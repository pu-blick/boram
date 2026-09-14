'use client';

import { useEffect, useState } from 'react';

// 접힘 상태를 기기마다 기억한다(localStorage). storageKey는 섹션마다 달라야 한다.
export function useCollapsed(storageKey) {
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        try { setCollapsed(localStorage.getItem(storageKey) === '1'); } catch (e) { /* 저장소 사용 불가 */ }
    }, [storageKey]);

    const toggle = () => {
        setCollapsed((prev) => {
            try { localStorage.setItem(storageKey, prev ? '0' : '1'); } catch (e) { /* 저장소 사용 불가 */ }
            return !prev;
        });
    };

    return [collapsed, toggle];
}

// 이번주 활동 도우미와 같은 모양: 제목 가운데, 화살표는 글씨 오른쪽, 줄 전체를 눌러 접고 편다.
export default function CollapsibleHeader({ icon, title, collapsed, onToggle }) {
    return (
        <button
            onClick={onToggle}
            aria-label={`${title} ${collapsed ? '펼치기' : '접기'}`}
            aria-expanded={!collapsed}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 0, marginBottom: collapsed ? 0 : 16, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Pretendard, sans-serif', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent)' }}>{icon}</span>
                {title}
            </h2>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#94a3b8', transition: 'transform 0.3s', transform: collapsed ? 'rotate(0)' : 'rotate(180deg)' }}>expand_more</span>
        </button>
    );
}
