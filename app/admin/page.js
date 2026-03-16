'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../components/AuthProvider';
import { db, setUserRole, getSchedules, setSchedule, removeSchedule } from '../../lib/firebase';

export default function AdminPage() {
    const { user, role, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('users');
    const [schedYear, setSchedYear] = useState(new Date().getFullYear());
    const [schedMonth, setSchedMonth] = useState(new Date().getMonth() + 1);
    const [schedules, setSchedulesState] = useState({});
    const [editDay, setEditDay] = useState('');
    const [editContent, setEditContent] = useState('');
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

    // Load schedules when year/month changes
    useEffect(() => {
        if (user && role === 'admin') {
            loadSchedules();
        }
    }, [user, role, schedYear, schedMonth]);

    async function loadSchedules() {
        const data = await getSchedules(schedYear, schedMonth);
        setSchedulesState(data);
    }

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

    async function handleAddSchedule() {
        const day = parseInt(editDay);
        if (!day || day < 1 || day > 31 || !editContent.trim()) return;
        await setSchedule(schedYear, schedMonth, day, editContent.trim());
        setEditDay('');
        setEditContent('');
        await loadSchedules();
    }

    function handleEditSchedule(day, content) {
        setEditDay(String(day));
        setEditContent(content);
    }

    async function handleDeleteSchedule(day) {
        if (confirm(`${schedMonth}월 ${day}일 일정을 삭제하시겠습니까?`)) {
            await removeSchedule(schedYear, schedMonth, day);
            await loadSchedules();
        }
    }

    const daysInMonth = new Date(schedYear, schedMonth, 0).getDate();

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>관리자</h1>
                <a href="/" className="admin-back">홈으로</a>
            </div>

            {/* Tab buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: 8,
                        fontFamily: 'Pretendard, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        background: activeTab === 'users' ? 'var(--accent)' : 'var(--bg)',
                        color: activeTab === 'users' ? 'white' : 'var(--text-secondary)',
                    }}
                >사용자 관리</button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: 8,
                        fontFamily: 'Pretendard, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        background: activeTab === 'schedule' ? 'var(--accent)' : 'var(--bg)',
                        color: activeTab === 'schedule' ? 'white' : 'var(--text-secondary)',
                    }}
                >일정 관리</button>
            </div>

            {/* Users tab */}
            {activeTab === 'users' && (
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
            )}

            {/* Schedule tab */}
            {activeTab === 'schedule' && (
                <div>
                    {/* Month selector */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                        <button onClick={() => {
                            if (schedMonth === 1) { setSchedMonth(12); setSchedYear(schedYear - 1); }
                            else setSchedMonth(schedMonth - 1);
                        }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text)' }}>◀</button>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{schedYear}년 {schedMonth}월</span>
                        <button onClick={() => {
                            if (schedMonth === 12) { setSchedMonth(1); setSchedYear(schedYear + 1); }
                            else setSchedMonth(schedMonth + 1);
                        }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text)' }}>▶</button>
                    </div>

                    {/* Add schedule form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="number"
                                min="1"
                                max={daysInMonth}
                                value={editDay}
                                onChange={(e) => setEditDay(e.target.value)}
                                placeholder="일"
                                style={{ width: 60, padding: '10px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'Pretendard, sans-serif', fontSize: 14, textAlign: 'center' }}
                            />
                            <button
                                onClick={handleAddSchedule}
                                style={{ padding: '10px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontFamily: 'Pretendard, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >추가</button>
                        </div>
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="일정 내용을 입력하세요 (여러 줄 가능)"
                            rows={3}
                            style={{ padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontFamily: 'Pretendard, sans-serif', fontSize: 14, resize: 'vertical', lineHeight: 1.6 }}
                        />
                    </div>

                    {/* Schedule list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(schedules)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([day, content]) => (
                                <div key={day} style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)', minWidth: 40 }}>{day}일</span>
                                    <span style={{ flex: 1, fontSize: 14, whiteSpace: 'pre-line' }}>{content}</span>
                                    <button
                                        onClick={() => handleEditSchedule(day, content)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}
                                    >✎</button>
                                    <button
                                        onClick={() => handleDeleteSchedule(day)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
                                    >×</button>
                                </div>
                            ))}
                        {Object.keys(schedules).length === 0 && (
                            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>이 달에 등록된 일정이 없습니다.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
