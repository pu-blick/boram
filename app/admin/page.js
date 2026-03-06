'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../components/AuthProvider';
import { db, setUserRole } from '../../lib/firebase';

export default function AdminPage() {
    const { user, role, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || role !== 'admin')) {
            router.push('/');
            return;
        }

        if (user && role === 'admin') {
            const usersRef = ref(db, 'users');
            const unsubscribe = onValue(usersRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const list = Object.entries(data).map(([uid, info]) => ({
                        uid,
                        ...info
                    }));
                    list.sort((a, b) => {
                        const order = { pending: 0, approved: 1, admin: 2 };
                        return (order[a.role] || 0) - (order[b.role] || 0);
                    });
                    setUsers(list);
                }
            });

            return () => unsubscribe();
        }
    }, [user, role, loading, router]);

    if (loading) {
        return <div className="loading-page"><div className="spinner"></div></div>;
    }

    if (!user || role !== 'admin') return null;

    async function handleApprove(uid) {
        await setUserRole(uid, 'approved');
    }

    async function handleReject(uid) {
        if (confirm('이 사용자를 거부하시겠습니까?')) {
            await setUserRole(uid, 'rejected');
        }
    }

    async function handleSetAdmin(uid) {
        if (confirm('이 사용자를 관리자로 지정하시겠습니까?')) {
            await setUserRole(uid, 'admin');
        }
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>사용자 관리</h1>
                <a href="/" className="admin-back">홈으로</a>
            </div>

            <div className="user-list">
                {users.map((u) => (
                    <div className="user-card" key={u.uid}>
                        <div className="user-info">
                            <span className="user-email">
                                {u.displayName || u.email}
                                {u.displayName && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>{u.email}</span>}
                            </span>
                            <span className="user-date">
                                가입: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '-'}
                            </span>
                        </div>
                        <div className="user-actions">
                            {u.role === 'pending' && (
                                <>
                                    <button className="btn-approve" onClick={() => handleApprove(u.uid)}>승인</button>
                                    <button className="btn-reject" onClick={() => handleReject(u.uid)}>거부</button>
                                </>
                            )}
                            {u.role === 'approved' && (
                                <>
                                    <span className="user-role-badge badge-approved">승인됨</span>
                                    <button className="btn-approve" onClick={() => handleSetAdmin(u.uid)} style={{ background: '#3b82f6', fontSize: 11 }}>관리자 지정</button>
                                </>
                            )}
                            {u.role === 'admin' && (
                                <span className="user-role-badge badge-admin">관리자</span>
                            )}
                            {u.role === 'rejected' && (
                                <>
                                    <span className="user-role-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>거부됨</span>
                                    <button className="btn-approve" onClick={() => handleApprove(u.uid)}>승인</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {users.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>등록된 사용자가 없습니다.</p>
                )}
            </div>
        </div>
    );
}
