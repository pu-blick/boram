'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/AuthProvider';
import { auth, getSchedules } from '../lib/firebase';
import { fetchAllStudentData } from '../lib/discipline';

export default function HomePage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="loading-page">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    // Pending approval
    if (role === 'pending') {
        return (
            <div className="pending-page">
                <div className="pending-card">
                    <div className="pending-icon">
                        <span className="material-symbols-rounded" style={{ fontSize: 48 }}>hourglass_top</span>
                    </div>
                    <h2>승인 대기 중</h2>
                    <p>
                        관리자의 승인을 기다리고 있습니다.<br />
                        승인이 완료되면 홈페이지를 이용할 수 있습니다.
                    </p>
                    <button className="pending-logout" onClick={() => signOut(auth)}>
                        로그아웃
                    </button>
                </div>
            </div>
        );
    }

    // Approved or Admin - show the actual site
    return <MainSite role={role} user={user} />;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmK27_RCgeQHOINSeec1hM-yrNcHP139QNYa7pGrEBDyL92vhfTGsOvqGH5zMntqiiDg/exec';

// 이메일 → 교사/반 매핑 (classNum: null이면 학년부장, 전체 반)
const TEACHER_MAP = {
    'cih4682@gmail.com': { name: '최익현', classNum: null },
};

const VIOLATION_LIST = [
    '수업 시간 미준수', '수업 중 음식물 섭취', '수업 중 면학 분위기 저해',
    '담임교사 지시 위반', '기타 일반 예절 위반',
    '[즉시] 미인정 지각', '[즉시] 미인정 결과', '[즉시] 미인정 조퇴',
    '[즉시] 미인정 외출', '[즉시] 미인정 결석', '[즉시] 수업시간 전자기기 무단 사용',
    '[2회] 두발 및 용의·복장 규정 위반', '[2회] 실내외화 혼용', '[2회] 교내 소란 및 비속어 사용',
    '교내 행사 무단 불참', '교외 단체 활동/행사 무단 불참', '[2회] 청소 활동 불성실',
    '규정된 출입문 미사용', '월담 행위', '[즉시] 사행성 오락',
    '음란물 반입/시청/소지', '출입 금지 구역 무단 입장', '불건전한 이성교제',
    '쓰레기 무단 투기', '[즉시] 고의적 공공기물 훼손', '학생 신분에 어긋난 행동',
    '식당 질서 위반(무단식사 등)', '복장 임의 변형', '수업 중 수면',
];

