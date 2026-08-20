import { Timestamp } from 'firebase/firestore';

// ––– Gemini Types ––––––––––––––––––––––––––––––


export type GeminiGenerateRequest = {
  prompt: string;
  instructions?: string;
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
};

// TypeScript interfaces for Gemini API response structure
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GroundingSupport {
  segment?: {
    startIndex: number;
    endIndex: number;
    text: string;
  };
  groundingChunkIndices?: number[];
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

export interface GeminiCandidate {
  content?: {
    parts?: Array<{ text: string }>;
    role?: string;
  };
  groundingMetadata?: GroundingMetadata;
}

export interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  text?: string;
}

export type GeminiStreamChunk = {
  text: string;
  isComplete: boolean;
  groundingMetadata?: GroundingMetadata;
};

export type GeminiStreamResponse = {
  stream: AsyncIterableIterator<GeminiStreamChunk>;
  getFullResponse: () => Promise<GeminiGenerateResponse>;
};

export type GeminiGenerateResponse = {
  text: string;
  textWithCitations: string;
  searchQueries?: string[];
  groundingMetadata?: GroundingMetadata;
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: string;
  raw?: any;
  error?: any;
};


// ––– Cache Types ––––––––––––––––––––––––––––––

export interface CachedResponse {
  data: GeminiGenerateResponse;
  timestamp: number;
  promptHash: string;
}

export interface CacheStorage {
  [key: string]: CachedResponse;
}

/** This is the type definition for all of the 'prompt_cache' database documents */
export interface CacheData {
  id: string;
  data: GeminiGenerateResponse;
  updatedAt: Timestamp;
  savedBy?: string;
}

// ––– Cache History ––––––––––––––––––––––––––––––


/** Pre-processed citation data derived from a single grounding chunk/supports pair */
export interface CitationSummary {
  title: string;                   // normalized key (lowercase, trimmed)
  displayTitle: string;            // original for display
  citationCount: number;
  firstAppearanceIndex: number;    // raw char offset
  firstAppearanceNormalized: number; // 0.0–1.0 relative to response length
  avgAppearanceIndex: number;
}

export interface HistoryEntry {
  capturedAt: Timestamp;
  promptId: string;                // denormalized for easier cross-collection queries
  citations: CitationSummary[];    // pre-processed, replaces raw groundingChunks/Supports
  searchQueries: string[];         // straight from GeminiGenerateResponse
  textHeadings: string[];          // extracted markdown headings, emoji stripped
}

/** One document in the prompt_stats collection — aggregated metrics across all generations */
export interface PromptStats {
  promptId: string;
  totalGenerations: number;
  lastUpdatedAt: Timestamp;
  // keyed by CitationSummary.title
  citationFrequency: Record<string, number>;       // sum of citationCount across all generations
  citationFirstAppearanceAvg: Record<string, number>; // rolling avg of firstAppearanceNormalized
  citationGenerationCount: Record<string, number>; // how many generations this source appeared in
  allSearchQueries: string[];                      // cumulative arrayUnion
  headingFrequency: Record<string, number>;        // sum across all generations
}


// ––– Saved Block Types ––––––––––––––––––––––––––––––

export type BlockSegment = {
  heading: string;
  content: string;
  citations: GroundingChunk[];
};

export type SavedBlock = {
  id: string;
  title: string;
  text: string;
  citations: GroundingChunk[];
  createdAt: number;
  updatedAt: number;
};


// ––– User & Subscription Types ––––––––––––––––––––––––––––––

export type UserProfile = {
  email: string;
  createdAt: number;
  weeklyReport: boolean;
};

export type EmailSubscription = {
  email: string;
  subscribedAt: number;
  active: boolean;
};

// ––– Other Types ––––––––––––––––––––––––––––––

export type CloudSaveState = 'idle' | 'saving' | 'saved' | 'error';

export type NewsItem = {
  source: string;
  date: string;
  updates: string[];
  impact: string;
  link: string;
  action: string;
};

export interface Shortcut {
  id: string;
  name: string; 
  description: string;
  prompt: string; 
  icon: string;
  instructions: string;
}

