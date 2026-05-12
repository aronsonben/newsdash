import React, { useEffect, useMemo, useState } from 'react';
import { generateStreamWithGemini, isGeminiConfigured, GeminiGenerateResponse, GeminiStreamResponse } from '../lib/geminiClient';
import { hasReachedDailyLimit, getUsageInfo } from '../lib/usageTracker';
// import { cacheManager } from '../lib/cacheManager';
import { CacheData, Shortcut } from 'src/types';
import { Timestamp } from 'firebase/firestore';

interface ChatPanelProps { 
    shortcut: Shortcut,
    promptCache: CacheData[],
    setPromptCache: React.Dispatch<React.SetStateAction<CacheData[]>>,
    forceRefreshTrigger?: number,
    onResponse?: ( 
      data: GeminiGenerateResponse, 
      fromCache?: boolean, 
      timestamp?: number
    ) => void; 
    onStreamChunk?: ( 
      text: string, 
      isComplete: boolean
    ) => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
  }

function ChatPanel({ shortcut, promptCache, setPromptCache, onResponse, onStreamChunk, forceRefreshTrigger, loading, setLoading }: ChatPanelProps) {

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading && !hasReachedDailyLimit(), [input, loading]);

  useEffect(() => {
    setInput(shortcut.prompt);
  }, [shortcut]);

  async function onSend(forceRefresh = false) {
    if (!canSend) return;

    // prompt info
    const promptId = shortcut.id || 'custom-prompt';
    const promptText = input.trim();
    
    // setInput('');
    setLoading(true);
    setError(null);
    
    try {
      if (!isGeminiConfigured()) {
        const errorText = `Gemini not configured. Please set a Gemini API key`;
        if (onStreamChunk) {
          onStreamChunk(errorText, true);
        }
        return;
      }

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = promptCache.find((entry) => entry.id === promptId);
        if (cached) {
          // Use cached response
          if (onStreamChunk) {
            onStreamChunk(cached.data.textWithCitations, true);
          }
          if (onResponse) {
            onResponse(cached.data, true, cached.updatedAt); // true indicates from cache
          }
          return;
        }
      }
      
      // No cache hit or forced refresh - make API call with streaming
      const streamResponse: GeminiStreamResponse = await generateStreamWithGemini({
        prompt: promptText,
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

      const newPromptCache: CacheData = {
        id: promptId,
        data: fullResponse,
        updatedAt: Timestamp.now().toMillis()
      }
      
      // Cache the response for future use
      setPromptCache([newPromptCache, ...promptCache]);
      
      // Send final response to NewsDashboard
      if (onStreamChunk) {
        console.log("[ChatPanel] Setting final stream chunk", );
        onStreamChunk(fullResponse.textWithCitations, true);
      }
      
      if (onResponse) {
        console.log("[ChatPanel] Handling final response", );
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

  useEffect(() => {
    if (forceRefreshTrigger && forceRefreshTrigger > 0 && input.trim().length > 0) {
      onSend(true);
    }
  }, [forceRefreshTrigger]);

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
    <section className="p-3 rounded-xl theme-chat-bg">
      <div className="flex flex-col gap-3">
        {/* Topic header with icon */}
        {shortcut.name && (
          <div className="flex items-center gap-2">
            {iconSrc && (
              <img
                src={iconSrc}
                alt=""
                className="h-8 w-8 rounded-lg object-cover shadow-sm"
                style={{ borderColor: 'rgb(var(--border))', borderWidth: '1px' }}
              />
            )}
            <h2 
              className="text-sm font-semibold font-grotesk"
              style={{ color: 'rgb(var(--text-secondary))' }}
            >
              {shortcut.name}
            </h2>
          </div>
        )}
        {/* Read-only prompt textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          readOnly
          placeholder="Choose a topic from shortcuts..."
          title="Prompt editing is not available at this time"
          className="w-full px-4 py-3 rounded-lg border resize-none transition-all duration-200 cursor-not-allowed focus:outline-none focus:ring-2 font-grotesk"
          disabled={true}
          style={{
            backgroundColor: 'bg-[rgb(239,235,230)]',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-muted))',
            minHeight: '44px',
            maxHeight: '200px',
          }}
        />
        {/* Edit and Send buttons */}
        <div className="flex justify-end gap-2">
          <button
            disabled
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 shadow-sm"
            style={{
              minHeight: '40px',
              backgroundColor: 'rgb(var(--button-primary-disabled))',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'not-allowed'
            }}
            title="Prompt editing is not available at this time"
          >
            Edit
          </button>
          <button
            onClick={() => onSend()}
            disabled={!canSend}
            className="px-6 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 shadow-sm hover:shadow-md"
            style={{
              minHeight: '40px',
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
            title={hasReachedDailyLimit() ? 'Daily API limit reached (20/20)' : loading ? 'Sending...' : 'Send message (⌘↵)'}
          >
            {loading ? 'Sending…' : hasReachedDailyLimit() ? 'Limit Reached' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
