import React from 'react';
import Modal from './Modal';

interface SaveBlockWarningModalProps {
  onSignIn: () => void;
  onAcknowledge: () => void;
  onClose: () => void;
}

export default function SaveBlockWarningModal({ onSignIn, onAcknowledge, onClose }: SaveBlockWarningModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--text-primary))' }}>
            <img src="/benicon.png" alt="Ben icon" className="h-8 w-auto inline-block" />
            Yo! Saved blocks won't be persisted.
          </h2>
          <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgb(var(--text-secondary))' }}>
            Save that block! Your saved block won't be persisted after you close the browser, though. 
          </p>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgb(var(--text-secondary))' }}>
            If you want to keep it for later, sign up for an account. It's free. I don't read any of your data (I can barely read my own email lol).
          </p>
          <p className="text-sm mt-2" style={{ color: 'rgb(var(--text-muted))' }}>
            Don't want to sign in with Google? No worries. Non-google sign in options will be available soon.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 border"
            style={{
              backgroundColor: 'rgb(var(--bg-secondary))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--text-primary))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-primary))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" fillRule="evenodd">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </g>
            </svg>
            Sign in with Google
          </button>

          <button
            onClick={onAcknowledge}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            style={{
              color: 'rgb(var(--text-muted))',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgb(var(--text-secondary))';
              e.currentTarget.style.backgroundColor = 'rgb(var(--bg-secondary))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgb(var(--text-muted))';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Got it, save anyway
          </button>
        </div>
      </div>
    </Modal>
  );
}
