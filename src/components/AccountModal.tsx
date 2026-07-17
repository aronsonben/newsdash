import { useState } from 'react';
import type { User } from 'firebase/auth';
import Modal from './Modal';
import { useLocalStorage } from '../services/useLocalStorage';

interface AccountModalProps {
  user: User;
  onSignOut: () => void;
  onClose: () => void;
}

export default function AccountModal({ user, onSignOut, onClose }: AccountModalProps) {
  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  const [storedUsername, setStoredUsername] = useLocalStorage<string>('newsdash_username', '');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const startEditing = () => {
    setEditValue(storedUsername);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) setStoredUsername(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-semibold mb-5">My Account</h2>
      <div className="space-y-4 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Email</p>
          <p style={{ color: 'rgb(var(--text-primary))' }}>{user.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Member since</p>
          <p style={{ color: 'rgb(var(--text-primary))' }}>{createdAt}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Display name</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={32}
                className="flex-1 px-2 py-1 rounded-lg border text-sm focus:outline-none"
                style={{
                  backgroundColor: 'rgb(var(--bg-secondary))',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--text-primary))',
                }}
              />
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(var(--button-primary))', color: 'white' }}
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs rounded-lg border transition-colors"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--text-secondary))' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p style={{ color: storedUsername ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))' }}>
                {storedUsername || 'Not set'}
              </p>
              <button
                onClick={startEditing}
                className="text-xs underline opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                Edit
              </button>
            </div>
          )}
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
