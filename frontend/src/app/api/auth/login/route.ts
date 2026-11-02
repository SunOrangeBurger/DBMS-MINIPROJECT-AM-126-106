import bcrypt from 'bcryptjs';
import { route } from '@/lib/api';
import { query, queryOne } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { assertNotLocked, clearFailures, recordFailure } from '@/lib/rateLimit';
import { ROLE_HOME, setSessionCookie } from '@/lib/session';
import type { Role } from '@/lib/session';
import { email as vEmail, readJson, str } from '@/lib/validate';

interface UserRow {
  user_id: number;
  full_name: string;
  password_hash: string;
  role: Role;
  is_active: number;
  customer_id: number | null;
  mechanic_id: number | null;
}

// Compared against when the e-mail is unknown, so response time does not reveal which e-mails exist
function dummyHash(): string {
  const g = globalThis as unknown as { __autocareDummyHash?: string };
  if (!g.__autocareDummyHash) g.__autocareDummyHash = bcrypt.hashSync('autocare-dummy-password', 10);
  return g.__autocareDummyHash;
}

export const POST = route(async ({ request }) => {
  const body = await readJson(request);
  const email = vEmail(body.email);
  const password = str(body.password, { name: 'Password', max: 200 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = `${ip}|${email}`;
  assertNotLocked(key);

  const user = await queryOne<UserRow>(
    `SELECT u.user_id, u.full_name, u.password_hash, u.role, u.is_active,
            c.customer_id, m.mechanic_id
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.user_id
       LEFT JOIN mechanics m ON m.user_id = u.user_id
      WHERE u.email = ?`,
    [email]
  );

  // The ONLY way in is a matching bcrypt hash - there is no master password.
  let ok = false;
  try {
    ok = await bcrypt.compare(password, user ? user.password_hash : dummyHash());
  } catch {
    ok = false;
  }
  if (!user || !user.is_active || !ok) {
    recordFailure(key);
    throw new HttpError(401, 'Invalid email or password');
  }

  clearFailures(key);
  await query('UPDATE users SET last_login_at = NOW() WHERE user_id = ?', [user.user_id]);
  await setSessionCookie({ uid: user.user_id, name: user.full_name, role: user.role, cid: user.customer_id, mid: user.mechanic_id });
  return { name: user.full_name, role: user.role, home: ROLE_HOME[user.role] };
});
