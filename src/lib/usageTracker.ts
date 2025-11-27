// Daily API usage tracking utilities
export interface UsageData {
  date: string;
  count: number;
}

const STORAGE_KEY = 'newsdash_api_usage';
const DAILY_LIMIT = 20;

// Check if we're in development mode
export const isDevelopment = import.meta.env.DEV;

// Get today's date in YYYY-MM-DD format
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get current usage data from localStorage
function getUsageData(): UsageData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as UsageData;
      const today = getTodayString();
      
      // Reset count if it's a new day
      if (data.date !== today) {
        return { date: today, count: 0 };
      }
      
      return data;
    }
  } catch (error) {
    console.warn('Failed to read usage data from localStorage:', error);
  }
  
  return { date: getTodayString(), count: 0 };
}

// Save usage data to localStorage
function saveUsageData(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save usage data to localStorage:', error);
  }
}

// Check if user has reached the daily limit
export function hasReachedDailyLimit(): boolean {
  // In development, never limit
  if (isDevelopment) {
    return false;
  }
  
  const usage = getUsageData();
  return usage.count >= DAILY_LIMIT;
}

// Get current usage count and limit
export function getUsageInfo(): { used: number; limit: number; remaining: number } {
  const usage = getUsageData();
  return {
    used: usage.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - usage.count)
  };
}

// Increment the API call count
export function incrementUsage(): void {
  // In development, don't track usage
  if (isDevelopment) {
    return;
  }
  
  const usage = getUsageData();
  usage.count++;
  saveUsageData(usage);
}

// Reset usage count (mainly for testing)
export function resetUsage(): void {
  const today = getTodayString();
  saveUsageData({ date: today, count: 0 });
}