import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/** Initializes firebase-admin once per serverless instance from the base64-encoded service account JSON. */
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not configured on the server.');
  }

  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not valid base64-encoded JSON.');
  }

  return initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) });
}

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

/** Lazily-initialized Admin Auth; lazy so a missing env var fails the request, not module load. */
export function getAdminAuth(): Auth {
  return (authInstance ??= getAuth(getAdminApp()));
}

/** Lazily-initialized Admin Firestore (bypasses security rules). */
export function getAdminDb(): Firestore {
  return (dbInstance ??= getFirestore(getAdminApp()));
}
