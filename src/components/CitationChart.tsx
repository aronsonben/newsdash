import { PromptStats } from 'src/types';

interface CitationChartProps {
  stats: PromptStats;
  /** Maps normalized citation key → human-readable display title */
  titleMap: Record<string, string>;
}

/** Pure CSS horizontal bar chart of citation frequency across all runs */
export default function CitationChart({ stats, titleMap }: CitationChartProps) {
  const { citationFrequency = {}, citationGenerationCount = {}, totalGenerations = 0 } = stats;

  const entries = Object.entries(citationFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (entries.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: 'rgb(var(--text-muted))' }}>
        No citation data yet.
      </p>
    );
  }

  const maxFreq = entries[0][1];

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-mono w-4 shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>#</span>
        <span className="text-xs flex-1 min-w-0" style={{ color: 'rgb(var(--text-muted))' }}>Source</span>
        <span className="text-xs font-mono w-20 text-right shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>Citations</span>
        <span className="text-xs font-mono w-14 text-right shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>Runs</span>
      </div>

      {entries.map(([key, freq], i) => {
        const displayTitle = titleMap[key] ?? key;
        const runCount = citationGenerationCount[key] ?? 0;
        const appearanceRate = totalGenerations > 0 ? Math.round((runCount / totalGenerations) * 100) : 0;
        const barWidth = maxFreq > 0 ? (freq / maxFreq) * 100 : 0;
        // Fade opacity for lower-ranked entries
        const opacity = Math.max(0.4, 1 - i * 0.07);

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono w-4 shrink-0 text-right"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                {i + 1}
              </span>
              <span
                className="text-xs flex-1 min-w-0 truncate"
                style={{ color: 'rgb(var(--text-secondary))' }}
                title={displayTitle}
              >
                {displayTitle}
              </span>
              <span className="text-xs font-mono w-20 text-right shrink-0" style={{ color: 'rgb(var(--text-primary))' }}>
                {freq}×
              </span>
              <span
                className="text-xs font-mono w-14 text-right shrink-0"
                style={{ color: 'rgb(var(--text-muted))' }}
                title={`Appeared in ${appearanceRate}% of runs`}
              >
                {runCount}/{totalGenerations}
              </span>
            </div>
            {/* Bar track */}
            <div
              className="ml-6 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgb(var(--bg-tertiary))' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: 'rgb(var(--accent))',
                  opacity,
                }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs pt-1" style={{ color: 'rgb(var(--text-muted))' }}>
        Across {totalGenerations} total {totalGenerations === 1 ? 'run' : 'runs'}
      </p>
    </div>
  );
}
