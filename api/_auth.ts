import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth } from './_admin';

export interface AuthedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
}

function bearerToken(req: VercelRequest): string | null {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

/** Verifies the Firebase ID token in the Authorization header; sends 401 and returns null on failure. */
export async function requireUser(req: VercelRequest, res: VercelResponse): Promise<AuthedUser | null> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
    };
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
}

/** Constant-time string comparison that tolerates different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checks the cron bearer secret; fails closed (401) if CRON_SECRET is unset. */
export function requireCron(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.CRON_SECRET;
  const token = bearerToken(req);
  if (!secret || !token || !safeEqual(token, secret)) {
    res.status(401).json({ error: 'Unauthorised' });
    return false;
  }
  return true;
}
