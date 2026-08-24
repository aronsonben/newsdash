import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { HistoryEntry } from '../src/types';

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

/** Reads the last N history entries from the prompt_cache/{promptId}/history subcollection */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId, limit: limitParam } = req.query;
  if (!promptId || typeof promptId !== 'string') {
    return res.status(400).json({ error: '`promptId` query parameter is required' });
  }

  const entryLimit = Math.min(
    parseInt(typeof limitParam === 'string' ? limitParam : '10', 10) || 10,
    50 // hard cap
  );

  try {
    const db = getDb();
    const historyRef = collection(db, `prompt_cache/${promptId}/history`);
    const q = query(historyRef, orderBy('capturedAt', 'desc'), limit(entryLimit));
    const snapshot = await getDocs(q);

    const entries = snapshot.docs.map(d => {
      const data = d.data() as HistoryEntry;
      // Serialize Firestore Timestamp → ISO string for JSON transport
      return {
        ...data,
        capturedAt: data.capturedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return res.status(200).json({ entries });
  } catch (err) {
    console.error('[history-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read history' });
  }
}
