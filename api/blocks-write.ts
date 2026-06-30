import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { SavedBlock } from '../src/types';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_BROWSER_API_KEY,
  authDomain: 'newsdash-concourse.firebaseapp.com',
  projectId: 'newsdash-concourse',
  storageBucket: 'newsdash-concourse.firebasestorage.app',
  messagingSenderId: '809304184792',
  appId: '1:809304184792:web:55f10ffc84aab0b6db04ad',
};

const MAX_BLOCKS = 25;

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, block } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: '`userId` is required' });
  }
  if (!block || typeof block !== 'object' || typeof block.id !== 'string') {
    return res.status(400).json({ error: '`block` with a string `id` is required' });
  }

  try {
    const db = getDb();
    const blocksRef = collection(db, 'users', userId, 'saved_blocks');

    // Enforce 25-block limit — allow overwrites of blocks that already exist.
    const snapshot = await getDocs(blocksRef);
    const alreadyExists = snapshot.docs.some(d => d.id === block.id);
    if (!alreadyExists && snapshot.size >= MAX_BLOCKS) {
      return res.status(400).json({ error: 'Block limit reached (25/25)' });
    }

    const blockRef = doc(blocksRef, block.id);
    await setDoc(blockRef, block as SavedBlock);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[blocks-write] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to write block' });
  }
}
