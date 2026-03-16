'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import { fetchAllStudentData, SHEET_IDS } from '../../lib/discipline';

const VIEW_ALL = 'ALL';
const VIEW_WARNING = 'WARNING';
const VIEW_COMMITTEE = 'COMMITTEE';

const S = {
    page: { fontFamily: 'Pretendard, sans-serif', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', minHeight: '100vh', paddingBottom: 80 },
    header: { background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)', color: 'white', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 60 },
    headerInner: { maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    titleRow: { display: 'flex', alignItems: 'center', gap: 12 },
    backBtn: { background: 'none', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', padding: 8, borderRadius: 10 },
    iconBox: { background: '#10b981', padding: 10, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: 900, color: 'white', margin: 0 },
    subtitle: { fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
    gradeRow: { display: 'flex', alignItems: 'center', gap: 8 },
    gradeGroup: { display: 'flex', background: 'rgba(51,65,85,0.5)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' },
    gradeBtn: (active, locked) => ({ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, background: active ? '#e11d48' : 'transparent', color: active ? 'white' : '#94a3b8', transition: 'all 0.2s', position: 'relative' }),
    lockIcon: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(148,163,184,0.8)' },
    syncBtn: (syncing) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: '1px solid white', cursor: 'pointer', background: syncing ? '#334155' : 'white', color: syncing ? '#94a3b8' : '#0f172a' }),
    main: { maxWidth: 1200, margin: '0 auto', padding: '24px 16px' },
    glass: { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 16, padding: 16, marginBottom: 20 },
    chipRow: { display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
    chip: (active) => ({ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: active ? 'none' : '1px solid #e2e8f0', background: active ? '#0f172a' : 'white', color: active ? 'white' : '#475569', cursor: 'pointer' }),
    cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
    card: { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 16, padding: 16, textAlign: 'center' },
    cardIcon: (bg) => ({ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: 'white', fontSize: 18 }),
    cardLabel: { fontSize: 11, color: '#64748b', fontWeight: 500, margin: 0 },
    cardValue: { fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '4px 0 0' },
    tabRow: { display: 'flex', background: 'rgba(255,255,255,0.5)', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.6)', marginBottom: 20 },
    tab: (active, color) => ({ flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: active ? (color || '#0f172a') : 'transparent', color: active ? 'white' : '#64748b', transition: 'all 0.2s' }),
    dlBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#059669', color: 'white', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', width: '100%', marginBottom: 20 },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '12px 8px', fontSize: 11, fontWeight: 500, color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'center' },
    td: { padding: '12px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', verticalAlign: 'middle' },
    badge: (bg) => ({ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 900, color: 'white', background: bg }),
    name: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
    studentId: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
    dot: (filled, level) => ({ width: 24, height: 24, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, margin: '0 2px', border: filled ? 'none' : '1px solid #e2e8f0', background: filled ? (level === 4 ? '#e11d48' : level === 3 ? '#f59e0b' : '#0f172a') : '#f8fafc', color: filled ? 'white' : '#cbd5e1', cursor: filled ? 'pointer' : 'default' }),
    cycleLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 500, marginRight: 6, paddingRight: 6, borderRight: '1px solid #e2e8f0' },
    cycleGroup: { display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.8)', padding: '4px 6px', borderRadius: 10, marginRight: 8, marginBottom: 4 },
    empty: { textAlign: 'center', padding: '80px 20px', color: '#94a3b8' },
    emptyIcon: { fontSize: 40, opacity: 0.2, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: 900, color: '#64748b' },
    emptySub: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
    modal: { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' },
    modalBox: { background: 'white', borderRadius: 24, width: '100%', maxWidth: 360, padding: 24 },
    modalLabel: { fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 },
    modalValue: { fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 },
    modalBtn: { width: '100%', padding: 14, borderRadius: 16, background: '#0f172a', color: 'white', fontSize: 15, fontWeight: 900, border: 'none', cursor: 'pointer' },
    fab: { position: 'fixed', bottom: 24, right: 24, width: 48, height: 48, borderRadius: 14, background: '#1D6F42', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: 'none', cursor: 'pointer', zIndex: 100, textDecoration: 'none' },
    spinner: { width: 40, height: 40, border: '4px solid #d1fae5', borderTop: '4px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};

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
        link.setAttribute('download', `${selectedGrade}학년_명단.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading) return null;
    if (!user) return null;

    return (
        <>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={S.page}>
                {/* Header */}
                <header style={S.header}>
                    <div style={S.headerInner}>
                        <div style={S.titleRow}>
                            <button style={S.backBtn} onClick={() => router.push('/')}><i className="fa-solid fa-arrow-left"></i></button>
                            <div style={S.iconBox}><i className="fa-solid fa-users-viewfinder" style={{ fontSize: 20, color: 'white' }}></i></div>
                            <div>
                                <h1 style={S.title}>생활지도 통합 관리</h1>
                                <div style={S.subtitle}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', marginRight: 6 }}></span>Student Life Management</div>
                            </div>
                        </div>
                        <div style={S.gradeRow}>
                            <div style={S.gradeGroup}>
                                {[1, 2, 3].map(grade => {
                                    const locked = grade === 1 || grade === 3;
                                    return (
                                        <button key={grade} style={S.gradeBtn(selectedGrade === grade, locked)}
                                            onClick={() => !locked && handleFetchSheet(grade)} disabled={locked}>
                                            {locked && <span style={S.lockIcon}><i className="fa-solid fa-lock"></i></span>}
                                            <span style={{ opacity: locked ? 0.3 : 1 }}>{grade}학년</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button style={S.syncBtn(isSyncing)} onClick={() => handleFetchSheet(selectedGrade)} disabled={isSyncing}>
                                <i className={`fa-solid fa-arrows-rotate${isSyncing ? ' fa-spin' : ''}`}></i> 조회
                            </button>
                        </div>
                    </div>
                </header>

                <div style={S.main}>
                    {/* Class chips */}
                    {loadedSheets.length > 0 && (
                        <div style={S.glass}>
                            <div style={S.chipRow}>
                                {loadedSheets.slice(0, 5).map(s => (
                                    <button key={s} style={S.chip(selectedClass === s)} onClick={() => setSelectedClass(selectedClass === s ? null : s)}>
                                        ✓ {s}
                                    </button>
                                ))}
                            </div>
                            {loadedSheets.length > 5 && (
                                <div style={{ ...S.chipRow, marginTop: 6 }}>
                                    {loadedSheets.slice(5).map(s => (
                                        <button key={s} style={S.chip(selectedClass === s)} onClick={() => setSelectedClass(selectedClass === s ? null : s)}>
                                            ✓ {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div style={S.cardGrid}>
                        {[
                            { label: '기록 학생', value: students.length, bg: '#0f172a', icon: 'fa-solid fa-user-group' },
                            { label: '주의 대상', value: students.filter(s => s.records.some(r => r.session === 3)).length, bg: '#f59e0b', icon: 'fa-solid fa-triangle-exclamation' },
                            { label: '선도 확정', value: students.filter(s => s.records.some(r => r.session === 4)).length, bg: '#e11d48', icon: 'fa-solid fa-gavel' },
                        ].map(c => (
                            <div key={c.label} style={S.card}>
                                <div style={S.cardIcon(c.bg)}><i className={c.icon}></i></div>
                                <p style={S.cardLabel}>{c.label}</p>
                                <p style={S.cardValue}>{c.value}<span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>명</span></p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={S.tabRow}>
                        {[
                            { id: VIEW_ALL, label: '전체보기', icon: 'fa-list', color: '#0f172a' },
                            { id: VIEW_WARNING, label: '주의대상(3회)', icon: 'fa-bell', color: '#f59e0b' },
                            { id: VIEW_COMMITTEE, label: '선도확정(4회)', icon: 'fa-gavel', color: '#e11d48' },
                        ].map(t => (
                            <button key={t.id} style={S.tab(viewMode === t.id, t.color)} onClick={() => setViewMode(t.id)}>
                                <i className={`fa-solid ${t.icon}`} style={{ marginRight: 4, fontSize: 10 }}></i>{t.label}
                            </button>
                        ))}
                    </div>

                    {/* Download */}
                    {filteredStudents.length > 0 && (
                        <button style={S.dlBtn} onClick={handleDownloadCSV}>
                            <i className="fa-solid fa-file-excel"></i> {selectedGrade}학년 엑셀 다운로드
                        </button>
                    )}

                    {/* Data */}
                    <div style={S.glass}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '80px 0' }}>
                                <div style={{ ...S.spinner, margin: '0 auto 16px' }}></div>
                                <p style={{ color: '#64748b', fontWeight: 700 }}>{selectedGrade}학년 데이터 분석 중...</p>
                            </div>
                        ) : filteredStudents.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            <th style={S.th}>학급</th>
                                            <th style={S.th}>학생 정보</th>
                                            <th style={{ ...S.th, textAlign: 'left' }}>누적 기록</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map(student => {
                                            const hasC = student.records.some(r => r.session === 4);
                                            const hasW = student.records.some(r => r.session === 3);
                                            return (
                                                <tr key={student.id}>
                                                    <td style={S.td}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', fontWeight: 900, fontSize: 11, color: '#475569', border: '1px solid #e2e8f0' }}>
                                                            {student.class.replace('반', '')}
                                                        </span>
                                                    </td>
                                                    <td style={S.td}>
                                                        {hasC && <div style={S.badge('#e11d48')}>선도</div>}
                                                        {!hasC && hasW && <div style={S.badge('#f59e0b')}>주의</div>}
                                                        <div style={S.name}>{student.name}</div>
                                                        <div style={S.studentId}>{student.id}</div>
                                                    </td>
                                                    <td style={{ ...S.td, textAlign: 'left' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                                            {[1, 2, 3, 4].map(cycle => {
                                                                const recs = student.records.filter(r => r.cycle === cycle);
                                                                if (recs.length === 0) return null;
                                                                return (
                                                                    <div key={cycle} style={S.cycleGroup}>
                                                                        <span style={S.cycleLabel}>{cycle}차</span>
                                                                        {[1, 2, 3, 4].map(s => {
                                                                            const r = recs.find(x => x.session === s);
                                                                            return (
                                                                                <div key={s} style={S.dot(!!r, s)}
                                                                                    onClick={() => r && setSelectedRecord(r)}>
                                                                                    {s}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={S.empty}>
                                <div style={S.emptyIcon}><i className="fa-solid fa-magnifying-glass"></i></div>
                                <p style={S.emptyTitle}>조회된 데이터가 없습니다.</p>
                                <p style={S.emptySub}>학년 탭을 눌러 시트를 동기화하세요</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal */}
                {selectedRecord && (
                    <div style={S.modal}>
                        <div style={S.modalBox}>
                            <p style={S.modalLabel}>날짜/사유 :</p>
                            <p style={S.modalValue}>{selectedRecord.date}</p>
                            <p style={S.modalLabel}>누적횟수 :</p>
                            <p style={S.modalValue}>{selectedRecord.reason}</p>
                            <button style={S.modalBtn} onClick={() => setSelectedRecord(null)}>확인</button>
                        </div>
                    </div>
                )}

                {/* FAB */}
                <a href={`https://docs.google.com/spreadsheets/d/${SHEET_IDS[selectedGrade]}/edit`} target="_blank" rel="noreferrer" style={S.fab}>
                    <i className="fa-solid fa-file-excel"></i>
                </a>
            </div>
        </>
    );
}
