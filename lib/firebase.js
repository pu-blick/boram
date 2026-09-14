import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
};

let app, auth, googleProvider, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getDatabase(app);
} catch (e) {
    console.error('Firebase init failed:', e);
}
export { auth, googleProvider, db };

// User role management
export async function getUserRole(uid) {
    try {
        if (!db) return null;
        const snapshot = await get(ref(db, `users/${uid}/role`));
        return snapshot.val();
    } catch (e) {
        console.error('getUserRole error:', e);
        return null;
    }
}

export async function setUserRole(uid, role) {
    try {
        if (!db) return;
        await set(ref(db, `users/${uid}/role`), role);
    } catch (e) {
        console.error('setUserRole error:', e);
    }
}

export async function registerUser(uid, email, displayName) {
    try {
        if (!db) return;
        const existing = await get(ref(db, `users/${uid}`));
        if (!existing.val()) {
            await set(ref(db, `users/${uid}`), {
                email: email,
                displayName: displayName || '',
                role: 'pending',
                createdAt: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error('registerUser error:', e);
    }
}

// Schedule management
export async function getSchedules(year, month) {
    try {
        if (!db) return {};
        const snapshot = await get(ref(db, `schedules/${year}/${month}`));
        return snapshot.val() || {};
    } catch (e) {
        console.error('getSchedules error:', e);
        return {};
    }
}

export async function setSchedule(year, month, day, content) {
    try {
        if (!db) return false;
        await set(ref(db, `schedules/${year}/${month}/${day}`), content);
        return true;
    } catch (e) {
        console.error('setSchedule error:', e);
        return false;
    }
}

// DB 규칙(database.rules.json)상 일정은 5000자 이하 문자열이라, 하루 일정 목록을 JSON 문자열로 담는다.
export const SCHEDULE_MAX_LENGTH = 5000;

const toItem = (v) => ({
    summary: typeof v?.summary === 'string' ? v.summary.trim() : '',
    detail: typeof v?.detail === 'string' ? v.detail.trim() : '',
});
const isItemLike = (v) => v && typeof v === 'object' && ('summary' in v || 'detail' in v);

// 저장된 값 → [{ summary, detail }]
// 읽는 형식: JSON 배열, JSON 객체 하나, 예전 일반 글(첫 줄 = 요약, 나머지 = 내용)
export function parseSchedule(text) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const data = JSON.parse(trimmed);
            const list = Array.isArray(data) ? data : [data];
            if (list.length > 0 && list.every(isItemLike)) {
                return list.map(toItem).filter((it) => it.summary || it.detail);
            }
        } catch (e) {
            // JSON이 아니면 일반 글로 읽는다
        }
    }
    const i = trimmed.indexOf('\n');
    const item = i === -1
        ? { summary: trimmed, detail: '' }
        : { summary: trimmed.slice(0, i).trim(), detail: trimmed.slice(i + 1).trim() };
    return item.summary || item.detail ? [item] : [];
}

// [{ summary, detail }] → 저장할 문자열 (모두 비었으면 null = 삭제)
export function serializeSchedule(items) {
    const list = items.map(toItem).filter((it) => it.summary || it.detail);
    return list.length ? JSON.stringify(list) : null;
}

export async function removeSchedule(year, month, day) {
    try {
        if (!db) return;
        await remove(ref(db, `schedules/${year}/${month}/${day}`));
    } catch (e) {
        console.error('removeSchedule error:', e);
    }
}

// Seating data management (per user)
export async function getSeatingData(uid) {
    try {
        if (!db) return null;
        const snapshot = await get(ref(db, `userdata/${uid}/seating`));
        return snapshot.val();
    } catch (e) {
        console.error('getSeatingData error:', e);
        return null;
    }
}

export async function saveSeatingData(uid, data) {
    try {
        if (!db) return;
        await set(ref(db, `userdata/${uid}/seating`), data);
    } catch (e) {
        console.error('saveSeatingData error:', e);
    }
}
