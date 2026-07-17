import React from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ onClose, children }: ModalProps) {
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
