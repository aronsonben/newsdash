import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Loads the service account JSON. Production/Preview use the base64 env var only;
 * `vercel dev` (VERCEL_ENV=development) may instead read a git-ignored local key file,
 * so no admin key ever needs to live in Vercel's Development scope.
 */
function loadServiceAccount(): Record<string, unknown> {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not valid base64-encoded JSON.');
    }
  }

  if (process.env.VERCEL_ENV === 'development') {
    const file = resolve(process.env.FIREBASE_DEV_SERVICE_ACCOUNT_FILE ?? '.secrets/dev-service-account.json');
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      throw new Error(`Local dev: could not read a service account key at ${file}.`);
    }
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not configured on the server.');
}

/** Initializes firebase-admin once per serverless instance. */
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({ credential: cert(loadServiceAccount() as Parameters<typeof cert>[0]) });
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
