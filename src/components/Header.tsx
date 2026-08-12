import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import AboutModal from './AboutModal';
import AccountModal from './AccountModal';

const NewsDashLogo = () => (
  <div className="flex items-center gap-3">
    <img 
      src="/newsdash_green.png" 
      alt="NewsDash logo" 
      className="h-10 w-auto rounded-lg"
    />
    <div className="hidden sm:flex items-end gap-3">
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
)

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
  apiStatus: boolean;
  user: User | null;
  displayName: string;      // this differs from the User.displayName in that it can be set when a user is using the app anonymously (either signed in or not)
  authLoading: boolean;
  openSignInModal: () => void;
  onSignIn: (mode: string) => void;
  onSignOut: () => void;
}

export default function Header({ isDark, toggleTheme, apiStatus, user, displayName, authLoading, openSignInModal, onSignIn, onSignOut }: HeaderProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  return (
    <>
    <header 
      className=" top-0 z-10 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: 'rgba(var(--bg-primary), 0.9)',
        borderColor: 'rgb(var(--border))',
        color: 'rgb(var(--text-primary))'
      }}
    >
      <NewsDashLogo />
      <div className="gap-3 items-center flex">
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
        <span style={{ color: 'rgb(var(--text-muted))' }}>·</span>
        {!authLoading && (
          user ? (
            <button
              onClick={() => setShowAccount(true)}
              className="w-9 h-9 rounded-full border-0 flex items-center justify-center transition-colors duration-200 cursor-pointer text-white"
              style={{ backgroundColor: 'rgb(var(--button-primary))' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))'; }}
              title={`Signed in as ${user.displayName ? user.displayName : user.email ? user.email : displayName }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={openSignInModal}
              className="px-3 py-2 rounded-lg text-white border-0 transition-colors duration-200 font-medium text-sm cursor-pointer"
              style={{ backgroundColor: 'rgb(var(--button-primary))' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary-hover))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--button-primary))'; }}
            >
              Sign in
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
