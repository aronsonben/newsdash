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
    <aside className="w-72 border-r border-[#2a2a2a] p-3 flex flex-col gap-2 bg-[#141414]">
      <div className="font-semibold mb-1 text-[#f0f0f0]">Shortcuts</div>
      <div className="grid gap-1">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect(item)}
            title={item.description ?? item.prompt}
            className="text-left border border-[#2a2a2a] rounded-md p-2 cursor-pointer bg-[#1a1a1a] text-[#e0e0e0] hover:bg-[#242424]"
          >
            <div className="font-medium text-[#f0f0f0]">{item.name}</div>
            {item.description && (
              <div className="text-[#999] text-xs mt-1">{item.description}</div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
