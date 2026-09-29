import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './_lib/admin.js';
import { isShortcutId } from './_lib/shortcuts.js';
import { serializeTimestamp } from './_lib/cache.js';

const FRESH_TTL_MS = 24 * 60 * 60 * 1000;

/** Reads the cached response for a shortcut; age classification (fresh/stale) is left to the client to surface. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId } = req.query;
  if (!isShortcutId(promptId)) {
    return res.status(400).json({ error: 'Unknown or missing `promptId`' });
  }

  try {
    const snap = await getAdminDb().doc(`prompt_cache/${promptId}`).get();
    if (!snap.exists) {
      return res.status(200).json({ status: 'miss' });
    }

    const entry = snap.data()!;
    const storedUpdatedAt = entry.updatedAt;
    if (!(storedUpdatedAt instanceof Timestamp)) {
      return res.status(200).json({ status: 'miss' });
    }

    // Old schema kept fields at the top level; new schema nests them under `data`.
    const payload: Record<string, any> = entry.data && typeof entry.data === 'object' ? entry.data : entry;
    const ageMs = Date.now() - storedUpdatedAt.toMillis();
    const updatedAt = serializeTimestamp(storedUpdatedAt);

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      status: ageMs < FRESH_TTL_MS ? 'fresh' : 'stale',
      updatedAt,
      ageMs,
      data: {
        id: promptId,
        data: {
          text: payload.text ?? '',
          textWithCitations: payload.textWithCitations ?? '',
          searchQueries: payload.searchQueries ?? [],
          groundingChunks: payload.groundingChunks ?? [],
          groundingSupports: payload.groundingSupports ?? [],
          searchEntryPoint: payload.searchEntryPoint ?? null,
        },
        updatedAt,
        ...(typeof entry.savedBy === 'string' ? { savedBy: entry.savedBy } : {}),
      },
    });
  } catch (err) {
    console.error('[cache-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read from cache' });
  }
}
