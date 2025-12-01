import { Link, Outlet } from 'react-router-dom';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import NewsDashboard from './components/NewsDashboard';
import UsageIndicator from './components/UsageIndicator';
import React from 'react';
import { GeminiGenerateResponse } from './lib/geminiClient';

export default function App() {
  const [selected, setSelected] = React.useState<null | { name: string; prompt: string }>(null);
  const [newsData, setNewsData] = React.useState<GeminiGenerateResponse | null>(null);
  const [streamingText, setStreamingText] = React.useState<string>('');
  const [isStreaming, setIsStreaming] = React.useState<boolean>(false);
  const [isCached, setIsCached] = React.useState<boolean>(false);
  const [cacheTimestamp, setCacheTimestamp] = React.useState<number | null>(null);
  const chatPanelRef = React.useRef<{ runAgain: () => void } | null>(null);
  const [isDark, setIsDark] = React.useState(() => {
    // Check for saved theme or default to dark
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  React.useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark-earth');
      // document.documentElement.setAttribute('data-theme', 'dark');     // old, simple dark theme
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div 
      className="flex flex-col min-h-screen font-grotesk"
      style={{
        backgroundColor: 'rgb(var(--bg-primary))',
        color: 'rgb(var(--text-primary))'
      }}
    >
      <Header isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
      <main className="flex-1 flex min-h-0">
        <Sidebar
          onSelect={(s) => {
            setSelected({ name: s.name, prompt: s.prompt });
            setNewsData(null);
            setIsCached(false);
            setCacheTimestamp(null);
          }}
        />
        <div className="flex-1 p-4 max-w-[960px] mx-auto">
          <section className="mb-4">
            <p style={{ color: 'rgb(var(--text-secondary))' }}>
              Ben's NewsDash for The Concourse. Use my predefined prompts to get the latest news on important topics.
            </p>
          </section>
          <ChatPanel 
            ref={chatPanelRef}
            preset={selected?.prompt} 
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
      <footer 
        className="p-4 flex items-center justify-between"
        style={{ color: 'rgb(var(--text-muted))' }}
      >
        <span>
          © {new Date().getFullYear()} NewsDash
        </span>
        <UsageIndicator />
      </footer>
    </div>
  );
}
