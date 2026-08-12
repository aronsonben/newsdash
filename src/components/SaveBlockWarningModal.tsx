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
            Sign in
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
