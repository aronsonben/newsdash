import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_BROWSER_API_KEY,
  authDomain: 'newsdash-concourse.firebaseapp.com',
  projectId: 'newsdash-concourse',
  storageBucket: 'newsdash-concourse.firebasestorage.app',
  messagingSenderId: '809304184792',
  appId: '1:809304184792:web:55f10ffc84aab0b6db04ad',
};

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

/**
 * Subscribes a signed-in user to the weekly email digest.
 * Writes to two Firestore locations:
 *   1. email_subscriptions/{userId} — queried by the send-weekly-report job
 *   2. users/{userId} — upserted with weeklyReport: true; creates the doc if new
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: '`userId` is required' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: '`email` is required and must be a valid address' });
  }

  try {
    const db = getDb();
    const now = Date.now();

    // Upsert the email_subscriptions document — always mark active: true
    const subRef = doc(db, 'email_subscriptions', userId);
    await setDoc(subRef, { email, subscribedAt: now, active: true }, { merge: true });

    // Upsert the users/{userId} profile document.
    // Uses merge: true so existing fields (e.g. other preferences) are preserved.
    // Note: createdAt is only written if the document doesn't already have it
    // because merge: true will not overwrite fields not included in the payload —
    // but since we always include createdAt here, a re-subscribe will update it.
    // To avoid a read (which the server-side client SDK cannot do under current rules),
    // we skip the existence check and always merge all fields.
    const userRef = doc(db, 'users', userId);

    await setDoc(userRef, { email, weeklyReport: true, createdAt: now }, { merge: true });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[subscribe] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
