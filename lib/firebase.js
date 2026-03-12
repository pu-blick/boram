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
        if (!db) return;
        await set(ref(db, `schedules/${year}/${month}/${day}`), content);
    } catch (e) {
        console.error('setSchedule error:', e);
    }
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
