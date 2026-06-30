import React, { useState } from 'react';
import newsdashgreen from '../assets/newsdash_green.png';
import type { User } from 'firebase/auth';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  apiStatus: boolean;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-xl p-8 max-w-md w-full mx-4"
        style={{ backgroundColor: 'rgb(var(--bg-primary))', color: 'rgb(var(--text-primary))', border: '1px solid rgb(var(--border))' }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl font-bold opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: 'rgb(var(--text-primary))' }}
        >
          ×
        </button>
        {children}
      </div>
    </>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
        <h2 className="text-2xl font-semibold mb-4">About NewsDash</h2>
        <p className="mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
          NewsDash is an AI-supported, climate-oriented, locally-focused news dashboard built by {' '}
          <a href="https://concourse.codes" target="_blank" rel="noreferrer" className="underline">
            Concourse Codes
          </a>.
        </p>
        <p className="mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
          NewsDash uses Google Gemini to search the web and scan trusted news sources for the latest climate news. 
          You can see which sources are used at the bottom of each response.
        </p>
        <p className="mt-4 mb-5 text-center italic" style={{ color: 'rgb(var(--text-secondary))' }}>
          It's like a <b>plain language RSS feed</b> for local climate news.
        </p>
        <p className="mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
          This is a personal project by
          <img 
            src="/benicon.png" 
            alt="NewsDash logo" 
            className="h-10 w-auto inline-block"
          />
          <a href="https://concourse.codes/about.html" target="_blank" rel="noreferrer" className="underline">
            Ben Aronson
          </a>.
          If you have any questions, feel free to {' '}
          <a href="https://concourse.codes/contact.html" target="_blank" rel="noreferrer" className="underline">
            get in touch
          </a>.
        </p>
        <p style={{ color: 'rgb(var(--text-muted))' }} className="text-sm">
          Version 1.0 · Built with React, Vite, and Tailwind CSS.
        </p>
    </Modal>
  );
}

function AccountModal({ user, onSignOut, onClose }: { user: import('firebase/auth').User; onSignOut: () => void; onClose: () => void }) {
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-semibold mb-5">My Account</h2>
      <div className="space-y-3 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Email</p>
          <p style={{ color: 'rgb(var(--text-primary))' }}>{user.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Member since</p>
          <p style={{ color: 'rgb(var(--text-primary))' }}>{createdAt}</p>
        </div>
      </div>
      <button
        onClick={() => { onSignOut(); onClose(); }}
        className="w-full px-4 py-2 rounded-lg text-white font-medium transition-colors duration-200"
        style={{ backgroundColor: 'rgb(var(--button-primary))' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))'; }}
      >
        Sign out
      </button>
    </Modal>
  );
}

export default function Header({ isDark, toggleTheme, apiStatus, user, authLoading, onSignIn, onSignOut }: HeaderProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  return (
    <>
    <header 
      className="sticky top-0 z-10 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: 'rgba(var(--bg-primary), 0.9)',
        borderColor: 'rgb(var(--border))',
        color: 'rgb(var(--text-primary))'
      }}
    >
      <div className="flex items-center gap-3">
        <img 
          src="/newsdash_green.png" 
          alt="NewsDash logo" 
          className="h-10 w-auto rounded-lg"
        />
        <div className="flex items-end gap-3">
          <div 
            className="font-light font-mono text-3xl italic"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            NewsDash
          </div>
          <div 
            className="font-light font-mono text-xs italic pb-1"
            style={{ color: 'rgb(var(--text-primary))' }}
          >
            by <a href="https://concourse.codes" target="_blank" className="underline decoration-[rgba(var(--border))] underline-offset-2">Concourse Codes</a>
          </div>
        </div>
      </div>
      <div className="gap-3 items-center sm:flex hidden">
        <button
          onClick={toggleTheme}
          className="px-3 py-2 rounded-lg text-white border-0 transition-colors duration-200 font-medium"
          style={{
            backgroundColor: 'rgb(var(--button-primary))'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))';
          }}
          title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        {/* <div className="flex flex-col items-center px-3 py-1 bg-[rgb(var(--button-primary))]/20 rounded-xl">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>API: </p>
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{apiStatus ? '✅': '❌'}</p>
        </div> */}
        <span style={{ color: 'rgb(var(--text-muted))' }}>·</span>
        {!authLoading && (
          user ? (
            <button
              onClick={() => setShowAccount(true)}
              className="w-9 h-9 rounded-full border-0 flex items-center justify-center transition-colors duration-200 cursor-pointer text-white"
              style={{ backgroundColor: 'rgb(var(--button-primary))' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))'; }}
              title={`Signed in as ${user.displayName ?? user.email}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="px-3 py-2 rounded-lg text-white border-0 transition-colors duration-200 font-medium text-sm"
              style={{ backgroundColor: 'rgb(var(--button-primary))' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))'; }}
            >
              Sign in with Google
            </button>
          )
        )}
        <span style={{ color: 'rgb(var(--text-muted))' }}>·</span>
        <button
          onClick={() => setShowAbout(true)}
          className="w-9 h-9 rounded-full border-0 flex items-center justify-center font-bold text-base transition-colors duration-200 cursor-pointer text-white"
          style={{ backgroundColor: 'rgb(var(--button-primary))' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))'; }}
          title="About NewsDash"
        >
          ?
        </button>
      </div>
    </header>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showAccount && user && <AccountModal user={user} onSignOut={onSignOut} onClose={() => setShowAccount(false)} />}
    </>
  );
}
