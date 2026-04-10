import { useState, useEffect, useRef } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import NewsDashboard from './components/NewsDashboard';
import UsageIndicator from './components/UsageIndicator';
import MobileShortcutTray from './components/MobileShortcutTray';
import { GeminiGenerateResponse } from './lib/geminiClient';
import { cacheManager } from './lib/cacheManager';
import { firestoreCache } from './lib/apiClient';
import type { CloudSaveState } from './components/NewsDashboard';
import { Shortcut } from './types';

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
  const chatPanelRef = useRef<{ runAgain: () => void } | null>(null);
  const [selected, setSelected] = useState<Shortcut>(DEFAULT_SHORTCUT);
  const [newsData, setNewsData] = useState<GeminiGenerateResponse | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [cacheRefreshTrigger, setCacheRefreshTrigger] = useState(0);
  const [cloudSaveState, setCloudSaveState] = useState<CloudSaveState>('idle');
  const [isDark, setIsDark] = useState(() => {
    // Check for saved theme or default to dark
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

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
    
    // 1. Check localStorage first
    const cached = await cacheManager.getCachedWithTimestamp(selectedShortcut.id);
    if (cached) {
      setNewsData(cached.data);
      setIsCached(true);
      setCacheTimestamp(cached.timestamp);
      return;
    }

    // 2. localStorage miss — check Firestore
    try {
      const firestoreResult = await firestoreCache.read(selectedShortcut.id);
      if (firestoreResult.status === 'fresh' || firestoreResult.status === 'stale') {
        const data = firestoreResult.data as GeminiGenerateResponse;
        const timestamp = new Date(firestoreResult.updatedAt).getTime();
        // Hydrate localStorage so next visit is instant
        await cacheManager.setCached(selectedShortcut.id, data);
        setNewsData(data);
        setIsCached(true);
        setCacheTimestamp(timestamp);
        setCloudSaveState('saved'); // already in Firestore
        return;
      }
    } catch (err) {
      console.warn('[handleShortcutSelect] Firestore read failed:', err);
    }

    // 3. Both missed — clear previous data
    setNewsData(null);
    setIsCached(false);
    setCacheTimestamp(null);
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
    <div 
      className="flex flex-col min-h-screen font-grotesk"
      style={{
        backgroundColor: 'rgb(var(--bg-primary))',
        color: 'rgb(var(--text-primary))'
      }}
    >
      <Header isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
      <MobileShortcutTray onSelect={handleShortcutSelect} refreshCache={cacheRefreshTrigger} selectedId={selected?.id} />
      <main className="flex-1 flex min-h-0">
        <Sidebar onSelect={handleShortcutSelect} refreshCache={cacheRefreshTrigger} selectedId={selected?.id} />
        <div className="flex-1 p-4 max-w-full md:max-w-240 mx-auto">
          <section className="mb-2">
            <p className="text-xs font-grotesk" style={{ color: 'rgb(var(--text-muted))' }}>
              Latest news summaries on interesting topics.
            </p>
          </section>
          <ChatPanel 
            ref={chatPanelRef}
            shortcut={selected}
            onResponse={handleResponse}
            onStreamChunk={handleStreamChunk}
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
            onRunAgain={() => {
              if (chatPanelRef.current) {
                chatPanelRef.current.runAgain();
              }
            }}
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
