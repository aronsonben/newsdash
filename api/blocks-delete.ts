import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, blockId } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: '`userId` is required' });
  }
  if (!blockId || typeof blockId !== 'string') {
    return res.status(400).json({ error: '`blockId` is required' });
  }

  try {
    const db = getDb();
    const blockRef = doc(db, 'users', userId, 'saved_blocks', blockId);
    await deleteDoc(blockRef);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[blocks-delete] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to delete block' });
  }
}
