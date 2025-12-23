import React from 'react';
import newsdashgreen from '../assets/newsdash_green.png';

interface HeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function Header({ isDark, toggleTheme }: HeaderProps) {
  return (
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
        <div 
          className="font-semibold font-grotesk"
          style={{ color: 'rgb(var(--text-primary))' }}
        >
          The Concourse NewsDash
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
        <span style={{ color: 'rgb(var(--text-muted))' }}>·</span>
        <a 
          href="https://concourse.codes" 
          target="_blank" 
          rel="noreferrer" 
          className="hover:opacity-80 transition-opacity"
          style={{ color: 'rgb(var(--accent))' }}
        >
          Concourse
        </a>
        {/* <span style={{ color: 'rgb(var(--text-muted))' }}>·</span> */}
        {/* <a 
          href="https://youtube.com/@ConcourseFM" 
          target="_blank" 
          rel="noreferrer" 
          className="hover:opacity-80 transition-opacity"
          style={{ color: 'rgb(var(--accent))' }}
        >
          FM
        </a>
        <span style={{ color: 'rgb(var(--text-muted))' }}>·</span>
        <a 
          href="https://bsky.app/profile/concourse-codes.bsky.social" 
          target="_blank" 
          rel="noreferrer" 
          className="hover:opacity-80 transition-opacity"
          style={{ color: 'rgb(var(--accent))' }}
        >
          Contact
        </a> */}
      </div>
    </header>
  );
}
