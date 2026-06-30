import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true while Firebase resolves the session

  useEffect(() => {
    // onAuthStateChanged fires once immediately with the current user (or null),
    // then again on every sign-in/sign-out. Firebase persists the session to
    // indexedDB automatically — the user stays logged in across page refreshes.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // cleans up the listener on unmount
  }, []);

  const signIn = () => signInWithPopup(auth, googleProvider);
  const signOut_ = () => signOut(auth);

  return { user, loading, signIn, signOut: signOut_ };
}
