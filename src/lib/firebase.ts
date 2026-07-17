import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  onAuthStateChanged, type User,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);

/**
 * オフライン対応の要。
 * ローカルキャッシュを有効にすると、通信が無くても読み書きができ、
 * 復旧時に自動で同期される。
 */
export const db = initializeFirestore(fbApp, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
});

export async function loginWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
  return user;
}

export function logout(): Promise<void> {
  return signOut(auth);
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
