import { Link, Outlet } from 'react-router-dom';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import NewsDashboard from './components/NewsDashboard';
import React from 'react';
import { GeminiGenerateResponse } from './lib/geminiClient';

export default function App() {
  const [selected, setSelected] = React.useState<null | { name: string; prompt: string }>(null);
  const [newsData, setNewsData] = React.useState<GeminiGenerateResponse | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      <Header />
      <main className="flex-1 flex min-h-0">
        <Sidebar
          onSelect={(s) => {
            setSelected({ name: s.name, prompt: s.prompt });
            setNewsData(null);
          }}
        />
        <div className="flex-1 p-4 max-w-[960px] mx-auto">
          <section className="mb-4">
            <p className="text-[#d0d0d0]">
              Ben's NewsDash for The Concourse. Use my predefined prompts to get the latest news on important topics.
            </p>
          </section>
          <ChatPanel preset={selected?.prompt} onResponse={setNewsData} />
          {selected && <NewsDashboard title={selected.name} data={newsData} />}
          <Outlet />
        </div>
      </main>
      <footer className="p-4 text-center text-gray-500">
        © {new Date().getFullYear()} NewsDash
      </footer>
    </div>
  );
}
