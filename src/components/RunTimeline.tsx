import { useState } from 'react';
import { HistoryEntry } from 'src/types';

interface RunTimelineProps {
  entries: HistoryEntry[];
}

function formatTimestamp(capturedAt: any): string {
  // Accepts ISO string (from API) or Firestore Timestamp-like object
  const date = typeof capturedAt === 'string' ? new Date(capturedAt) : capturedAt?.toDate?.();
  if (!date || isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Chronological list of the last N history runs for a given shortcut */
export default function RunTimeline({ entries }: RunTimelineProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (entries.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: 'rgb(var(--text-muted))' }}>
        No history entries found for this topic.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry, i) => {
        const isExpanded = expandedIndex === i;
        const runNumber = entries.length - i;
        return (
          <div
            key={i}
            className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border))' }}
          >
            {/* Collapsed header — always visible */}
            <button
              type="button"
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--bg-tertiary))]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="text-xs font-mono font-semibold shrink-0 px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgb(var(--bg-tertiary))', color: 'rgb(var(--text-muted))' }}
                >
                  #{runNumber}
                </span>
                <span className="text-sm font-mono truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                  {formatTimestamp(entry.capturedAt)}
                </span>
                <span
                  className="text-xs shrink-0 px-1.5 py-0.5 rounded-full border"
                  style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--text-muted))' }}
                >
                  {entry.textHeadings?.length ?? 0} headings
                </span>
              </div>
              <span className="text-xs shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>
                {isExpanded ? '▾' : '▸'}
              </span>
            </button>

            {/* Expanded body */}
            {isExpanded && (
              <div
                className="px-4 pb-4 space-y-3 border-t"
                style={{ borderColor: 'rgb(var(--border))' }}
              >
                {/* Text headings */}
                {entry.textHeadings?.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>
                      Headings
                    </p>
                    <ul className="space-y-1 pl-3 border-l-2" style={{ borderColor: 'rgb(var(--border))' }}>
                      {entry.textHeadings.map((h, hi) => (
                        <li key={hi} className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Search queries */}
                {entry.searchQueries?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>
                      Search Queries
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.searchQueries.map((q, qi) => (
                        <span
                          key={qi}
                          className="text-xs px-2 py-1 rounded-full border"
                          style={{
                            backgroundColor: 'rgb(var(--bg-tertiary))',
                            borderColor: 'rgb(var(--border))',
                            color: 'rgb(var(--text-secondary))',
                          }}
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top citations */}
                {entry.citations?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>
                      Top Citations
                    </p>
                    <div className="flex flex-col gap-1">
                      {entry.citations.slice(0, 5).map((c, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <span className="text-xs font-mono w-4 text-right shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>
                            {c.citationCount}×
                          </span>
                          <span className="text-xs truncate" style={{ color: 'rgb(var(--text-secondary))' }}>
                            {c.displayTitle}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
