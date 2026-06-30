import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { marked } from 'marked';
import { SavedBlock } from 'src/types';

interface SavedBlockModalProps {
  block: Omit<SavedBlock, 'id' | 'createdAt' | 'updatedAt'>;
  onConfirm: (title: string, text: string) => void;
  onDiscard: () => void;
  limitReached?: boolean;
}

// Detects whether a string is HTML or raw markdown.
function toHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return marked.parse(text) as string;
}

const TOOLBAR_BUTTONS = (
  editor: ReturnType<typeof useEditor>,
  onSetLink: () => void
) => [
  { label: 'B', title: 'Bold', action: () => editor?.chain().focus().toggleBold().run(), active: !!editor?.isActive('bold'), className: 'font-bold' },
  { label: 'I', title: 'Italic', action: () => editor?.chain().focus().toggleItalic().run(), active: !!editor?.isActive('italic'), className: 'italic' },
  { label: 'H2', title: 'Heading 2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: !!editor?.isActive('heading', { level: 2 }), className: '' },
  { label: 'H3', title: 'Heading 3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: !!editor?.isActive('heading', { level: 3 }), className: '' },
  { label: '• List', title: 'Bullet list', action: () => editor?.chain().focus().toggleBulletList().run(), active: !!editor?.isActive('bulletList'), className: '' },
  { label: '1. List', title: 'Ordered list', action: () => editor?.chain().focus().toggleOrderedList().run(), active: !!editor?.isActive('orderedList'), className: '' },
  { label: '⊞ Link', title: 'Set link', action: onSetLink, active: !!editor?.isActive('link'), className: '' },
];

export default function SavedBlockModal({ block, onConfirm, onDiscard, limitReached }: SavedBlockModalProps) {
  const [title, setTitle] = useState(block.title);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: toHtml(block.text),
  });

  const handleSetLink = () => {
    const current = editor?.getAttributes('link').href ?? '';
    const url = window.prompt('Enter URL (leave empty to remove):', current);
    if (url === null) return; // cancelled
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleSave = () => {
    if (!editor || !title.trim() || limitReached) return;
    onConfirm(title.trim(), editor.getHTML());
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onDiscard();
  };

  const buttons = TOOLBAR_BUTTONS(editor, handleSetLink);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--bg-primary))', borderColor: 'rgb(var(--border))' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <span className="text-xs font-semibold font-grotesk uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>
            Save Block
          </span>
          <button
            onClick={onDiscard}
            className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Discard"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Block title"
            className="w-full text-lg font-semibold bg-transparent outline-none border-b pb-2 font-grotesk"
            style={{ color: 'rgb(var(--text-primary))', borderColor: 'rgb(var(--border))' }}
          />

          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center gap-1 p-1.5 rounded-lg border"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border))' }}
          >
            {buttons.map(btn => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.action}
                title={btn.title}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${btn.className}`}
                style={{
                  backgroundColor: btn.active ? 'rgb(var(--accent))' : 'transparent',
                  color: btn.active ? 'rgb(var(--bg-primary))' : 'rgb(var(--text-secondary))',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div
            className="markdown-content rounded-lg border p-4 cursor-text"
            style={{ backgroundColor: 'rgb(var(--bg-secondary))', borderColor: 'rgb(var(--border))' }}
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent editor={editor} />
          </div>

          {/* Citations */}
          {block.citations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold font-grotesk uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>
                Citations
              </p>
              <div className="flex flex-col gap-1">
                {block.citations.map((chunk, i) =>
                  chunk.web?.uri ? (
                    <a
                      key={i}
                      href={chunk.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs truncate hover:underline"
                      style={{ color: 'rgb(var(--accent))' }}
                    >
                      [{i + 1}] {chunk.web.title ?? chunk.web.uri}
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            {limitReached ? '25/25 — block limit reached' : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="px-4 py-1.5 text-sm rounded-lg border transition-colors hover:opacity-80"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--text-secondary))' }}
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={limitReached || !title.trim()}
              className="px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgb(var(--accent))', color: 'rgb(var(--bg-primary))' }}
            >
              Save Block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
