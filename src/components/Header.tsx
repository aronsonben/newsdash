import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import Modal from './Modal';
import AboutModal from './AboutModal';
import AccountModal from './AccountModal';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  apiStatus: boolean;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
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
