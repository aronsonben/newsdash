import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_BROWSER_API_KEY,
  authDomain: 'newsdash-concourse.firebaseapp.com',
  projectId: 'newsdash-concourse',
  storageBucket: 'newsdash-concourse.firebasestorage.app',
  messagingSenderId: '809304184792',
  appId: '1:809304184792:web:55f10ffc84aab0b6db04ad',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
