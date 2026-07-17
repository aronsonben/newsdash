import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, Firestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { CacheData, GeminiGenerateResponse } from '../src/types';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_BROWSER_API_KEY,
  authDomain: "newsdash-concourse.firebaseapp.com",
  projectId: "newsdash-concourse",
  storageBucket: "newsdash-concourse.firebasestorage.app",
  messagingSenderId: "809304184792",
  appId: "1:809304184792:web:55f10ffc84aab0b6db04ad"
};

const app = initializeApp(firebaseConfig);

// ─── TTL constants ────────────────────────────────────────────────────────────
const FRESH_TTL_MS = 24 * 60 * 60 * 1000;      // < 24 h  → return immediately
// ≥ 24 h → stale (still returned; no upper-bound expiry on DB reads)

function getDb(): Firestore {
  const db = getFirestore(app);
  return db;
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
    console.log("[cache-read] Trying to read the cache.... ", );

    const db = getDb();

    const promptCacheRef = doc(db, 'prompt_cache', promptId);

    const existing = await getDoc(promptCacheRef);
    if (!existing.exists()) {
      console.log('[cache-read] Prompt Cache does NOT exist for: ', promptId);
      return res.status(200).json({ status: 'miss' });
    }

    // console.log("[cache-read] It exists! Continuing...");

    const entry = existing.data();
    // console.log("[cache-read] Found data from the database! ");

    // console.log("[cache-read] Creating new CacheData object with text: ", entry);

    // Detect schema version: new schema has a nested `data` object
    const payload: Record<string, any> = entry.data && typeof entry.data === 'object'
      ? entry.data   // new schema
      : entry;       // old schema (fields at top level)

    const entryData: GeminiGenerateResponse = {
      text:               payload.text              ?? '',
      textWithCitations:  payload.textWithCitations ?? '',
      searchQueries:      payload.searchQueries     ?? [],
      groundingChunks:    payload.groundingChunks   ?? [],
      groundingSupports:  payload.groundingSupports ?? [],
      searchEntryPoint:   payload.searchEntryPoint  ?? null,
    }

    const storedUpdatedAt =
      typeof entry.updatedAt === 'number'
        ? entry.updatedAt
        : typeof payload.updatedAt === 'number'
          ? payload.updatedAt
          : null;

    if (!storedUpdatedAt) {
      return res.status(200).json({ status: 'miss' });
    }

    const ageMs = Date.now() - storedUpdatedAt;

    // Always return the last known entry regardless of age.
    // fresh = < 24 h, stale = ≥ 24 h. The client decides how to surface the age.
    const status = ageMs < FRESH_TTL_MS ? 'fresh' : 'stale';

    const existingPromptData: CacheData = {
      id: promptId,
      data: entryData,
      updatedAt: storedUpdatedAt,
      ...(entry.savedBy && typeof entry.savedBy === 'string' ? { savedBy: entry.savedBy } : {}),
    };

    // console.log("[cache-read] Found the existingPromptData:  ", existingPromptData);
    
    return res.status(200).json({
      status,
      updatedAt: storedUpdatedAt,
      ageMs,
      data: existingPromptData,
    });
  } catch (err) {
    console.error('[cache-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read from cache' });
  }
}
