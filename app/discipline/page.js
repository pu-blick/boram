'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../components/AuthProvider';
import { auth } from '../../lib/firebase';
import { fetchAllStudentData, SHEET_IDS } from '../../lib/discipline';

const VIEW_ALL = 'ALL';
const VIEW_WARNING = 'WARNING';
const VIEW_COMMITTEE = 'COMMITTEE';

export default function DisciplinePage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    const [students, setStudents] = useState([]);
    const [loadedSheets, setLoadedSheets] = useState([]);
    const [viewMode, setViewMode] = useState(VIEW_ALL);
    const [loading, setLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(2);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    const handleFetchSheet = useCallback(async (grade) => {
        setIsSyncing(true);
        setLoading(true);
        setError(null);
        setSelectedGrade(grade);
        setSelectedClass(null);
        try {
            const { students: data, loadedSheets: sheets } = await fetchAllStudentData(grade);
            setStudents(data);
            setLoadedSheets(sheets);
            if (sheets.length === 0) setError('NOT_FOUND');
            else if (data.length === 0) setError('DATA_EMPTY');
        } catch (err) {
            console.error('Fetch Error:', err);
            setError('UNKNOWN');
        } finally {
            setIsSyncing(false);
            setLoading(false);
        }
    }, []);

    const allClasses = [...new Set(students.map(s => s.class))].sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''));
        const numB = parseInt(b.replace(/[^0-9]/g, ''));
        return numA - numB;
    });

    const filteredStudents = students.filter(s => {
        if (selectedClass && s.class !== selectedClass) return false;
        if (viewMode === VIEW_ALL) return true;
        if (viewMode === VIEW_WARNING) return s.records.some(r => r.session === 3);
        if (viewMode === VIEW_COMMITTEE) return s.records.some(r => r.session === 4);
        return true;
    });

    const handleDownloadCSV = () => {
        if (filteredStudents.length === 0) return;
        const headers = ['학번', '이름', '1회', '2회', '3회', '4회(1차선도)', '1회', '2회', '3회', '4회(2차선도)', '1회', '2회', '3회', '4회(3차선도)', '1회', '2회', '3회', '4회(4차선도)'];
        const rows = filteredStudents.map(s => {
            const rowData = new Array(18).fill('');
            rowData[0] = s.id;
            rowData[1] = s.name;
            s.records.forEach(r => {
                const colIndex = 2 + (r.cycle - 1) * 4 + (r.session - 1);
                if (colIndex < 18) rowData[colIndex] = r.date;
            });
            return rowData;
        });
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', viewMode === VIEW_WARNING ? `${selectedGrade}학년_주의대상_명단.csv` : viewMode === VIEW_COMMITTEE ? `${selectedGrade}학년_선도확정_명단.csv` : `${selectedGrade}학년_전체_명단.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTabActiveClass = (id) => {
        if (id === VIEW_ALL) return 'bg-slate-900 text-white shadow-lg';
        if (id === VIEW_WARNING) return 'bg-amber-500 text-white shadow-lg';
        if (id === VIEW_COMMITTEE) return 'bg-rose-600 text-white shadow-lg';
        return 'bg-slate-900 text-white';
    };

    if (authLoading) return null;
    if (!user) return null;

    return (
        <>
            <Script src="https://cdn.tailwindcss.com" strategy="afterInteractive" />
            <Script id="fa-css" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
                if (!document.querySelector('link[href*="font-awesome"]')) {
                    var l = document.createElement('link');
                    l.rel = 'stylesheet';
                    l.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
                    document.head.appendChild(l);
                }
            `}} />
            <style>{`
                .disc-glass { background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 8px 32px 0 rgba(31,38,135,0.05); }
                .disc-glass-dark { background: rgba(15,23,42,0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
                .disc-page { font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); min-height: 100vh; }
                .disc-page ::-webkit-scrollbar { width: 8px; height: 8px; }
                .disc-page ::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
                .disc-page ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="disc-page pb-20 overflow-x-hidden">
                {/* Header */}
                <header className="disc-glass-dark text-white p-4 md:p-6 shadow-2xl sticky top-0 z-[60] backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                        <div className="flex items-center space-x-3 md:space-x-4">
                            <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <i className="fa-solid fa-arrow-left text-white text-lg"></i>
                            </button>
                            <div className="bg-emerald-500 p-2 md:p-3 rounded-xl shadow-lg">
                                <i className="fa-solid fa-users-viewfinder text-xl md:text-2xl text-white"></i>
                            </div>
                            <div>
                                <h1 className="text-lg md:text-2xl font-black tracking-tight text-white text-nowrap">생활지도 통합 관리</h1>
                                <div className="flex items-center space-x-2 mt-0.5 md:mt-1">
                                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <p className="text-slate-400 text-[10px] md:text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">Student Life Management</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/10 shadow-inner overflow-hidden">
                                {[1, 2, 3].map(grade => {
                                    const locked = grade === 1 || grade === 3;
                                    return (
                                        <button key={grade} onClick={() => !locked && handleFetchSheet(grade)} disabled={locked}
                                            className={`relative px-3 md:px-6 py-1.5 md:py-2.5 rounded-lg text-[12px] md:text-[15px] font-bold transition-all ${locked ? 'text-slate-600 cursor-not-allowed opacity-50' : selectedGrade === grade ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
                                            {grade}학년
                                            {locked && <i className="fa-solid fa-lock absolute -top-1 -right-1 text-[8px] text-slate-500 bg-slate-700 rounded-full p-1"></i>}
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => handleFetchSheet(selectedGrade)} disabled={isSyncing}
                                className={`flex-1 md:flex-none flex items-center justify-center space-x-2 md:space-x-4 px-4 md:px-8 py-2.5 md:py-4 rounded-xl transition-all shadow-xl active:scale-95 border text-[14px] md:text-[18px] font-bold ${isSyncing ? 'bg-slate-700 text-slate-400 border-slate-600' : 'bg-white text-slate-900 border-white hover:bg-slate-100'}`}>
                                <i className={`fa-solid fa-arrows-rotate ${isSyncing ? 'animate-spin' : ''}`}></i>
                                <span className="whitespace-nowrap">조회</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-3 md:px-6 mt-6 md:mt-10 space-y-6 md:space-y-10">
                    {/* Class Filter */}
                    {(loadedSheets.length > 0 || isSyncing) && (
                        <div className="disc-glass py-3 md:py-6 px-3 md:px-6 rounded-2xl md:rounded-3xl border border-white/80 shadow-sm flex flex-col items-center gap-1.5 md:gap-2">
                            {isSyncing && loadedSheets.length === 0 ? (
                                <div className="flex items-center space-x-2 text-slate-400 font-bold text-xs md:text-sm animate-pulse py-2">
                                    <i className="fa-solid fa-spinner animate-spin text-emerald-500"></i>
                                    <span>동기화 중...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-center items-center gap-1.5 md:gap-2">
                                        {loadedSheets.slice(0, 5).map(s => (
                                            <button key={s} onClick={() => setSelectedClass(selectedClass === s ? null : s)}
                                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[11px] md:text-[13px] font-bold transition-all ${selectedClass === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    {loadedSheets.length > 5 && (
                                        <div className="flex justify-center items-center gap-1.5 md:gap-2">
                                            {loadedSheets.slice(5).map(s => (
                                                <button key={s} onClick={() => setSelectedClass(selectedClass === s ? null : s)}
                                                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[11px] md:text-[13px] font-bold transition-all ${selectedClass === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-300'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-2 md:gap-8">
                        {[
                            { title: '기록 학생', value: students.length, icon: 'fa-solid fa-user-group', color: 'bg-slate-800' },
                            { title: '주의 대상', value: students.filter(s => s.records.some(r => r.session === 3)).length, icon: 'fa-solid fa-triangle-exclamation', color: 'bg-amber-500' },
                            { title: '선도 확정', value: students.filter(s => s.records.some(r => r.session === 4)).length, icon: 'fa-solid fa-gavel', color: 'bg-rose-600' },
                        ].map(card => (
                            <div key={card.title} className="disc-glass p-3 md:p-6 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center md:items-center space-y-2 md:space-y-0 md:space-x-6 transition-all hover:translate-y-[-2px] hover:shadow-lg border border-white/60">
                                <div className={`${card.color} w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center text-white text-lg md:text-2xl shadow-lg shrink-0`}>
                                    <i className={card.icon}></i>
                                </div>
                                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                    <p className="text-[10px] md:text-[17px] font-medium text-slate-500 mb-0.5 tracking-tight leading-tight whitespace-nowrap">{card.title}</p>
                                    <div className="flex items-baseline space-x-0.5 md:space-x-1">
                                        <span className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter">{card.value}</span>
                                        <span className="text-[9px] md:text-sm font-bold text-slate-500">명</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* View Mode Tabs + Download */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl md:rounded-2xl border border-white/60 shadow-sm w-full lg:w-auto overflow-hidden">
                            {[
                                { id: VIEW_ALL, label: '전체보기', icon: 'fa-list' },
                                { id: VIEW_WARNING, label: '주의대상(3회)', icon: 'fa-bell' },
                                { id: VIEW_COMMITTEE, label: '선도확정(4회)', icon: 'fa-gavel' }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setViewMode(tab.id)}
                                    className={`flex-1 flex items-center justify-center space-x-1 md:space-x-2 px-3 md:px-8 py-2.5 md:py-3.5 rounded-lg md:rounded-xl text-[11px] md:text-[15px] font-bold transition-all whitespace-nowrap ${viewMode === tab.id ? getTabActiveClass(tab.id) : 'text-slate-500 hover:text-slate-800'}`}>
                                    <i className={`fa-solid ${tab.icon} hidden sm:inline text-[9px] md:text-[11px]`}></i>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                        {filteredStudents.length > 0 && (
                            <button onClick={handleDownloadCSV} className="w-full lg:w-auto flex items-center justify-center space-x-2 bg-emerald-600 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl text-[13px] md:text-[15px] font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 whitespace-nowrap">
                                <i className="fa-solid fa-file-excel text-base md:text-lg"></i>
                                <span>{selectedGrade}학년 엑셀 다운로드</span>
                            </button>
                        )}
                    </div>

                    {/* Data Table */}
                    <div className="disc-glass rounded-2xl md:rounded-3xl overflow-hidden min-h-[400px] border border-white/80 shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 md:py-56 space-y-4 md:space-y-6">
                                <div className="relative w-12 h-12 md:w-16 md:h-16">
                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                                </div>
                                <p className="font-bold text-slate-400 text-base md:text-lg tracking-tight">{selectedGrade}학년 데이터 분석 중...</p>
                            </div>
                        ) : filteredStudents.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200/50 bg-slate-50/50">
                                            <th className="px-3 md:px-10 py-4 md:py-8 text-[11px] md:text-[15px] font-medium text-slate-500 whitespace-nowrap text-center w-12 md:w-24">학급</th>
                                            <th className="px-3 md:px-10 py-4 md:py-8 text-[11px] md:text-[15px] font-medium text-slate-500 whitespace-nowrap text-center w-[85px] md:w-40">학생 정보</th>
                                            <th className="px-3 md:px-10 py-4 md:py-8 text-[11px] md:text-[15px] font-medium text-slate-500 whitespace-nowrap text-left">누적 기록</th>
                                            <th className="hidden md:table-cell px-10 py-8 text-[15px] font-medium text-slate-500 text-center whitespace-nowrap">최종 판정</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/50">
                                        {filteredStudents.map(student => {
                                            const hasCommittee = student.records.some(r => r.session === 4);
                                            const hasWarning = student.records.some(r => r.session === 3);
                                            return (
                                                <tr key={student.id} className="hover:bg-white/60 transition-colors group">
                                                    <td className="px-3 md:px-10 py-4 md:py-8 text-center align-middle">
                                                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl font-black text-[11px] md:text-sm border border-slate-200">
                                                            {student.class.replace('반', '')}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 md:px-10 py-4 md:py-8 align-middle">
                                                        <div className="flex flex-col items-center justify-center text-center">
                                                            <div className="md:hidden mb-1.5 h-4">
                                                                {hasCommittee ? (
                                                                    <span className="bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded-md font-black animate-pulse">선도</span>
                                                                ) : hasWarning ? (
                                                                    <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-md font-black">주의</span>
                                                                ) : null}
                                                            </div>
                                                            <span className="font-bold text-slate-900 text-[14px] md:text-[17px] leading-tight whitespace-nowrap">{student.name}</span>
                                                            <span className="text-[10px] md:text-[13px] text-slate-400 font-medium mt-1 whitespace-nowrap">{student.id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 md:px-10 py-4 md:py-8 align-middle">
                                                        <div className="flex flex-wrap gap-2 md:gap-4 justify-start">
                                                            {[1, 2, 3, 4].map(cycle => {
                                                                const cycleRecs = student.records.filter(r => r.cycle === cycle);
                                                                if (cycleRecs.length === 0) return null;
                                                                return (
                                                                    <div key={cycle} className="flex items-center space-x-1.5 md:space-x-3 bg-white/80 p-1.5 md:p-2.5 rounded-lg md:rounded-xl border border-white shadow-sm">
                                                                        <span className="text-[9px] md:text-[13px] font-medium text-slate-400 px-1.5 md:px-3 border-r border-slate-100 whitespace-nowrap">{cycle}차</span>
                                                                        <div className="flex space-x-1 md:space-x-2">
                                                                            {[1, 2, 3, 4].map(s => {
                                                                                const r = cycleRecs.find(x => x.session === s);
                                                                                return (
                                                                                    <div key={s}
                                                                                        className={`w-6 h-6 md:w-9 md:h-9 rounded-md md:rounded-lg flex items-center justify-center text-[10px] md:text-[13px] font-black border transition-all ${r ? (s === 4 ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : s === 3 ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-slate-800 border-slate-800 text-white shadow-lg') : 'bg-slate-50 border-slate-100 text-slate-200'}`}
                                                                                        title={r ? `날짜: ${r.date}\n사유: ${r.reason}` : '기록 없음'}
                                                                                        onClick={() => { if (r) setSelectedRecord(r); }}
                                                                                        style={{ cursor: r ? 'pointer' : 'default', touchAction: 'manipulation' }}>
                                                                                        <span className="pointer-events-none">{s}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="hidden md:table-cell px-10 py-8 text-center align-middle">
                                                        <div className="inline-flex flex-col items-center gap-2 w-full">
                                                            {hasCommittee ? (
                                                                <span className="inline-flex items-center bg-rose-600 text-white px-6 py-3 rounded-xl text-[15px] font-bold shadow-xl animate-pulse whitespace-nowrap">
                                                                    <i className="fa-solid fa-gavel mr-2.5"></i>선도위원회 확정
                                                                </span>
                                                            ) : hasWarning ? (
                                                                <span className="inline-flex items-center bg-amber-500 text-white px-6 py-3 rounded-xl text-[15px] font-bold shadow-xl whitespace-nowrap">
                                                                    <i className="fa-solid fa-triangle-exclamation mr-2.5"></i>주의 (3회 기록)
                                                                </span>
                                                            ) : (
                                                                <span className="bg-slate-100 text-slate-400 px-6 py-3 rounded-xl text-[15px] font-bold whitespace-nowrap">생활지도 대상</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 md:py-64 text-slate-300 space-y-6 md:space-y-8">
                                <div className="bg-white w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-4xl mb-2 border border-slate-100 shadow-sm">
                                    <i className="fa-solid fa-magnifying-glass opacity-20"></i>
                                </div>
                                <div className="text-center px-4">
                                    <p className="font-black text-slate-400 text-xl md:text-2xl tracking-tight">조회된 데이터가 없습니다.</p>
                                    <p className="text-[10px] md:text-sm font-bold text-slate-400/60 mt-3 uppercase tracking-widest">학년 탭을 눌러 시트를 동기화하세요</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Record Detail Modal */}
                {selectedRecord && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-sm bg-slate-900/40">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">날짜/사유 :</p>
                                            <p className="text-[16px] font-bold text-slate-800 leading-relaxed">{selectedRecord.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-2.5 shrink-0" />
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">누적횟수 :</p>
                                            <p className="text-[16px] font-bold text-slate-800 leading-relaxed">{selectedRecord.reason}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRecord(null)}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[16px] hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Sheets Link */}
                <a href={`https://docs.google.com/spreadsheets/d/${SHEET_IDS[selectedGrade]}/edit`} target="_blank" rel="noreferrer"
                    className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-[#1D6F42] hover:bg-[#155231] text-white w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl shadow-2xl flex items-center justify-center text-2xl md:text-3xl transition-all hover:scale-110 active:scale-95 z-[100]">
                    <i className="fa-solid fa-file-excel"></i>
                </a>
            </div>
        </>
    );
}
