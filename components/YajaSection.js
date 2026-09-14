'use client';

import { useEffect, useState } from 'react';
import { parseSupervisionSheet, getSupervisionWeek } from '../lib/yaja';

// 2학년부 공용 업무 시트 → "2학기 야자감독" 탭
// 웹에 게시한 CSV 주소로 바꾸면 파일 전체를 공개하지 않아도 된다.
const YAJA_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1FAE9gD8U5JHllxRGzaNfGfznR9Wj5itS98SaT0pElPI/export?format=csv&gid=753093703';

export default function YajaSection() {
    const [schedule, setSchedule] = useState(null);
    const [failed, setFailed] = useState(false);
    const week = getSupervisionWeek();
    const today = new Date().toDateString();
    const isNextWeek = week[0].date > new Date();

    useEffect(() => {
        fetch(YAJA_SHEET_URL)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            })
            .then((text) => setSchedule(parseSupervisionSheet(text)))
            .catch(() => setFailed(true));
    }, []);

    return (
        <section style={{ background: 'white', borderRadius: 'var(--radius)', padding: '20px', boxShadow: 'var(--shadow-sm)', marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Pretendard, sans-serif' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent)' }}>nightlight</span>
                {isNextWeek ? '다음주' : '이번주'} 야자감독
            </h2>

            {failed ? (
                <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>감독표를 불러오지 못했습니다.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {week.map(({ date, label }) => {
                        const isToday = date.toDateString() === today;
                        const entry = schedule?.[`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`];
                        return (
                            <div key={label} style={{
                                background: isToday ? '#eff6ff' : '#f8fafc',
                                borderRadius: 10,
                                padding: '10px 6px',
                                minHeight: 72,
                                border: isToday ? '2px solid #3b82f6' : '1px solid #f1f5f9',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#3b82f6' : '#94a3b8' }}>{label}</div>
                                <div style={{ fontSize: 14, fontWeight: isToday ? 800 : 600, color: isToday ? '#1e40af' : '#475569', marginBottom: 6 }}>{date.getDate()}</div>
                                {!schedule ? (
                                    <div style={{ fontSize: 10, color: '#cbd5e1' }}>…</div>
                                ) : entry?.type === 'teacher' ? (
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', wordBreak: 'keep-all' }}>{entry.text}</div>
                                ) : entry?.type === 'event' ? (
                                    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', lineHeight: 1.25, wordBreak: 'keep-all' }}>{entry.text}</div>
                                ) : (
                                    <div style={{ fontSize: 10, color: '#cbd5e1' }}>-</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
