import React from 'react';
import shortcuts from '../../shortcuts.json';

type Shortcut = {
  name: string;
  description?: string;
  prompt: string;
};

export function Sidebar({ onSelect }: { onSelect: (s: Shortcut) => void }) {
  const items = (shortcuts as Shortcut[]).filter((s) => !!s?.name && !!s?.prompt);

  return (
    <aside className="w-72 border-r theme-border p-4 flex flex-col gap-3 theme-sidebar-bg">
      <div className="font-semibold mb-1 theme-text-primary font-grotesk text-lg">Shortcuts</div>
      <div className="grid gap-2">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect(item)}
            title={item.description ?? item.prompt}
            className="text-left border theme-border rounded-lg p-3 cursor-pointer theme-bg-primary theme-text-primary hover:theme-bg-secondary hover:shadow-sm transition-all duration-200 group"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
              e.currentTarget.style.borderColor = 'rgb(var(--sidebar-accent))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-primary))';
              e.currentTarget.style.borderColor = 'rgb(var(--border))';
            }}
          >
            <div className="font-medium font-grotesk group-hover:theme-sidebar-accent transition-colors">{item.name}</div>
            {item.description && (
              <div className="theme-text-muted text-xs mt-1 line-clamp-2">{item.description}</div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
