import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firestore';
import { SavedBlock } from 'src/types';

// ─── Storage helpers ──────────────────────────────────────────────────────────
// Authenticated users → localStorage (persists across tabs and sessions).
// Unauthenticated users → sessionStorage (ephemeral, cleared on tab close).

const MAX_BLOCKS = 25;

function getStorage(userId: string | null): { storage: Storage; key: string } {
  if (userId) {
    return { storage: localStorage, key: `newsdash_saved_blocks_${userId}` };
  }
  return { storage: sessionStorage, key: 'newsdash_saved_blocks' };
}

function readFromStorage(userId: string | null): SavedBlock[] {
  try {
    const { storage, key } = getStorage(userId);
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedBlock[]) : [];
  } catch {
    return [];
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSavedBlocks(userId: string | null) {
  const [blocks, setBlocks] = useState<SavedBlock[]>(() => readFromStorage(userId));
  const hasSyncedRef = useRef(false);

  // Persist every change to the appropriate local storage tier immediately.
  useEffect(() => {
    try {
      const { storage, key } = getStorage(userId);
      storage.setItem(key, JSON.stringify(blocks));
    } catch (e) {
      console.error('[useSavedBlocks] Failed to persist blocks', e);
    }
  }, [blocks, userId]);

  // On mount: hydrate from Firestore once (authenticated users only).
  // Firestore is the source of truth — remote data overwrites local if present.
  // This runs once per mount, so a fast local add before the fetch completes
  // won't be overwritten on subsequent re-renders.
  useEffect(() => {
    if (!userId || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    getDocs(collection(db, 'users', userId, 'saved_blocks'))
      .then(snapshot => {
        const remoteBlocks = snapshot.docs.map(d => d.data() as SavedBlock);
        if (remoteBlocks.length > 0) {
          setBlocks(remoteBlocks);
        }
      })
      .catch(() => {
        console.warn('[useSavedBlocks] Firestore hydration skipped (not signed in or rules blocked)');
      });
  }, [userId]);

  const limitReached = blocks.length >= MAX_BLOCKS;

  const addBlock = (block: Omit<SavedBlock, 'id' | 'createdAt' | 'updatedAt'>): boolean => {
    if (limitReached) return false;
    const now = Date.now();
    const newBlock: SavedBlock = { ...block, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    setBlocks(prev => [...prev, newBlock]);
    if (userId) setDoc(doc(db, 'users', userId, 'saved_blocks', newBlock.id), newBlock).catch(() => {});
    return true;
  };

  const updateBlock = (id: string, updates: Partial<Pick<SavedBlock, 'title' | 'text'>>) => {
    setBlocks(prev => {
      const next = prev.map(b => (b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b));
      if (userId) {
        const updated = next.find(b => b.id === id);
        if (updated) setDoc(doc(db, 'users', userId, 'saved_blocks', updated.id), updated).catch(() => {});
      }
      return next;
    });
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (userId) deleteDoc(doc(db, 'users', userId, 'saved_blocks', id)).catch(() => {});
  };

  return { blocks, addBlock, updateBlock, removeBlock, limitReached };
}

