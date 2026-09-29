import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { getAdminDb } from './admin';
import { requireUser, safeEqual } from './auth';

/** Escapes text for safe interpolation into HTML. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Verifies the HMAC-SHA256 signature attached to email unsubscribe links.
 * Fails closed if UNSUBSCRIBE_HMAC_SECRET is unset.
 */
function verifyUnsubscribeToken(userId: string, sig: string): boolean {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(userId).digest('hex');
  return safeEqual(expected, sig);
}

/**
 * Marks a user's subscription as inactive in both Firestore collections:
 *   - email_subscriptions/{userId}.active = false
 *   - users/{userId}.weeklyReport = false
 */
async function performUnsubscribe(userId: string) {
  const db = getAdminDb();
  await Promise.all([
    db.doc(`email_subscriptions/${userId}`).set({ active: false }, { merge: true }),
    db.doc(`users/${userId}`).set({ weeklyReport: false }, { merge: true }),
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── GET: one-click unsubscribe from email link (HMAC-signed) ─────────────
  if (req.method === 'GET') {
    const { uid, sig } = req.query;

    if (!uid || !sig || typeof uid !== 'string' || typeof sig !== 'string') {
      return res.status(400).send(confirmationPage('Invalid link', 'This unsubscribe link is missing required parameters.'));
    }
    if (!verifyUnsubscribeToken(uid, sig)) {
      return res.status(403).send(confirmationPage('Invalid link', 'This unsubscribe link is invalid or has expired.'));
    }

    try {
      await performUnsubscribe(uid);
      return res.status(200).send(
        confirmationPage('Unsubscribed', "You've been removed from the NewsDash weekly digest.")
      );
    } catch (err) {
      console.error('[unsubscribe] Firestore error:', err);
      return res.status(500).send(confirmationPage('Error', 'Something went wrong. Please try again.'));
    }
  }

  // ── POST: unsubscribe triggered from the Account modal UI ────────────────
  if (req.method === 'POST') {
    const user = await requireUser(req, res);
    if (!user) return;

    try {
      await performUnsubscribe(user.uid);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[unsubscribe] Firestore error:', err);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── Simple HTML confirmation page returned on GET unsubscribe ────────────────

function confirmationPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} — NewsDash</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 40px 48px; max-width: 420px;
            text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    h1 { margin: 0 0 12px; font-size: 20px; color: #111827; }
    p  { margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #6b7280; }
    a  { font-size: 14px; color: #4f46e5; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <a href="${escapeHtml(process.env.APP_URL ?? '/')}">← Back to NewsDash</a>
  </div>
</body>
</html>`;
}
