import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, Firestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { CacheData } from '../src/types';

const firebaseConfig = {
  apiKey: "AIzaSyCDapuZAlEepBaM6uXwnJCcGd3p8uUYteA",
  authDomain: "newsdash-concourse.firebaseapp.com",
  projectId: "newsdash-concourse",
  storageBucket: "newsdash-concourse.firebasestorage.app",
  messagingSenderId: "809304184792",
  appId: "1:809304184792:web:55f10ffc84aab0b6db04ad"
};

const app = initializeApp(firebaseConfig);

// ─── Firebase Admin singleton ─────────────────────────────────────────────────
// function getDb(): admin.firestore.Firestore {
//   if (!admin.apps.length) {
//     admin.initializeApp({
//       credential: admin.credential.cert({
//         projectId: process.env.FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//       }),
//     });
//   }
//   return admin.firestore();
// }

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
    id:                promptId,
    data: {
      text:              data.text,
      textWithCitations: data.textWithCitations,
      searchQueries:     data.searchQueries     ?? [],
      groundingChunks:   data.groundingChunks   ?? [],
      groundingSupports: data.groundingSupports ?? [],
      searchEntryPoint:  data.searchEntryPoint  ?? null,
    },
    updatedAt:         Timestamp.now().toMillis(),
  };

  try {
    const db = getDb();
    const promptCacheRef = doc(db, 'prompt_cache', promptId);
    await setDoc(promptCacheRef, cacheData);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[cache-write] Firestore write error:', err);
    return res.status(500).json({ error: 'Failed to write to cache' });
  }
}
