'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, getUserRole } from '../lib/firebase';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [splashVisible, setSplashVisible] = useState(true);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    }, []);

    // 로딩 완료 시 스플래시 페이드 아웃 (0.4s transition 후 제거)
    useEffect(() => {
        if (!loading && splashVisible) {
            const timer = setTimeout(() => setSplashVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [loading, splashVisible]);

    useEffect(() => {
        if (!auth) { setLoading(false); return; }
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    const userRole = await getUserRole(firebaseUser.uid);
                    setRole(userRole || 'pending');
                } else {
                    setUser(null);
                    setRole(null);
                }
            } catch (e) {
                console.error('Auth state error:', e);
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Session timeout: auto logout after 30 min of inactivity
    useEffect(() => {
        if (!user) return;

        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                signOut(auth);
            }, SESSION_TIMEOUT);
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(timer);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {children}
            {splashVisible && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    background: '#062117',
                    opacity: loading ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                    pointerEvents: loading ? 'auto' : 'none',
                }}>
                    <span style={{
                        fontFamily: "'Josefin Sans', sans-serif",
                        fontSize: '40px',
                        fontWeight: 300,
                        letterSpacing: '10px',
                        color: 'white',
                    }}>EduFlow</span>
                    <span style={{
                        fontFamily: "Pretendard, sans-serif",
                        fontSize: '13px',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '2px',
                    }}>학교가는중....</span>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
