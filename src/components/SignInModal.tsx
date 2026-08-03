import React, { useState, useEffect, useRef } from 'react';

interface SignInModalProps {
  isOpen: boolean;
  handleSignIn: (mode: string, email?: string) => void;
  handleSignOut: () => void;
  onClose: () => void;
}

export default function SignInModal({ isOpen, handleSignIn, handleSignOut, onClose }: SignInModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [magicLinkOpen, setMagicLinkOpen] = useState<boolean>(false);
  const [emailValue, setEmailValue] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  /** Handling user input for when they are inputting magic link email */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSignIn("magic");
    if (e.key === 'Escape') onClose();
  };

  /** handle user clicking outside of the modal box */
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleChangeEmailValue = (e: string) => {
    setEmailValue(e);
    if (error) {
      setError('');
    }
  }

  /** Locally handle magic link sign in to validate email address */
  const handleMagicLinkSignIn = () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValue || emailValue.trim() === '' || !isValidEmail(emailValue)) {
      setError("Whoops! You input an invalid email, or this sign-in method is not working right now. Please try again.");
      return;
    } 
    handleSignIn("magic", emailValue);
    setEmailValue('');
    setError('');
  }

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
            Sign In {magicLinkOpen && 'with Magic Link'}
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
            {!magicLinkOpen ? 
              "Sign in with Google, your email, or anonymously (you can link your account later if you wish)."
              : "Enter your email and a link to sign in will be sent."}
          </p>
          {magicLinkOpen && (
            <>
            <input
              ref={inputRef}
              type="email"
              required
              onInvalid={(e) => {
                e.preventDefault();
                setError("Whoops! You input an invalid email, or this sign-in method is not working right now. Please try again.");
              }}
              value={emailValue}
              onChange={e => handleChangeEmailValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"anon@email.com"}
              maxLength={32}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none placeholder:text-[rgb(var(--text-primary))]/50"
              style={{
                backgroundColor: 'rgb(var(--bg-secondary))',
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--text-primary))',
              }}
            />
            <span className="text-xs text-red-500">{error}</span>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex flex-col justify-end gap-2 px-5 py-3 border-t"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          {!magicLinkOpen ? (
            <div className="flex flex-col justify-end gap-2 px-5 py-3">
              <button
                onClick={() => handleSignIn("google")}
                className="px-3 py-2 rounded-lg text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] text-sm font-normal bg-[rgb(var(--bg-primary))] border-[0.5px] border-white/80 dark:border-[rgb(var(--border-primary))] transition-colors duration-200 hover:bg-[rgb(var(--bg-secondary))] hover:cursor-pointer"
              >
                Sign in with Google
              </button>
              <button
                type="button"
                onClick={() => handleSignIn("anonymous")}
                className="px-3 py-2 rounded-lg text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] text-sm font-normal bg-[rgb(var(--bg-primary))] border-[0.5px] border-white/80 dark:border-[rgb(var(--border-primary))] transition-colors duration-200 hover:bg-[rgb(var(--bg-secondary))] hover:cursor-pointer"
              >
                Sign In Anonymously
              </button>
              <button
                onClick={() => setMagicLinkOpen(true)}
                className="px-3 py-2 rounded-lg text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] text-sm font-normal bg-[rgb(var(--bg-primary))] border-[0.5px] border-white/80 dark:border-[rgb(var(--border-primary))] transition-colors duration-200 hover:bg-[rgb(var(--bg-secondary))] hover:cursor-pointer"
              >
                Sign in with Magic Link (email)
              </button>
            </div>
          ) : (
            <div className="flex flex-col justify-end gap-2 px-5 py-3">
              <button
                onClick={() => handleMagicLinkSignIn()}
                className="px-3 py-2 rounded-lg text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] text-sm font-normal bg-[rgb(var(--bg-primary))] border-[0.5px] border-white/80 dark:border-[rgb(var(--border-primary))] transition-colors duration-200 hover:bg-[rgb(var(--bg-secondary))] hover:cursor-pointer"
              >
                Send Magic Link
              </button>
              <button
                type="button"
                onClick={() => { onClose(); setMagicLinkOpen(false); setEmailValue(''); setError(''); }}
                className="px-3 py-2 rounded-lg text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-secondary))] text-sm font-normal bg-[rgb(var(--bg-primary))] border-[0.5px] border-white/80 dark:border-[rgb(var(--border-primary))] transition-colors duration-200 hover:bg-[rgb(var(--bg-secondary))] hover:cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
