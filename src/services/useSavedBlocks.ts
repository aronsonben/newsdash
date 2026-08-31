import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, deleteUserBlock, getUserBlocks, saveUserBlock, updateUserBlock } from '../lib/firestore';
import { SavedBlock } from 'src/types';

// ─── Storage helpers ──────────────────────────────────────────────────────────
// Authenticated users → localStorage (persists across tabs and sessions).
// Unauthenticated users → sessionStorage (ephemeral, cleared on tab close).

const MAX_BLOCKS = 25;

function getStorage(userId: string | null): { storage: Storage; key: string } {
  if (userId) {
    return { storage: localStorage, key: `newsdash_saved_blocks` };
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
    // console.log("[useSavedBlocks] Persisting change of savedBlocks to storage...", blocks );
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

    // console.log("[useSavedBlocks] A user is signed in, fetching saved blocks...");
    getUserBlocks(userId)
      .then(data => {
        // console.log("[useSavedBlocks][effect] Fetched (hydrated) blocks from firestore: ", data);
        if (!data) return;
        setBlocks(data);
      })
      .catch(() => {
        console.log("[useSavedBlocks][effect] Failed to hydrate blocks from firestore for user: ", userId);
      });
  }, [userId]);

  const limitReached = blocks.length >= MAX_BLOCKS;

  /** Allow a user to save a block of text. If a user is signed in, save to database. Otherwise only save to sessionStorage. */
  const addBlock = async (block: Omit<SavedBlock, 'createdAt' | 'updatedAt'>): Promise<void> => {
    if (limitReached) return;

    try {
      const now = Date.now();
      const newBlock: SavedBlock = { ...block, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      setBlocks(prev => [...prev, newBlock]);
      
      if (userId) {
        await saveUserBlock(userId, newBlock);
      }
    } catch (error) {
      console.log("[useSavedBlocks] Error saving blocks... ", );
    }
  };

  /** Update a given block with new edits */
  const updateBlock = (id: string, updates: Partial<Pick<SavedBlock, 'title' | 'text'>>) => {
    try {
      setBlocks(prev => {
        const next = prev.map(b => (b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b));
        if (userId) {
          const updated = next.find(b => b.id === id);
          if (updated) {
            updateUserBlock(userId, updated);
          }
        }
        return next;
      });     
    } catch (error) {
      console.log("[useSavedBlocks] Error saving blocks", error);
    }
  };

  /** Remove a given block from storage and/or database */
  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (userId) {
      deleteUserBlock(userId, id);
    }
  };

  /** Clear all blocks from state and local storage on sign-out */
  const clearBlocks = () => {
    setBlocks([]);
    localStorage.removeItem('newsdash_saved_blocks');
  };

  return { blocks, addBlock, updateBlock, removeBlock, clearBlocks, limitReached };
}

