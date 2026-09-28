import { GoogleGenAI } from "@google/genai";
import { hasReachedDailyLimit, incrementUsage, isDevelopment } from './usageTracker';
import { GeminiGenerateRequest, GroundingChunk, GroundingSupport, GroundingMetadata, GeminiCandidate, GeminiApiResponse, GeminiGenerateResponse, GeminiStreamChunk, GeminiStreamResponse } from "src/types";

let apiKey: string | undefined;

if (!import.meta.env.DEV) {
  // console.log("[geminiClient] Using process", );
  apiKey = process.env.GEMINI_API_KEY;
} else {
  // console.log("[geminiClient] using vite", import.meta.env);
  apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? (import.meta.env as any).GEMINI_API_KEY;
}

/** Inserts citation links at the end of each grounded sentence, located by matching segment text. */
function addCitations(text: string, groundingMetadata?: GroundingMetadata): string {
  if (!groundingMetadata?.groundingSupports || !groundingMetadata?.groundingChunks) {
    return text;
  }

  const chunks = groundingMetadata.groundingChunks;
  const supports = [...groundingMetadata.groundingSupports].sort(
    (a, b) => (a.segment?.startIndex ?? 0) - (b.segment?.startIndex ?? 0)
  );

  const insertions = new Map<number, string[]>();
  let searchFrom = 0;

  for (const support of supports) {
    const segText = support.segment?.text;
    if (!segText || !support.groundingChunkIndices?.length) continue;

    let start = text.indexOf(segText, searchFrom);
    if (start === -1) start = text.indexOf(segText);
    if (start === -1) continue;
    searchFrom = start;

    // Never cite inside a heading line
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    if (/^\s*#{1,6}\s/.test(text.slice(lineStart, start + 1))) continue;

    let end = start + segText.length;
    while (end > start && /\s/.test(text[end - 1])) end--;

    // Extend to the end of the sentence if the segment stops mid-sentence
    const closers = `["'”’)\\]*_]*`;
    if (!new RegExp(`[.!?]${closers}$`).test(text.slice(start, end))) {
      const nl = text.indexOf('\n', end);
      const lineEnd = nl === -1 ? text.length : nl;
      const m = new RegExp(`[.!?]${closers}(?=\\s|$)`).exec(text.slice(end, lineEnd));
      end = m ? end + m.index + m[0].length : lineEnd;
    }

    const links = support.groundingChunkIndices
      .map((i) => {
        const uri = chunks[i]?.web?.uri;
        return uri ? `[${i + 1}](${uri})` : null;
      })
      .filter((l): l is string => l !== null);
    if (links.length === 0) continue;

    const existing = insertions.get(end) ?? [];
    for (const l of links) if (!existing.includes(l)) existing.push(l);
    insertions.set(end, existing);
  }

  let result = text;
  for (const pos of [...insertions.keys()].sort((a, b) => b - a)) {
    result = result.slice(0, pos) + ` ${insertions.get(pos)!.join(' ')}` + result.slice(pos);
  }
  return result;
}

// ─── Heading emoji helpers ────────────────────────────────────────────────────

const HEADING_PREFIX = /^\s{0,3}#{1,6}[ \t]+/;
const LEADING_EMOJIS = /^(?:[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]+[ \t]*)+/u;

/** Removes leading emojis from Markdown headings so citation offsets aren't skewed; returns them in heading order. */
function stripHeadingEmojis(text: string): { stripped: string; emojis: string[] } {
  const emojis: string[] = [];
  const stripped = text
    .split('\n')
    .map((line) => {
      const prefix = HEADING_PREFIX.exec(line);
      if (!prefix) return line;
      const rest = line.slice(prefix[0].length);
      const emoji = LEADING_EMOJIS.exec(rest);
      emojis.push(emoji ? emoji[0] : '');
      return prefix[0] + (emoji ? rest.slice(emoji[0].length) : rest);
    })
    .join('\n');
  return { stripped, emojis };
}

/** Puts the emojis removed by stripHeadingEmojis back into their headings, matched by heading order. */
function restoreHeadingEmojis(text: string, emojis: string[]): string {
  let i = 0;
  return text
    .split('\n')
    .map((line) => {
      const prefix = HEADING_PREFIX.exec(line);
      if (!prefix) return line;
      const emoji = emojis[i++] ?? '';
      return prefix[0] + emoji + line.slice(prefix[0].length);
    })
    .join('\n');
}

export async function generateWithGemini(req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  // if (!isGeminiConfigured()) {
  //   return {
  //     text: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
  //     textWithCitations: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
  //     searchQueries: []
  //   };
  // }

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

    // console.log('Grounding metadata extracted:', {
    //   chunksCount: groundingChunks.length,
    //   supportsCount: groundingSupports.length,
    //   queriesCount: webSearchQueries.length,
    //   hasSearchEntryPoint: !!searchEntryPoint
    // });

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
  // First check that Gemini is configured in the backend. If not, return an error.
  // TODO: (6/22) Removing this check while I figure out this geminiConfig check
  /* if (!isGeminiConfigured()) {
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
 */
  // Check daily usage limit (only in production). TODO: limit requests further
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

  // Get prompt info from request:
  const prompt = req.prompt;
  const instructions = req.instructions;


  // Call Gemini service
  const ai = new GoogleGenAI({apiKey: apiKey});
  const groundingTool = {
    googleSearch: {},
  };
  let systemInstruction: string = ""; 
  systemInstruction = `
    You are performing web search-based research for the latest news stories related to the prompt topic.
    If sources are mentioned, find the websites for those publications and use those. 
    Otherwise, first look for the most authoritative sources for each topic.

    Your research strategy should be as follows:
    1. Perform up to three web search queries related to the prompt topic
    2. Read 4-5 of the latest articles from a handful of sources
    3. Extract the most relevant themes across all articles
    4. Synthesize the themes into topics tied to each source

    Your response should follow these guidelines:
    - Use sections, headings, and emojis to separate themes
    - Provide a 1-2 sentence executive summary for each theme
    - Provide up to two paragraphs summarizing the theme
    - Return a maximum of five themes so as to not overwhelm the user

    Your audience:
    - Your audience is an educated professional with advanced knowledge of a given topic
    - They are a leader within the given industry and want to stay on top of key topics

    Output Format:
    - Output your response in Markdown format and cite every factual claim using inline Markdown hyperlinks
    - For example, "Flooding in Texas[CITATION_NUM](URL)."
    - Citations should always appear at the end of a sentence, after the period, and never in the middle of a word.

    Sources: ${instructions}
  `;

   const config = {
    tools: [groundingTool],
    systemInstruction: systemInstruction,
  };

  try {
    // Make streaming call to Gemini API with Grounding with Google Search
    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
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

      // console.log('Streaming grounding metadata extracted:', {
      //   chunksCount: groundingChunks.length,
      //   supportsCount: groundingSupports.length,
      //   queriesCount: webSearchQueries.length,
      //   hasSearchEntryPoint: !!searchEntryPoint
      // });

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
