'use client';

import { useEffect, useRef, useState } from 'react';

// 척척박사 챗봇: Supabase Edge Function(chat)에 질문과 대화 기록을 보낸다.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const CHAT_ENDPOINT = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/chat` : '';

async function askChatbot(question, history) {
    if (!CHAT_ENDPOINT) return '아직 AI가 연결되지 않았어요. (Supabase 설정 필요) 🛠️';
    const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ question, history }),
    });
    if (!res.ok) {
        if (res.status === 404) return '챗봇 서버(Edge Function)가 아직 배포되지 않았어요. 🛠️';
        const text = await res.text();
        throw new Error(`서버 오류 ${res.status}: ${text.slice(0, 120)}`);
    }
    return (await res.json()).answer || '(빈 응답)';
}

const CS = {
    fab: { position: 'fixed', bottom: 8, right: -8, zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
    fabChar: { height: 176, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.28))', transition: 'transform 0.2s ease' },
    fabBubble: { background: 'white', color: '#1d4ed8', fontSize: 12.5, fontWeight: 800, padding: '7px 12px', borderRadius: 14, whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', border: '1px solid #dbeafe', transition: 'opacity 0.25s ease' },
    panel: { position: 'fixed', bottom: 20, right: 20, zIndex: 300, width: 'min(360px, calc(100vw - 32px))', height: 'min(520px, calc(100vh - 120px))', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 16px 48px rgba(15,23,42,0.28)', border: '1px solid #e2e8f0' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'linear-gradient(135deg, #2563eb, #06b6d4)', color: 'white' },
    closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: 22, lineHeight: 1, cursor: 'pointer' },
    body: { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc' },
    userBubble: { maxWidth: '80%', padding: '9px 12px', borderRadius: '14px 14px 4px 14px', background: '#2563eb', color: 'white', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap' },
    botBubble: { maxWidth: '80%', padding: '9px 12px', borderRadius: '14px 14px 14px 4px', background: 'white', color: '#0f172a', fontSize: 13.5, lineHeight: 1.45, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' },
    inputRow: { display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #e2e8f0', background: 'white' },
    input: { flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' },
    sendBtn: { padding: '10px 16px', borderRadius: 12, border: 'none', background: '#2563eb', color: 'white', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' },
};

export default function ChatBot() {
    const [open, setOpen] = useState(false);
    const [hover, setHover] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: '안녕하세요! 학교 업무 자료에 대해 무엇이든 물어보세요. 🙂' },
    ]);
    const bodyRef = useRef(null);

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [messages, open, loading]);

    const send = async () => {
        const question = input.trim();
        if (!question || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: question }]);
        setLoading(true);
        try {
            const history = messages.map(m => ({ role: m.role, text: m.text }));
            const answer = await askChatbot(question, history);
            setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: '오류가 발생했어요. 잠시 후 다시 시도해주세요.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                    style={CS.fab}
                    aria-label="무엇이든 물어보세요"
                >
                    <span className="chat-bubble-float" style={{ ...CS.fabBubble, opacity: hover ? 1 : 0 }}>무엇이든 물어보세요</span>
                    {/* 그림 오른쪽 39%가 투명 여백이라, 그림 폭의 14%만큼 오른쪽으로 옮겨도 몸이 잘리지 않는다 (말풍선은 제자리) */}
                    <img className="chat-char" src="/척척박사.png" alt="척척박사" style={{ ...CS.fabChar, transform: `translateX(14%) scale(${hover ? 1.05 : 1})` }} />
                </button>
            )}
            {open && (
                <div style={CS.panel}>
                    <div style={CS.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 22 }}>lightbulb</span>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>무엇이든 물어보세요</span>
                        </div>
                        <button onClick={() => setOpen(false)} style={CS.closeBtn} aria-label="닫기">×</button>
                    </div>
                    <div ref={bodyRef} style={CS.body}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={m.role === 'user' ? CS.userBubble : CS.botBubble}>{m.text}</div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ ...CS.botBubble, color: '#94a3b8' }}>입력 중…</div>
                            </div>
                        )}
                    </div>
                    <div style={CS.inputRow}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') send(); }}
                            placeholder="메시지를 입력하세요…"
                            style={CS.input}
                        />
                        <button onClick={send} disabled={loading || !input.trim()} style={{ ...CS.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}>전송</button>
                    </div>
                </div>
            )}
        </>
    );
}
