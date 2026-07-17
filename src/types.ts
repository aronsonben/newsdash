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

interface CachedResponse {
  data: GeminiGenerateResponse;
  timestamp: number;
}

interface CacheStorage {
  [key: string]: CachedResponse;
}

export interface CacheData {
  id: string;
  data: GeminiGenerateResponse;
  updatedAt: number;
  savedBy?: string;
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

