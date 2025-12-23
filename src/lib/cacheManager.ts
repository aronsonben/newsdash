import { GeminiGenerateResponse } from './geminiClient';

interface CachedResponse {
  data: GeminiGenerateResponse;
  timestamp: number;
  promptHash: string;
}

interface CacheStorage {
  [key: string]: CachedResponse;
}

const CACHE_KEY = 'newsdash_response_cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class CacheManager {
  private async hashPrompt(prompt: string): Promise<string> {
    // Create a consistent hash for the prompt
    const encoder = new TextEncoder();
    const data = encoder.encode(prompt.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getCache(): CacheStorage {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to read cache:', error);
      return {};
    }
  }

  private setCache(cache: CacheStorage): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to write cache (quota exceeded?):', error);
      // Clear old entries and try again
      this.clearExpired();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (retryError) {
        console.error('Failed to write cache even after cleanup:', retryError);
      }
    }
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_EXPIRY_MS;
  }

  async getCached(prompt: string): Promise<GeminiGenerateResponse | null> {
    const cache = this.getCache();
    const promptHash = await this.hashPrompt(prompt);
    const cached = cache[promptHash];

    if (!cached) {
      return null;
    }

    if (this.isExpired(cached.timestamp)) {
      // Remove expired entry
      delete cache[promptHash];
      this.setCache(cache);
      return null;
    }

    console.log('Cache hit for prompt:', prompt.substring(0, 50) + '...');
    return cached.data;
  }

  async getCachedWithTimestamp(promptId: string): Promise<{ data: GeminiGenerateResponse; timestamp: number } | null> {
    const cache = this.getCache();
    const promptHash = await this.hashPrompt(promptId);
    const cached = cache[promptHash];

    if (!cached) {
      return null;
    }

    if (this.isExpired(cached.timestamp)) {
      // Remove expired entry
      delete cache[promptHash];
      this.setCache(cache);
      return null;
    }

    console.log('Cache hit for prompt:', promptId.substring(0, 50) + '...');
    return { data: cached.data, timestamp: cached.timestamp };
  }

  async setCached(promptId: string, response: GeminiGenerateResponse): Promise<void> {
    const cache = this.getCache();
    const promptHash = await this.hashPrompt(promptId);

    cache[promptHash] = {
      data: response,
      timestamp: Date.now(),
      promptHash
    };

    this.setCache(cache);
    console.log('Cached response for prompt ID:', promptId);
  }

  clearExpired(): number {
    const cache = this.getCache();
    const entries = Object.entries(cache);
    const initialCount = entries.length;
    
    const validEntries = entries.filter(([, cached]) => !this.isExpired(cached.timestamp));
    
    const newCache: CacheStorage = {};
    validEntries.forEach(([key, cached]) => {
      newCache[key] = cached;
    });

    this.setCache(newCache);
    
    const removedCount = initialCount - validEntries.length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} expired cache entries`);
    }
    
    return removedCount;
  }

  clearAll(): void {
    localStorage.removeItem(CACHE_KEY);
    console.log('Cleared all cache entries');
  }

  getCacheInfo(): { totalEntries: number; oldestEntry: Date | null; newestEntry: Date | null } {
    const cache = this.getCache();
    const entries = Object.values(cache);
    
    if (entries.length === 0) {
      return { totalEntries: 0, oldestEntry: null, newestEntry: null };
    }

    const timestamps = entries.map(entry => entry.timestamp);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);

    return {
      totalEntries: entries.length,
      oldestEntry: new Date(oldestTimestamp),
      newestEntry: new Date(newestTimestamp)
    };
  }

  getAllCacheEntries(): Array<{ promptHash: string; timestamp: Date; data: GeminiGenerateResponse }> {
    const cache = this.getCache();
    return Object.entries(cache).map(([hash, cached]) => ({
      promptHash: hash,
      timestamp: new Date(cached.timestamp),
      data: cached.data
    }));
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Cleanup on app start
cacheManager.clearExpired();