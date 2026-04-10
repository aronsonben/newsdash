import { generateWithGemini, isGeminiConfigured, GeminiGenerateResponse } from './geminiClient';

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
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    const provider = req.provider ?? 'auto';
    
    // Auto-select provider: prefer Gemini if configured, fall back to OpenRouter
    const useGemini = provider === 'gemini' || (provider === 'auto' && isGeminiConfigured());
    
    // Use Gemini if selected/available
    if (useGemini) {
      if (!isGeminiConfigured()) {
        return { 
          text: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
          searchQueries: []
        };
      }
      
      // Convert messages to a single prompt if provided
      let prompt = req.prompt;
      console.log("Using prompt: ", prompt);
      
      return await generateWithGemini({
        prompt,
        temperature: req.temperature ?? 0.7,
        modelName: req.model ?? 'gemini-2.5-flash'
      });
    }
    
    // No provider configured
    console.log("No provider configued.");
    return { 
      text: `No AI provider configured. Please set VITE_GEMINI_API_KEY or VITE_OPENROUTER_API_KEY.`,
      searchQueries: []
    };
  }
};

// ─── Firestore cache (via Vercel serverless functions) ────────────────────────

export type FirestoreReadResult =
  | { status: 'fresh' | 'stale'; data: GeminiGenerateResponse; updatedAt: string; ageMs: number }
  | { status: 'miss' | 'expired' };

export const firestoreCache = {
  async read(promptId: string): Promise<FirestoreReadResult> {
    const res = await fetch(`/api/cache-read?promptId=${encodeURIComponent(promptId)}`);
    if (!res.ok) {
      console.error('[firestoreCache.read] API error', res.status);
      return { status: 'miss' };
    }
    return res.json() as Promise<FirestoreReadResult>;
  },

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
