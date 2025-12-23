import React, { useEffect, useMemo, useState } from 'react';
import { generateStreamWithGemini, isGeminiConfigured, GeminiGenerateResponse } from '../lib/geminiClient';
import { hasReachedDailyLimit, getUsageInfo } from '../lib/usageTracker';
import { cacheManager } from '../lib/cacheManager';
import { Shortcut } from 'src/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const ChatPanel = React.forwardRef<
  { runAgain: () => void }, 
  { shortcut: Shortcut,
    onResponse?: ( 
      data: GeminiGenerateResponse, 
      fromCache?: boolean, 
      timestamp?: number
    ) => void; 
    onStreamChunk?: ( 
      text: string, 
      isComplete: boolean
    ) => void }
  > ( function ChatPanel({ 
    shortcut,
    onResponse, 
    onStreamChunk 
  }, ref) {

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading && !hasReachedDailyLimit(), [input, loading]);

  useEffect(() => {
    setInput(shortcut.prompt);
  }, [shortcut]);

  async function onSend(forceRefresh = false) {
    if (!canSend) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    
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
        instructions: shortcut.instructions,
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

  const iconSrc = shortcut.icon ? (shortcut.icon.startsWith('/') ? shortcut.icon : `/${shortcut.icon}`) : undefined;

  return (
    <section className="grid p-4 rounded-xl theme-chat-bg">
      {shortcut.name && (
        <p className="font-normal theme-text-secondary">
          {shortcut.name}
        </p>
      )}
      <div className="flex flex-col gap-3 items-end">
        <div className="flex-1">
          {/* Pre-defined prompt header */}
          <div className="flex items-center gap-4">
            {iconSrc && (
              <img
                src={iconSrc}
                alt="Selected shortcut"
                className="h-20 w-20 rounded-2xl border border-[rgb(var(--border))] object-cover shadow-sm"
              />
            )}
            <div className="flex-1">
              {input ? 
                (<p className="md:text-xl font-semibold my-4">{input}</p>) : 
                (<p className="font-bold my-4">Choose a prompt to get started.</p>)
              }
            </div>
          </div>
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
