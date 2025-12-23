import React from 'react';
import { Shortcut } from 'src/types';
import shortcuts from '../../shortcuts.json';

export default function MobileShortcutTray({ onSelect }: { onSelect: (s: Shortcut) => void }) {
  const items = (shortcuts as Shortcut[]).filter((s) => !!s?.name && !!s?.prompt);

  return (
    <section className="md:hidden border-b theme-border theme-sidebar-bg px-4 py-3">
      {/* <div className="flex items-center justify-between mb-2">
        <span className="font-semibold font-grotesk theme-text-primary">Shortcuts</span>
      </div> */}
      <div className="flex justify-between gap-3 overflow-x-auto">
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
              aria-label={item.name}
              title={item.description ?? item.prompt}
              className="flex items-center justify-center shrink-0 max-w-16 max-h-16 rounded-2xl border theme-border bg-white/10 hover:max-w-17 hover:max-h-17 hover:theme-bg-secondary transition-all duration-300"
            >
              {iconSrc ? (
              <img src={iconSrc} alt={item.name} className="h-full w-full object-cover rounded-xl" />
              ) : (
              <span className="text-xs font-semibold theme-text-primary uppercase">{initials}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
