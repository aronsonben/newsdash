import { CacheData, BlockSegment, GroundingChunk } from "src/types";
import { FRESH_TTL_MS } from "../constants";

/**
 * Returns the freshness state of a cached entry.
 * 'fresh'  = updated within the past 24 h (show without a staleness hint)
 * 'stale'  = older than 24 h (show with a staleness hint; never hidden)
 * 'none'   = no cache entry exists
 */
export function getCacheState(cacheObj: CacheData | null): 'none' | 'fresh' | 'stale' {
  if (!cacheObj) { return 'none'; }

  const cacheDifference = Date.now() - cacheObj.updatedAt;

  if (cacheDifference < FRESH_TTL_MS) {
    return 'fresh';
  }
  return 'stale';
}

// Extracts GroundingChunks whose URIs appear as markdown links ([text](url)) in the given text.
function extractCitationsFromText(text: string, chunks: GroundingChunk[]): GroundingChunk[] {
  const urlRegex = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;
  const foundUrls = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(text)) !== null) {
    foundUrls.add(match[1]);
  }
  return chunks.filter(chunk => chunk.web?.uri && foundUrls.has(chunk.web.uri));
}

// Splits markdown text on H2/H3 headers, returning each section as a BlockSegment
// with its heading, body content, and the GroundingChunks cited within that section.
export function segmentMarkdownByHeaders(text: string, chunks: GroundingChunk[]): BlockSegment[] {
  const lines = text.split('\n');
  const segments: BlockSegment[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      if (currentHeading !== null) {
        const content = currentLines.join('\n').trim();
        segments.push({ heading: currentHeading, content, citations: extractCitationsFromText(content, chunks) });
      }
      currentHeading = match[2].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading !== null) {
    const content = currentLines.join('\n').trim();
    segments.push({ heading: currentHeading, content, citations: extractCitationsFromText(content, chunks) });
  }

  return segments;
}