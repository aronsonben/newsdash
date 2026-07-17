import React, { useState, useEffect, useRef } from 'react';

interface UsernamePromptModalProps {
  isOpen: boolean;
  defaultValue: string;
  anonPlaceholder: string;
  onConfirm: (username: string) => void;
  onClose: () => void;
}

export default function UsernamePromptModal({ isOpen, defaultValue, anonPlaceholder, onConfirm, onClose }: UsernamePromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync value and focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(value.trim() || anonPlaceholder);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Only show the "use anonymous" nudge when the input is pre-filled with
  // something other than the anonymous placeholder (i.e. a signed-in user).
  const showAnonNudge = defaultValue !== anonPlaceholder;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-sm flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'rgb(var(--bg-primary))', borderColor: 'rgb(var(--border))' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <span className="text-xs font-semibold font-grotesk uppercase tracking-wide" style={{ color: 'rgb(var(--text-muted))' }}>
            Choose a display name
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            This name will be attached to your saved response in the database.
            You'll only be asked once.
          </p>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={anonPlaceholder}
            maxLength={32}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{
              backgroundColor: 'rgb(var(--bg-secondary))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--text-primary))',
            }}
          />
          {showAnonNudge && (
            <button
              type="button"
              onClick={() => setValue(anonPlaceholder)}
              className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              Use anonymous instead ({anonPlaceholder})
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-5 py-3 border-t"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:cursor-pointer"
            style={{
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--text-secondary))',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors hover:cursor-pointer"
            style={{
              backgroundColor: 'rgb(var(--button-primary))',
              color: 'white',
            }}
          >
            Save &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
