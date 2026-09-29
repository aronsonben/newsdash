import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './admin';
import type { GeneratedNews, GroundingChunk, GroundingSupport } from './_lib/gemini';

interface CitationSummary {
  title: string;
  displayTitle: string;
  citationCount: number;
  firstAppearanceIndex: number;
  firstAppearanceNormalized: number;
  avgAppearanceIndex: number;
}

/** Replaces characters that are unsafe in Firestore map keys; must stay stable so existing stats keys keep matching. */
export function toFieldKey(s: string): string {
  return s.replace(/\./g, '-').replace(/\//g, '-').substring(0, 500);
}

/** Extracts markdown headings from response text, stripping emojis for clean keys */
export function extractHeadings(text: string): string[] {
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(text)) !== null) {
    const cleaned = match[1].replace(emojiRegex, '').trim();
    if (cleaned) headings.push(cleaned);
  }
  return headings;
}

/** Joins groundingChunks + groundingSupports into compact per-source citation metrics */
export function buildCitationSummaries(
  chunks: GroundingChunk[],
  supports: GroundingSupport[],
  textLength: number
): CitationSummary[] {
  const chunkMap = new Map<number, { title: string; displayTitle: string }>();
  for (let i = 0; i < chunks.length; i++) {
    const raw = chunks[i]?.web?.title;
    if (!raw) continue;
    chunkMap.set(i, { displayTitle: raw, title: raw.toLowerCase().trim() });
  }

  const accumulator = new Map<string, { displayTitle: string; count: number; appearances: number[] }>();
  for (const support of supports) {
    const startIndex = support.segment?.startIndex ?? 0;
    for (const chunkIdx of support.groundingChunkIndices ?? []) {
      const chunk = chunkMap.get(chunkIdx);
      if (!chunk) continue;
      const existing = accumulator.get(chunk.title);
      if (existing) {
        existing.count++;
        existing.appearances.push(startIndex);
      } else {
        accumulator.set(chunk.title, { displayTitle: chunk.displayTitle, count: 1, appearances: [startIndex] });
      }
    }
  }

  return Array.from(accumulator.entries()).map(([title, data]) => {
    const firstAppearanceIndex = Math.min(...data.appearances);
    const avgAppearanceIndex = Math.round(
      data.appearances.reduce((a, b) => a + b, 0) / data.appearances.length
    );
    return {
      title,
      displayTitle: data.displayTitle,
      citationCount: data.count,
      firstAppearanceIndex,
      firstAppearanceNormalized: textLength > 0 ? firstAppearanceIndex / textLength : 0,
      avgAppearanceIndex,
    };
  });
}

/** Converts a Firestore Timestamp to the {seconds, nanoseconds} shape the client expects. */
export function serializeTimestamp(ts: Timestamp | undefined | null): { seconds: number; nanoseconds: number } | null {
  return ts ? { seconds: ts.seconds, nanoseconds: ts.nanoseconds } : null;
}

/** Appends a history doc and merges aggregate counters into prompt_stats. */
async function writeHistoryAndStats(shortcutId: string, data: GeneratedNews): Promise<void> {
  const db = getAdminDb();
  const now = Timestamp.now();

  const searchQueries = data.searchQueries ?? [];
  const textHeadings = extractHeadings(data.text);
  const citations = buildCitationSummaries(data.groundingChunks ?? [], data.groundingSupports ?? [], data.text.length);

  await db.collection(`prompt_cache/${shortcutId}/history`).add({
    capturedAt: now,
    promptId: shortcutId,
    citations,
    searchQueries,
    textHeadings,
  });

  const citationFrequency: Record<string, FieldValue> = {};
  const citationFirstAppearanceSum: Record<string, FieldValue> = {};
  const citationGenerationCount: Record<string, FieldValue> = {};
  for (const c of citations) {
    const key = toFieldKey(c.title);
    citationFrequency[key] = FieldValue.increment(c.citationCount);
    citationFirstAppearanceSum[key] = FieldValue.increment(c.firstAppearanceNormalized);
    citationGenerationCount[key] = FieldValue.increment(1);
  }

  await db.doc(`prompt_stats/${shortcutId}`).set(
    {
      promptId: shortcutId,
      totalGenerations: FieldValue.increment(1),
      lastUpdatedAt: now,
      ...(searchQueries.length > 0 ? { allSearchQueries: FieldValue.arrayUnion(...searchQueries) } : {}),
      ...(textHeadings.length > 0 ? { allHeadings: FieldValue.arrayUnion(...textHeadings) } : {}),
      ...(citations.length > 0 ? { citationFrequency, citationFirstAppearanceSum, citationGenerationCount } : {}),
    },
    { merge: true }
  );
}

/**
 * Writes the generated result to prompt_cache/{id}, then records history and stats.
 * History/stats failures are logged and never fail the cache write.
 * Returns the server timestamp stored as updatedAt.
 */
export async function writeCacheEntry(shortcutId: string, data: GeneratedNews, savedBy: string): Promise<Timestamp> {
  const updatedAt = Timestamp.now();

  await getAdminDb().doc(`prompt_cache/${shortcutId}`).set({
    id: shortcutId,
    data: {
      text: data.text,
      textWithCitations: data.textWithCitations,
      searchQueries: data.searchQueries ?? [],
      groundingChunks: data.groundingChunks ?? [],
      groundingSupports: data.groundingSupports ?? [],
      searchEntryPoint: data.searchEntryPoint ?? null,
    },
    updatedAt,
    savedBy,
  });

  try {
    await writeHistoryAndStats(shortcutId, data);
  } catch (err) {
    console.error('[cache] History/stats write error:', err);
  }

  return updatedAt;
}
