import React, { useEffect, useMemo, useState } from 'react';
import { hasReachedDailyLimit, getUsageInfo } from '../lib/usageTracker';
import { CacheData, Shortcut } from 'src/types';
import { Timestamp } from 'firebase/firestore';

interface ChatPanelProps { 
    shortcut: Shortcut,
    onSend: (forceRefresh?: boolean) => void,
    loading: boolean;
    geminiConfigured: boolean;
  }

function ChatPanel({ shortcut, onSend, loading, geminiConfigured }: ChatPanelProps) {
  // ––– STATE ––––––––––––
  const [input, setInput] = useState(shortcut.prompt);

  const iconSrc = shortcut.icon ? (shortcut.icon.startsWith('/') ? shortcut.icon : `/${shortcut.icon}`) : undefined;

  // TODO: see if this can be made more efficient
  // update the 'canSend' based on: 1) input isn't empty, 2) not in loading state, 3) geminiConfigured
  const canSend = useMemo(() => input.trim().length > 0 && !loading && geminiConfigured, [input, loading, geminiConfigured]);

  // ––– EFFECTS ––––––––––––
  useEffect(() => {
    setInput(shortcut.prompt);
  }, [shortcut]);

  // // TODO: what is this doing
  // useEffect(() => {
  //   if (forceRefreshTrigger && forceRefreshTrigger > 0 && input.trim().length > 0) {
  //     onSend(true);
  //   }
  // }, [forceRefreshTrigger]);


  // ––– JSX ––––––––––––
  return (
    <section className="p-3 rounded-xl theme-chat-bg">
      <div className="flex flex-col gap-3">
        {/* Topic header with icon */}
        {shortcut.name && (
          <div className="flex items-center gap-2">
            {iconSrc && (
              <img src={iconSrc} alt="" className="h-8 w-8 rounded-lg object-cover shadow-sm border" style={{ borderColor: "border-[rgb(--border)]"}}/>
            )}
            <h2 className="text-sm font-semibold font-grotesk color-[rgb(var(--text-secondary))]" >
              {shortcut.name}
            </h2>
          </div>
        )}
        {/* Read-only prompt textarea */}
        <textarea
          value={input}
          readOnly
          placeholder="Choose a topic from shortcuts..."
          title="Prompt editing is not available at this time"
          className="w-full px-4 py-3 rounded-lg border resize-none transition-all duration-200 cursor-not-allowed focus:outline-none focus:ring-2 font-grotesk min-h-11 max-h-50"
          disabled={true}
          style={{
            backgroundColor: 'bg-[rgb(239,235,230)]',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-muted))',
          }}
        />
        {/* Edit and Send buttons */}
        <div className="flex justify-end gap-2">
          <button
            disabled
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 shadow-sm min-h-10 cursor-not-allowed"
            style={{
              backgroundColor: 'rgb(var(--button-primary-disabled))',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
            title="Prompt editing is not available at this time"
          >
            Edit
          </button>
          <button
            onClick={() => onSend(true)}
            disabled={!geminiConfigured || !canSend}
            className="px-6 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap min-h-10 focus:outline-none focus:ring-2 shadow-sm hover:shadow-md"
            style={{
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
            title={loading ? 'Sending...' : 'Send message (⌘↵)'}
          >
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ChatPanel;
