import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { hasReachedDailyLimit, incrementUsage, isDevelopment } from './usageTracker';

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
    uri?: string;
    title?: string;
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

export type GeminiStreamChunk = {
  text: string;
  isComplete: boolean;
  groundingMetadata?: GroundingMetadata;
};

export type GeminiStreamResponse = {
  stream: AsyncIterableIterator<GeminiStreamChunk>;
  getFullResponse: () => Promise<GeminiGenerateResponse>;
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

  // Check daily usage limit (only in production)
  if (hasReachedDailyLimit()) {
    const errorText = `Daily API limit reached. You can make 20 requests per day. Please try again tomorrow.`;
    return {
      text: errorText,
      textWithCitations: errorText,
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

    // Increment usage counter after successful API call
    incrementUsage();

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

export async function generateStreamWithGemini(req: GeminiGenerateRequest): Promise<GeminiStreamResponse> {
  if (!isGeminiConfigured()) {
    const errorText = `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`;
    const errorResponse: GeminiGenerateResponse = {
      text: errorText,
      textWithCitations: errorText,
      searchQueries: []
    };
    
    return {
      stream: (async function* () {
        yield { text: errorText, isComplete: true };
      })(),
      getFullResponse: async () => errorResponse
    };
  }

  // Check daily usage limit (only in production)
  if (hasReachedDailyLimit()) {
    const errorText = `Daily API limit reached. You can make 20 requests per day. Please try again tomorrow.`;
    const errorResponse: GeminiGenerateResponse = {
      text: errorText,
      textWithCitations: errorText,
      searchQueries: []
    };
    
    return {
      stream: (async function* () {
        yield { text: errorText, isComplete: true };
      })(),
      getFullResponse: async () => errorResponse
    };
  }

  const ai = new GoogleGenAI({apiKey: apiKey});
  const groundingTool = {
    googleSearch: {},
  };
  let systemInstruction: string = ""; 
  systemInstruction = "You are performing web search-based research for the latest news stories related to the prmopt topic. " + 
    "For each news topic found, generate a one-sentence executive summary, a 4-5 sentence paragraph summarizing relevant articles, a one-line list of sources used, and one-line list of key stakeholers." + 
    "Use sections, headings, and emojis to separate topics for the sake of readibility." +
    "Your audience is an educated professional with advanced knowledge of a given topic. They are a leader within the given industry and want to stay on top of key topics.";
    
   
  
   const config = {
    tools: [groundingTool],
    systemInstruction: systemInstruction,
  };

  try {
    // Make streaming call to Gemini API with Grounding with Google Search
    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: req.prompt,
      config,
    });

    let fullText = '';
    let finalGroundingMetadata: GroundingMetadata | undefined;
    let streamStarted = false;

    const stream = async function* () {
      try {
        streamStarted = true;
        for await (const chunk of response) {
          const chunkText = chunk.text || '';
          fullText += chunkText;
          
          // Store grounding metadata from the last chunk (it's usually in the final chunk)
          if (chunk.candidates?.[0]?.groundingMetadata) {
            finalGroundingMetadata = chunk.candidates[0].groundingMetadata as unknown as GroundingMetadata;
          }

          yield {
            text: chunkText,
            isComplete: false,
            groundingMetadata: chunk.candidates?.[0]?.groundingMetadata
          } as GeminiStreamChunk;
        }

        // Final chunk to indicate completion
        yield {
          text: '',
          isComplete: true,
          groundingMetadata: finalGroundingMetadata
        } as GeminiStreamChunk;
      } catch (error) {
        console.error('Gemini streaming error:', error);
        const errorText = `Error during streaming: ${error instanceof Error ? error.message : String(error)}`;
        yield {
          text: errorText,
          isComplete: true
        } as GeminiStreamChunk;
      }
    };

    const getFullResponse = async (): Promise<GeminiGenerateResponse> => {
      // If stream hasn't been consumed yet, consume it now
      if (!streamStarted) {
        for await (const chunk of stream()) {
          if (chunk.isComplete) break;
        }
      }

      // Extract grounding metadata components
      const groundingSupports = finalGroundingMetadata?.groundingSupports ?? [];
      const groundingChunks = finalGroundingMetadata?.groundingChunks ?? [];
      const webSearchQueries = finalGroundingMetadata?.webSearchQueries ?? [];
      const searchEntryPoint = finalGroundingMetadata?.searchEntryPoint?.renderedContent ?? undefined;

      // Add citations to the full text
      const textWithCitations = addCitations(fullText, finalGroundingMetadata);

      // Increment usage counter after successful streaming API call
      incrementUsage();

      console.log('Streaming grounding metadata extracted:', {
        chunksCount: groundingChunks.length,
        supportsCount: groundingSupports.length,
        queriesCount: webSearchQueries.length,
        hasSearchEntryPoint: !!searchEntryPoint
      });

      return {
        text: fullText,
        textWithCitations,
        searchQueries: webSearchQueries,
        groundingMetadata: finalGroundingMetadata,
        groundingChunks,
        groundingSupports,
        searchEntryPoint,
        raw: response
      };
    };

    return {
      stream: stream(),
      getFullResponse
    };
  } catch (error) {
    console.error('Gemini streaming API error:', error);
    const errorText = `Error generating streaming content: ${error instanceof Error ? error.message : String(error)}`;
    const errorResponse: GeminiGenerateResponse = {
      text: errorText,
      textWithCitations: errorText,
      searchQueries: []
    };

    return {
      stream: (async function* () {
        yield { text: errorText, isComplete: true };
      })(),
      getFullResponse: async () => errorResponse
    };
  }
}
