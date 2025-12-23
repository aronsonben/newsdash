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
import { Shortcut } from './types';

// This is the global climate news shortcut just copy-pasted. Should eventually do this more tactfully.
const DEFAULT_SHORTCUT = {
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
  const [isDark, setIsDark] = useState(() => {
    // Check for saved theme or default to dark
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
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

  const handleShortcutSelect = (shortcut: Shortcut) => {
    const newShortcut = {
      name: shortcut.name,
      description: shortcut.description,
      prompt: shortcut.prompt,
      icon: shortcut.icon,
      instructions: shortcut.instructions
    }
    setSelected(newShortcut);
    setNewsData(null);
    setIsCached(false);
    setCacheTimestamp(null);
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
      <MobileShortcutTray onSelect={handleShortcutSelect} />
      <main className="flex-1 flex min-h-0">
        <Sidebar onSelect={handleShortcutSelect} />
        <div className="flex-1 p-4 max-w-[960px] mx-auto">
          <section className="mb-4">
            <p className="text-xs font-grotesk italic" style={{ color: 'rgb(var(--text-secondary))' }}>
              Heyo! It's Ben from Concourse. Get some helpful summaries of the latest news in some interesting topics.
            </p>
          </section>
          <ChatPanel 
            ref={chatPanelRef}
            shortcut={selected}
            onResponse={(data, fromCache = false, timestamp) => {
              setNewsData(data);
              setIsCached(fromCache);
              setCacheTimestamp(timestamp || null);
            }}
            onStreamChunk={(text: string, isComplete: boolean) => {
              setStreamingText(text);
              setIsStreaming(!isComplete);
              if (isComplete) {
                // Clear streaming text when complete, let newsData handle final display
                setTimeout(() => setStreamingText(''), 100);
              }
            }}
          />
          {selected && <NewsDashboard 
            title={selected.name} 
            data={newsData} 
            streamingText={streamingText} 
            isStreaming={isStreaming} 
            isCached={isCached} 
            cacheTimestamp={cacheTimestamp}
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
      <div className="fixed bottom-16 right-4 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] rounded-lg shadow-lg px-2 py-1 border border-gray-200 dark:border-gray-700">
        <UsageIndicator />
      </div>
      
      <Footer />
    </div>
  );
}