const RS = {
    modal: { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' },
    modalBox: { background: 'white', borderRadius: 24, width: '100%', maxWidth: 400, maxHeight: '85vh', padding: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    label: { fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 },
    value: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 },
    btn: { width: '100%', padding: 14, borderRadius: 16, color: 'white', fontSize: 15, fontWeight: 900, border: 'none', cursor: 'pointer' },
};

function MainSite({ role, user }) {
    const teacherInfo = user?.email ? TEACHER_MAP[user.email] : null;
    const [showRecordModal, setShowRecordModal] = useState(false);
    const [recordStep, setRecordStep] = useState(1);
    const [recordStudent, setRecordStudent] = useState(null);
    const [recordDate, setRecordDate] = useState('');
    const [recordViolation, setRecordViolation] = useState('');
    const [recordCustom, setRecordCustom] = useState('');
    const [recordSaving, setRecordSaving] = useState(false);
    const [recordResult, setRecordResult] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [allStudents, setAllStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [selectedClassFilter, setSelectedClassFilter] = useState(null);
    const [fabOffset, setFabOffset] = useState(0);

    useEffect(() => {
        let timeout;
        const handleScroll = () => {
            setFabOffset(30);
            clearTimeout(timeout);
            timeout = setTimeout(() => setFabOffset(0), 150);
        };
        window.addEventListener('scroll', handleScroll);
        return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(timeout); };
    }, []);

    const openRecordModal = async () => {
        const today = new Date();
        setRecordDate(`${today.getMonth() + 1}/${today.getDate()}`);
        setRecordStep(1);
        setRecordStudent(null);
        setRecordViolation('');
        setRecordCustom('');
        setRecordResult(null);
        setStudentSearch('');
        setSelectedClassFilter(teacherInfo?.classNum || null);
        setShowRecordModal(true);
        if (allStudents.length === 0) {
            setStudentsLoading(true);
            try {
                const { allStudents: every } = await fetchAllStudentData(2);
                setAllStudents(every);
            } catch (e) { console.error(e); }
            finally { setStudentsLoading(false); }
        }
    };

    const handleRecordSubmit = async () => {
        if (!recordStudent) return;
        const violation = recordViolation === '__custom__' ? recordCustom : recordViolation;
        if (!violation) return;
        const content = `${recordDate} ${violation}`;
        const classNum = recordStudent.class.replace(/[^0-9-]/g, '');
        const teacherName = teacherInfo?.name || '';
        setRecordSaving(true);
        setRecordResult(null);
        try {
            // 1) 엑셀 기록 (Apps Script)
            const res = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ sheetName: classNum, studentId: recordStudent.id, content, teacherName, violation, date: recordDate, studentName: recordStudent.name })
            });
            const json = await res.json();

            // 2) 구글폼 응답 시트 기록은 Apps Script에서 처리

            setRecordResult(json.success ? 'success' : 'error: ' + (json.error || '알 수 없는 오류'));
        } catch (err) {
            setRecordResult('error: ' + err.message);
        } finally { setRecordSaving(false); }
    };

    useEffect(() => {
        // Pass Firebase config to legacy script via window
        window.__FIREBASE_CONFIG__ = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };

        // Load Firebase compat SDK then legacy script
        const loadScript = (src) => new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => { console.error('Script load failed:', src); resolve(); };
            document.body.appendChild(s);
        });

        loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
            .then(() => loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js'))
            .then(() => loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js'))
            .then(() => loadScript('/legacy-script.js'))
            .catch(e => console.error('Script chain failed:', e));
    }, []);

    return (
        <>
            {/* Header */}
            <header className="header">
                <button className="menu-btn" onClick={() => {
                    document.getElementById('sidebar')?.classList.toggle('open');
                    document.getElementById('sidebarOverlay')?.classList.toggle('open');
                }}>
                    <span className="material-symbols-rounded">menu</span>
                </button>
                <div className="logo">
                    <span className="logo-text">EduFlow</span>
                </div>
            </header>

            {/* Sidebar */}
            <nav className="sidebar" id="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-logo">EduFlow</span>
                    <button className="close-btn" onClick={() => {
                        document.getElementById('sidebar')?.classList.toggle('open');
                        document.getElementById('sidebarOverlay')?.classList.toggle('open');
                    }}>
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <ul className="sidebar-menu">
                    <li><a href="/"><span className="material-symbols-rounded">home</span> 홈</a></li>
                    <li><a href="https://www.notion.so/2ffeaefe31828034a444d95d990c6561" target="_blank"><span className="material-symbols-rounded">calendar_month</span> 학사일정</a></li>
                    <li><a href="https://www.notion.so/306eaefe3182802cb920fd4ad04cc492" target="_blank"><span className="material-symbols-rounded">checklist</span> 창체일정</a></li>
                    <li><a href="https://www.notion.so/2026-2-2ffeaefe318280c7bf90d1dee06f5f2f" target="_blank"><span className="material-symbols-rounded">groups</span> NOTION</a></li>
                    <li><a href="https://www.notion.so/303eaefe318280289edcc49f8850d826" target="_blank"><span className="material-symbols-rounded">school</span> 입시컨설팅</a></li>
                    <li><a href="#"><span className="material-symbols-rounded">directions_bus</span> 수학여행</a></li>
                    {role === 'admin' && (
                        <li><a href="/admin"><span className="material-symbols-rounded">admin_panel_settings</span> 관리자</a></li>
                    )}
                    <li><a href="#" onClick={(e) => { e.preventDefault(); signOut(auth); }}><span className="material-symbols-rounded">logout</span> 로그아웃</a></li>
                </ul>
            </nav>
            <div className="sidebar-overlay" id="sidebarOverlay" onClick={() => {
                document.getElementById('sidebar')?.classList.toggle('open');
                document.getElementById('sidebarOverlay')?.classList.toggle('open');
            }}></div>

            {/* Hero Banner */}
            <section className="hero">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h1 style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, letterSpacing: '-0.5px' }}>보람고 2학년부</h1>
                </div>
            </section>

            {/* Main Content */}
            <main className="main-content">
                <section className="card-section">
                    <div className="card-grid">
                        <a href="https://www.notion.so/2ffeaefe31828034a444d95d990c6561" target="_blank" className="card">
                            <div className="card-thumb"><img src="/학사일정.jpeg" alt="학사일정" /></div>
                            <span className="card-label">학사일정</span>
                        </a>
                        <a href="https://www.notion.so/306eaefe3182802cb920fd4ad04cc492" target="_blank" className="card">
                            <div className="card-thumb"><img src="/창체일정.jpeg" alt="창체일정" /></div>
                            <span className="card-label">창체일정</span>
                        </a>
                        <a href="https://www.notion.so/2026-2-2ffeaefe318280c7bf90d1dee06f5f2f" target="_blank" className="card">
                            <div className="card-thumb"><img src="/노션기록.jpeg" alt="NOTION" /></div>
                            <span className="card-label">NOTION</span>
                        </a>
                        <a href="https://www.notion.so/303eaefe318280289edcc49f8850d826" target="_blank" className="card">
                            <div className="card-thumb"><img src="/규정모음_2.png" alt="입시컨설팅" /></div>
                            <span className="card-label">입시컨설팅</span>
                        </a>
                        <a href="#" className="card">
                            <div className="card-thumb"><img src="/수학여행.jpeg" alt="수학여행" /></div>
                            <span className="card-label">수학여행</span>
                        </a>
                    </div>
                </section>

                <section className="bottom-links">
                    <a href="http://xn--s39aqy283b66bj2x.kr/" target="_blank" className="circle-btn">
                        <img src="/컴시간 알리미.png" alt="컴시간 알리미" />
                    </a>
                    <a href="/seating" className="circle-btn">
                        <img src="/CLASS HELP.png" alt="CLASS HELP" />
                    </a>
                    <a href="/discipline" className="circle-btn">
                        <img src="/공동체 관리대장.png" alt="공동체 관리대장" />
                    </a>
                    <a href="/idsearch" className="circle-btn">
                        <img src="/id.png" alt="ID" />
                    </a>
                </section>

                <HelperSection />

                <WeeklySchedule />

                <CalendarSection />

            </main>

            <footer className="footer">
                <p>EduFlow</p>
            </footer>

            {/* 위반 기록 플로팅 버튼 */}
            <button className="record-fab" onClick={openRecordModal} style={{
                position: 'fixed', bottom: '45%', right: 12, width: 52, height: 52,
                borderRadius: 14, background: 'none', border: 'none', cursor: 'pointer', zIndex: 150,
                padding: 0, overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                transform: `translateY(${fabOffset}px)`,
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <img src="/c_ 1.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>

            {/* 기록 모달 */}
            {showRecordModal && (
                <div style={RS.modal} onClick={() => setShowRecordModal(false)}>
                    <div style={RS.modalBox} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>위반 기록</h3>
                            <button onClick={() => setShowRecordModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>

                        {recordResult === 'success' ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: 48, marginBottom: 16, color: '#10b981' }}>&#10003;</div>
                                <p style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>기록 완료!</p>
                                <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{recordStudent?.name} ({recordStudent?.id})</p>
                                <button onClick={() => { setRecordResult(null); setRecordStep(1); setRecordStudent(null); setRecordViolation(''); setRecordCustom(''); }}
                                    style={{ ...RS.btn, marginTop: 20, background: '#10b981' }}>추가 기록</button>
                                <button onClick={() => setShowRecordModal(false)}
                                    style={{ ...RS.btn, marginTop: 8, background: '#64748b' }}>닫기</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                                    {[1, 2, 3].map(s => (
                                        <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: recordStep >= s ? '#e11d48' : '#e2e8f0' }}></div>
                                    ))}
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {recordStep === 1 && (
                                        <div>
                                            <div style={{ display: 'flex', gap: 4, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
                                                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                    <button key={n} onClick={() => setSelectedClassFilter(selectedClassFilter === n ? null : n)}
                                                        style={{
                                                            flex: '0 0 auto', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                            border: selectedClassFilter === n ? 'none' : '1px solid #e2e8f0',
                                                            background: selectedClassFilter === n ? '#0f172a' : 'white',
                                                            color: selectedClassFilter === n ? 'white' : '#475569',
                                                            cursor: 'pointer', whiteSpace: 'nowrap'
                                                        }}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                            <p style={RS.label}>학생 선택</p>
                                            <input type="text" placeholder="이름 또는 학번 검색..." value={studentSearch}
                                                onChange={e => setStudentSearch(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
                                            {studentsLoading ? (
                                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>학생 데이터 불러오는 중...</p>
                                            ) : (
                                                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                                    {allStudents.filter(s => {
                                                        if (selectedClassFilter && s.class !== `2-${selectedClassFilter}반`) return false;
                                                        if (studentSearch && !s.name.includes(studentSearch) && !s.id.includes(studentSearch)) return false;
                                                        return true;
                                                    }).map(s => (
                                                        <button key={s.id} onClick={() => { setRecordStudent(s); setRecordStep(2); }}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', marginBottom: 4, textAlign: 'left' }}>
                                                            <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#475569', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{s.class}</span>
                                                            <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{s.name}</span>
                                                            <span style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{s.id}</span>
                                                        </button>
                                                    ))}
                                                    {allStudents.filter(s => {
                                                        if (selectedClassFilter && s.class !== `2-${selectedClassFilter}반`) return false;
                                                        if (studentSearch && !s.name.includes(studentSearch) && !s.id.includes(studentSearch)) return false;
                                                        return true;
                                                    }).length === 0 && !studentsLoading && (
                                                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>검색 결과가 없습니다</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {recordStep === 2 && (
                                        <div>
                                            <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{recordStudent?.class} {recordStudent?.name} ({recordStudent?.id})</span>
                                                <button onClick={() => setRecordStep(1)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#e11d48', fontWeight: 700, cursor: 'pointer' }}>변경</button>
                                            </div>
                                            <p style={RS.label}>날짜</p>
                                            <input type="text" value={recordDate} onChange={e => setRecordDate(e.target.value)}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
                                            <p style={RS.label}>위반내용 선택</p>
                                            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                                                {VIOLATION_LIST.map(v => (
                                                    <button key={v} onClick={() => { setRecordViolation(v); setRecordStep(3); }}
                                                        style={{ display: 'block', width: '100%', padding: '9px 12px', borderRadius: 8, border: recordViolation === v ? '2px solid #e11d48' : '1px solid #e2e8f0', background: recordViolation === v ? '#fef2f2' : 'white', cursor: 'pointer', marginBottom: 4, textAlign: 'left', fontSize: 13, fontWeight: recordViolation === v ? 700 : 500 }}>
                                                        {v}
                                                    </button>
                                                ))}
                                            </div>
                                            <p style={{ ...RS.label, marginTop: 8 }}>또는 직접 입력</p>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <input type="text" placeholder="직접 입력..." value={recordCustom}
                                                    onChange={e => { setRecordCustom(e.target.value); setRecordViolation('__custom__'); }}
                                                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                                                <button onClick={() => { if (recordCustom) setRecordStep(3); }}
                                                    style={{ padding: '10px 16px', borderRadius: 10, background: '#0f172a', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>확인</button>
                                            </div>
                                        </div>
                                    )}

                                    {recordStep === 3 && (
                                        <div>
                                            <p style={RS.label}>학생</p>
                                            <p style={RS.value}>{recordStudent?.class} {recordStudent?.name} ({recordStudent?.id})</p>
                                            <p style={RS.label}>날짜</p>
                                            <p style={RS.value}>{recordDate}</p>
                                            <p style={RS.label}>위반내용</p>
                                            <p style={RS.value}>{recordViolation === '__custom__' ? recordCustom : recordViolation}</p>
                                            <p style={RS.label}>시트에 입력될 값</p>
                                            <p style={{ ...RS.value, background: '#f1f5f9', padding: '10px 14px', borderRadius: 10, fontSize: 14 }}>
                                                {recordDate} {recordViolation === '__custom__' ? recordCustom : recordViolation}
                                            </p>
                                            {recordResult && recordResult.startsWith('error') && (
                                                <p style={{ color: '#e11d48', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{recordResult}</p>
                                            )}
                                            <button onClick={handleRecordSubmit} disabled={recordSaving}
                                                style={{ ...RS.btn, background: recordSaving ? '#94a3b8' : '#e11d48', marginBottom: 8 }}>
                                                {recordSaving ? '기록 중...' : '기록하기'}</button>
                                            <button onClick={() => setRecordStep(2)}
                                                style={{ ...RS.btn, background: '#64748b' }}>뒤로</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

const SCHEDULE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/11v6OaMfVEOGOhNYDwpPX8dMw94lek7iX_A1SceyRHkc/export?format=csv&gid=1333092882';

function parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let cells = [];
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            cells.push(current.trim());
            if (cells.some(c => c !== '')) rows.push(cells);
            cells = [];
            current = '';
        } else {
            current += ch;
        }
    }
    cells.push(current.trim());
    if (cells.some(c => c !== '')) rows.push(cells);
    return rows;
}

function getWeekDates() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const dates = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function matchDate(cellText, targetMonth, targetDay) {
    if (!cellText) return false;
    const m1 = cellText.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (m1 && parseInt(m1[1]) === targetMonth && parseInt(m1[2]) === targetDay) return true;
    const m2 = cellText.match(/(\d{1,2})월\s*(\d{1,2})일?\s*~\s*(\d{1,2})일/);
    if (m2) {
        const mon = parseInt(m2[1]);
        const from = parseInt(m2[2]);
        const to = parseInt(m2[3]);
        if (mon === targetMonth && targetDay >= from && targetDay <= to) return true;
    }
    const m3 = cellText.match(/(\d{1,2})월(\d{1,2})일?\s*~\s*(\d{1,2})일/);
    if (m3) {
        const mon = parseInt(m3[1]);
        const from = parseInt(m3[2]);
        const to = parseInt(m3[3]);
        if (mon === targetMonth && targetDay >= from && targetDay <= to) return true;
    }
    return false;
}

function HelperSection() {
    const [open, setOpen] = useState(false);

    const RECYCLE_START = new Date(2026, 2, 23); // 2026-03-23
    const LUNCH_START = new Date(2026, 2, 23);

    const recycleTeams = [
        ['김규현 (20105)', '이준규 (20420)'],
        ['우희범 (20215)', '이민서 (20521)'],
        ['최수영 (20328)', '윤 건 (20616)'],
        ['김기민 (20705)', '손지호 (21012)'],
        ['홍성민 (20826)', '최정후 (20925)'],
    ];

    const lunchTeams = [
        ['강다인 (20102)', '김재윤 (20111)'],
        ['김무겸 (20203)', '이창인 (20220)'],
        ['이주환 (20318)', '최민준 (20326)'],
        ['고나은 (20401)', '송채린 (20411)'],
        ['서 윤 (20515)', '윤여산 (20519)'],
        ['유지안 (20615)', '이지민 (20621)'],
        ['김러원 (20706)', '한보경 (20727)'],
        ['김민서 (20802)', '박수민 (20814)'],
        ['유가람 (20915)', '한민경 (20927)'],
        ['신수찬 (21013)', '오준희 (21015)'],
    ];

    const getWeekIndex = (startDate, totalTeams) => {
        const now = new Date();
        const diff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 7));
        if (diff < 0) return -1;
        return diff % totalTeams;
    };

    const recycleIdx = getWeekIndex(RECYCLE_START, recycleTeams.length);
    const lunchIdx = getWeekIndex(LUNCH_START, lunchTeams.length);

    // 시작 전이면 임시 표시용
    const recycleDisplay = recycleIdx === -1 ? ['김지훈 (20300)', '김단희 (20500)'] : recycleTeams[recycleIdx];
    const lunchDisplay = lunchIdx === -1 ? ['신민영 (20700)', '이진선 (20800)'] : lunchTeams[lunchIdx];

    return (
        <section style={{ marginTop: 24 }}>
            <div onClick={() => setOpen(!open)} style={{
                background: 'white', borderRadius: 'var(--radius)', padding: '16px 20px',
                boxShadow: 'var(--shadow-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
                <h2 style={{
                    fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Pretendard, sans-serif',
                    color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#3b82f6' }}>notifications</span>
                    이번주 활동 도우미
                </h2>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#94a3b8', transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
            </div>
            {open && (
                <div style={{ background: 'white', borderRadius: '0 0 var(--radius) var(--radius)', padding: '0 20px 20px', marginTop: -8, boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', color: '#0f172a' }}>분리수거 도우미</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {recycleDisplay.map((name, i) => (
                                <div key={i} style={{
                                    padding: '10px 20px', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                    textAlign: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', color: '#166534'
                                }}>{name}</div>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', color: '#0f172a' }}>급식지도 도우미</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {lunchDisplay.map((name, i) => (
                                <div key={i} style={{
                                    padding: '10px 20px', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
                                    textAlign: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', color: '#9a3412'
                                }}>{name}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function WeeklySchedule() {
    const [weekData, setWeekData] = useState({});
    const [loaded, setLoaded] = useState(false);
    const weekDates = getWeekDates();
    const dayLabels = ['월', '화', '수', '목', '금'];

    useEffect(() => {
        fetch(SCHEDULE_SHEET_URL)
            .then(r => r.text())
            .then(text => {
                const rows = parseCSV(text);
                const result = {};
                let lastDate = '';

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length < 3) continue;
                    if (row[0]) lastDate = row[0];
                    const event = row[5];
                    if (!event) continue;

                    for (let d = 0; d < 5; d++) {
                        const date = weekDates[d];
                        const month = date.getMonth() + 1;
                        const day = date.getDate();
                        if (matchDate(lastDate, month, day)) {
                            if (!result[d]) result[d] = [];
                            const period = row[1] || '';
                            const pNum = parseInt(period);
                            const prefix = pNum >= 1 && pNum <= 7 ? String(pNum) : '';
                            result[d].push({ num: prefix, text: event });
                        }
                    }
                }
                console.log('이번주:', weekDates.map(d => (d.getMonth()+1)+'/'+d.getDate()));
                console.log('매칭결과:', result);
                console.log('CSV 날짜샘플:', rows.slice(1, 25).filter(r => r[0]).map(r => r[0]));
                setWeekData(result);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    return (
        <section style={{ background: 'white', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow-sm)', marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Pretendard, sans-serif' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent)' }}>date_range</span>
                창의적체험활동 일정
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {dayLabels.map((label, i) => {
                    const date = weekDates[i];
                    const isToday = date.toDateString() === new Date().toDateString();
                    const events = weekData[i] || [];
                    return (
                        <div key={i} style={{
                            background: isToday ? '#eff6ff' : '#f8fafc',
                            borderRadius: 10,
                            padding: '10px 8px',
                            minHeight: 80,
                            border: isToday ? '2px solid #3b82f6' : '1px solid #f1f5f9',
                            transition: 'all 0.2s'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#3b82f6' : '#94a3b8' }}>{label}</div>
                                <div style={{ fontSize: 14, fontWeight: isToday ? 800 : 600, color: isToday ? '#1e40af' : '#475569' }}>{date.getDate()}</div>
                            </div>
                            {events.length > 0 ? events.map((e, j) => (
                                <div key={j} style={{ fontSize: 10, color: '#059669', fontWeight: 400, lineHeight: 1.2, marginBottom: 2, wordBreak: 'keep-all', textAlign: 'center' }}>
                                    {e.num ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                            <span style={{ fontSize: 9, fontWeight: 700, color: 'white', background: '#3b82f6', borderRadius: 4, width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{e.num}</span>
                                            <span>{e.text}</span>
                                        </span>
                                    ) : e.text}
                                </div>
                            )) : (
                                <div style={{ fontSize: 9, color: '#cbd5e1', textAlign: 'center', marginTop: 8 }}>-</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function CalendarSection() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [schedules, setSchedules] = useState({});

    useEffect(() => {
        getSchedules(year, month).then(setSchedules);
    }, [year, month]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); }
        else setMonth(month - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); }
        else setMonth(month + 1);
    };

    const isToday = (d) => d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

    return (
        <section className="calendar-section">
            <div className="calendar-header">
                <button className="cal-nav" onClick={prevMonth}>
                    <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <h2 className="cal-title">{year}년 {month}월</h2>
                <button className="cal-nav" onClick={nextMonth}>
                    <span className="material-symbols-rounded">chevron_right</span>
                </button>
            </div>

            <div className="calendar-grid">
                {dayNames.map((d, i) => (
                    <div key={d} className={`cal-dayname ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}>{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="cal-cell empty"></div>
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const dayOfWeek = (firstDayOfWeek + i) % 7;
                    const hasSchedule = !!schedules[d];
                    return (
                        <div
                            key={d}
                            className={`cal-cell ${isToday(d) ? 'today' : ''} ${hasSchedule ? 'has-event' : ''} ${dayOfWeek === 0 ? 'sun' : ''} ${dayOfWeek === 6 ? 'sat' : ''}`}
                        >
                            <span className="cal-date">{d}</span>
                            {hasSchedule && <span className="cal-schedule-text">{schedules[d]}</span>}
                        </div>
                    );
                })}
            </div>

        </section>
    );
}
