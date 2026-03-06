import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, get, set } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyAqmFSAARsCeurZvV1NmVnZlqc3Y4q5bBQ",
    authDomain: "boram-2848a.firebaseapp.com",
    databaseURL: "https://boram-2848a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "boram-2848a",
    storageBucket: "boram-2848a.firebasestorage.app",
    messagingSenderId: "14057140893",
    appId: "1:14057140893:web:a1354129dae7bb0d575a74"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);

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
