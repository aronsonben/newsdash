import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireCron } from './_lib/auth';
import { getShortcut } from './_lib/shortcuts';
import { generateForShortcut } from './_lib/gemini';
import { writeCacheEntry } from './_lib/cache';

/**
 * Cron-triggered: regenerates one shortcut and writes it to prompt_cache/{id},
 * pre-warming the cache before the weekly digest. No cooldown; the cron always refreshes.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireCron(req, res)) return;

  const { id } = req.body ?? {};
  const shortcut = getShortcut(id);
  if (!shortcut) {
    return res.status(400).json({ error: 'Unknown shortcut id' });
  }

  try {
    const generated = await generateForShortcut(shortcut);
    await writeCacheEntry(shortcut.id, generated, 'WeeklyRefreshBot');
    console.log(`[refresh-shortcut] Cache refreshed for: ${shortcut.id}`);
    return res.status(200).json({ success: true, id: shortcut.id });
  } catch (error) {
    console.error(`[refresh-shortcut] Error refreshing shortcut ${shortcut.id}:`, error);
    return res.status(500).json({ error: 'Failed to refresh shortcut' });
  }
}
