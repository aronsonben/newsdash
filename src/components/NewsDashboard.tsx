import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { GeminiGenerateResponse, GroundingChunk, CloudSaveState } from 'src/types';

const FRESH_TTL_MS = 24 * 60 * 60 * 1000;      // < 24 h  → return immediately

export type NewsItem = {
  source: string;
  date: string;
  updates: string[];
  impact: string;
  link: string;
  action: string;
};

const dummyItems: NewsItem[] = [
  {
    source: 'OpenAI Research',
    date: '2025-11-24',
    updates: ['New alignment technique improves small model safety.'],
    impact: 'Likely boosts reliability of edge deployments.',
    link: 'https://example.com/openai-news',
    action: 'Evaluate for roadmap integration.'
  },
  {
    source: 'Google DeepMind',
    date: '2025-11-23',
    updates: ['Paper on long-context training efficiency released.'],
    impact: 'Lower inference costs for long docs.',
    link: 'https://example.com/deepmind-paper',
    action: 'Prototype longer context summarization.'
  },
  {
    source: 'Hugging Face',
    date: '2025-11-22',
    updates: ['New datasets for multi-modal QA announced.'],
    impact: 'Faster experimentation for image+text tasks.',
    link: 'https://example.com/hf-blog',
    action: 'Create spike on multi-modal Q&A.'
  }
];

const segmentColors: string[] = [
  "oklch(72.3% 0.219 149.579)",
  "oklch(65.07% 0.186 259.89)", // blue-500
  "oklch(62.88% 0.203 29.23)", // red-500
  "oklch(75.13% 0.181 56.36)", // orange-500
  "oklch(94.13% 0.168 99.59)", // yellow-500
]

interface NewsDashboardProps { 
  title?: string; 
  data: GeminiGenerateResponse | null; 
  streamingText?: string; 
  isStreaming?: boolean; 
  isCached?: boolean; 
  cacheTimestamp?: number | null; 
  onRunAgain?: () => void; 
  onSaveToCloud?: () => void; 
  cloudSaveState?: CloudSaveState;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isFetching?: boolean;
}

