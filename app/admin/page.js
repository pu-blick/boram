'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../components/AuthProvider';
import { db, setUserRole, getSchedules, setSchedule } from '../../lib/firebase';

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

            <ScheduleManager />

            <div className="admin-header" style={{ marginTop: 40, marginBottom: 16 }}>
                <h1>사용자 관리</h1>
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

function ScheduleManager() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [schedules, setSchedules] = useState({});
    const [editDay, setEditDay] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        getSchedules(year, month).then(setSchedules);
    }, [year, month]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); }
        else setMonth(month - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); }
        else setMonth(month + 1);
    };

    const handleDayClick = (d) => {
        setEditDay(d);
        setEditText(schedules[d] || '');
    };

    const handleSave = async () => {
        if (editDay === null) return;
        await setSchedule(year, month, editDay, editText.trim() || null);
        const updated = await getSchedules(year, month);
        setSchedules(updated);
        setEditDay(null);
        setEditText('');
    };

    return (
        <div style={{ marginTop: 32 }}>
            <div className="admin-header" style={{ marginBottom: 16 }}>
                <h1>달력 일정 관리</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>◀</button>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{year}년 {month}월</span>
                <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>▶</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 16 }}>
                {dayNames.map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '6px 0', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#64748b' }}>{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const hasEvent = !!schedules[d];
                    const isEditing = editDay === d;
                    return (
                        <div key={d} onClick={() => handleDayClick(d)}
                            style={{ minHeight: 48, padding: '4px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, textAlign: 'center', border: isEditing ? '2px solid #3b82f6' : '1px solid #f1f5f9', background: isEditing ? '#eff6ff' : hasEvent ? '#f0fdf4' : '#fff', transition: 'all 0.15s' }}>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{d}</div>
                            {hasEvent && <div style={{ fontSize: 9, color: '#2563eb', fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{schedules[d]}</div>}
                        </div>
                    );
                })}
            </div>

            {editDay !== null && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>{month}월 {editDay}일 일정</p>
                    <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="일정을 입력하세요 (비우면 삭제)"
                        autoFocus
                        style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #cbd5e0', borderRadius: 8, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleSave} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>저장</button>
                        <button onClick={() => setEditDay(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>취소</button>
                    </div>
                </div>
            )}
        </div>
    );
}
