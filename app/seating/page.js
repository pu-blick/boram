'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '../../components/AuthProvider';
import { getSeatingData, saveSeatingData } from '../../lib/firebase';

// ─── XLSX dynamic import ───
let XLSX = null;
async function loadXLSX() {
    if (!XLSX) XLSX = await import('xlsx');
    return XLSX;
}

export default function SeatingPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>;
    if (!user) return null;
    if (role === 'pending') { router.push('/'); return null; }

    return (
        <>
            <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js" strategy="afterInteractive" />
            <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css" />
            <style>{`
                :root { font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; }
                body { background: #f1f5f9; min-height: 100vh; width: 100vw; overflow-x: hidden; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
                .font-sans { font-family: "Pretendard Variable", Pretendard, sans-serif !important; }
                textarea::-webkit-scrollbar-button, div::-webkit-scrollbar-button { display: none; }
                .liquid-glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 1); box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05); }
                .reveal-anim { animation: reveal-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                @keyframes reveal-pop { from { transform: translateY(15px) scale(0.85); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                .capture-mode { background: #f8f5f2 !important; width: 1400px !important; height: auto !important; min-height: 1000px !important; padding: 100px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; border-radius: 0 !important; }
                .capture-mode .no-print { display: none !important; }
                .capture-mode .excluded-seat { opacity: 0 !important; border: none !important; background: transparent !important; box-shadow: none !important; }
                .capture-mode [class*="aspect-"] { aspect-ratio: 5/3 !important; }
                .capture-mode > h2 { font-size: 2.8rem !important; }
                .capture-mode .capture-bb { margin-bottom: 40px !important; margin-top: 10px !important; }
                .capture-mode .capture-text-id { font-size: 20px !important; line-height: 1.2 !important; }
                .capture-mode .capture-text-name { font-size: 26px !important; line-height: 1.2 !important; }
                .capture-mode .capture-seat-content > * { margin-top: 0 !important; }
                .capture-mode .capture-seat-content { overflow: visible !important; }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(calc(95vh + 20px)) rotate(720deg); opacity: 0; } }
            `}</style>
            <SeatingApp uid={user.uid} />
        </>
    );
}

