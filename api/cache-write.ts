import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

interface GroundingSupport {
  segment?: { startIndex: number; endIndex: number; text: string };
  groundingChunkIndices?: number[];
}

interface CacheData {
  text: string;
  textWithCitations: string;
  searchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: string | null;
}

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId, data } = req.body ?? {};

  if (!promptId || typeof promptId !== 'string') {
    return res.status(400).json({ error: '`promptId` is required' });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: '`data` is required' });
  }
  if (typeof data.text !== 'string' || typeof data.textWithCitations !== 'string') {
    return res.status(400).json({ error: '`data.text` and `data.textWithCitations` are required strings' });
  }

  const cacheData: CacheData = {
    text:              data.text,
    textWithCitations: data.textWithCitations,
    searchQueries:     data.searchQueries     ?? [],
    groundingChunks:   data.groundingChunks   ?? [],
    groundingSupports: data.groundingSupports ?? [],
    searchEntryPoint:  data.searchEntryPoint  ?? null,
  };

  try {
    const db = getDb();
    await db.collection('prompt_cache').doc(promptId).set({
      promptId,
      ...cacheData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[cache-write] Firestore write error:', err);
    return res.status(500).json({ error: 'Failed to write to cache' });
  }
}
