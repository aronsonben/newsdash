import { NewsItem, Shortcut } from "./types";
import shortcuts from '../shortcuts.json';

export const FRESH_TTL_MS = 24 * 60 * 60 * 1000;      // < 24 h  → return immediately
export const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const BASE_SHORTCUTS: Shortcut[] = shortcuts;

export const NEWSDASH_CACHE_KEY = "newsdash_prompt_cache";

// This is the global climate news shortcut just copy-pasted. Should eventually do this more tactfully.
export const DEFAULT_SHORTCUT = {
    "id": "global-climate-headlines-weekly",
    "name": "Latest Climate Headlines Weekly",
    "description": "Read the top stories from leading global and US climate, environment, and sustainability sources over the past week.",
    "prompt": "Tell me about the latest major climate, environment, and sustainability news from around the world for the past 7 days.",
    "icon": "/earth.png",
    "instructions": "Search the web for the latest news published from the following sources: Grist, Canary Media, Inside Climate News, Guardian Climate, NYT Climate, Carbon Brief."
}

export const SEGMENT_COLORS: string[] = [
  "oklch(72.3% 0.219 149.579)",
  "oklch(65.07% 0.186 259.89)", // blue-500
  "oklch(62.88% 0.203 29.23)", // red-500
  "oklch(75.13% 0.181 56.36)", // orange-500
  "oklch(94.13% 0.168 99.59)", // yellow-500
]

export const dummyItems: NewsItem[] = [
  {
    source: 'OpenAI Research',
    date: '2025-11-24',
    updates: ['New alignment technique improves small model safety.'],
    impact: 'Likely boosts reliability of edge deployments.',
    link: 'https://example.com/openai-news',
    action: 'Evaluate for roadmap integration.'
  },
  {
    source: 'Google DeepMind',
    date: '2025-11-23',
    updates: ['Paper on long-context training efficiency released.'],
    impact: 'Lower inference costs for long docs.',
    link: 'https://example.com/deepmind-paper',
    action: 'Prototype longer context summarization.'
  },
  {
    source: 'Hugging Face',
    date: '2025-11-22',
    updates: ['New datasets for multi-modal QA announced.'],
    impact: 'Faster experimentation for image+text tasks.',
    link: 'https://example.com/hf-blog',
    action: 'Create spike on multi-modal Q&A.'
  }
];

