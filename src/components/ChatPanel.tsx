import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, GenerateResponse } from '../lib/apiClient';
import { generateWithGemini, isGeminiConfigured, GeminiGenerateResponse } from '../lib/geminiClient';


interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function ChatPanel({ preset, onResponse }: { preset?: string; onResponse?: (data: GeminiGenerateResponse) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Choose one of the shortcuts in the sidebar to get started.'
      }
    ]);
  }, []);

  useEffect(() => {
    if (typeof preset === 'string') {
      setInput(preset);
    }
  }, [preset]);

  async function onSend() {
    if (!canSend) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    // Send the request to the Gemini API service
    try {
      if (!isGeminiConfigured()) {
        return { 
          text: `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`,
          searchQueries: []
        };
      }
      const reply = await generateWithGemini({
        prompt: userMessage.content,
        temperature: 0.7,     // hardcoded default value for nnow
        modelName: 'gemini-2.5-flash'   // just default to 2.5 flash for now
      });
      
      if (onResponse) {
        onResponse(reply);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
        {messages.map((m) => (
          <div key={m.id} className="grid">
            <span className="text-xs text-gray-400">{m.role.toUpperCase()}</span>
            <span className="text-[#d0d0d0]">{m.content}</span>
          </div>
        ))}
        {error && <div className="text-red-500">{error}</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-[#e0e0e0]"
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          className={`px-3 py-2 rounded-md text-white ${canSend ? 'bg-sky-600 cursor-pointer' : 'bg-sky-600/50 cursor-not-allowed'}`}
        >
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>
    </section>
  );
}
