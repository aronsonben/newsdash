import React, { useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { GeminiGenerateResponse, GroundingChunk, CloudSaveState, NewsItem, CacheData, Shortcut, BlockSegment, SavedBlock } from 'src/types';
import { FRESH_TTL_MS, SEGMENT_COLORS } from '../constants';
import { getCacheState, segmentMarkdownByHeaders } from '../lib/utils';

/**
 * Returns a human-readable relative time string (e.g. "just now", "3h ago", "5 days ago")
 * based on the Unix timestamp (ms) of when a cache entry was last saved.
 */
function formatRelativeTime(updatedAt: number): string {
  const diffMs = Date.now() - updatedAt;
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (minutes < 1) return 'just now';
  if (hours < 1) return `${minutes}m ago`;
  if (days < 1) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

interface NewsDashboardProps { 
  data: GeminiGenerateResponse | null;
  isStreaming: boolean; 
  streamingText: string; 
  onSaveToCloud: () => void; 
  cloudSaveState: CloudSaveState;
  loading: boolean;
  isFetching: boolean;
  onRunAgain: (forceRefresh?: boolean) => void; 
  currentCacheObj: CacheData | null;
  currentCacheState: string;
  highlightedText: string;
  setHighlightedText: (text: string | null, selection: Selection | null, citations?: GroundingChunk[]) => void;
  highlightedCitations: GroundingChunk[];
  storedUsername?: string;
  onSaveBlock?: (block: Omit<SavedBlock, 'createdAt' | 'updatedAt'>) => void;
}

export default function NewsDashboard({ 
  data, 
  isStreaming, 
  streamingText, 
  onSaveToCloud, 
  cloudSaveState = 'idle', 
  loading, 
  isFetching, 
  onRunAgain, 
  currentCacheObj, 
  currentCacheState, 
  highlightedText,
  setHighlightedText,
  highlightedCitations,
  storedUsername, 
  onSaveBlock 
}: NewsDashboardProps) {
  // ––– STATE ––––––––––––
  // Citation Popup State
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [selectedSegment, setSelectedSegment] = React.useState<string | null>(null);
  const [dialogPosition, setDialogPosition] = React.useState({ top: 0, left: 0 });      // TODO: don't think I need this saved in state
  // Misc. State

  // Pre-process response text into header segments for the save-block feature.
  const segments: BlockSegment[] = React.useMemo(() => {
    if (!data?.textWithCitations || !data?.groundingChunks) return [];
    return segmentMarkdownByHeaders(data.textWithCitations, data.groundingChunks);
  }, [data?.textWithCitations, data?.groundingChunks]);

  const extractHeadingText = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(c => (typeof c === 'string' ? c : '')).join('');
    return String(children ?? '');
  };

  const handleHeaderClick = (headingText: string) => {
    if (!onSaveBlock) return;
    const segment = segments.find(s => s.heading === headingText);
    if (segment) {
      let segId = segment.heading + Date.now();
      onSaveBlock({ id: segId, title: segment.heading, text: segment.content, citations: segment.citations });
    }
  };

  const showActionBar = (currentCacheObj || (!!data && !isStreaming));

  // savedBy is the durable discriminator: present = originated from Firestore, absent = locally run
  const hasSavedBy = !!currentCacheObj?.savedBy;
  const savedBy = hasSavedBy ? currentCacheObj?.savedBy : '';
  const displayNameRunner = !hasSavedBy
    ? 'anonymous'
    : (storedUsername && storedUsername === savedBy ? 'you' : (savedBy || 'anonymous'));

  const STALE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // prompt to re-run after 3 days
  const isOld = !!currentCacheObj && (Date.now() - currentCacheObj.updatedAt) > STALE_THRESHOLD_MS;

  // ––– CITATION POPUP HANDLERS ––––––––––––
  // these are for handling the pop-up that appears in the citation segment view
  useEffect(() => {
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

  // ––– NEWS DATA HANDLER ––––––––––––––––––––

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


  // ––– CUSTOM HIGHLIGHT TOOLTIP HANDLER ––––––––––––––––––––
  /**
   * Custom text highlight handler does two things:
   * 1. Sets the highlighted text to global state
   * 2. Displays a custom highlight tooltip UI with actions
   */
  const handleCustomHighlight = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString();
    if (!text) return;

    // matches digits not preceded by a letter/digit, handles "1,2,3" and "1These" patterns
    const citationNums = [...text.matchAll(/(?<![a-zA-Z\d])(\d{1,2})(?!\d)/g)]
      .map(m => parseInt(m[1], 10));
    const citations: GroundingChunk[] = citationNums
      .filter(num => num >= 1 && num <= (data?.groundingChunks?.length ?? 0))
      .map(num => data!.groundingChunks![num - 1]);

    setHighlightedText(text, selection, citations.length > 0 ? citations : undefined);
  }

  // ––– MISC. HANDLER ––––––––––––––––––––
  // Custom ReactMarkdown components for better styling
  const markdownComponents: Components = {
    h1: ({ children }) => (
      <h1 className="markdown-content" style={{ color: 'rgb(var(--text-primary))' }}>{children}</h1>
    ),
    h2: ({ children }) => {
      const isClickable = !!onSaveBlock && segments.length > 0;
      const text = extractHeadingText(children);
      return (
        <h2
          className={`markdown-content${isClickable ? ' group cursor-pointer' : ''}`}
          style={{ color: 'rgb(var(--text-primary))' }}
          onClick={isClickable ? () => handleHeaderClick(text) : undefined}
          title={isClickable ? 'Click to save this section' : undefined}
        >
          {children}
          {isClickable && (
            <span
              className="ml-2 text-xs opacity-0 group-hover:opacity-60 transition-opacity select-none"
              style={{ color: 'rgb(var(--accent))' }}
            >
              ⊞ save
            </span>
          )}
        </h2>
      );
    },
    h3: ({ children }) => {
      const isClickable = !!onSaveBlock && segments.length > 0;
      const text = extractHeadingText(children);
      return (
        <h3
          className={`markdown-content${isClickable ? ' group cursor-pointer' : ''}`}
          style={{ color: 'rgb(var(--text-primary))' }}
          onClick={isClickable ? () => handleHeaderClick(text) : undefined}
          title={isClickable ? 'Click to save this section' : undefined}
        >
          {children}
          {isClickable && (
            <span
              className="ml-2 text-xs opacity-0 group-hover:opacity-60 transition-opacity select-none"
              style={{ color: 'rgb(var(--accent))' }}
            >
              ⊞ save
            </span>
          )}
        </h3>
      );
    },
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
            {currentCacheObj ? (
              <>
                {hasSavedBy && <span style={{ color: 'rgb(var(--text-muted))' }}>☁</span>}
                <span>
                  {'Last run '}
                  <span style={{ color: isOld ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))' }}>
                    {formatRelativeTime(currentCacheObj.updatedAt)}
                  </span>
                  {' by '}
                  <strong style={{ color: 'rgb(var(--text-secondary))' }} title={(displayNameRunner === 'you') ? storedUsername : savedBy}>
                    {displayNameRunner}
                  </strong>
                </span>
              </>
            ) : (
              <span>Fresh response</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRunAgain(true)}
              disabled={loading}
              className="px-3 py-1 text-xs font-medium rounded transition-colors duration-200 border bg-theme-button-outlined border-theme-button-outlined text-theme-button-secondary hover:cursor-pointer enabled:hover:bg-[rgb(var(--button-primary))]/20 enabled:hover:text-[rgb(var(--text-primary))] enabled:hover:border-[rgb(var(--border))] disabled:opacity-50 disabled:cursor-not-allowed"
              style={isOld ? { backgroundColor: 'rgb(var(--accent))', borderColor: 'rgb(var(--accent))', color: 'rgb(var(--bg-primary))' } : {}}
              title={isOld ? 'This data is over 3 days old — run again for the latest news' : 'Run this prompt again to get fresh results'}
            >
              {isOld ? 'Run again for latest ↑' : 'Run Again'}
            </button>
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
              <div 
                onMouseUp={handleCustomHighlight} 
              >
                <ReactMarkdown 
                  components={markdownComponents}
                  skipHtml={false}
                  urlTransform={(url) => url}
                >
                  {data?.textWithCitations || ''}
                </ReactMarkdown>
              </div>
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
                            style={{ backgroundColor: SEGMENT_COLORS[idx] }}
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
