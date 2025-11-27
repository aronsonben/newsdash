import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Environment variables for Gemini API
const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
  ?? (import.meta.env as any).GEMINI_API_KEY;

let genAI: GoogleGenAI | null = null;
let model: GenerativeModel | null = null;

export function isGeminiConfigured() {
  return Boolean(apiKey);
}

export type GeminiGenerateRequest = {
  prompt: string;
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
};

// TypeScript interfaces for Gemini API response structure
interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

interface GroundingSupport {
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
    renderedContent: string;
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

function addCitations(text: string, groundingMetadata?: GroundingMetadata): string {
    if (!groundingMetadata?.groundingSupports || !groundingMetadata?.groundingChunks) {
        return text;
    }

    const supports = groundingMetadata.groundingSupports;
    const chunks = groundingMetadata.groundingChunks;
    let modifiedText = text;

    // Sort supports by end_index in descending order to avoid shifting issues when inserting.
    const sortedSupports = [...supports].sort(
        (a: GroundingSupport, b: GroundingSupport) => 
            (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
    );

    for (const support of sortedSupports) {
        const endIndex = support.segment?.endIndex;
        if (endIndex === undefined || !support.groundingChunkIndices?.length) {
            continue;
        }

        const citationLinks = support.groundingChunkIndices
            .map((i: number) => {
                const uri = chunks[i]?.web?.uri;
                if (uri) {
                    return `[${i + 1}](${uri})`;
                }
                return null;
            })
            .filter((link): link is string => link !== null);

        if (citationLinks.length > 0) {
            const citationString = ` ${citationLinks.join(", ")}`;
            modifiedText = modifiedText.slice(0, endIndex) + citationString + modifiedText.slice(endIndex);
        }
    }

    return modifiedText;
}

export async function generateWithGemini(req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  if (!isGeminiConfigured()) {
    return {
      text: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
      textWithCitations: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
      searchQueries: []
    };
  }

  const ai = new GoogleGenAI({apiKey: apiKey});
  const groundingTool = {
    googleSearch: {},
  };
  const config = {
    tools: [groundingTool],
  };

  try {
    // Make call to Gemini API with Grounding with Google Search
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: req.prompt,
      config,
    }) as GeminiApiResponse;

    // Get response text
    const text = response.text ?? 'Gemini API Response failed.';

    // Get groundingMetadata
    if (!response.candidates || !response.candidates[0]) {
      return {
        text,
        textWithCitations: text,
        searchQueries: []
      };
    }

    const candidate = response.candidates[0];
    const groundingMetadata = candidate.groundingMetadata;
    
    // Extract individual grounding metadata components
    const groundingSupports = groundingMetadata?.groundingSupports ?? [];
    const groundingChunks = groundingMetadata?.groundingChunks ?? [];
    const webSearchQueries = groundingMetadata?.webSearchQueries ?? [];
    const searchEntryPoint = groundingMetadata?.searchEntryPoint?.renderedContent ?? undefined;

    // Add citations to the text
    const textWithCitations = addCitations(text, groundingMetadata);

    console.log('Grounding metadata extracted:', {
      chunksCount: groundingChunks.length,
      supportsCount: groundingSupports.length,
      queriesCount: webSearchQueries.length,
      hasSearchEntryPoint: !!searchEntryPoint
    });

    return {
      text,
      textWithCitations,
      searchQueries: webSearchQueries,
      groundingMetadata,
      groundingChunks,
      groundingSupports,
      searchEntryPoint,
      raw: response
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    const errorText = `Error generating content: ${error instanceof Error ? error.message : String(error)}`;
    return {
      text: errorText,
      textWithCitations: errorText,
      searchQueries: []
    };
  }
}
