import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, Firestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { CacheData, GeminiGenerateResponse } from '../src/types';

const firebaseConfig = {
  apiKey: "AIzaSyCDapuZAlEepBaM6uXwnJCcGd3p8uUYteA",
  authDomain: "newsdash-concourse.firebaseapp.com",
  projectId: "newsdash-concourse",
  storageBucket: "newsdash-concourse.firebasestorage.app",
  messagingSenderId: "809304184792",
  appId: "1:809304184792:web:55f10ffc84aab0b6db04ad"
};

const app = initializeApp(firebaseConfig);

// ─── TTL constants ────────────────────────────────────────────────────────────
const FRESH_TTL_MS = 24 * 60 * 60 * 1000;      // < 24 h  → return immediately
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 1–7 d   → return stale + hint
// > 7 d → treat as miss so the client triggers a fresh fetch


// Get a list of cities from your database
async function getCacheReads(db: Firestore) {
  const cacheCollection = collection(db, 'prompt_cache');
  const cacheSnapshot = await getDocs(cacheCollection);
  const cacheList = cacheSnapshot.docs.map(cac => cac.data());
  console.log(cacheList);
  return cacheList;
}

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
    const db = getDb();

    const promptCacheRef = doc(db, 'prompt_cache', promptId);

    const existing = await getDoc(promptCacheRef);
    if (!existing.exists()) {
      console.log('[cache-read] Prompt Cache does NOT exist for: ', promptId);
      return res.status(200).json({ status: 'miss' });
    }

    console.log("[cache-read] It exists! ", existing);

    const entry = existing.data().data;
    console.log("[cache-read] Found data from the database! ");
    const updatedAt = Timestamp.now().toMillis();
    const ageMs = Date.now() - updatedAt;

    if (ageMs > STALE_TTL_MS) {
      // Treat as miss — client should request a fresh fetch
      return res.status(200).json({ status: 'expired' });      
    }

    const status = ageMs < FRESH_TTL_MS ? 'fresh' : 'stale';

    console.log("[cache-read] Creating new CacheData object with text: ", entry);

    const entryData: GeminiGenerateResponse = {
      text:               entry.text              ?? '',
      textWithCitations:  entry.textWithCitations ?? '',
      searchQueries:      entry.searchQueries     ?? [],
      groundingChunks:    entry.groundingChunks   ?? [],
      groundingSupports:  entry.groundingSupports ?? [],
      searchEntryPoint:   entry.searchEntryPoint  ?? null,
    }

    const existingPromptData: CacheData = {
      id: promptId,
      data: entryData,
      updatedAt: updatedAt
    }

    console.log("[cache-read] Found the existingPromptData:  ", existingPromptData);
    return res.status(200).json({
      status,
      updatedAt: updatedAt,
      ageMs,
      data: existingPromptData,
    });
  } catch (err) {
    console.error('[cache-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read from cache' });
  }
}
