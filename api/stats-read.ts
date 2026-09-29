import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminDb } from './_lib/admin.js';
import { isShortcutId } from './_lib/shortcuts.js';

/** Reads the aggregate prompt_stats document for a given promptId */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId } = req.query;
  if (!isShortcutId(promptId)) {
    return res.status(400).json({ error: 'Unknown or missing `promptId`' });
  }

  try {
    const snap = await getAdminDb().doc(`prompt_stats/${promptId}`).get();
    if (!snap.exists) {
      return res.status(200).json({ status: 'miss' });
    }

    const data = snap.data()!;
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({
      status: 'ok',
      stats: { ...data, lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString() ?? null },
    });
  } catch (err) {
    console.error('[stats-read] Firestore error:', err);
    return res.status(500).json({ error: 'Failed to read stats' });
  }
}
