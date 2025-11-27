/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string; // Google Gemini API key
  readonly VITE_OPENROUTER_API_KEY?: string; // OpenRouter API key
  readonly VITE_SITE_URL?: string; // Referer URL for OpenRouter rankings
  readonly VITE_SITE_TITLE?: string; // Site title for OpenRouter rankings
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
