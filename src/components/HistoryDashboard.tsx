import { useEffect, useState } from 'react';
import { Shortcut, PromptStats, HistoryEntry } from 'src/types';
import { statsClient } from '../lib/apiClient';
import RunTimeline from './RunTimeline';
import CitationChart from './CitationChart';
import SearchQueryCloud from './SearchQueryCloud';

interface HistoryDashboardProps {
  shortcut: Shortcut;
}

type Section = {
  id: string;
  label: string;
  render: () => React.ReactNode;
};

/** Builds a display-title lookup map from the loaded history entries */
function buildTitleMap(entries: HistoryEntry[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of entries) {
    for (const c of entry.citations ?? []) {
      if (c.title && c.displayTitle) map[c.title] = c.displayTitle;
    }
  }
  return map;
}

/** Full analytics dashboard for a single shortcut: run history, citation frequency, search queries */
export default function HistoryDashboard({ shortcut }: HistoryDashboardProps) {
  const [stats, setStats] = useState<PromptStats | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      setStats(null);
      setEntries([]);
      try {
        const [fetchedStats, fetchedEntries] = await Promise.all([
          statsClient.readStats(shortcut.id),
          statsClient.readHistory(shortcut.id, 10),
        ]);
        if (!cancelled) {
          setStats(fetchedStats);
          setEntries(fetchedEntries);
        }
      } catch {
        if (!cancelled) setError('Failed to load history data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [shortcut.id]);

  const titleMap = buildTitleMap(entries);

  const sections: Section[] = [
    {
      id: 'timeline',
      label: 'Run History',
      render: () => <RunTimeline entries={entries} />,
    },
    {
      id: 'citations',
      label: 'Citation Frequency',
      render: () =>
        stats ? (
          <CitationChart stats={stats} titleMap={titleMap} />
        ) : (
          <p className="text-sm italic" style={{ color: 'rgb(var(--text-muted))' }}>No data.</p>
        ),
    },
    {
      id: 'queries',
      label: 'Search Queries',
      render: () => <SearchQueryCloud queries={stats?.allSearchQueries ?? []} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex items-center gap-3 pb-3 border-b"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            {shortcut.name}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {stats
              ? `${stats.totalGenerations} total ${stats.totalGenerations === 1 ? 'run' : 'runs'} · last ${entries.length > 0 ? '10 runs shown' : 'run: none'}`
              : 'Loading…'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg animate-pulse"
              style={{ backgroundColor: 'rgb(var(--bg-secondary))' }}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{error}</p>
      )}

      {!loading && !error && !stats && (
        <div
          className="rounded-xl border p-6 text-center"
          style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--bg-secondary))' }}
        >
          <p className="text-sm italic" style={{ color: 'rgb(var(--text-muted))' }}>
            No history yet for this topic. Run a search to start tracking.
          </p>
        </div>
      )}

      {!loading && !error && stats && sections.map(section => (
        <section key={section.id}>
          <h3
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            {section.label}
          </h3>
          {section.render()}
        </section>
      ))}
    </div>
  );
}
