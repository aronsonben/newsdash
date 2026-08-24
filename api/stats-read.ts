import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { PromptStats } from '../src/types';

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

/** Reads the aggregate prompt_stats document for a given promptId */
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
    const statsRef = doc(db, 'prompt_stats', promptId);
    const snap = await getDoc(statsRef);
    if (!snap.exists()) {
      return res.status(200).json({ status: 'miss' });
    }
    const data = snap.data() as PromptStats;
    // Firestore Timestamp objects are not JSON-serializable; convert lastUpdatedAt
    const serialized = {
      ...data,
      lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString() ?? null,
    };
    return res.status(200).json({ status: 'ok', stats: serialized });
  } catch (err) {
    console.error('[stats-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read stats' });
  }
}
