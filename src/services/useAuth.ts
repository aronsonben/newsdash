import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, signInAnonymously, sendSignInLinkToEmail, ActionCodeSettings, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth, googleProvider } from '../lib/auth';
import { useLocalStorage } from './useLocalStorage';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true while Firebase resolves the session

  useEffect(() => {
    // onAuthStateChanged fires once immediately with the current user (or null),
    // then again on every sign-in/sign-out. Firebase persists the session to
    // indexedDB automatically — the user stays logged in across page refreshes.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // console.log("[useAuth] User is signed if obj is valid: ", firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // cleans up the listener on unmount
  }, []);

  // ––– SIGN IN METHODS  –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
  /** Sign in with Google */
  const signIn = () => signInWithPopup(auth, googleProvider);
  
  /** Default sign out */
  const signOut_ = () => signOut(auth);

  /** Anonymous sign in method */
  const anonymousSignIn = () => signInAnonymously(auth)
    .then(() => { })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log("[useAuth] Error trying to sign in anonymously: ", errorCode, errorMessage);
      throw new Error(error);
    });
  
  /** Sign in with a magic link given an email address */
  const magicLinkSignIn = (email: string) => {
    // Construct the required ActionCodeSettings Firebase object for sign in
    const url = import.meta.env.DEV ? 'http://localhost:5173' : 'https://newsdash.concourse.codes';
    const actionCodeSettings: ActionCodeSettings = {
      url: url,
      handleCodeInApp: true,
    }
    sendSignInLinkToEmail(auth, email, actionCodeSettings)
      .then(() => {
        // Link sent successfully
        console.log("[useAuth] Magic email link sent successfully to: ", email);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("[useAuth] Error trying to sign in with magic link: ", errorCode, errorMessage);
        throw new Error(error);
      });
  };

  // ––– HELPER METHODS –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

  /** Function to handle the sign in with magic link flow. Returns true if successfully logged in */
  const checkEmailLinkSignIn = async (url: string, email: string): Promise<boolean> => {
    if (!isSignInWithEmailLink(auth, url)) {
      console.log("[useAuth] is NOT a email link sign in");
      return false;
    }

    console.log("[useAuth] Confirmed we found a sign in with email link");

    if (!email) {
      console.error("Invalid sign in with link. Try again.");
      return false;
    }

    try {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      // Technically should remove 'temp_email' from localStorage here but for now will handle on signOut
      console.log("[useAuth] Successfully signed in with email link! ", result);
      return true;
    } catch (error) {
      console.error("Error signing in with email link: ", error);
      return false;
    }
  }

  return { user, loading, signIn, signOut: signOut_, anonymousSignIn, magicLinkSignIn, checkEmailLinkSignIn };
}
