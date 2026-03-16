'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { auth, googleProvider, registerUser } from '../../lib/firebase';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
    const { user, loading: authLoading } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [failCount, setFailCount] = useState(0);
    const [lockUntil, setLockUntil] = useState(null);
    const router = useRouter();

    // AuthProvider가 유저를 감지하면 자동으로 메인 페이지로 이동
    useEffect(() => {
        if (!authLoading && user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const isLocked = lockUntil && Date.now() < lockUntil;

    async function handleEmailAuth(e) {
        e.preventDefault();
        setError('');

        if (isLocked) {
            const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
            setError(`로그인 시도가 제한되었습니다. ${remaining}초 후 다시 시도해주세요.`);
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if (name) {
                    await updateProfile(cred.user, { displayName: name });
                }
                await registerUser(cred.user.uid, email, name);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            setFailCount(0);
            setLockUntil(null);
        } catch (err) {
            if (!isSignUp) {
                const newCount = failCount + 1;
                setFailCount(newCount);
                if (newCount >= 5) {
                    setLockUntil(Date.now() + 30000);
                    setFailCount(0);
                    setError('5회 연속 실패하여 30초간 로그인이 제한됩니다.');
                    setLoading(false);
                    return;
                }
            }
            if (err.code === 'auth/email-already-in-use') {
                setError('이미 등록된 이메일입니다.');
            } else if (err.code === 'auth/weak-password') {
                setError('비밀번호는 6자 이상이어야 합니다.');
            } else if (err.code === 'auth/invalid-email') {
                setError('올바른 이메일 형식이 아닙니다.');
            } else if (err.code === 'auth/invalid-credential') {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else {
                setError('오류가 발생했습니다. 다시 시도해주세요.');
            }
        }
        setLoading(false);
    }

    async function handleGoogleLogin() {
        setError('');
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await registerUser(
                result.user.uid,
                result.user.email,
                result.user.displayName
            );
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                setError('구글 로그인에 실패했습니다.');
            }
        }
        setLoading(false);
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <h1>EduFlow</h1>
                </div>
                <p className="login-subtitle">에듀플로우</p>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleEmailAuth}>
                    {isSignUp && (
                        <input
                            type="text"
                            className="login-input"
                            placeholder="이름"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                    <input
                        type="email"
                        className="login-input"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        className="login-input"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="login-btn login-btn-primary"
                        disabled={loading || isLocked}
                    >
                        {loading ? '처리 중...' : isLocked ? '잠금 중...' : (isSignUp ? '회원가입' : '로그인')}
                    </button>
                </form>

                <div className="login-divider">또는</div>

                <button
                    className="login-btn login-btn-google"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <svg className="google-icon" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google로 로그인
                </button>

                <div className="login-toggle">
                    {isSignUp ? (
                        <>이미 계정이 있으신가요? <button onClick={() => { setIsSignUp(false); setError(''); }}>로그인</button></>
                    ) : (
                        <>계정이 없으신가요? <button onClick={() => { setIsSignUp(true); setError(''); }}>회원가입</button></>
                    )}
                </div>
            </div>
        </div>
    );
}
