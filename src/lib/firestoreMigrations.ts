import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { app } from './auth';
import { SavedBlock, UserProfile } from '../types';

const PROMPT_CACHE_IDS = [
  'global-climate-headlines-weekly',
  'massachusetts-climate-news-weekly',
  'new-england-climate-news-weekly',
  'boston-climate-news-monthly',
];

// Single Firestore instance for the browser client SDK.
// Security rules enforce per-user access — requests are automatically
// authenticated by the Firebase Auth session.
export const db = getFirestore(app);

/**
 * Reads the users/{userId} profile document from Firestore.
 * Returns null if the document doesn't exist yet (user has never subscribed).
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/**
 * One-time migration: converts the `updatedAt` field in each prompt_cache
 * document from a Unix millisecond number to a Firestore Timestamp object.
 */
export async function convertMillisToTimestamp(): Promise<void> {
  const results: { id: string; status: string }[] = [];

  for (const id of PROMPT_CACHE_IDS) {
    const ref = doc(db, 'prompt_cache', id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      results.push({ id, status: 'skipped — document not found' });
      continue;
    }

    const data = snap.data();
    const updatedAt = data?.updatedAt;

    if (typeof updatedAt !== 'number') {
      results.push({ id, status: `skipped — updatedAt is ${typeof updatedAt}, not a number` });
      continue;
    }

    await updateDoc(ref, { updatedAt: Timestamp.fromMillis(updatedAt) });
    results.push({ id, status: `converted ${updatedAt} → Timestamp` });
  }

  console.table(results);
}