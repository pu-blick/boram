'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Pretendard, sans-serif' }}>
            <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '20px' }}>일시적인 오류가 발생했습니다</p>
            <button onClick={() => reset()} style={{ padding: '12px 32px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                다시 시도
            </button>
        </div>
    );
}
