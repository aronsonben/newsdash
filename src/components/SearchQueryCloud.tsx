import { useState } from 'react';

interface SearchQueryCloudProps {
  queries: string[];
}

const MAX_VISIBLE = 50;

/** Flex-wrap chip cloud of all search queries ever used for a given shortcut */
export default function SearchQueryCloud({ queries }: SearchQueryCloudProps) {
  const [showAll, setShowAll] = useState(false);

  if (queries.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: 'rgb(var(--text-muted))' }}>
        No search queries recorded yet.
      </p>
    );
  }

  const visible = showAll ? queries : queries.slice(0, MAX_VISIBLE);
  const overflow = queries.length - MAX_VISIBLE;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((q, i) => (
        <span
          key={i}
          className="text-xs px-2.5 py-1 rounded-full border transition-colors cursor-default"
          style={{
            backgroundColor: 'rgb(var(--bg-secondary))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-secondary))',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgb(var(--accent))';
            e.currentTarget.style.color = 'rgb(var(--text-primary))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgb(var(--border))';
            e.currentTarget.style.color = 'rgb(var(--text-secondary))';
          }}
        >
          {q}
        </span>
      ))}
      {!showAll && overflow > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--text-muted))',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgb(var(--accent))';
            e.currentTarget.style.color = 'rgb(var(--accent))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgb(var(--border))';
            e.currentTarget.style.color = 'rgb(var(--text-muted))';
          }}
        >
          +{overflow} more
        </button>
      )}
    </div>
  );
}
