import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// ─── Types (mirrored from geminiClient.ts to avoid browser imports) ───────────

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

interface GroundingSupport {
  segment?: { startIndex: number; endIndex: number; text: string };
  groundingChunkIndices?: number[];
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: { renderedContent?: string };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

// ─── Citation helper ──────────────────────────────────────────────────────────

function addCitations(text: string, groundingMetadata?: GroundingMetadata): string {
  if (!groundingMetadata?.groundingSupports || !groundingMetadata?.groundingChunks) {
    return text;
  }

  const supports = groundingMetadata.groundingSupports;
  const chunks = groundingMetadata.groundingChunks;
  let modifiedText = text;

  const sortedSupports = [...supports].sort(
    (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
  );

  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;
    if (endIndex === undefined || !support.groundingChunkIndices?.length) continue;

    const citationLinks = support.groundingChunkIndices
      .map((i) => {
        const uri = chunks[i]?.web?.uri;
        return uri ? `[${i + 1}](${uri})` : null;
      })
      .filter((link): link is string => link !== null);

    if (citationLinks.length > 0) {
      let insertAt = endIndex;
      while (
        insertAt < modifiedText.length &&
        /\S/.test(modifiedText[insertAt - 1]) &&
        /\S/.test(modifiedText[insertAt])
      ) {
        insertAt++;
      }
      modifiedText =
        modifiedText.slice(0, insertAt) +
        ` ${citationLinks.join(', ')}` +
        modifiedText.slice(insertAt);
    }
  }

  return modifiedText;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }

  const { prompt, model, temperature, instructions } = req.body ?? {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: '`prompt` is required' });
  }

  const modelName: string = (typeof model === 'string' && model) ? model : 'gemini-2.5-flash';

  const systemInstruction = `
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

    Sources: ${instructions ?? ''}
  `;

  const ai = new GoogleGenAI({ apiKey });

  const config = {
    tools: [{ googleSearch: {} }],
    systemInstruction,
    ...(typeof temperature === 'number' ? { temperature } : {}),
  };

  try {
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
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

    const groundingChunks = finalGroundingMetadata?.groundingChunks ?? [];
    const groundingSupports = finalGroundingMetadata?.groundingSupports ?? [];
    const webSearchQueries = finalGroundingMetadata?.webSearchQueries ?? [];
    const searchEntryPoint = finalGroundingMetadata?.searchEntryPoint?.renderedContent ?? undefined;
    const textWithCitations = addCitations(fullText, finalGroundingMetadata);

    return res.status(200).json({
      text: fullText,
      textWithCitations,
      searchQueries: webSearchQueries,
      groundingMetadata: finalGroundingMetadata,
      groundingChunks,
      groundingSupports,
      searchEntryPoint,
    });
  } catch (error) {
    console.error('[api/generate] Gemini error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: `Gemini API error: ${message}` });
  }
}
