'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useAuth } from '../components/AuthProvider';
import { auth, getSchedules } from '../lib/firebase';

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
    return <MainSite role={role} />;
}

function MainSite({ role }) {
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
                    <li><a href="https://www.notion.so/305eaefe318280aab667e41088ac32af" target="_blank"><span className="material-symbols-rounded">school</span> 입시컨설팅</a></li>
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
                        <a href="https://www.notion.so/305eaefe318280aab667e41088ac32af" target="_blank" className="card">
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

                <WeeklySchedule />

                <CalendarSection />

            </main>

            <footer className="footer">
                <p>EduFlow</p>
            </footer>
        </>
    );
}

const SCHEDULE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/11v6OaMfVEOGOhNYDwpPX8dMw94lek7iX_A1SceyRHkc/export?format=csv&gid=1333092882';

function parseCSV(text) {
    const lines = text.split('\n');
    const rows = [];
    for (const line of lines) {
        const cells = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
            else { current += ch; }
        }
        cells.push(current.trim());
        rows.push(cells);
    }
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
                            result[d].push(period ? `${period}교시 ${event}` : event);
                        }
                    }
                }
                setWeekData(result);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    return (
        <section style={{ background: 'white', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow-sm)', marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Pretendard, sans-serif' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent)' }}>date_range</span>
                한주의 일정
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
                                <div key={j} style={{ fontSize: 9, color: '#059669', lineHeight: 1.3, marginBottom: 3, wordBreak: 'keep-all' }}>{e}</div>
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
