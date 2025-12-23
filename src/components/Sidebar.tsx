import { useEffect, useState } from 'react';
import { Shortcut } from 'src/types';
import shortcuts from '../../shortcuts.json';
import { cacheManager } from '../lib/cacheManager';

export function Sidebar({ onSelect, refreshCache }: { onSelect: (s: Shortcut) => void; refreshCache?: number }) {
  const items = (shortcuts as Shortcut[]).filter((s) => !!s?.name && !!s?.prompt);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  // Check cache status for all shortcuts
  useEffect(() => {
    const checkCacheStatus = async () => {
      const cached = new Set<string>();
      
      for (const item of items) {
        if (item.id) {
          const cachedData = await cacheManager.getCached(item.id);
          if (cachedData) {
            cached.add(item.id);
          }
        }
      }
      
      setCachedIds(cached);
    };

    checkCacheStatus();
  }, [refreshCache]); // Re-check when refreshCache changes

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

          const isCached = item.id && cachedIds.has(item.id);

          return (
            <button
              key={item.name}
              onClick={() => onSelect(item)}
              title={item.description ?? item.prompt}
              aria-label={item.name}
              className="flex items-center justify-center lg:justify-start gap-3 w-full border theme-border rounded-lg p-2 lg:p-3 cursor-pointer theme-bg-primary hover:theme-bg-secondary hover:shadow-sm transition-all duration-200 group relative"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
                e.currentTarget.style.borderColor = 'rgb(var(--sidebar-accent))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--bg-primary))';
                e.currentTarget.style.borderColor = 'rgb(var(--border))';
              }}
            >
              <span className="flex items-center justify-center h-10 w-10 md:min-w-20 md:min-h-20 rounded-xl overflow-hidden bg-white/10">
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
              {isCached && (
                <span 
                  className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[rgb(var(--dashboard-accent))]" 
                  title="Cached data available"
                />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
