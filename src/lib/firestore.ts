import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from './auth';
import { UserProfile } from '../types';

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
