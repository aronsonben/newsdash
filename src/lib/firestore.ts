import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { app } from './auth';
import { SavedBlock, UserProfile } from '../types';

// Single Firestore instance for the browser client SDK.
// Security rules enforce per-user access — requests are automatically
// authenticated by the Firebase Auth session.
export const db = getFirestore(app);

/**
 * Reads the users/{userId} profile document from Firestore.
 * Returns null if the document doesn't exist yet (user has never subscribed).
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}


/** ***********************************************
 *  ****** SAVED BLOCKS ***************************
 *  *********************************************** */

/** Fetch all saved blocks for a given user */
export async function getUserBlocks(userId: string): Promise<SavedBlock[] | null> {
  if (!userId) return null;
  try {
    const blocksSnap = await getDocs(collection(db, `users/${userId}/saved_blocks`));
    const savedBlocks = blocksSnap.docs.map(d => d.data() as SavedBlock);
    return savedBlocks;
  } catch (error) {
    console.error("[firestore] Failed to fetch blocks for user: ", userId);
    return null;
  }
}

/** Save a block to the database for the given user */
export async function saveUserBlock(userId: string, newBlock: SavedBlock): Promise<void> {
  if (!userId) return;
  try {
    console.log("[firestore] Saving new block for user ", newBlock.id);
    const newBlockRef = doc(db, `users/${userId}/saved_blocks`, newBlock.id);
    await setDoc(newBlockRef, newBlock);
  } catch (error) {
    console.error("[firestore] Failed to save block for user: ", userId);
  }
}

/** Update a specified block for a given user */
export async function updateUserBlock(userId: string, updatedBlock: SavedBlock): Promise<void> {
  if (!userId) return;
  try {
    console.log("[firestore] Updating a block for user ", updatedBlock.id);
    const existingBlockRef = doc(db, `users/${userId}/saved_blocks`, updatedBlock.id);
    const existingBlock = await getDoc(existingBlockRef);
    if (!existingBlock.exists()) return; // todo: throw error
    await setDoc(existingBlockRef, updatedBlock);
  } catch (error) {
    console.error("[firestore] Failed to save block for user: ", userId);
  }
}

/** Delete a specified block for a given user */
export async function deleteUserBlock(userId: string, blockId: string): Promise<void> {
  if (!userId) return;
  try {
    console.log("[firestore] Deleting block for user ", blockId);
    const existingBlockRef = doc(db, `users/${userId}/saved_blocks`, blockId);
    await deleteDoc(existingBlockRef)
  } catch (error) {
    console.error("[firestore] Failed to save block for user: ", userId);
  }
}