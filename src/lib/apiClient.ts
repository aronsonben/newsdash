import { CacheData, GeminiStreamResponse, GeminiGenerateResponse, SavedBlock } from 'src/types';
import { generateStreamWithGemini } from './geminiClient';

export type GenerateRequest = {
  prompt: string;
  modelName?: string; 
  instructions?: string;
  temperature?: number;
  messages?: { role: 'system' | 'user' | 'assistant'; content: string }[]; // optional full history
  stream?: boolean; // future expansion
  provider?: 'gemini' | 'openrouter' | 'auto'; // specify which provider to use
};

export type GenerateResponse = {
  text: string;
  searchQueries?: string[];
  groundingMetadata?: any;
  raw?: any;
};

export const apiClient = {
  async generate(req: GenerateRequest): Promise<GeminiStreamResponse> {
    // ── Local dev: call Gemini directly (VITE_GEMINI_API_KEY stays on your machine) ──
    if (import.meta.env.DEV) {
      console.log('[dev] Calling Gemini directly with prompt:', req.prompt);
      return generateStreamWithGemini({
        prompt: req.prompt,
        temperature: req.temperature ?? 0.7,
        modelName: req.modelName ?? 'gemini-2.5-flash',
      });
    }

    // ── Production: route through the Vercel serverless function ──
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: req.prompt,
        model: req.modelName ?? 'gemini-2.5-flash',
        temperature: req.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      let errorText: string;
      let errorType: 'config' | 'quota' | 'network' | 'unknown' = 'unknown';

      // Parse error to determine type
      if (res.status === 500 && errorBody.includes('not configured')) {
        errorType = 'config';
        errorText = `⚠️ Whoops! API configuration error. I'll be fixing this soon, or contact me above.`;
      } else if (res.status === 429 || errorBody.includes('quota')) {
        errorType = 'quota';
        errorText = `⚠️ Whoops! API quota exceeded. Please try again later.`;
      } else if (res.status >= 500) {
        errorType = 'network';
        errorText = `⚠️ Whoops! Service temporarily unavailable. Please try again.`;
      } else {
        errorText = `API error ${res.status}: ${errorBody}`;
      }

      const errorResponse: GeminiGenerateResponse = { 
        text: errorText, 
        textWithCitations: errorText, 
        searchQueries: [],
        error: { type: errorType, status: res.status, message: errorBody }
      };
      
      return {
        stream: (async function* () { 
          yield { text: errorText, isComplete: true, error: errorType }; 
        })(),
        getFullResponse: async () => errorResponse,
      };
    }

    const data: GeminiGenerateResponse = await res.json();

    // Wrap the full response in a GeminiStreamResponse so callers need no changes
    return {
      stream: (async function* () {
        yield { text: data.text, isComplete: true, groundingMetadata: data.groundingMetadata };
      })(),
      getFullResponse: async () => data,
    };
  }
};

// ─── Firestore cache (via Vercel serverless functions) ────────────────────────

export type FirestoreReadResult =
  | { status: 'fresh' | 'stale'; data: CacheData; updatedAt: string; ageMs: number }
  | { status: 'miss' | 'expired' };

export const firestoreCache = {
  // Read from the cache via Firestore db
  async read(promptId: string): Promise<FirestoreReadResult> {
    const res = await fetch(`/api/cache-read?promptId=${encodeURIComponent(promptId)}`);
    if (!res.ok) {
      console.error('[firestoreCache.read] API error', res.status);
      return { status: 'miss' };
    }
    return res.json() as Promise<FirestoreReadResult>;
  },

  // Write to the Firestore db
  async save(promptId: string, data: GeminiGenerateResponse, savedBy?: string): Promise<boolean> {
    const res = await fetch('/api/cache-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, data, savedBy }),
    });
    if (!res.ok) {
      console.error('[firestoreCache.save] API error', res.status, await res.text());
      return false;
    }
    return true;
  },
};

// ─── Saved blocks (via Vercel serverless functions) ───────────────────────────

export const blocksClient = {
  async readAll(userId: string): Promise<SavedBlock[]> {
    const res = await fetch(`/api/blocks-read?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      console.error('[blocksClient.readAll] API error', res.status);
      return [];
    }
    const data = await res.json();
    return (data.blocks ?? []) as SavedBlock[];
  },

  async write(userId: string, block: SavedBlock): Promise<boolean> {
    const res = await fetch('/api/blocks-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, block }),
    });
    if (!res.ok) {
      console.error('[blocksClient.write] API error', res.status);
      return false;
    }
    return true;
  },

  async delete(userId: string, blockId: string): Promise<boolean> {
    const res = await fetch('/api/blocks-delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, blockId }),
    });
    if (!res.ok) {
      console.error('[blocksClient.delete] API error', res.status);
      return false;
    }
    return true;
  },
};

