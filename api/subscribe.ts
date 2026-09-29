import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_lib/admin';
import { requireUser } from './_lib/auth';

/**
 * Subscribes the signed-in user to the weekly email digest.
 * Identity and email come from the verified ID token, never the request body.
 * Writes email_subscriptions/{uid} (queried by send-weekly-report) and users/{uid}.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (user.isAnonymous || !user.email || !user.emailVerified) {
    return res.status(400).json({ error: 'A signed-in account with a verified email is required' });
  }

  try {
    const db = getAdminDb();
    const now = Date.now();

    await db.doc(`email_subscriptions/${user.uid}`).set(
      { email: user.email, subscribedAt: now, active: true },
      { merge: true }
    );

    // createdAt is only set on first subscribe so re-subscribing doesn't reset it.
    const userRef = db.doc(`users/${user.uid}`);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const createdAt = snap.data()?.createdAt ?? now;
      tx.set(userRef, { email: user.email, weeklyReport: true, createdAt }, { merge: true });
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[subscribe] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
