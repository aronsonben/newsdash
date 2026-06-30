import { SavedBlock } from 'src/types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface SavedBlocksListProps {
  blocks: SavedBlock[];
  onEdit: (block: SavedBlock) => void;
  onDelete: (id: string) => void;
  limitReached: boolean;
  className?: string;
}

export default function SavedBlocksList({ blocks, onEdit, onDelete, limitReached, className = '' }: SavedBlocksListProps) {
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold font-grotesk uppercase tracking-wide"
          style={{ color: 'rgb(var(--text-muted))' }}
        >
          Saved Blocks
        </span>
        {limitReached && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-muted))' }}
          >
            25/25
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {blocks.map(block => (
          <div
            key={block.id}
            className="group relative rounded-lg border p-3 cursor-pointer transition-colors"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border))' }}
            onClick={() => onEdit(block)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--accent))'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgb(var(--border))'; }}
          >
            <p
              className="text-sm font-medium font-grotesk pr-6 truncate"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              {block.title}
            </p>
            <p
              className="text-xs mt-0.5 line-clamp-2"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              {stripHtml(block.text).slice(0, 140)}
            </p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(block.id); }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity text-xs leading-none p-1"
              style={{ color: 'rgb(var(--text-muted))' }}
              aria-label="Delete block"
              title="Delete block"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
