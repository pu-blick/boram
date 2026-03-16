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

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    }, []);

    // auth 로딩 완료 시 app-loading 클래스 제거 → 콘텐츠 표시
    useEffect(() => {
        if (!loading) {
            document.documentElement.classList.remove('app-loading');
            document.documentElement.classList.add('app-loaded');
        }
    }, [loading]);

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
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
