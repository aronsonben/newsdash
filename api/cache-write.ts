import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, Firestore, doc, setDoc, updateDoc, addDoc, increment, arrayUnion, Timestamp } from "firebase/firestore";
import { CacheData, CitationSummary, HistoryEntry, GroundingChunk, GroundingSupport, PromptStats } from '../src/types';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_BROWSER_API_KEY,
  authDomain: "newsdash-concourse.firebaseapp.com",
  projectId: "newsdash-concourse",
  storageBucket: "newsdash-concourse.firebasestorage.app",
  messagingSenderId: "809304184792",
  appId: "1:809304184792:web:55f10ffc84aab0b6db04ad"
};

const app = initializeApp(firebaseConfig);

function getDb(): Firestore {
  const db = getFirestore(app);
  return db;
}

// ─── Pre-processing helpers ───────────────────────────────────────────────────

/** Dots are Firestore path separators in updateDoc — replace to avoid misinterpretation */
function toFieldKey(s: string): string {
  return s.replace(/\./g, '-').replace(/\//g, '-').substring(0, 500);
}

/** Extracts markdown headings from response text, stripping emojis for clean keys */
function extractHeadings(text: string): string[] {
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
function buildCitationSummaries(
  chunks: GroundingChunk[],
  supports: GroundingSupport[],
  textLength: number
): CitationSummary[] {
  // Map chunkIndex → { title, displayTitle }
  const chunkMap = new Map<number, { title: string; displayTitle: string }>();
  for (let i = 0; i < chunks.length; i++) {
    const raw = chunks[i]?.web?.title;
    if (!raw) continue;
    chunkMap.set(i, { displayTitle: raw, title: raw.toLowerCase().trim() });
  }

  // Accumulate per-title appearance data across all supports
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

  // Flatten accumulator into CitationSummary[]
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

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { promptId, data, savedBy } = req.body ?? {};

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
    updatedAt:         Timestamp.now(),
    ...(savedBy && typeof savedBy === 'string' ? { savedBy } : {}),
  };

  try {
    const db = getDb();
    const promptCacheRef = doc(db, 'prompt_cache', promptId);
    await setDoc(promptCacheRef, cacheData);

    // ── History + stats writes are fire-and-forget; a failure here does not fail the cache write
    await writeHistory(db, promptId, data).catch((err) => {
      console.error('[cache-write] History/stats write error:', err);
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[cache-write] Firestore write error:', err);
    return res.status(500).json({ error: 'Failed to write to cache' });
  }
}

/** Appends a HistoryEntry subcollection doc and updates the prompt_stats aggregate */
async function writeHistory(db: Firestore, promptId: string, data: any): Promise<void> {
  console.log("[cache-write] Writing to cache via the cache-write endpoint!!", promptId);

  // First get the database reference objects
  const historyRef = collection(db, `prompt_cache/${promptId}/history`);
  const statsRef = doc(db, 'prompt_stats', promptId);

  // Get some of the more straightforward data settled here
  const searchQueries: string[] = data.searchQueries ?? [];
  const textHeadings = extractHeadings(data.text);
  const citations = buildCitationSummaries(
    data.groundingChunks ?? [],
    data.groundingSupports ?? [],
    data.text.length
  );
  
  console.log("[cache-write] Succeeded building textHeadings & citaitons: ", textHeadings, " ---- ", citations);

  // Instantiate the history entry to be saved
  const historyEntry: HistoryEntry = {
    capturedAt: Timestamp.now(),
    promptId,
    citations,
    searchQueries,
    textHeadings,
  };

  // ----
  // Build the stats update object with dynamic dot-notation map keys
  const statsUpdate: Record<string, any> = {
    promptId,
    totalGenerations: increment(1),
    lastUpdatedAt: Timestamp.now(),
    ...(searchQueries.length > 0 ? { allSearchQueries: arrayUnion(...searchQueries) } : {}),
  };

  if (textHeadings.length > 0) {
    statsUpdate['allHeadings'] = arrayUnion(...textHeadings);
  }
  for (const citation of citations) {
    const key = toFieldKey(citation.title);
    statsUpdate[`citationFrequency.${key}`] = increment(citation.citationCount);
    statsUpdate[`citationFirstAppearanceSum.${key}`] = increment(citation.firstAppearanceNormalized);
    statsUpdate[`citationGenerationCount.${key}`] = increment(1);
  }

  console.log("[cache-write] Adding history entry... ");
  try {
    await addDoc(historyRef, historyEntry);
  } catch (e: any) {
    console.log("[cache-write] failed to add new history doc: ", e);
    throw e;
  }
  console.log("[cache-write] Returned from history entry...");

  // updateDoc supports dot-notation as nested paths; setDoc treats dots as literal field names (invalid in Firestore)
  try {
    console.log("[cache-write] Upserting stats doc");
    await updateDoc(statsRef, statsUpdate);
  } catch (e: any) {
    if (e?.code === 'not-found') {
      console.log("[cache-write] Stats doc not found, creating for first time");
      await setDoc(statsRef, { promptId });
      await updateDoc(statsRef, statsUpdate);
    } else {
      console.log("[cache-write] Writing stats to cache failed...", e);
      throw e;
    }
  }
}