// ─── Lucide-style Icons ───
function SvgIcon({ children, className = '', ...props }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>{children}</svg>;
}
function Shuffle(p) { return <SvgIcon {...p}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></SvgIcon>; }
function Printer(p) { return <SvgIcon {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></SvgIcon>; }
function LayoutGrid(p) { return <SvgIcon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></SvgIcon>; }
function Loader2(p) { return <SvgIcon {...p}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></SvgIcon>; }
function Disc(p) { return <SvgIcon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></SvgIcon>; }
function Eye(p) { return <SvgIcon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></SvgIcon>; }
function EyeOff(p) { return <SvgIcon {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></SvgIcon>; }
function Users(p) { return <SvgIcon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>; }
function Lock(p) { return <SvgIcon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></SvgIcon>; }
function ChevronUp(p) { return <SvgIcon {...p}><polyline points="18 15 12 9 6 15"/></SvgIcon>; }
function ChevronDown(p) { return <SvgIcon {...p}><polyline points="6 9 12 15 18 9"/></SvgIcon>; }
function Download(p) { return <SvgIcon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></SvgIcon>; }
function FileUp(p) { return <SvgIcon {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></SvgIcon>; }
function X(p) { return <SvgIcon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></SvgIcon>; }
function MousePointer2(p) { return <SvgIcon {...p}><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></SvgIcon>; }
function RefreshCw(p) { return <SvgIcon {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></SvgIcon>; }
function Award(p) { return <SvgIcon {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></SvgIcon>; }
function Type(p) { return <SvgIcon {...p}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></SvgIcon>; }
function Plus(p) { return <SvgIcon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></SvgIcon>; }
function Sparkles(p) { return <SvgIcon {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></SvgIcon>; }
function Wand2(p) { return <SvgIcon {...p}><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></SvgIcon>; }
function Minus(p) { return <SvgIcon {...p}><line x1="5" y1="12" x2="19" y2="12"/></SvgIcon>; }

// ─── Main App (identical structure to original App.tsx) ───
function SeatingApp({ uid }) {
    const router = useRouter();
    const initialStudents = [];

    const [students, setStudents] = useState(initialStudents);
    const [config, setConfig] = useState({ rows: 5, cols: 6 });
    const [seatingPlan, setSeatingPlan] = useState([]);
    const [isAllRevealed, setIsAllRevealed] = useState(false);
    const [isExcludeMode, setIsExcludeMode] = useState(false);
    const [isTeacherView, setIsTeacherView] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [title, setTitle] = useState("우리 반 자리 배치");
    const [showRoulette, setShowRoulette] = useState(false);
    const [isSecretMode, setIsSecretMode] = useState(false);
    const [selectedSecretStudent, setSelectedSecretStudent] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const logoClickCountRef = useRef(0);
    const logoClickTimerRef = useRef(null);
    const printRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Load from Firebase
    useEffect(() => {
        getSeatingData(uid).then(data => {
            if (data) {
                if (data.students) setStudents(data.students);
                if (data.config) setConfig(data.config);
                if (data.title) setTitle(data.title);
                if (data.seatingPlan) setSeatingPlan(data.seatingPlan);
                if (data.isSecretMode) setIsSecretMode(data.isSecretMode);
            }
            setDataLoaded(true);
        });
    }, [uid]);

    // Init seating plan on config change
    useEffect(() => {
        if (!dataLoaded) return;
        const totalSeats = config.rows * config.cols;
        if (seatingPlan.length !== totalSeats) {
            const newPlan = Array.from({ length: totalSeats }, (_, i) => ({
                id: i, student: null, isRevealed: false, isExcluded: false, pinnedStudentId: null,
            }));
            setSeatingPlan(newPlan);
            setIsAllRevealed(false);
        }
    }, [config, dataLoaded]);

    // Auto-save (debounced)
    useEffect(() => {
        if (!dataLoaded) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveSeatingData(uid, { students, config, title, seatingPlan, isSecretMode });
        }, 1500);
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [students, config, title, seatingPlan, isSecretMode, uid, dataLoaded]);

    const handleLogoClick = () => {
        logoClickCountRef.current += 1;
        if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);
        logoClickTimerRef.current = setTimeout(() => { logoClickCountRef.current = 0; }, 2000);
        if (logoClickCountRef.current >= 5) {
            logoClickCountRef.current = 0;
            if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current);
            setIsSecretMode(prev => !prev);
            setSelectedSecretStudent(null);
        }
    };

    const handleShuffle = useCallback(() => {
        if (students.length === 0) { alert("학생 명단을 먼저 입력해주세요!"); return; }
        const availableSeats = seatingPlan.filter(s => !s.isExcluded).length;
        if (students.length > availableSeats) { alert(`자리가 부족합니다!\n현재 학생 수: ${students.length}명\n사용 가능한 자리: ${availableSeats}석`); return; }
        setIsShuffling(true);
        setTimeout(() => {
            const studentMap = new Map(students.map(s => [s.id, s]));
            const pinnedStudentIds = new Set(seatingPlan.filter(s => !s.isExcluded && s.pinnedStudentId && studentMap.has(s.pinnedStudentId)).map(s => s.pinnedStudentId));
            const remainingStudents = [...students].filter(s => !pinnedStudentIds.has(s.id)).sort(() => Math.random() - 0.5);
            let remainingIndex = 0;
            const newPlan = seatingPlan.map(seat => {
                if (seat.isExcluded) return { ...seat, student: null, isRevealed: false };
                if (seat.pinnedStudentId && studentMap.has(seat.pinnedStudentId)) return { ...seat, student: studentMap.get(seat.pinnedStudentId), isRevealed: false };
                const student = remainingStudents[remainingIndex] || null;
                remainingIndex++;
                return { ...seat, student, isRevealed: false };
            });
            setSeatingPlan(newPlan);
            setIsAllRevealed(false);
            setIsShuffling(false);
        }, 1200);
    }, [students, seatingPlan]);

    const handleSeatClick = (index) => {
        if (isExcludeMode) {
            setSeatingPlan(prev => prev.map((seat, i) => i === index ? { ...seat, isExcluded: !seat.isExcluded, student: null } : seat));
        } else if (isSecretMode) {
            if (seatingPlan[index]?.isExcluded) return;
            if (selectedSecretStudent) {
                setSeatingPlan(prev => prev.map((seat, i) => {
                    if (i === index) { const newPin = seat.pinnedStudentId === selectedSecretStudent.id ? null : selectedSecretStudent.id; return { ...seat, pinnedStudentId: newPin }; }
                    if (seat.pinnedStudentId === selectedSecretStudent.id) return { ...seat, pinnedStudentId: null };
                    return seat;
                }));
            } else {
                setSeatingPlan(prev => prev.map((seat, i) => i === index ? { ...seat, pinnedStudentId: null } : seat));
            }
        } else {
            setSeatingPlan(prev => {
                const newPlan = [...prev];
                if (newPlan[index].student) newPlan[index] = { ...newPlan[index], isRevealed: !newPlan[index].isRevealed };
                return newPlan;
            });
        }
    };

    const doCapture = async () => {
        setTimeout(async () => {
            try {
                const target = printRef.current;
                target.classList.add('capture-mode');
                // Set explicit height on seats (html-to-image ignores aspect-ratio)
                const seatDivs = target.querySelectorAll('[class*="aspect-"]');
                seatDivs.forEach(el => {
                    const w = el.offsetWidth;
                    el.style.setProperty('height', Math.round(w * 0.6) + 'px', 'important');
                });
                await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
                const dataUrl = await window.htmlToImage.toPng(target, { backgroundColor: '#f8f5f2', pixelRatio: 3 });
                seatDivs.forEach(el => el.style.removeProperty('height'));
                target.classList.remove('capture-mode');
                const link = document.createElement('a');
                link.download = `${title || '자리배치'}_${new Date().toLocaleDateString()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error(err);
                alert('이미지 저장 중 오류가 발생했습니다.');
                if (printRef.current) printRef.current.classList.remove('capture-mode');
            }
        }, 200);
    };

    const handleExportImage = () => {
        if (!printRef.current) return;
        if (!isAllRevealed) {
            setShowConfirm(true);
            return;
        }
        doCapture();
    };

    const handleConfirmExport = () => {
        setSeatingPlan(prev => prev.map(s => ({ ...s, isRevealed: true })));
        setIsAllRevealed(true);
        setShowConfirm(false);
        setTimeout(doCapture, 200);
    };

    const handleRevealAll = () => {
        const nextState = !isAllRevealed;
        setSeatingPlan(prev => prev.map(s => ({ ...s, isRevealed: nextState })));
        setIsAllRevealed(nextState);
    };

    const BlackboardComp = ({ isBottom = false }) => (
        <div className={`capture-bb w-full max-w-4xl h-10 sm:h-14 bg-[#0a2e1f] rounded-lg sm:rounded-xl relative flex items-center justify-center border-[4px] sm:border-[8px] border-[#4e342e] shadow-xl shrink-0 overflow-hidden ${isBottom ? 'mt-4 sm:mt-[25px] lg:mt-[8px] mb-2 sm:mb-4 lg:mb-1' : 'mt-2 sm:mt-4 lg:mt-1 mb-4 sm:mb-[25px] lg:mb-[8px]'}`}>
            <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 flex space-x-1 sm:space-x-2">
                <div className="w-4 h-1.5 sm:w-6 sm:h-2.5 bg-white/30 rounded-full"></div>
                <div className="w-6 h-1.5 sm:w-8 sm:h-2.5 bg-yellow-200/30 rounded-full"></div>
            </div>
            <div className="text-white font-black text-sm sm:text-xl tracking-[0.3em] sm:tracking-[0.5em] z-10 drop-shadow-lg uppercase">Blackboard</div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
        </div>
    );

    if (!dataLoaded) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9' }}><div className="spinner"></div></div>;

    return (
        <div className="min-h-screen flex flex-col overflow-x-hidden text-slate-800 font-sans animate-fade-in">
            {/* Header - identical to original */}
            <header className="no-print shrink-0 px-4 sm:px-8 py-3 sm:py-5 flex flex-col sm:flex-row items-center justify-between border-b bg-white rounded-t-2xl shadow-sm z-10 gap-3 sm:gap-0">
                <div className="flex items-center gap-3 sm:gap-5 self-start sm:self-center">
                    <button onClick={() => router.push('/')} className="p-1.5 sm:p-2 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    </button>
                    <div onClick={handleLogoClick} className="p-1.5 sm:p-2.5 bg-indigo-600 rounded-lg sm:rounded-xl shadow-lg shadow-slate-200 cursor-pointer select-none shrink-0">
                        <LayoutGrid className="text-white w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg sm:text-2xl font-extrabold sm:font-black tracking-tight text-slate-900 leading-none" style={{ WebkitTextStroke: '0.5px' }}>자리배치 도우미</h1>
                            {isSecretMode && (
                                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-full">
                                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 시크릿
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Premium Class Manager</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                    <button onClick={() => setShowRoulette(true)} className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 bg-white text-amber-500 rounded-lg sm:rounded-xl hover:bg-amber-50 transition-all text-xs sm:text-sm font-medium sm:font-bold border border-slate-100 shadow-sm active:scale-95">
                        <Disc className="w-4 h-4 sm:w-6 sm:h-6 mr-1.5 sm:mr-2" /> <span className="whitespace-nowrap">룰렛 추첨</span>
                    </button>
                    <button onClick={handleExportImage} className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-6 py-2 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all text-xs sm:text-sm font-medium sm:font-bold shadow-sm active:scale-95">
                        <Printer className="w-4 h-4 sm:w-6 sm:h-6 mr-1.5 sm:mr-2" /> <span className="whitespace-nowrap">이미지 저장</span>
                    </button>
                    <button onClick={handleShuffle} disabled={isShuffling} className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-8 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 transition-all shadow-xl text-xs sm:text-sm font-medium sm:font-bold disabled:opacity-50 active:scale-95">
                        {isShuffling ? <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 mr-1.5 sm:mr-3 animate-spin" /> : <Shuffle className="w-4 h-4 sm:w-6 sm:h-6 mr-1.5 sm:mr-3" />}
                        <span className="whitespace-nowrap">배치 시작</span>
                    </button>
                </div>
            </header>

            {/* Main - identical to original */}
            <main className="seating-main flex-1 flex flex-col lg:flex-row p-3 sm:p-6 lg:p-3 gap-4 sm:gap-6 lg:gap-3">
                <aside className="seating-aside no-print w-full lg:w-72 flex flex-col shrink-0 gap-4 sm:gap-6 lg:gap-2">
                    {/* Settings */}
                    <section className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 lg:p-3 space-y-4 lg:space-y-2 shadow-sm">
                        <h2 className="text-[12px] sm:text-[14px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Settings</h2>
                        <ControlsComp config={config} setConfig={setConfig} title={title} setTitle={setTitle} />
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="space-y-2">
                                <label className="hidden sm:block text-[12px] font-black text-slate-300 uppercase tracking-widest">Operation Mode</label>
                                <div className="grid grid-cols-2 bg-slate-50 p-1 rounded-lg sm:rounded-xl border border-slate-200">
                                    <button onClick={() => setIsExcludeMode(false)} className={`flex items-center justify-center py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[14px] font-bold transition-all ${!isExcludeMode ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400'}`}>배치 모드</button>
                                    <button onClick={() => setIsExcludeMode(true)} className={`flex items-center justify-center py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[14px] font-bold transition-all ${isExcludeMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>제외 모드</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="hidden sm:block text-[12px] font-black text-slate-300 uppercase tracking-widest">View Option</label>
                                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                                    <button onClick={() => setIsTeacherView(!isTeacherView)} className="flex items-center justify-center sm:justify-between px-3 sm:px-4 py-2 sm:py-3 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-[12px] sm:text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm group">
                                        <div className="flex items-center"><Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-slate-300 group-hover:text-indigo-600" />{isTeacherView ? "교사 시점" : "학생 시점"}</div>
                                        <span className="hidden sm:inline text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-400 font-black tracking-tighter">{isTeacherView ? "REAR" : "FRONT"}</span>
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleRevealAll} className="flex items-center justify-center px-3 py-2 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[12px] sm:text-[14px] font-bold text-slate-700 hover:bg-slate-100 transition-all shadow-sm group">
                                            {isAllRevealed ? <><EyeOff className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 text-slate-400" /> <span className="whitespace-nowrap">가리기</span></> : <><Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 text-indigo-600" /> <span className="whitespace-nowrap">결과 공개</span></>}
                                        </button>
                                        <button onClick={handleShuffle} disabled={isShuffling} className="flex items-center justify-center px-3 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-[12px] sm:text-[14px] font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 active:scale-95">
                                            {isShuffling ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" />} <span className="whitespace-nowrap">배치 시작</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Secret Pin Mode */}
                    {isSecretMode && (
                        <section className="bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-sm">
                            <h2 className="text-[12px] sm:text-[14px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5"><Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Secret Pin Mode</h2>
                            <p className="text-[10px] sm:text-[11px] text-amber-700 mb-2">학생 선택 후 자리 클릭 → 핀 고정</p>
                            <div className="space-y-1 max-h-44 overflow-y-auto">
                                {students.map(student => {
                                    const isPinned = seatingPlan.some(s => s.pinnedStudentId === student.id);
                                    return (
                                        <button key={student.id} onClick={() => setSelectedSecretStudent(prev => prev?.id === student.id ? null : student)}
                                            className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-medium transition-all flex items-center justify-between ${selectedSecretStudent?.id === student.id ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-amber-100 border border-amber-100'}`}>
                                            <span>{student.name}</span>
                                            {isPinned && <Lock className="w-2.5 h-2.5 shrink-0 opacity-60" />}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedSecretStudent && <p className="mt-2 text-[10px] text-amber-700 font-bold">✓ {selectedSecretStudent.name} 선택됨</p>}
                        </section>
                    )}

                    {/* Student List */}
                    <section className="bg-white rounded-xl sm:rounded-2xl flex-1 flex flex-col min-h-0 border border-slate-200 p-4 sm:p-5 lg:p-3 shadow-sm">
                        <h2 className="hidden sm:block text-[14px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Student List</h2>
                        <StudentInputComp students={students} setStudents={setStudents} onRevealAll={handleRevealAll} onShuffle={handleShuffle} />
                    </section>
                </aside>

                {/* Grid */}
                <div className="seating-grid-wrap flex-1 flex flex-col min-h-[500px] lg:min-h-0 rounded-xl sm:rounded-2xl bg-[#f8f5f2] shadow-xl shadow-slate-200/50 border border-slate-200">
                    <div className="flex-1 overflow-auto p-4 sm:p-8 lg:p-4 flex flex-col items-center justify-center">
                        <div ref={printRef} className="w-full h-full flex flex-col items-center justify-center bg-[#f8f5f2] rounded-xl py-4 lg:py-1">
                            <h2 className="text-xl sm:text-[2.2rem] lg:text-[1.8rem] font-black text-slate-900 mb-3 sm:mb-[15px] lg:mb-2 mt-0 lg:mt-2 shrink-0 tracking-tight text-center px-4" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 900 }}>{title}</h2>
                            {!isTeacherView && <BlackboardComp />}
                            <div className="flex-1 w-full flex items-center justify-center min-h-0 px-2 sm:px-4 py-2">
                                <SeatingGridComp config={config} seatingPlan={seatingPlan} onSeatClick={handleSeatClick} isExcludeMode={isExcludeMode} isTeacherView={isTeacherView} isShuffling={isShuffling} isSecretMode={isSecretMode} />
                            </div>
                            {isTeacherView && <BlackboardComp isBottom={true} />}
                            <div className="h-4 sm:h-6 w-full" />
                        </div>
                    </div>
                </div>
            </main>

            {showRoulette && <RouletteComp onClose={() => setShowRoulette(false)} students={students} />}

            {showConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mx-4 max-w-sm w-full text-center animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="w-14 h-14 mx-auto mb-5 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Printer className="w-7 h-7 text-indigo-600" />
                        </div>
                        <p className="text-[15px] sm:text-base font-bold text-slate-800 mb-6 leading-relaxed">모든 이름을 공개한 상태로<br/>이미지를 저장할까요?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95">취소</button>
                            <button onClick={handleConfirmExport} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Controls (identical to original) ───
function ControlsComp({ config, setConfig, title, setTitle }) {
    const clamp = (v) => Math.max(1, Math.min(10, v));
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 tracking-tight">배치표 이름</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-indigo-500 outline-none text-sm font-bold transition-all shadow-inner placeholder:text-slate-300" placeholder="예: 우리 반 자리 배치" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <StepperComp label="가로 칸" value={config.cols} onChange={v => setConfig(prev => ({ ...prev, cols: clamp(v) }))} />
                <StepperComp label="세로 줄" value={config.rows} onChange={v => setConfig(prev => ({ ...prev, rows: clamp(v) }))} />
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mb-1">Current Capacity</p>
                <p className="text-lg font-black text-slate-700">총 <span className="text-indigo-600 font-black">{config.rows * config.cols}</span>석 <span className="text-slate-300 font-normal">/</span> {config.cols}x{config.rows}</p>
            </div>
        </div>
    );
}

function StepperComp({ label, value, onChange }) {
    const clamp = (v) => Math.max(1, Math.min(10, v));
    const [draft, setDraft] = useState(String(value));
    const [focused, setFocused] = useState(false);
    useEffect(() => { if (!focused) setDraft(String(value)); }, [value, focused]);
    const displayed = focused ? draft : String(value);
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 tracking-tight">{label}</label>
            <div className="flex items-stretch bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                <input type="text" inputMode="numeric" value={displayed}
                    onFocus={() => { setFocused(true); setDraft(String(value)); }}
                    onChange={e => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={() => { setFocused(false); const p = parseInt(draft); onChange(isNaN(p) ? 1 : clamp(p)); }}
                    className="flex-1 min-w-0 px-4 py-3 bg-transparent text-sm font-bold outline-none text-center" />
                <div className="flex flex-col border-l border-slate-200">
                    <button onClick={() => onChange(clamp(value + 1))} className="flex-1 px-2.5 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition-colors"><ChevronUp className="w-3.5 h-3.5 text-slate-400" /></button>
                    <div className="border-t border-slate-200" />
                    <button onClick={() => onChange(clamp(value - 1))} className="flex-1 px-2.5 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 transition-colors"><ChevronDown className="w-3.5 h-3.5 text-slate-400" /></button>
                </div>
            </div>
        </div>
    );
}

// ─── StudentInput (identical to original) ───
function StudentInputComp({ students, setStudents, onRevealAll, onShuffle }) {
    const fileInputRef = useRef(null);
    const downloadTemplate = async () => {
        const xlsx = await loadXLSX();
        const data = [["학번", "이름"], ["10101", "김철수"], ["10102", "이영희"]];
        const ws = xlsx.utils.aoa_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "명단양식");
        xlsx.writeFile(wb, "학생명단_양식.xlsx");
    };
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const xlsx = await loadXLSX();
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
                const newStudents = data.slice(1).filter(row => row && row[1]).map((row, index) => ({
                    id: `ex-${row[0] || index}-${Date.now()}`, name: `${row[0] ? `(${row[0]}) ` : ''}${row[1]}`.trim()
                }));
                if (newStudents.length > 0) setStudents(newStudents);
            } catch { alert("파일을 불러오는 중 오류가 발생했습니다."); }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };
    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 sm:gap-3 mb-4 sm:mb-6">
                <button onClick={downloadTemplate} className="flex items-center justify-center px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-[12px] sm:text-[15px] font-black text-slate-500 uppercase active:scale-95 shadow-sm">
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-[#1a4d2e]" /> 양식 받기
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center px-4 py-2.5 sm:py-3 bg-[#1a4d2e] text-white rounded-xl hover:bg-[#143a23] transition-all text-[12px] sm:text-[15px] font-black uppercase active:scale-95 shadow-md">
                    <FileUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" /> 명단 업로드
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            </div>
            <div className="mt-auto lg:mt-2 pt-4 lg:pt-0 pb-1 lg:pb-0 border-t border-slate-50 flex items-center justify-center gap-3">
                {onRevealAll && <button onClick={onRevealAll} className="sm:hidden w-9 h-9 flex items-center justify-center bg-slate-100 border border-slate-200 rounded-full active:scale-95 transition-all shadow-sm"><Eye className="w-4 h-4 text-indigo-600" /></button>}
                <div className="bg-slate-50/80 px-4 py-2 rounded-full flex items-center shadow-inner border border-slate-100">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mr-3 whitespace-nowrap">Registered</span>
                    <span className="text-[14px] sm:text-[16px] font-black text-[#1a4d2e]">{students.length}명</span>
                </div>
                {onShuffle && <button onClick={onShuffle} className="sm:hidden w-9 h-9 flex items-center justify-center bg-indigo-600 rounded-full active:scale-95 transition-all shadow-md"><Shuffle className="w-4 h-4 text-white" /></button>}
            </div>
        </div>
    );
}

// ─── SeatingGrid (identical to original) ───
function SeatingGridComp({ config, seatingPlan, onSeatClick, isExcludeMode, isTeacherView, isShuffling, isSecretMode }) {
    const renderGrid = () => {
        const rows = [];
        for (let r = 0; r < config.rows; r++) {
            let rowSeats = seatingPlan.slice(r * config.cols, (r + 1) * config.cols);
            if (isTeacherView) rowSeats = [...rowSeats].reverse();
            rows.push(rowSeats);
        }
        const displayRows = isTeacherView ? [...rows].reverse() : rows;
        return (
            <div className="grid gap-1.5 sm:gap-5 lg:gap-2 w-full max-w-full place-items-center" style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}>
                {displayRows.flat().map((seat) => {
                    if (!seat) return null;
                    const actualIndex = seatingPlan.findIndex(s => s.id === seat.id);
                    const studentInfo = seat.student?.name || "";
                    const idMatch = studentInfo.match(/^\((.*?)\)\s*(.*)$/);
                    const studentId = idMatch ? idMatch[1] : null;
                    const studentName = idMatch ? idMatch[2] : studentInfo;
                    const isExcluded = seat.isExcluded;
                    return (
                        <div key={seat.id} onClick={() => onSeatClick(actualIndex)}
                            className={`relative rounded-lg sm:rounded-xl border-[2px] sm:border-[3px] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform w-full
                                ${isExcluded ? 'excluded-seat' : ''}
                                ${isShuffling ? 'animate-pulse scale-95 opacity-60' : 'hover:scale-105 active:scale-95'}
                                ${seat.isRevealed ? 'bg-[#fcfaf7] border-[#8d6e63] shadow-lg reveal-anim z-10' : 'bg-[#f0edea] border-slate-200 hover:border-slate-300 shadow-sm'}
                                ${isExcluded ? isExcludeMode ? 'opacity-30 bg-slate-100 border-dashed border-slate-300 pointer-events-auto' : 'opacity-0 pointer-events-none' : ''}
                                aspect-[4/3] lg:aspect-[2/1] min-h-[50px]`}>
                            {!isExcluded && <div className={`absolute top-0 left-0 right-0 h-1.5 sm:h-3 rounded-t-lg opacity-90 ${seat.isRevealed ? 'bg-[#5d4037]' : 'bg-slate-300'}`}></div>}
                            {isExcluded ? (
                                <div className="flex items-center justify-center"><X className="w-4 h-4 sm:w-8 sm:h-8 text-slate-300" /></div>
                            ) : seat.isRevealed ? (
                                <div className="capture-seat-content flex flex-col items-center justify-center w-full h-full p-0.5 sm:p-4 text-center space-y-0 sm:space-y-0.5 overflow-hidden">
                                    {studentId && <span className="capture-text-id font-medium text-black text-[9px] sm:text-sm lg:text-base leading-tight">{studentId}</span>}
                                    <span className="capture-text-name font-black text-slate-900 text-[10px] sm:text-base lg:text-[24px] leading-tight truncate w-full px-0.5">{studentName}</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center opacity-40">
                                    <span className="text-[11px] sm:text-sm font-black text-slate-400">{actualIndex + 1}</span>
                                    {seat.student && <MousePointer2 className="w-3 h-3 sm:w-5 sm:h-5 mt-1 sm:mt-2 text-slate-300 animate-bounce" />}
                                </div>
                            )}
                            {isSecretMode && seat.pinnedStudentId && !isExcluded && (
                                <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-amber-400 rounded-full p-0.5 shadow-md z-20"><Lock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" /></div>
                            )}
                            {!isExcluded && <div className={`absolute bottom-0 left-0 right-0 h-1 sm:h-2 rounded-b-lg transition-colors ${seat.isRevealed ? 'bg-[#3e2723]' : 'bg-slate-200'}`}></div>}
                        </div>
                    );
                })}
            </div>
        );
    };
    return <div className="w-full flex justify-center items-center py-4 px-2"><div className="w-full max-w-7xl">{renderGrid()}</div></div>;
}

// ─── Roulette (identical to original) ───
const WHEEL_SPIN_DURATION = 8000;
const WHEEL_COLORS = [
    { bg: '#fce4ec', text: '#880e4f' }, { bg: '#fff9c4', text: '#f57f17' },
    { bg: '#e0f7fa', text: '#006064' }, { bg: '#f3e5f5', text: '#6a1b9a' },
    { bg: '#e0f2f1', text: '#004d40' }, { bg: '#fff3e0', text: '#e65100' },
    { bg: '#ede7f6', text: '#4527a0' }, { bg: '#f1f8e9', text: '#33691e' },
];
const CONFETTI_COLORS = ['#f472b6', '#facc15', '#60a5fa', '#a78bfa', '#34d399', '#fb923c', '#c084fc', '#4ade80'];

function RouletteComp({ onClose, students }) {
    const [items, setItems] = useState([]);
    const [subject, setSubject] = useState("오늘의 주인공 추첨");
    const [winnerCount, setWinnerCount] = useState(1);
    const [newItemText, setNewItemText] = useState("");
    const [isSpinning, setIsSpinning] = useState(false);
    const [winners, setWinners] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(0);
    const currentAngleRef = useRef(0);

    useEffect(() => { setIsMobile(window.innerWidth < 640); }, []);
    useEffect(() => { const h = () => setIsMobile(window.innerWidth < 640); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
    useEffect(() => { if (students.length > 0 && items.length === 0) setItems(students.map(s => ({ id: s.id, text: s.name }))); }, [students]);
    useEffect(() => () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }, []);

    const canvasSize = isMobile ? 280 : 400;
    const confettiPieces = useMemo(() => Array.from({ length: 15 }, (_, i) => ({ id: i, left: Math.random() * 100, delay: Math.random() * 2, duration: 2 + Math.random() * 2, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], size: 6 + Math.random() * 8, rotation: Math.random() * 360 })), []);

    function calcFontSize(n) { const b = isMobile ? 11 : 15; if (n <= 6) return b; if (n <= 12) return Math.max(b - 2, 9); if (n <= 20) return Math.max(b - 4, 8); return Math.max(b - 6, 7); }
    function truncText(ctx, text, maxW) { if (ctx.measureText(text).width <= maxW) return text; let t = text; while (t.length > 1 && ctx.measureText(t + '..').width > maxW) t = t.slice(0, -1); return t + '..'; }

    const drawWheel = useCallback((rot) => {
        const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
        const dpr = window.devicePixelRatio || 1, size = canvasSize;
        c.width = size * dpr; c.height = size * dpr; c.style.width = `${size}px`; c.style.height = `${size}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const ctr = size / 2, r = ctr - 6, n = items.length;
        ctx.clearRect(0, 0, size, size);
        ctx.save(); ctx.beginPath(); ctx.arc(ctr, ctr, r + 3, 0, Math.PI * 2); ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4; ctx.fillStyle = '#d97706'; ctx.fill(); ctx.restore();
        if (n === 0) { ctx.beginPath(); ctx.arc(ctr, ctr, r, 0, Math.PI * 2); ctx.fillStyle = '#f8f8f8'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#94a3b8'; ctx.font = `bold ${isMobile ? 13 : 17}px 'Noto Sans KR', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('항목을 추가해주세요', ctr, ctr); ctx.beginPath(); ctx.arc(ctr, ctr, 14, 0, Math.PI * 2); ctx.fillStyle = '#d97706'; ctx.fill(); ctx.beginPath(); ctx.arc(ctr, ctr, 8, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); return; }
        const sa = (Math.PI * 2) / n;
        for (let i = 0; i < n; i++) { const a = rot + i * sa, e = a + sa, cl = WHEEL_COLORS[i % WHEEL_COLORS.length]; ctx.beginPath(); ctx.moveTo(ctr, ctr); ctx.arc(ctr, ctr, r, a, e); ctx.closePath(); ctx.fillStyle = cl.bg; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
        const fs = calcFontSize(n);
        for (let i = 0; i < n; i++) { const a = rot + i * sa, cl = WHEEL_COLORS[i % WHEEL_COLORS.length]; ctx.save(); ctx.translate(ctr, ctr); ctx.rotate(a + sa / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cl.text; ctx.font = `bold ${fs}px 'Noto Sans KR', sans-serif`; ctx.fillText(truncText(ctx, items[i].text, r * 0.5), r * 0.62, 0); ctx.restore(); }
        ctx.beginPath(); ctx.arc(ctr, ctr, r, 0, Math.PI * 2); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 5; ctx.stroke();
        ctx.beginPath(); ctx.arc(ctr, ctr, r - 2, 0, Math.PI * 2); ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1; ctx.stroke();
        for (let i = 0; i < n; i++) { const a = rot + i * sa; ctx.beginPath(); ctx.moveTo(ctr + Math.cos(a) * (r - 12), ctr + Math.sin(a) * (r - 12)); ctx.lineTo(ctr + Math.cos(a) * r, ctr + Math.sin(a) * r); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke(); }
        const dc = Math.max(n * 2, 16); for (let i = 0; i < dc; i++) { const a = (Math.PI * 2 / dc) * i; ctx.beginPath(); ctx.arc(ctr + Math.cos(a) * (r + 0.5), ctr + Math.sin(a) * (r + 0.5), 2.5, 0, Math.PI * 2); ctx.fillStyle = i % 2 === 0 ? '#fef2f2' : '#fecaca'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(ctr, ctr, isMobile ? 16 : 22, 0, Math.PI * 2); ctx.fillStyle = '#d97706'; ctx.fill(); ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(ctr, ctr, isMobile ? 9 : 12, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    }, [items, isMobile, canvasSize]);

    useEffect(() => { drawWheel(currentAngleRef.current); }, [drawWheel]);
    useEffect(() => { document.fonts.ready.then(() => drawWheel(currentAngleRef.current)); }, [drawWheel]);

    const spinWheel = useCallback((wi, onDone) => {
        const n = items.length; if (n === 0) return;
        const sa = (Math.PI * 2) / n, bt = -Math.PI / 2 - wi * sa - sa / 2, j = (Math.random() - 0.5) * sa * 0.6, tgt = bt + j;
        const ext = 8 + Math.random() * 4, totalRot = tgt - currentAngleRef.current - ext * Math.PI * 2;
        const startA = currentAngleRef.current, startT = performance.now(); let rev = false;
        const anim = (t) => {
            const el = t - startT, p = Math.min(el / WHEEL_SPIN_DURATION, 1), ea = 1 - Math.pow(1 - p, 3);
            const cur = startA + totalRot * ea; currentAngleRef.current = cur; drawWheel(cur);
            if (p >= 0.75 && !rev) { rev = true; onDone(); }
            if (p < 1) animationRef.current = requestAnimationFrame(anim);
            else { currentAngleRef.current = (startA + totalRot) % (Math.PI * 2); drawWheel(currentAngleRef.current); }
        };
        animationRef.current = requestAnimationFrame(anim);
    }, [items, drawWheel]);

    const startSpin = () => {
        if (isSpinning || items.length < winnerCount) { if (items.length < winnerCount) alert(`참여 항목 수(${items.length})가 당첨 인원(${winnerCount})보다 적습니다.`); return; }
        const shuffled = [...items].sort(() => Math.random() - 0.5), allW = shuffled.slice(0, winnerCount);
        setWinners([]); setIsSpinning(true);
        const wi = items.findIndex(i => i.id === allW[0].id);
        spinWheel(wi, () => { setWinners(allW); setIsSpinning(false); const a = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); a.volume = 0.2; a.play().catch(() => {}); });
    };

    const dlTemplate = async () => { const x = await loadXLSX(); const d = [["학번", "이름"], ["10101", "김철수"], ["10102", "이영희"]]; const ws = x.utils.aoa_to_sheet(d); const wb = x.utils.book_new(); x.utils.book_append_sheet(wb, ws, "명단양식"); x.writeFile(wb, "룰렛_추첨_양식.xlsx"); };
    const handleFU = async (e) => { const f = e.target.files?.[0]; if (!f) return; const x = await loadXLSX(); const rd = new FileReader(); rd.onload = (ev) => { try { const wb = x.read(ev.target?.result, { type: 'binary' }); const ws = wb.Sheets[wb.SheetNames[0]]; const d = x.utils.sheet_to_json(ws, { header: 1 }); const ni = d.slice(1).filter(r => r && r[1]).map((r, i) => ({ id: `r-${r[0] || i}-${Date.now()}`, text: `${r[0] ? `(${r[0]}) ` : ''}${r[1]}`.trim() })); if (ni.length > 0) setItems(prev => [...prev, ...ni]); } catch { alert("파일을 읽는 도중 오류가 발생했습니다."); } if (fileInputRef.current) fileInputRef.current.value = ''; }; rd.readAsBinaryString(f); };
    const handleAdd = () => { if (!newItemText.trim()) return; setItems(prev => [...prev, { id: `manual-${Date.now()}`, text: newItemText.trim() }]); setNewItemText(""); };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 font-sans overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-6xl bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-10 animate-in fade-in zoom-in duration-300 max-h-[95vh] overflow-y-auto border border-slate-200">
                <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-6 p-1.5 sm:p-2 hover:bg-slate-100 rounded-full transition-all z-50"><X className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" /></button>
                {/* Left */}
                <div className="flex-[1.2] flex flex-col items-center justify-center space-y-2 sm:space-y-4">
                    <div className="text-center"><h2 className="text-2xl sm:text-5xl font-black tracking-tight mb-1 sm:mb-2" style={{ fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>행운의 룰렛</h2></div>
                    <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
                        <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '-10px' }}>
                            <svg width={isMobile ? 28 : 36} height={isMobile ? 34 : 44} viewBox="0 0 36 44"><defs><filter id="ps" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter></defs><polygon points="18,44 2,0 34,0" fill="#d97706" stroke="#92400e" strokeWidth="1.5" filter="url(#ps)" /><polygon points="18,36 8,6 28,6" fill="#f59e0b" /></svg>
                        </div>
                        <canvas ref={canvasRef} className="rounded-full" />
                    </div>
                    {isSpinning && <p className="text-amber-500 font-bold text-sm sm:text-lg animate-pulse">추첨 중...</p>}
                    <button onClick={startSpin} disabled={isSpinning || items.length < 1} className="w-full max-w-[280px] sm:max-w-[340px] py-3 sm:py-5 text-white rounded-xl shadow-lg transition-all font-black text-base sm:text-2xl tracking-widest disabled:opacity-30 active:scale-95 flex items-center justify-center uppercase" style={{ background: isSpinning ? '#d97706' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 20px rgba(220,38,38,0.35)' }}>
                        {isSpinning ? <RefreshCw className="w-5 h-5 sm:w-7 sm:h-7 animate-spin" /> : <><Sparkles className="w-5 h-5 sm:w-7 sm:h-7 mr-2 sm:mr-3" /> START</>}
                    </button>
                </div>
                {/* Right */}
                <div className="flex-1 flex flex-col space-y-3 sm:space-y-6 lg:shrink-0 lg:max-w-md">
                    <div className="space-y-3 sm:space-y-5">
                        <div className="space-y-1.5 sm:space-y-2.5"><div className="flex items-center space-x-2 sm:space-x-3 text-slate-500"><Type className="w-4 h-4 sm:w-5 sm:h-5" /><span className="text-[15px] sm:text-[18px] font-medium tracking-tight">주제</span></div><input type="text" value={subject} onChange={e => setSubject(e.target.value)} disabled={isSpinning} className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] sm:text-[18px] font-bold shadow-sm focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all placeholder:text-slate-300 disabled:opacity-50" /></div>
                        <div className="space-y-1.5 sm:space-y-2.5"><div className="flex items-center space-x-2 sm:space-x-3 text-slate-500"><Users className="w-4 h-4 sm:w-5 sm:h-5" /><span className="text-[15px] sm:text-[18px] font-medium tracking-tight">당첨 인원</span></div>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <button onClick={() => setWinnerCount(Math.max(1, winnerCount - 1))} disabled={isSpinning} className="px-4 sm:px-6 py-2.5 sm:py-3.5 hover:bg-slate-100 text-slate-500 transition-colors border-r border-slate-200 active:bg-slate-200 disabled:opacity-50"><Minus className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                                <input type="number" min="1" max={items.length || 1} value={winnerCount} readOnly className="flex-1 text-center bg-transparent text-[15px] sm:text-[18px] font-bold outline-none appearance-none cursor-default py-2.5 sm:py-3.5" style={{ MozAppearance: 'textfield' }} />
                                <button onClick={() => setWinnerCount(Math.min(items.length || 1, winnerCount + 1))} disabled={isSpinning} className="px-4 sm:px-6 py-2.5 sm:py-3.5 hover:bg-slate-100 text-slate-500 transition-colors border-l border-slate-200 active:bg-slate-200 disabled:opacity-50"><Plus className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                            </div>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2.5"><div className="flex items-center space-x-2 sm:space-x-3 text-slate-500"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /><span className="text-[15px] sm:text-[18px] font-medium tracking-tight">직접 추가</span></div>
                            <div className="flex gap-2"><input type="text" value={newItemText} onChange={e => setNewItemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} disabled={isSpinning} placeholder="항목명" className="flex-1 min-w-0 px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] sm:text-[18px] font-bold shadow-sm outline-none placeholder:text-slate-300 disabled:opacity-50" /><button onClick={handleAdd} disabled={isSpinning} className="px-3 sm:px-6 bg-amber-600 text-white rounded-xl font-black text-[14px] sm:text-[16px] hover:bg-amber-700 transition-all flex items-center justify-center shadow-md active:scale-95 group disabled:opacity-50 shrink-0 whitespace-nowrap"><Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 group-hover:rotate-90 transition-transform" /> 추가</button></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button onClick={dlTemplate} disabled={isSpinning} className="flex items-center justify-center py-2.5 sm:py-3.5 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 transition-all text-[14px] sm:text-[16px] font-bold text-slate-600 shadow-sm disabled:opacity-50"><Download className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-amber-500" /> 양식 받기</button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isSpinning} className="flex items-center justify-center py-2.5 sm:py-3.5 bg-white border border-slate-200 rounded-xl hover:bg-amber-50 transition-all text-[14px] sm:text-[16px] font-bold text-slate-600 shadow-sm disabled:opacity-50"><FileUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-amber-500" /> 파일 업로드</button>
                        <input type="file" ref={fileInputRef} onChange={handleFU} className="hidden" accept=".xlsx,.xls" />
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 border border-slate-200 rounded-xl min-h-[160px] sm:min-h-[200px]">
                        <div className="px-3 sm:px-5 py-2 sm:py-3 bg-white border-b border-slate-200 flex justify-between items-center shrink-0"><h4 className="text-[15px] sm:text-[18px] font-medium text-slate-500">참여 항목 ({items.length})</h4><button onClick={() => setItems([])} disabled={isSpinning} className="text-[12px] sm:text-[13px] font-bold text-amber-500 hover:text-amber-700 transition-colors disabled:opacity-50">전체 삭제</button></div>
                        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                            {items.map((item, idx) => (
                                <div key={item.id} className="bg-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-[13px] sm:text-[15px] font-bold text-slate-700 flex justify-between items-center group shadow-sm hover:shadow-md transition-all">
                                    <span className="truncate pr-2">{item.text}</span>
                                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={isSpinning} className="text-slate-300 hover:text-rose-500 transition-all hover:scale-110 disabled:opacity-0"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                            {items.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8 sm:py-10"><Users className="w-8 h-8 sm:w-10 sm:h-10 mb-2 opacity-20" /><p className="text-xs sm:text-sm font-bold opacity-40">항목을 추가해주세요</p></div>}
                        </div>
                    </div>
                </div>
                {/* Winner */}
                {winners.length > 0 && !isSpinning && (
                    <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-in fade-in duration-500 p-6 sm:p-12 text-center overflow-hidden rounded-2xl">
                        {confettiPieces.map(p => <div key={p.id} className="absolute pointer-events-none" style={{ left: `${p.left}%`, top: '-20px', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.size > 10 ? '50%' : '2px', transform: `rotate(${p.rotation}deg)`, animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in infinite`, willChange: 'transform' }} />)}
                        <Award className="w-16 h-16 sm:w-28 sm:h-28 text-amber-400 mb-4 sm:mb-8 animate-bounce" />
                        <div className="flex flex-col items-center space-y-4 sm:space-y-6 mb-8 sm:mb-14 w-full max-w-4xl overflow-hidden relative z-10">
                            <span className="text-xl sm:text-4xl font-bold text-slate-700 tracking-tight">{subject}</span>
                            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 py-3 sm:py-4 max-h-[45vh] overflow-y-auto w-full px-4">
                                {winners.map((win, idx) => { const oi = items.findIndex(it => it.id === win.id); const cl = WHEEL_COLORS[(oi >= 0 ? oi : idx) % WHEEL_COLORS.length]; return (
                                    <div key={win.id} className="animate-in zoom-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                        <h3 className={`${winners.length > 4 ? 'text-lg sm:text-3xl' : winners.length > 1 ? 'text-xl sm:text-5xl' : 'text-3xl sm:text-7xl'} font-black tracking-tighter px-6 sm:px-14 py-3 sm:py-7 rounded-2xl shadow-2xl border-b-4`} style={{ backgroundColor: cl.bg, color: cl.text, borderColor: cl.text + '33' }}>{win.text}</h3>
                                    </div>
                                ); })}
                            </div>
                        </div>
                        <button onClick={() => setWinners([])} className="relative z-10 px-14 sm:px-32 py-3 sm:py-6 bg-amber-600 text-white rounded-xl font-black text-lg sm:text-3xl hover:bg-amber-700 transition-all active:scale-95 shadow-xl">확인</button>
                    </div>
                )}
            </div>
        </div>
    );
}
