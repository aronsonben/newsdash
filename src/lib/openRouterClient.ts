import { OpenRouter } from '@openrouter/sdk';

// Environment variables (client-side). For production, proxy requests server-side to avoid exposing the API key.
const apiKey = (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined)
  // Dev convenience: accept non-Vite var if present in env files.
  ?? (import.meta.env as any).OPENROUTER_API_KEY;
const referer = import.meta.env.VITE_SITE_URL as string | undefined; // e.g. https://yourdomain.com
const siteTitle = import.meta.env.VITE_SITE_TITLE as string | undefined; // e.g. NewsDash

let client: OpenRouter | null = null;

export function getOpenRouter() {
  if (!client) {
    client = new OpenRouter({
      apiKey: apiKey ?? ''
    } as any);
  }
  return client;
}

export function isConfigured() {
  return Boolean(apiKey);
}
