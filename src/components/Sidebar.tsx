import { useEffect, useState } from 'react';
import { CacheData, Shortcut, SavedBlock } from 'src/types';
import shortcuts from '../../shortcuts.json';
import SavedBlocksList from './SavedBlocksList';

const BASE_SHORTCUTS: Shortcut[] = shortcuts;

interface SidebarProps { 
  selectedId: string;
  cachedIds: string[];
  onSelect: (s: Shortcut) => void;
  savedBlocks: SavedBlock[];
  onEditBlock: (block: SavedBlock) => void;
  onDeleteBlock: (id: string) => void;
  limitReached: boolean;
}

export function Sidebar({ selectedId, cachedIds, onSelect, savedBlocks, onEditBlock, onDeleteBlock, limitReached }: SidebarProps) {


  return (
    <aside className="hidden md:flex flex-col gap-3 border-r theme-border theme-sidebar-bg px-4 py-5 shrink-0 w-20 lg:w-72">
      <div className="hidden lg:block font-semibold mb-1 theme-text-primary font-grotesk text-lg">Shortcuts</div>
      <div className="grid gap-2">
        {BASE_SHORTCUTS.map((item) => {
          const iconSrc = item.icon ? (item.icon.startsWith('/') ? item.icon : `/${item.icon}`) : undefined;
          const initials = item.name
            .split(' ')
            .map((chunk) => chunk[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          // const isCached = item.id && cachedIds.has(item.id);
          const isCached = item.id && (cachedIds.indexOf(item.id) > 0);
          const isSelected = item.id === selectedId;

          return (
            <button
              key={item.name}
              onClick={() => onSelect(item)}
              title={item.description ?? item.prompt}
              aria-label={item.name}
              aria-pressed={isSelected}
              className="flex items-center justify-center lg:justify-start gap-3 w-full border rounded-lg p-2 lg:p-3 cursor-pointer hover:shadow-sm transition-all duration-200 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--sidebar-accent))] focus-visible:ring-offset-1"
              style={{
                backgroundColor: isSelected ? 'rgb(var(--sidebar-bg))' : 'rgb(var(--bg-primary))',
                borderColor: isSelected ? 'rgb(var(--sidebar-accent))' : 'rgb(var(--border))',
                borderWidth: isSelected ? '2px' : '1px'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
                  e.currentTarget.style.borderColor = 'rgb(var(--sidebar-accent))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--bg-primary))';
                  e.currentTarget.style.borderColor = 'rgb(var(--border))';
                }
              }}
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
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
              {cachedIds.indexOf(item.id) >= 0 && (
                <span 
                  id="cached-indicator"
                  className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-[rgb(var(--dashboard-accent))]" 
                  title="Cached data available"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Saved blocks — only shown on lg where sidebar is wide enough for labels */}
      {savedBlocks.length > 0 && (
        <div
          className="lg:block mt-2 pt-4 border-t"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <SavedBlocksList
            blocks={savedBlocks}
            onEdit={onEditBlock}
            onDelete={onDeleteBlock}
            limitReached={limitReached}
          />
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
