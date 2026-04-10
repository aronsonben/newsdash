import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// ─── TTL constants ────────────────────────────────────────────────────────────
const FRESH_TTL_MS = 24 * 60 * 60 * 1000;      // < 24 h  → return immediately
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 1–7 d   → return stale + hint
// > 7 d → treat as miss so the client triggers a fresh fetch

// ─── Firebase Admin singleton ─────────────────────────────────────────────────
function getDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin.firestore();
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId } = req.query;
  if (!promptId || typeof promptId !== 'string') {
    return res.status(400).json({ error: '`promptId` query parameter is required' });
  }

  try {
    const db = getDb();
    const doc = await db.collection('prompt_cache').doc(promptId).get();

    if (!doc.exists) {
      return res.status(200).json({ status: 'miss' });
    }

    const entry = doc.data()!;
    const updatedAt: Date = (entry.updatedAt as admin.firestore.Timestamp).toDate();
    const ageMs = Date.now() - updatedAt.getTime();

    if (ageMs > STALE_TTL_MS) {
      // Treat as miss — client should request a fresh fetch
      return res.status(200).json({ status: 'expired' });
    }

    const status = ageMs < FRESH_TTL_MS ? 'fresh' : 'stale';

    return res.status(200).json({
      status,
      updatedAt: updatedAt.toISOString(),
      ageMs,
      data: {
        text:               entry.text              ?? '',
        textWithCitations:  entry.textWithCitations ?? '',
        searchQueries:      entry.searchQueries     ?? [],
        groundingChunks:    entry.groundingChunks   ?? [],
        groundingSupports:  entry.groundingSupports ?? [],
        searchEntryPoint:   entry.searchEntryPoint  ?? null,
      },
    });
  } catch (err) {
    console.error('[cache-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read from cache' });
  }
}
