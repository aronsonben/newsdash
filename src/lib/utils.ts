import { CacheData } from "src/types";
import { FRESH_TTL_MS, CACHE_EXPIRY_MS } from "../constants";

export function getCacheState(cacheObj: CacheData | null) {
  if (!cacheObj) { return 'none'; }

  let dateCachedAt: number = cacheObj.updatedAt;
  let cacheDifference = Date.now() - dateCachedAt;

  // Cache is considered FRESH if it was updated within the past 24h
  if ( cacheDifference < FRESH_TTL_MS ) {
    return 'fresh';
  }
  // Cache is considered STALE if it was updated within the past 7d
  if ( cacheDifference < CACHE_EXPIRY_MS ) {
    return 'stale';
  }
  // Cache is considered EXPIRED if it was updated more than 7d ago
  if ( cacheDifference >= FRESH_TTL_MS && cacheDifference >= CACHE_EXPIRY_MS ) {
    return 'expired';
  }
  // Cache is considered NONE if the cacheObj does not exist for some reason
  return 'none';
}

export function isGeminiConfigured() {
  // Environment variables for Gemini API
  let apiKey: string | undefined;

  if (!import.meta.env.DEV) {
    // console.log("[utils] Using process", );
    apiKey = process.env.GEMINI_API_KEY;
  } else {
    // console.log("[utils] using vite", import.meta.env);
    apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? (import.meta.env as any).GEMINI_API_KEY;
  }

  return Boolean(apiKey);
}