import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { SavedBlock } from '../src/types';

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
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: '`userId` query parameter is required' });
  }

  try {
    const db = getDb();
    const blocksRef = collection(db, 'users', userId, 'saved_blocks');
    const snapshot = await getDocs(blocksRef);
    const blocks: SavedBlock[] = snapshot.docs.map(d => d.data() as SavedBlock);
    return res.status(200).json({ blocks });
  } catch (err) {
    console.error('[blocks-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read saved blocks' });
  }
}
