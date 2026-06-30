import { getFirestore } from 'firebase/firestore';
import { app } from './auth';

// Single Firestore instance for the browser client SDK.
// Security rules enforce per-user access — requests are automatically
// authenticated by the Firebase Auth session.
export const db = getFirestore(app);
