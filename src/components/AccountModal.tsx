import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import Modal from './Modal';
import { useLocalStorage } from '../services/useLocalStorage';
import { getUserProfile } from '../lib/firestore';

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

  // ── Weekly digest subscription state ─────────────────────────────────────
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  // Load current subscription status from the users/{uid} Firestore document on open.
  useEffect(() => {
    getUserProfile(user.uid)
      .then(profile => setWeeklyReport(profile?.weeklyReport ?? false))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [user.uid]);

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

  /**
   * Calls the subscribe or unsubscribe API endpoint when the user toggles
   * the weekly digest opt-in, then updates local UI state on success.
   */
  const handleToggleWeeklyReport = async () => {
    const newValue = !weeklyReport;
    setSubscribeLoading(true);
    try {
      const endpoint = newValue ? '/api/subscribe' : '/api/unsubscribe';
      const body = newValue
        ? { userId: user.uid, email: user.email }
        : { userId: user.uid };
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setWeeklyReport(newValue);
    } catch (err) {
      console.error('[AccountModal] Failed to update subscription:', err);
    } finally {
      setSubscribeLoading(false);
    }
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

        {/* Weekly digest opt-in */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'rgb(var(--text-muted))' }}>Weekly Digest</p>
          {profileLoading ? (
            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Loading…</p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                role="switch"
                aria-checked={weeklyReport}
                disabled={subscribeLoading}
                onClick={handleToggleWeeklyReport}
                className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                style={{ backgroundColor: weeklyReport ? 'rgb(var(--button-primary))' : 'rgb(var(--border))' }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: weeklyReport ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
              <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                {weeklyReport ? 'Subscribed' : 'Not subscribed'} &mdash; weekly news digest to {user.email}
              </p>
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
