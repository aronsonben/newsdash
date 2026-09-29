import { GoogleGenAI } from '@google/genai';
import type { ServerShortcut } from './_shortcuts';

// ─── Types (mirrored from geminiClient.ts to avoid browser imports) ───────────

export interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

export interface GroundingSupport {
  segment?: { startIndex: number; endIndex: number; text: string };
  groundingChunkIndices?: number[];
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

/** Input for one grounded search; prompt and instructions must come from trusted server-side shortcut config. */
export interface GenerateInput {
  prompt: string;
  instructions?: string;
  temperature?: number;
  model?: string;
}

export interface GeneratedNews {
  text: string;
  textWithCitations: string;
  searchQueries: string[];
  groundingMetadata?: GroundingMetadata;
  groundingChunks: GroundingChunk[];
  groundingSupports: GroundingSupport[];
  searchEntryPoint?: string;
}

// Server-controlled only; clients can never choose the model.
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite';

// ─── Citation helper ──────────────────────────────────────────────────────────

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

// ─── Generation ───────────────────────────────────────────────────────────────

/** Builds the system prompt sent with every grounded news search. */
function buildSystemInstruction(instructions: string): string {
  return `
    You are performing a web search for the latest news related to the climate-oriented prompt topic.
    If sources are mentioned, find the websites for those publications and use those.
    Otherwise, first look for the most authoritative sources for each topic.

    Your research strategy should be as follows:
    1. Perform up to three web search queries related to the prompt topic
    2. Read 4-5 of the latest articles from a handful of sources
    3. Extract the most relevant themes across all articles
    4. Synthesize the themes into topics tied to each source

    Timeframe:
    - Today's date is ${new Date().toDateString()}
    - You MUST follow the timeframe given in the prompt when choosing recent articles or publications.
    - For example, if the user wants "Boston climate news from the past 7 days", only provide news published WITHIN the past 7 days from today
    - If you find nothing published within the given time frame, you may expand the timeframe by one unit (e.g. 7 days can be come 14 days (2 weeks), 1 month can become 2 months)

    Your response should follow these guidelines:
    - Use sections, headings, and emojis to separate themes
    - Provide a 1-2 sentence executive summary for each theme
    - Provide up to two paragraphs summarizing the theme
    - Return a maximum of five themes so as to not overwhelm the user

    Your audience:
    - Your audience is an educated professional with advanced knowledge of a given topic
    - They are a leader within the given industry and want to stay on top of key topics

    Sources: ${instructions}
  `;
}

/**
 * Runs one Google-Search-grounded Gemini request and returns the text with citation links inserted.
 * Shared by the on-demand generate route and the scheduled cache refresh.
 */
export async function generateNews(input: GenerateInput): Promise<GeneratedNews> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const config = {
    tools: [{ googleSearch: {} }],
    systemInstruction: buildSystemInstruction(input.instructions ?? ''),
    ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : {}),
  };

  const response = await ai.models.generateContentStream({
    model: input.model ?? DEFAULT_MODEL,
    contents: input.prompt,
    config,
  });

  let fullText = '';
  let finalGroundingMetadata: GroundingMetadata | undefined;

  for await (const chunk of response) {
    fullText += chunk.text ?? '';
    const meta = chunk.candidates?.[0]?.groundingMetadata;
    if (meta) {
      finalGroundingMetadata = meta as unknown as GroundingMetadata;
    }
  }

  const { stripped, emojis } = stripHeadingEmojis(fullText);
  const textWithCitations = restoreHeadingEmojis(
    addCitations(stripped, finalGroundingMetadata),
    emojis
  );

  return {
    text: fullText,
    textWithCitations,
    searchQueries: finalGroundingMetadata?.webSearchQueries ?? [],
    groundingMetadata: finalGroundingMetadata,
    groundingChunks: finalGroundingMetadata?.groundingChunks ?? [],
    groundingSupports: finalGroundingMetadata?.groundingSupports ?? [],
    searchEntryPoint: finalGroundingMetadata?.searchEntryPoint?.renderedContent ?? undefined,
  };
}

/** Generates news for an allowlisted shortcut using only its server-side prompt and instructions. */
export function generateForShortcut(shortcut: ServerShortcut): Promise<GeneratedNews> {
  return generateNews({ prompt: shortcut.prompt, instructions: shortcut.instructions });
}
