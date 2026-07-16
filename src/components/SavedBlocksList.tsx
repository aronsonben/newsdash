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
      <div className="flex items-center justify-between mb-2 lg:hidden">
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

      {/* xs/sm view: below md — rows with number, title, date */}
      <div className="flex flex-col gap-1.5 md:hidden">
        {blocks.map((block, index) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onEdit(block)}
            className="flex items-center gap-3 w-full rounded-lg border px-3 py-2 cursor-pointer transition-colors text-left"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--text-primary))' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--accent))'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgb(var(--border))'; }}
            aria-label={`Open block ${index + 1}: ${block.title}`}
          >
            <span
              className="text-xs font-semibold font-grotesk w-5 shrink-0 text-center"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              {index + 1}
            </span>
            <span
              className="text-sm font-medium font-grotesk flex-1 truncate"
              style={{ color: 'rgb(var(--text-primary))' }}
            >
              {block.title}
            </span>
            <span
              className="text-xs shrink-0"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              {new Date(block.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>

      {/* md view: md to lg — compact numbered squares */}
      <div className="hidden md:flex lg:hidden flex-wrap gap-1.5">
        {blocks.map((block, index) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onEdit(block)}
            className="w-full group relative rounded-lg border p-3 cursor-pointer transition-colors"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border))', color: 'rgb(var(--text-primary))' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--accent))'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgb(var(--border))'; }}
            title={block.title}
            aria-label={`Open block ${index + 1}: ${block.title}`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Full view: larger than md */}
      <div className="hidden lg:block">
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
    </div>
  );
}
