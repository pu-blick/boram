'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../components/AuthProvider';
import { db, setUserRole, getSchedules, setSchedule, parseSchedule, serializeSchedule, SCHEDULE_MAX_LENGTH } from '../../lib/firebase';

export default function AdminPage() {
    const { user, role, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('schedule');
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

    const tabStyle = (active) => ({
        flex: 1,
        padding: '12px 0',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        border: 'none',
        borderBottom: active ? '3px solid #3b82f6' : '3px solid transparent',
        background: active ? '#eff6ff' : 'transparent',
        color: active ? '#1e40af' : '#94a3b8',
        transition: 'all 0.2s',
        borderRadius: '8px 8px 0 0',
    });

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>관리자</h1>
                <a href="/" className="admin-back">홈으로</a>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
                <button style={tabStyle(activeTab === 'schedule')} onClick={() => setActiveTab('schedule')}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>calendar_month</span>
                    일정 관리
                </button>
                <button style={tabStyle(activeTab === 'users')} onClick={() => setActiveTab('users')}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>group</span>
                    사용자 관리
                </button>
            </div>

            {/* Schedule Tab */}
            {activeTab === 'schedule' && <ScheduleManager />}

            {/* Users Tab */}
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
        </div>
    );
}

function ScheduleManager() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [schedules, setSchedulesState] = useState({});
    const [editDay, setEditDay] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getSchedules(year, month).then(setSchedulesState);
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

    const emptyItem = () => ({ summary: '', detail: '' });

    const handleDayClick = (d) => {
        const items = parseSchedule(schedules[d]);
        setEditDay(d);
        setEditItems(items.length ? items : [emptyItem()]);
    };

    const closeEditor = () => {
        setEditDay(null);
        setEditItems([]);
    };

    const updateItem = (index, field, value) => {
        setEditItems(items => items.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
    };
    const addItem = () => setEditItems(items => [...items, emptyItem()]);
    const removeItem = (index) => {
        setEditItems(items => (items.length > 1 ? items.filter((_, i) => i !== index) : [emptyItem()]));
    };

    const serialized = serializeSchedule(editItems);
    const savedLength = serialized ? serialized.length : 0;
    const tooLong = savedLength > SCHEDULE_MAX_LENGTH;
    const missingSummary = editItems.some(it => !it.summary.trim() && it.detail.trim());
    const blocked = tooLong || missingSummary || saving;

    const handleSave = async () => {
        if (editDay === null || blocked) return;
        setSaving(true);
        const ok = await setSchedule(year, month, editDay, serialized);
        setSaving(false);
        if (!ok) {
            alert('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            return;
        }
        setSchedulesState(await getSchedules(year, month));
        closeEditor();
    };

    return (
        <div>
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
                    const todayDate = new Date();
                    const isToday = todayDate.getFullYear() === year && todayDate.getMonth() + 1 === month && todayDate.getDate() === d;
                    return (
                        <div key={d} onClick={() => handleDayClick(d)}
                            style={{ minHeight: 56, padding: '4px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, textAlign: 'center', border: isEditing ? '2px solid #3b82f6' : isToday ? '2px solid #10b981' : '1px solid #f1f5f9', background: isEditing ? '#eff6ff' : hasEvent ? '#f0fdf4' : '#fff', transition: 'all 0.15s' }}>
                            <div style={{ fontWeight: 600, marginBottom: 2, color: isToday ? '#10b981' : undefined }}>{d}</div>
                            {hasEvent && parseSchedule(schedules[d]).map((it, j) => (
                                <div key={j} style={{ fontSize: 9, color: '#059669', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {it.summary}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {editDay !== null && (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                    <p style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4, color: '#3b82f6' }}>edit_calendar</span>
                        {year}년 {month}월 {editDay}일
                    </p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>모든 칸을 비우고 저장하면 이 날짜 일정이 삭제됩니다</p>

                    {editItems.map((item, index) => {
                        const noSummary = !item.summary.trim() && !!item.detail.trim();
                        return (
                            <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: '#3b82f6' }}>일정 {index + 1}</span>
                                    <button onClick={() => removeItem(index)} style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>delete</span>
                                        삭제
                                    </button>
                                </div>

                                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                    <span>요약 제목 <span style={{ fontWeight: 400, color: '#94a3b8' }}>· 달력에 보이는 글자</span></span>
                                    <span style={{ fontWeight: 400, color: item.summary.length > 7 ? '#d97706' : '#94a3b8' }}>{item.summary.length}자 (7자까지 보임)</span>
                                </label>
                                <input
                                    type="text"
                                    value={item.summary}
                                    onChange={(e) => updateItem(index, 'summary', e.target.value)}
                                    placeholder="예: 수학여행"
                                    autoFocus={index === 0}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${noSummary ? '#ef4444' : '#cbd5e0'}`, borderRadius: 8, outline: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Pretendard, sans-serif' }}
                                />

                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                    상세 내용 <span style={{ fontWeight: 400, color: '#94a3b8' }}>· 요약을 누르면 보이는 전체 내용</span>
                                </label>
                                <textarea
                                    value={item.detail}
                                    onChange={(e) => updateItem(index, 'detail', e.target.value)}
                                    placeholder="실제 내용을 붙여넣으세요"
                                    rows={6}
                                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #cbd5e0', borderRadius: 8, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontFamily: 'Pretendard, sans-serif' }}
                                />
                                {noSummary && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, marginTop: 4 }}>요약 제목을 입력해 주세요</p>}
                            </div>
                        );
                    })}

                    <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', padding: 10, marginBottom: 8, background: '#fff', border: '1px dashed #93c5fd', borderRadius: 10, color: '#3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
                        요약 + 상세 내용 추가
                    </button>

                    <p style={{ fontSize: 11, textAlign: 'right', marginBottom: 10, color: tooLong ? '#ef4444' : '#94a3b8', fontWeight: tooLong ? 700 : 400 }}>
                        저장 용량 {savedLength} / {SCHEDULE_MAX_LENGTH}자{tooLong && ' — 너무 깁니다. 내용을 줄여 주세요'}
                    </p>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleSave} disabled={blocked} style={{ flex: 1, padding: '10px', background: blocked ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: blocked ? 'not-allowed' : 'pointer', fontSize: 14 }}>{saving ? '저장 중...' : '저장'}</button>
                        <button onClick={closeEditor} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>취소</button>
                    </div>
                </div>
            )}
        </div>
    );
}
