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
                    <li><a href="https://www.notion.so/305eaefe318280aab667e41088ac32af" target="_blank"><span className="material-symbols-rounded">gavel</span> 규정모음</a></li>
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
                    <h1>EduFlow</h1>
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
                            <div className="card-thumb"><img src="/규정모음.jpeg" alt="규정모음" /></div>
                            <span className="card-label">규정모음</span>
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
                    <a href="https://student-discipline-manager.netlify.app" target="_blank" className="circle-btn">
                        <img src="/공동체 관리대장.png" alt="공동체 관리대장" />
                    </a>
                </section>

                <CalendarSection />

                <section className="memo-section">
                    <div className="memo-header">
                        <div className="memo-title">
                            <span className="material-symbols-rounded">edit_note</span>
                            <h2>MEMO</h2>
                        </div>
                        <div className="alarm-ticker-header" id="alarmTickerHeader"></div>
                    </div>

                    <div className="postit">
                        <div className="postit-toolbar" onMouseDown={(e) => e.preventDefault()}>
                            <button className="postit-tool" onClick={() => window.insertCheckbox?.()} title="체크박스">
                                <span className="material-symbols-rounded">check_box</span>
                            </button>
                            <button className="postit-tool" onClick={() => window.toggleBold?.()} title="진하게">
                                <span className="material-symbols-rounded">format_bold</span>
                            </button>
                            <div className="color-picker-wrap">
                                <button className="postit-tool" onClick={() => window.toggleColorPicker?.()} title="글자 색상">
                                    <span className="material-symbols-rounded">palette</span>
                                </button>
                                <div className="color-picker-popup" id="colorPicker" onMouseDown={(e) => e.preventDefault()}>
                                    <button className="color-dot" style={{background:'#1a1a2e'}} onClick={() => window.applyColor?.('#1a1a2e')}></button>
                                    <button className="color-dot" style={{background:'#ef4444'}} onClick={() => window.applyColor?.('#ef4444')}></button>
                                    <button className="color-dot" style={{background:'#f59e0b'}} onClick={() => window.applyColor?.('#f59e0b')}></button>
                                    <button className="color-dot" style={{background:'#22c55e'}} onClick={() => window.applyColor?.('#22c55e')}></button>
                                    <button className="color-dot" style={{background:'#3b82f6'}} onClick={() => window.applyColor?.('#3b82f6')}></button>
                                    <button className="color-dot" style={{background:'#a855f7'}} onClick={() => window.applyColor?.('#a855f7')}></button>
                                    <button className="color-dot" style={{background:'#ec4899'}} onClick={() => window.applyColor?.('#ec4899')}></button>
                                </div>
                            </div>
                            <button className="postit-new-btn" onClick={() => window.newMemo?.()}>NEW</button>
                        </div>
                        <div className="postit-save-bar">
                            <input type="text" className="postit-title-input" id="memoTitleInput" placeholder="제목을 입력하세요" />
                            <button className="memo-save-btn" onClick={() => window.saveAsMemo?.()}>저장</button>
                        </div>
                        <div className="postit-body" id="memoPad" contentEditable="true" data-placeholder="자유롭게 메모하세요..." suppressContentEditableWarning={true}></div>
                    </div>

                    <div className="memo-search-bar">
                        <span className="material-symbols-rounded memo-search-icon">search</span>
                        <input type="text" id="memoSearch" placeholder="메모 검색..." onInput={() => window.searchMemos?.()} />
                    </div>

                    <div className="saved-memos" id="savedMemos"></div>
                </section>
            </main>

            <footer className="footer">
                <p>EduFlow</p>
            </footer>
        </>
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
