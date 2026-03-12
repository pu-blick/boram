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
    const snapshot = await get(ref(db, `users/${uid}/role`));
    return snapshot.val(); // 'admin', 'approved', 'pending', null
}

export async function setUserRole(uid, role) {
    await set(ref(db, `users/${uid}/role`), role);
}

export async function registerUser(uid, email, displayName) {
    const existing = await get(ref(db, `users/${uid}`));
    if (!existing.val()) {
        await set(ref(db, `users/${uid}`), {
            email: email,
            displayName: displayName || '',
            role: 'pending',
            createdAt: new Date().toISOString()
        });
    }
}

// Schedule management
export async function getSchedules(year, month) {
    const snapshot = await get(ref(db, `schedules/${year}/${month}`));
    return snapshot.val() || {};
}

export async function setSchedule(year, month, day, content) {
    await set(ref(db, `schedules/${year}/${month}/${day}`), content);
}

export async function removeSchedule(year, month, day) {
    await remove(ref(db, `schedules/${year}/${month}/${day}`));
}

// Seating data management (per user)
export async function getSeatingData(uid) {
    const snapshot = await get(ref(db, `userdata/${uid}/seating`));
    return snapshot.val();
}

export async function saveSeatingData(uid, data) {
    await set(ref(db, `userdata/${uid}/seating`), data);
}
