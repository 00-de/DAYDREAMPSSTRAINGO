import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface CloudSave<T = unknown> {
  slot: string;
  data: T;
  updatedAt: string;
  appVersion: string;
}

const ref = (uid: string, slot: string) => doc(db, 'users', uid, 'saves', slot);

/**
 * クラウドへ保存。ゲストの場合はローカルのみに書き込む。
 * オフライン時も Firestore のキャッシュへ書き込まれ、復旧時に自動送信される。
 */
export async function pushSave<T>(slot: string, data: T, appVersion: string): Promise<'cloud' | 'local'> {
  await window.tds.save.write(slot, data); // ローカルが常に正
  const uid = auth.currentUser?.uid;
  if (!uid) return 'local';

  await setDoc(ref(uid, slot), {
    slot, data, appVersion, updatedAt: serverTimestamp(),
  });
  return 'cloud';
}

/** クラウドとローカルを比べ、新しい方を返す */
export async function pullSave<T>(slot: string): Promise<CloudSave<T> | null> {
  const uid = auth.currentUser?.uid;
  const local = (await window.tds.save.read(slot)) as T | null;

  if (!uid) return local ? { slot, data: local, updatedAt: '', appVersion: '' } : null;

  const snap = await getDoc(ref(uid, slot));
  if (!snap.exists()) return local ? { slot, data: local, updatedAt: '', appVersion: '' } : null;

  const cloud = snap.data() as CloudSave<T>;
  if (local) await window.tds.save.write(slot, cloud.data);
  return cloud;
}
