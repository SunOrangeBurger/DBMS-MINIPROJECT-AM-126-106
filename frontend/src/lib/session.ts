import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Sessions: a signed (HMAC-SHA256) token in an httpOnly cookie.
// Nothing is stored in the browser except this cookie; the secret never leaves
// the server (SESSION_SECRET in frontend/.env.local).
// ---------------------------------------------------------------------------

export type Role = 'admin' | 'staff' | 'customer';

export interface Session {
  uid: number;
  name: string;
  role: Role;
  cid: number | null; // customers.customer_id (customers only)
  mid: number | null; // mechanics.mechanic_id (staff only)
  exp: number; // unix seconds
}

export const SESSION_COOKIE = 'autocare_session';
export const SESSION_SECONDS = 8 * 60 * 60;

export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  staff: '/staff',
  customer: '/customer',
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters (see frontend/.env.example)');
  }
  return s;
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

export function createToken(data: Omit<Session, 'exp'>, now = Date.now()): string {
  const session: Session = { ...data, exp: Math.floor(now / 1000) + SESSION_SECONDS };
  const body = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** Returns the session, or null when the token is missing, tampered with or expired. */
export function verifyToken(token: string | undefined | null, now = Date.now()): Session | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
    if (typeof session.exp !== 'number' || session.exp * 1000 < now) return null;
    if (!['admin', 'staff', 'customer'].includes(session.role)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(data: Omit<Session, 'exp'>): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(data), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
