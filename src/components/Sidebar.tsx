import React from 'react';
import shortcuts from '../../shortcuts.json';

type Shortcut = {
  name: string;
  description?: string;
  prompt: string;
  icon?: string;
};

export function Sidebar({ onSelect }: { onSelect: (s: Shortcut) => void }) {
  const items = (shortcuts as Shortcut[]).filter((s) => !!s?.name && !!s?.prompt);

  return (
    <aside className="hidden md:flex flex-col gap-3 border-r theme-border theme-sidebar-bg px-4 py-5 shrink-0 w-20 lg:w-72">
      <div className="hidden lg:block font-semibold mb-1 theme-text-primary font-grotesk text-lg">Shortcuts</div>
      <div className="grid gap-2">
        {items.map((item) => {
          const iconSrc = item.icon ? (item.icon.startsWith('/') ? item.icon : `/${item.icon}`) : undefined;
          const initials = item.name
            .split(' ')
            .map((chunk) => chunk[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <button
              key={item.name}
              onClick={() => onSelect(item)}
              title={item.description ?? item.prompt}
              aria-label={item.name}
              className="flex items-center justify-center lg:justify-start gap-3 w-full border theme-border rounded-lg p-2 lg:p-3 cursor-pointer theme-bg-primary hover:theme-bg-secondary hover:shadow-sm transition-all duration-200 group"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
                e.currentTarget.style.borderColor = 'rgb(var(--sidebar-accent))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--bg-primary))';
                e.currentTarget.style.borderColor = 'rgb(var(--border))';
              }}
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden bg-white/10">
                {iconSrc ? (
                  <img src={iconSrc} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold tracking-wide theme-text-primary uppercase">
                    {initials}
                  </span>
                )}
              </span>
              <span className="hidden lg:block font-medium font-grotesk group-hover:theme-sidebar-accent transition-colors">
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
