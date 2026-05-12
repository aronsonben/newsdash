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

interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text: string }>;
    role?: string;
  };
  groundingMetadata?: GroundingMetadata;
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  text?: string;
}

export type GeminiGenerateResponse = {
  text: string;
  textWithCitations: string;
  searchQueries?: string[];
  groundingMetadata?: GroundingMetadata;
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: string;
  raw?: any;
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
}


// ––– Other Types ––––––––––––––––––––––––––––––

export interface Shortcut {
  id: string;
  name: string; 
  description: string;
  prompt: string; 
  icon: string;
  instructions: string;
}