import { CacheData, GeminiStreamResponse, GeminiGenerateResponse, PromptStats, HistoryEntry, SerializedTimestamp } from 'src/types';
import { auth } from './auth';

export type GenerateRequest = {
  shortcutId: string;
  displayName?: string;
};

/** Builds a stream-shaped error response so callers handle failures the same way as successes. */
function errorStream(
  errorText: string,
  errorType: 'config' | 'quota' | 'auth' | 'network' | 'unknown',
  status: number
): GeminiStreamResponse {
  const errorResponse: GeminiGenerateResponse = {
    text: errorText,
    textWithCitations: errorText,
    searchQueries: [],
    error: { type: errorType, status, message: errorText },
  };
  return {
    stream: (async function* () {
      yield { text: errorText, isComplete: true, error: errorType };
    })(),
    getFullResponse: async () => errorResponse,
  };
}

export const apiClient = {
  /**
   * Asks the server to generate (or serve the recently cached) news for a shortcut.
   * The server owns the prompt, model and cooldown; the client only names the shortcut.
   */
  async generate(req: GenerateRequest): Promise<GeminiStreamResponse> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      return errorStream('Please sign in to refresh the news.', 'auth', 401);
    }

    let res: Response;
    try {
      res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ shortcutId: req.shortcutId, displayName: req.displayName }),
      });
    } catch {
      return errorStream('Whoops! Service temporarily unavailable. Please try again.', 'network', 0);
    }

    if (!res.ok) {
      if (res.status === 401) return errorStream('Please sign in to refresh the news.', 'auth', res.status);
      if (res.status === 429) return errorStream('Whoops! API quota exceeded. Please try again later.', 'quota', res.status);
      if (res.status >= 500) return errorStream('Whoops! Service temporarily unavailable. Please try again.', 'network', res.status);
      return errorStream(`Request failed (${res.status}).`, 'unknown', res.status);
    }

    const data: GeminiGenerateResponse = await res.json();

    // Wrap the full response in a GeminiStreamResponse so callers need no changes
    return {
      stream: (async function* () {
        yield { text: data.text, isComplete: true, groundingMetadata: data.groundingMetadata };
      })(),
      getFullResponse: async () => data,
    };
  },
};

// ─── Firestore cache (via Vercel serverless functions) ────────────────────────

export type FirestoreReadResult =
  | { status: 'fresh' | 'stale'; data: CacheData; updatedAt: SerializedTimestamp; ageMs: number }
  | { status: 'miss' };

export const firestoreCache = {
  /** Reads the shared cached response for a shortcut via the server. */
  async read(promptId: string): Promise<FirestoreReadResult> {
    const res = await fetch(`/api/cache-read?promptId=${encodeURIComponent(promptId)}`);
    if (!res.ok) {
      console.error('[firestoreCache.read] API error', res.status);
      return { status: 'miss' };
    }
    return res.json() as Promise<FirestoreReadResult>;
  },
};

// ─── Stats & history (via Vercel serverless functions) ────────────────────────

export const statsClient = {
  /** Reads the aggregate PromptStats doc for a given shortcut */
  async readStats(promptId: string): Promise<PromptStats | null> {
    const res = await fetch(`/api/stats-read?promptId=${encodeURIComponent(promptId)}`);
    if (!res.ok) {
      console.error('[statsClient.readStats] API error', res.status);
      return null;
    }
    const data = await res.json();
    return data.status === 'ok' ? (data.stats as PromptStats) : null;
  },

  /** Reads the last N history entries for a given shortcut */
  async readHistory(promptId: string, historyLimit = 10): Promise<HistoryEntry[]> {
    const res = await fetch(
      `/api/history-read?promptId=${encodeURIComponent(promptId)}&limit=${historyLimit}`
    );
    if (!res.ok) {
      console.error('[statsClient.readHistory] API error', res.status);
      return [];
    }
    const data = await res.json();
    return (data.entries ?? []) as HistoryEntry[];
  },
};
