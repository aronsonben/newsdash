import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, GenerateResponse } from '../lib/apiClient';
import { generateWithGemini, generateStreamWithGemini, isGeminiConfigured, GeminiGenerateResponse } from '../lib/geminiClient';
import { hasReachedDailyLimit, getUsageInfo } from '../lib/usageTracker';
import { cacheManager } from '../lib/cacheManager';


interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ChatPanel = React.forwardRef<{ runAgain: () => void }, { preset?: string; onResponse?: (data: GeminiGenerateResponse, fromCache?: boolean, timestamp?: number) => void; onStreamChunk?: (text: string, isComplete: boolean) => void }>(function ChatPanel({ preset, onResponse, onStreamChunk }, ref) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading && !hasReachedDailyLimit(), [input, loading]);

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

  async function onSend(forceRefresh = false) {
    if (!canSend) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    
    setMessages((prev: Message[]) => [...prev, userMessage]);
    // setInput('');
    setLoading(true);
    setError(null);
    
    try {
      if (!isGeminiConfigured()) {
        const errorText = `Gemini not configured. Please set VITE_GEMINI_API_KEY environment variable.`;
        if (onStreamChunk) {
          onStreamChunk(errorText, true);
        }
        return;
      }

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedResponseWithTimestamp = await cacheManager.getCachedWithTimestamp(userMessage.content);
        if (cachedResponseWithTimestamp) {
          // Use cached response - simulate streaming for consistent UX
          if (onStreamChunk) {
            onStreamChunk(cachedResponseWithTimestamp.data.textWithCitations, true);
          }
          if (onResponse) {
            onResponse(cachedResponseWithTimestamp.data, true, cachedResponseWithTimestamp.timestamp); // true indicates from cache
          }
          return;
        }
      }
      
      // No cache hit or forced refresh - make API call with streaming
      const streamResponse = await generateStreamWithGemini({
        prompt: userMessage.content,
        temperature: 0.7,
        modelName: 'gemini-2.5-flash'
      });
      
      let accumulatedText = '';
      
      // Process the stream chunks and send to NewsDashboard
      for await (const chunk of streamResponse.stream) {
        if (!chunk.isComplete && chunk.text) {
          accumulatedText += chunk.text;
          if (onStreamChunk) {
            onStreamChunk(accumulatedText, false);
          }
        }
      }
      
      // Get the full response with citations when streaming completes
      const fullResponse = await streamResponse.getFullResponse();
      
      // Cache the response for future use
      await cacheManager.setCached(userMessage.content, fullResponse);
      
      // Send final response to NewsDashboard
      if (onStreamChunk) {
        onStreamChunk(fullResponse.textWithCitations, true);
      }
      
      if (onResponse) {
        onResponse(fullResponse, false); // false indicates fresh from API
      }
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
      if (onStreamChunk) {
        onStreamChunk('Error generating response', true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Expose runAgain method via ref
  React.useImperativeHandle(ref, () => ({
    runAgain: () => {
      if (input.trim().length > 0) {
        onSend(true); // Force refresh, skip cache
      }
    }
  }));

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // 200px max height
      const minHeight = 44; // ~2.75rem
      textarea.style.height = Math.min(Math.max(scrollHeight, minHeight), maxHeight) + 'px';
      textarea.style.overflowY = scrollHeight > maxHeight ? 'scroll' : 'hidden';
    }
  }, []);

  React.useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  return (
    <section className="grid gap-4 p-4 rounded-xl theme-chat-bg border border-[rgb(var(--chat-accent))]">
      {/* Removing Messaging Idea 
      <div 
        className="grid gap-3 border rounded-lg p-4"
        style={{
          backgroundColor: 'rgb(var(--bg-primary))',
          borderColor: 'rgb(var(--border))'
        }}
      >
        {messages.map((m) => (
          <div key={m.id} className="grid gap-1">
            <span 
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'rgb(var(--chat-accent))' }}
            >
              {m.role}
            </span>
            <span 
              className="leading-relaxed"
              style={{ color: 'rgb(var(--text-secondary))' }}
            >
              {m.content}
            </span>
          </div>
        ))}
        {error && <div className="text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border border-red-200 dark:border-red-800/50 text-sm">{error}</div>}
        {(() => {
          const usageInfo = getUsageInfo();
          if (hasReachedDailyLimit()) {
            return (
              <div className="text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg border border-red-200 dark:border-red-800/50 text-sm">
                <strong>Daily limit reached:</strong> You've used all 20 API calls for today. Please try again tomorrow.
              </div>
            );
          } else if (usageInfo.remaining <= 3 && usageInfo.used > 0) {
            return (
              <div className="text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50 text-sm">
                <strong>Warning:</strong> You have {usageInfo.remaining} API calls remaining today.
              </div>
            );
          }
          return null;
        })()}
      </div>
      */} 
      <div className="flex flex-col gap-3 items-end">
        <div className="flex-1">
          {/* Pre-defined prompt header */}
          <div>
            {input ? 
              (<p className="text-xl font-bold my-4 mx-2">{input}</p>) : 
              (<p className="font-bold my-4 mx-2">Choose a prompt to get started.</p>)
            }
          </div>
          {/* Prompt Input Textbox */}
          {/* <textarea
            ref={textareaRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="w-full px-4 py-3 rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all duration-200 leading-relaxed"
            style={{
              minHeight: '44px',
              maxHeight: '200px',
              overflowY: 'hidden',
              backgroundColor: 'rgb(var(--bg-primary))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--text-primary))',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgb(var(--chat-accent))';
              e.target.style.boxShadow = `0 0 0 2px rgb(var(--chat-accent) / 0.2)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgb(var(--border))';
              e.target.style.boxShadow = 'none';
            }}
          /> */}
        </div>
        <button
          onClick={() => onSend()}
          disabled={!canSend}
          className="px-6 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 shadow-sm hover:shadow-md"
          style={{
            minHeight: '34px',
            backgroundColor: canSend ? 'rgb(var(--button-primary))' : 'rgb(var(--button-primary-disabled))',
            color: canSend ? 'white' : 'rgba(255, 255, 255, 0.7)',
            cursor: canSend ? 'pointer' : 'not-allowed'
          }}
          onMouseEnter={(e) => {
            if (canSend) {
              e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))';
            }
          }}
          onMouseLeave={(e) => {
            if (canSend) {
              e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))';
            }
          }}
          title={hasReachedDailyLimit() ? 'Daily API limit reached (20/20)' : loading ? 'Sending...' : 'Send message'}
        >
          {loading ? 'Sending…' : hasReachedDailyLimit() ? 'Limit Reached' : 'Send'}
        </button>
      </div>
    </section>
  );
});

export default ChatPanel;
