import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './_lib/admin.js';
import { requireUser } from './_lib/auth.js';
import { getShortcut } from './_lib/shortcuts.js';
import { generateForShortcut } from './_lib/gemini.js';
import { writeCacheEntry, serializeTimestamp } from './_lib/cache.js';
import { sanitizeDisplayName } from './_lib/validate.js';

// TODO: this cooldown hour env var has not been defined yet, will always default to 6 (9/29/26)
const COOLDOWN_MS = (Number(process.env.GENERATE_COOLDOWN_HOURS) || 6) * 60 * 60 * 1000;
// Longer than maxDuration so a crashed run's lease still expires on its own.
const LEASE_MS = 2 * 60 * 1000;

/** Builds the client response from a stored prompt_cache document. */
function cachedResponse(entry: FirebaseFirestore.DocumentData) {
  const d = entry.data ?? {};
  return {
    text: d.text ?? '',
    textWithCitations: d.textWithCitations ?? '',
    searchQueries: d.searchQueries ?? [],
    groundingChunks: d.groundingChunks ?? [],
    groundingSupports: d.groundingSupports ?? [],
    searchEntryPoint: d.searchEntryPoint ?? undefined,
    cached: true,
    updatedAt: serializeTimestamp(entry.updatedAt),
    savedBy: typeof entry.savedBy === 'string' ? entry.savedBy : undefined,
  };
}

/** True if the stored entry is younger than the global cooldown. */
function isWithinCooldown(entry: FirebaseFirestore.DocumentData | undefined): boolean {
  const updatedAt = entry?.updatedAt;
  return updatedAt instanceof Timestamp && Date.now() - updatedAt.toMillis() < COOLDOWN_MS;
}

/**
 * Atomically claims the per-shortcut generation lease so concurrent requests
 * trigger at most one Gemini call. Returns false if another run holds it.
 */
async function acquireLease(shortcutId: string): Promise<boolean> {
  const db = getAdminDb();
  const ref = db.doc(`generation_locks/${shortcutId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const expiresAt = snap.data()?.expiresAt;
    if (expiresAt instanceof Timestamp && expiresAt.toMillis() > Date.now()) return false;
    tx.set(ref, { expiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS) });
    return true;
  });
}

/**
 * Server-controlled generation: the client names a shortcut only. Serves the cached
 * entry inside the cooldown window, otherwise runs Gemini once and stores the result.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { shortcutId, displayName } = req.body ?? {};
  const shortcut = getShortcut(shortcutId);
  if (!shortcut) {
    return res.status(400).json({ error: 'Unknown shortcutId' });
  }

  const cacheRef = getAdminDb().doc(`prompt_cache/${shortcut.id}`);

  try {
    const existing = await cacheRef.get();
    if (existing.exists && isWithinCooldown(existing.data())) {
      return res.status(200).json(cachedResponse(existing.data()!));
    }

    if (!(await acquireLease(shortcut.id))) {
      if (existing.exists) return res.status(200).json(cachedResponse(existing.data()!));
      res.setHeader('Retry-After', '30');
      return res.status(429).json({ error: 'Generation already in progress. Try again shortly.' });
    }

    try {
      // Another request may have finished between our first read and the lease claim.
      const recheck = await cacheRef.get();
      if (recheck.exists && isWithinCooldown(recheck.data())) {
        return res.status(200).json(cachedResponse(recheck.data()!));
      }

      const generated = await generateForShortcut(shortcut);
      const savedBy = sanitizeDisplayName(displayName);
      const updatedAt = await writeCacheEntry(shortcut.id, generated, savedBy);

      return res.status(200).json({
        ...generated,
        cached: false,
        updatedAt: serializeTimestamp(updatedAt),
        savedBy,
      });
    } finally {
      await getAdminDb().doc(`generation_locks/${shortcut.id}`).delete().catch((err) => {
        console.error('[api/generate] Failed to release lease:', err);
      });
    }
  } catch (err) {
    console.error('[api/generate] Error:', err);
    return res.status(500).json({ error: 'Failed to generate news. Please try again later.' });
  }
}
