import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_lib/admin';
import { isShortcutId } from './_lib/shortcuts';

/** Reads the last N history entries from the prompt_cache/{promptId}/history subcollection */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId, limit: limitParam } = req.query;
  if (!isShortcutId(promptId)) {
    return res.status(400).json({ error: 'Unknown or missing `promptId`' });
  }

  const entryLimit = Math.min(
    parseInt(typeof limitParam === 'string' ? limitParam : '10', 10) || 10,
    50 // hard cap
  );

  try {
    const snapshot = await getAdminDb()
      .collection(`prompt_cache/${promptId}/history`)
      .orderBy('capturedAt', 'desc')
      .limit(entryLimit)
      .get();

    const entries = snapshot.docs.map((d) => {
      const data = d.data();
      return { ...data, capturedAt: data.capturedAt?.toDate?.()?.toISOString() ?? null };
    });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({ entries });
  } catch (err) {
    console.error('[history-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read history' });
  }
}
