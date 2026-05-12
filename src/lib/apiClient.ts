import { CacheData, GeminiStreamResponse } from 'src/types';
import { generateStreamWithGemini, isGeminiConfigured, GeminiGenerateResponse } from './geminiClient';

export type GenerateRequest = {
  prompt: string;
  model?: string; // e.g. 'openai/gpt-4o' or any supported model alias
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
      if (!isGeminiConfigured()) {
        const errorText = `Gemini not configured. Please set VITE_GEMINI_API_KEY in .env.local for local development.`;
        const errorResponse: GeminiGenerateResponse = { text: errorText, textWithCitations: errorText, searchQueries: [] };
        return {
          stream: (async function* () { yield { text: errorText, isComplete: true }; })(),
          getFullResponse: async () => errorResponse,
        };
      }
      console.log('[dev] Calling Gemini directly with prompt:', req.prompt);
      return generateStreamWithGemini({
        prompt: req.prompt,
        temperature: req.temperature ?? 0.7,
        modelName: req.model ?? 'gemini-2.5-flash',
      });
    }

    // ── Production: route through the Vercel serverless function ──
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: req.prompt,
        model: req.model ?? 'gemini-2.5-flash',
        temperature: req.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const errorText = `API error ${res.status}: ${await res.text()}`;
      const errorResponse: GeminiGenerateResponse = { text: errorText, textWithCitations: errorText, searchQueries: [] };
      return {
        stream: (async function* () { yield { text: errorText, isComplete: true }; })(),
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
  async save(promptId: string, data: GeminiGenerateResponse): Promise<boolean> {
    const res = await fetch('/api/cache-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, data }),
    });
    if (!res.ok) {
      console.error('[firestoreCache.save] API error', res.status, await res.text());
      return false;
    }
    return true;
  },
};