export default function NewsDashboard({ title, data, streamingText, isStreaming, isCached, cacheTimestamp, onRunAgain, onSaveToCloud, cloudSaveState = 'idle', loading, setLoading, isFetching = false }: NewsDashboardProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [selectedSegment, setSelectedSegment] = React.useState<string | null>(null);
  const [dialogPosition, setDialogPosition] = React.useState({ top: 0, left: 0 });
  const [isSaveHovered, setIsSaveHovered] = React.useState<boolean>(false);

  // these are for handling the pop-up that appears in the citation segment view
  React.useEffect(() => {
    if (selectedSegment && dialogRef.current) {
      dialogRef.current.show();
    } else if (dialogRef.current) {
      dialogRef.current.close();
    }
  }, [selectedSegment]);

  const handleSegmentClick = (seg: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedSegment) {
      setSelectedSegment(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDialogPosition({
      top: rect.top + 25,
      left: rect.left
    });
    setSelectedSegment(seg);
  };

  // memoized citation items
  const items: NewsItem[] = React.useMemo(() => {
    // console.log("[NewsDashboard] Data updated! ", data);
    if (!data) return [];
    if (!data.groundingChunks) return [];
    if (!data.groundingSupports) return [];
    const groundingChunks = data.groundingChunks;
    const groundingSupports = data.groundingSupports;

    return groundingChunks.map((chunk: GroundingChunk, idx: number) => {
      const web = chunk.web;

      // Filter out the grounding supports for this chunk
      const supports = groundingSupports.filter((sup) =>
        sup.groundingChunkIndices?.includes(idx)
      );

      // Then get the text segments
      const segments: string[] = supports.flatMap((sup) =>
        sup.segment?.text ? [sup.segment.text] : []
      );

      return {
        source: web?.title ?? 'Unknown Source',
        date: '', 
        updates: segments,
        impact: '',
        link: web?.uri ?? '#',
        action: ''
      };
    });
  }, [data]);

  // Custom ReactMarkdown components for better styling
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="markdown-content" style={{ color: 'rgb(var(--text-secondary))' }}>{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="markdown-content" style={{ color: 'rgb(var(--text-secondary))' }}>{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 className="markdown-content" style={{ color: 'rgb(var(--text-muted))' }}>{children}</h6>
    ),
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mr-1 text-[0.6rem] align-super"
        style={{ color: 'rgb(var(--accent))' }}
      >
        {children}
      </a>
    ),
    code: ({ children, className }) => {
      const isInline = !className;
      return (
        <code 
          className={className}
          style={{
            backgroundColor: isInline ? 'rgb(var(--bg-secondary))' : 'transparent',
            color: 'rgb(var(--text-primary))',
            fontSize: isInline ? '0.875rem' : '0.85rem'
          }}
        >
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => (
      <blockquote style={{ 
        borderLeftColor: 'rgb(var(--accent))',
        backgroundColor: 'rgb(var(--bg-secondary) / 0.5)',
        color: 'rgb(var(--text-secondary))'
      }}>
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
        <table style={{ borderColor: 'rgb(var(--border))' }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ 
        backgroundColor: 'rgb(var(--bg-secondary))',
        color: 'rgb(var(--text-primary))',
        borderColor: 'rgb(var(--border))'
      }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{ 
        color: 'rgb(var(--text-secondary))',
        borderColor: 'rgb(var(--border))'
      }}>
        {children}
      </td>
    )
  };

  const isFreshCache = !!cacheTimestamp && (Date.now() - cacheTimestamp < FRESH_TTL_MS); // cached within past 24h
  const showActionBar = (isCached || (!!data && !isStreaming)) && (isCached || !!onSaveToCloud);

  return (
    <section className="mt-6">
      {/* Action bar: shown when cached or when fresh data is ready to save */}
      {showActionBar && (
        <div 
          className="flex items-center justify-between px-6 py-2 text-xs border-l border-r border-t rounded-t-xl"
          style={{
            backgroundColor: 'rgb(var(--bg-secondary) / 0.5)',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-muted))'
          }}
        >
          <span className="flex items-center gap-2">
            {isCached ? (
              <>
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'rgb(var(--dashboard-accent))' }}
                ></span>
                <span>
                  Cached on
                  <span
                    className="p-1 rounded"
                    style={{
                      backgroundColor: isFreshCache && isSaveHovered ? 'rgb(var(--dashboard-accent))' : 'inherit',
                      color: isFreshCache && isSaveHovered ? 'black' : 'inherit',
                      transition: '0.33s ease'
                    }}
                  >
                    {cacheTimestamp ? new Date(cacheTimestamp).toLocaleDateString() + ' at ' + new Date(cacheTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown date'}
                  </span>
                </span>
              </>
            ) : (
              <span>Fresh response</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {onSaveToCloud && cloudSaveState !== 'saved' && (
              <span 
                onMouseEnter={() => setIsSaveHovered(true)}
                onMouseLeave={() => setIsSaveHovered(false)}
              >
                <button
                  onClick={onSaveToCloud}
                  disabled={cloudSaveState === 'saving' || isFreshCache}
                  className="px-3 py-1 text-xs font-medium rounded transition-colors duration-200 border bg-theme-button-outlined border-theme-button-outlined text-theme-button-secondary hover:cursor-pointer hover:bg-theme-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isFreshCache ? 'Already saved within the last 24 hours' : cloudSaveState === 'error' ? 'Save failed — click to retry' : 'Save this response to the cloud database'}
                >
                  {cloudSaveState === 'saving' ? 'Saving…' : cloudSaveState === 'error' ? 'Retry Save ↑' : '↑ Save to Cloud'}
                </button>
              </span>
            )}
            {cloudSaveState === 'saved' && (
              <span className="px-3 py-1 text-xs font-medium" style={{ color: 'rgb(var(--dashboard-accent))' }}>
                ✓ Saved to Cloud
              </span>
            )}
            {onRunAgain && (
              <button
                onClick={onRunAgain}
                className="px-3 py-1 text-xs font-medium rounded transition-colors duration-200 border bg-theme-button-outlined border-theme-button-outlined text-theme-button-secondary hover:cursor-pointer hover:bg-theme-button-primary"
                title="Run this prompt again to get fresh results"
              >
                Run Again
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Main dashboard content */}
      <div 
        className={`p-6 border ${showActionBar ? 'rounded-b-xl rounded-t-none border-t-0' : 'rounded-xl'}`}
        style={{ backgroundColor: 'rgb(var(--dashboard-bg))', borderColor: 'rgb(var(--border))' }}
      >
        {loading && !streamingText && (
          <div
            className="mb-6 p-5 rounded-xl border shadow-sm space-y-3"
            style={{
              backgroundColor: 'rgb(var(--bg-primary))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: 'rgb(var(--dashboard-accent))' }}
              />
              <span className="text-xs font-grotesk animate-pulse" style={{ color: 'rgb(var(--text-muted))' }}>
                Searching the web and generating summary…
              </span>
            </div>
            {[100, 85, 92, 70, 88].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-full animate-pulse"
                style={{
                  width: `${w}%`,
                  backgroundColor: 'rgb(var(--bg-secondary))',
                  animationDelay: `${i * 120}ms`
                }}
              />
            ))}
            <div className="pt-2 space-y-2">
              {[60, 75].map((w, i) => (
                <div
                  key={i}
                  className="h-3 rounded-full animate-pulse"
                  style={{
                    width: `${w}%`,
                    backgroundColor: 'rgb(var(--bg-secondary))',
                    animationDelay: `${(i + 5) * 120}ms`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {(streamingText || data?.text) && (
          <div 
            className="mb-6 p-5 rounded-xl border markdown-content shadow-sm"
            style={{
              backgroundColor: 'rgb(var(--bg-primary))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--text-secondary))'
            }}
          >
            {isStreaming ? (
              <div className="relative">
                <ReactMarkdown 
                  components={markdownComponents}
                  skipHtml={false}
                  urlTransform={(url) => url}
                >
                  {streamingText || ''}
                </ReactMarkdown>
                <span 
                  className="inline-block w-2 h-5 ml-1 animate-pulse"
                  style={{ backgroundColor: 'rgb(var(--dashboard-accent))' }}
                ></span>
              </div>
            ) : (
              <ReactMarkdown 
                components={markdownComponents}
                skipHtml={false}
                urlTransform={(url) => url}
              >
                {data?.textWithCitations || ''}
              </ReactMarkdown>
            )}
          </div>
        )}

      {(!loading && !streamingText && !data && items.length === 0) ? (
        isFetching ? (
          <div className="p-12 flex justify-center items-center">
            <span 
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'rgb(var(--dashboard-accent))',
                borderTopColor: 'transparent'
              }}
            />
          </div>
        ) : (
        <div 
          className="p-12 text-center rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--bg-primary))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-muted))',
            borderStyle: 'dashed'
          }}
        >
          <p className="text-lg font-grotesk mb-1">← Select a topic from shortcuts to begin</p>
          <p className="text-sm" style={{ color: 'rgb(var(--text-muted) / 0.7)' }}>Choose a shortcut or edit the prompt to get AI-powered news summaries</p>
        </div>
        )
      ) : (
        <div 
          className="overflow-x-auto rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--bg-primary))',
            borderColor: 'rgb(var(--border))'
          }}
        > 
          {/* Citations Table */}
          <table className="min-w-full border-collapse">
            <thead 
              style={{
                backgroundColor: 'rgb(var(--bg-secondary))'
              }}
            >
              <tr>
                {['Source', 'Update', 'Link'].map((header) => (
                  <th 
                    key={header}
                    className="text-left font-semibold text-sm p-4 border-b font-grotesk uppercase tracking-wide"
                    style={{
                      color: 'rgb(var(--dashboard-accent))',
                      borderColor: 'rgb(var(--border))'
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(items.length === 0) ? (
                <tr key={0} className="w-full flex justify-center align-top py-2 text-sm text-[rgb(var(--text-secondary))] transition-colors duration-150">
                  <td>No data</td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="align-top transition-colors duration-150"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td 
                      className="text-sm p-4 border-b text-[rgb(var(--text-secondary))] border-[rgb(var(--border))]/50"
                    >
                      <a href={item.link} target="_blank" className="">{item.source}</a>
                    </td>
                    <td 
                      className="text-sm p-4 border-b text-[rgb(var(--text-secondary))] border-[rgb(var(--border))]/50"
                    >
                      <div className="w-full h-full flex gap-2">
                      {item.updates.length > 0 && (
                        item.updates.map((seg, idx) => (
                          <div 
                            key={idx}
                            className="w-fit px-2 rounded text-[#141414] cursor-pointer hover:opacity-100 transition-opacity" 
                            style={{ backgroundColor: segmentColors[idx] }}
                            onClick={(e) => handleSegmentClick(seg, e)}
                          >
                            {idx}
                          </div>
                        ))
                      )}
                      </div>
                    </td>
                    <td 
                      className="text-sm p-4 border-b text-[rgb(var(--text-secondary))] border-[rgb(var(--border))]/50"
                    >
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center px-3 py-1 text-sm text-white rounded-md transition-colors duration-200 font-medium"
                        style={{
                          backgroundColor: 'rgb(var(--button-primary))'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))';
                        }}
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Segment Popup Dialog */}
      <dialog 
        ref={dialogRef}
        className="rounded-xl border"
        style={{
          backgroundColor: 'rgb(var(--bg-primary))',
          borderColor: 'rgb(var(--border))',
          color: 'rgb(var(--text-secondary))',
          maxWidth: '500px',
          padding: '0',
          position: 'fixed',
          top: `${dialogPosition.top}px`,
          left: `${dialogPosition.left}px`,
          margin: '0',
          zIndex: 1000
        }}
        closedby='any'
      >
        <div className="flex flex-row-reverse items-start gap-2 p-5">
          <button
            onClick={() => setSelectedSegment(null)}
            className="w-fit items-end justify-end px-2 py-1 text-xs rounded border transition-colors duration-200 font-medium cursor-pointer"
            style={{
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--text-secondary))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary) / 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
            }}
          >
            x
          </button>
          <p className="text-xs leading-relaxed">{selectedSegment}</p>
        </div>
      </dialog>
    </section>
  );
}
