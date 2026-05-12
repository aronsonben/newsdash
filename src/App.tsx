import { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import NewsDashboard from './components/NewsDashboard';
import UsageIndicator from './components/UsageIndicator';
import MobileShortcutTray from './components/MobileShortcutTray';
import { GeminiGenerateResponse } from './lib/geminiClient';
import { firestoreCache } from './lib/apiClient';
import { CacheData, Shortcut, CloudSaveState, FRESH_TTL_MS } from './types';
import { useLocalStorage } from './services/useLocalStorage';

const NEWSDASH_CACHE_KEY = "newsdash_prompt_cache";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// This is the global climate news shortcut just copy-pasted. Should eventually do this more tactfully.
const DEFAULT_SHORTCUT = {
    "id": "global-climate-headlines-weekly",
    "name": "Latest Climate Headlines Weekly",
    "description": "Read the top stories from leading global and US climate, environment, and sustainability sources over the past week.",
    "prompt": "Tell me about the latest major climate, environment, and sustainability news from around the world for the past 7 days.",
    "icon": "/earth.png",
    "instructions": "Search the web for the latest news published from the following sources: Grist, Canary Media, Inside Climate News, Guardian Climate, NYT Climate, Carbon Brief."
}

export default function App() {
  const [selected, setSelected] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [runAgainTrigger, setRunAgainTrigger] = useState(0);
  const [newsData, setNewsData] = useState<GeminiGenerateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  // Cache-related state variables
  const [promptCache, setPromptCache] = useLocalStorage<CacheData[]>(NEWSDASH_CACHE_KEY, []);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [cacheRefreshTrigger, setCacheRefreshTrigger] = useState(0);
  const [cloudSaveState, setCloudSaveState] = useState<CloudSaveState>('idle');
  // Misc. state
  const [isDark, setIsDark] = useState(() => {
    // Check for saved theme or default to dark
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // Clear stale content as soon as a new request starts so the skeleton
  // is never blocked by old streamingText / newsData values.
  useEffect(() => {
    if (loading) {
      setStreamingText('');
      setNewsData(null);
    }
  }, [loading]);

  // Auto-load cached data for the default shortcut on first mount
  useEffect(() => {
    handleShortcutSelect(DEFAULT_SHORTCUT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark-earth');
      // document.documentElement.setAttribute('data-theme', 'dark');     // old, simple dark theme
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const isExpired = (timestamp: number): boolean => {
    const timeDifference = (Date.now() - timestamp);
    return timeDifference > CACHE_EXPIRY_MS;
  }

  // Handle shortcut selection from Sidebar or MobileShortcutTray
  const handleShortcutSelect = async (shortcut: Shortcut) => {
    const selectedShortcut = {
      id: shortcut.id,
      name: shortcut.name,
      description: shortcut.description,
      prompt: shortcut.prompt,
      icon: shortcut.icon,
      instructions: shortcut.instructions
    }
    
    // Reset cloud save state when switching shortcuts
    setCloudSaveState('idle');

    // Update selected shortcut immediately (for ChatPanel)
    setSelected(selectedShortcut);

    // Clear the NewsDashboard immediately
    setNewsData(null);
    setStreamingText('');
    setIsFetching(true);
    
    // 1. Check localStorage first
    const cached = promptCache.find((entry) => entry.id === selectedShortcut.id);

    // If the cache object was found in localStorage, make sure it hasn't expired:
    if (cached) {
      // console.log(`[handleShortcutSelect] Found a cached object in localStorage for ${selectedShortcut.id} `, cached);
      const expired = isExpired(new Date(cached.updatedAt).getTime());

      if (expired) {
        // console.log("[handleShortcutSelect] The cache has expired for: ", shortcut.id, ". Deleting...");
        setPromptCache((prev) => prev.filter((entry) => entry.id !== cached.id));
        setNewsData(null);
        setIsCached(false);
        setCacheTimestamp(null);
        setIsFetching(false);
        return;
      } else {
        // console.log("[handleShortcutSelect] We found the cache object, updating the UI for: ", shortcut.id);
        // console.log("[handleShortcutSelect] Cache data & timestamp: ", cached.updatedAt, cached.data);
        setNewsData(cached.data);
        setStreamingText(cached.data.textWithCitations);
        setIsCached(true);
        setCacheTimestamp(cached.updatedAt);
        setIsFetching(false);
        return;
      }
    }

    // 2. Check Firestore for the object 
    try {
      const firestoreResult = await firestoreCache.read(selectedShortcut.id);
      if (firestoreResult.status === 'expired') {
        console.log("[handleShortcutSelect] Fetched the cached object from the database, but it is expired. You should run it again for the latest news.");
        setIsFetching(false);
        return;
      } else if (firestoreResult.status === 'fresh' || firestoreResult.status === 'stale') {
        // console.log("[handleShortcutSelect] Fetched the cached object from the database.");
        const data = firestoreResult.data;
        const timestamp = new Date(firestoreResult.updatedAt).getTime();
        // We found a fresh cache object in the database, it's just not in this user's localStorage.
        // Hydrate localStorage so next visit is instant
        setPromptCache([data, ...promptCache]);
        setNewsData(data.data as GeminiGenerateResponse);
        setStreamingText(data.data.textWithCitations);
        setIsCached(true);
        setCacheTimestamp(new Date(firestoreResult.updatedAt).getTime());
        setCloudSaveState('saved'); // already in Firestore
        setIsFetching(false);
        return;
      }
    } catch (err) {
      console.warn('[handleShortcutSelect] Firestore read failed:', err);
    }

    // 3. Both missed — clear previous data
    console.log("[App] Either the cache missed or it has expired. Try a new search to get the latest news.");
    setNewsData(null);
    setIsCached(false);
    setCacheTimestamp(null);
    setIsFetching(false);
  };

  const handleResponse = (data: GeminiGenerateResponse, fromCache: boolean = false, timestamp?: number) => {
    setNewsData(data);
    setIsCached(fromCache);
    setCacheTimestamp(timestamp || null);
    // New response — allow saving to cloud
    setCloudSaveState('idle');
    // Trigger cache indicator refresh in Sidebar
    setCacheRefreshTrigger(prev => prev + 1);
  };

  const handleSaveToCloud = async () => {
    if (!newsData || !selected) return;
    setCloudSaveState('saving');
    const success = await firestoreCache.save(selected.id, newsData);
    setCloudSaveState(success ? 'saved' : 'error');
  };

  const handleStreamChunk = (text: string, isComplete: boolean) => {
    setStreamingText(text);
    setIsStreaming(!isComplete);
    if (isComplete) {
      // Clear streaming text when complete, let newsData handle final display
      setTimeout(() => setStreamingText(''), 100);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-grotesk bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))]">
      <Header isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
      <MobileShortcutTray onSelect={handleShortcutSelect} refreshCache={cacheRefreshTrigger} selectedId={selected?.id} />
      <main className="flex-1 flex min-h-0">
        <Sidebar promptCache={promptCache} onSelect={handleShortcutSelect} refreshCache={cacheRefreshTrigger} selectedId={selected?.id} />
        <div className="flex-1 p-4 max-w-full md:max-w-240 mx-auto">
          <section className="mb-2">
            <p className="text-xs font-grotesk" style={{ color: 'rgb(var(--text-muted))' }}>
              Latest news summaries on interesting topics.
            </p>
          </section>
          <ChatPanel 
            shortcut={selected}
            promptCache={promptCache}
            setPromptCache={setPromptCache}
            onResponse={handleResponse}
            onStreamChunk={handleStreamChunk}
            forceRefreshTrigger={runAgainTrigger}
            loading={loading}
            setLoading={setLoading}
          />
          {selected && <NewsDashboard 
            title={selected.name} 
            data={newsData} 
            streamingText={streamingText} 
            isStreaming={isStreaming} 
            isCached={isCached} 
            cacheTimestamp={cacheTimestamp}
            onSaveToCloud={handleSaveToCloud}
            cloudSaveState={cloudSaveState}
            onRunAgain={() => setRunAgainTrigger(t => t + 1)}
            loading={loading}
            setLoading={setLoading}
            isFetching={isFetching}
          />}
          <Outlet />
        </div>
      </main>
      
      {/* Floating Usage Indicator */}
      <div className="fixed bottom-16 right-4 rounded-lg shadow-lg px-2 py-1 border" style={{ backgroundColor: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-secondary))', borderColor: 'rgb(var(--border))' }}>
        <UsageIndicator />
      </div>
      
      <Footer />
    </div>
  );
}
