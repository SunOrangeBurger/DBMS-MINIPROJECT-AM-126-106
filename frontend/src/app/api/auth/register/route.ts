import bcrypt from 'bcryptjs';
import { route } from '@/lib/api';
import { callProcWithOut, queryOne } from '@/lib/db';
import { ROLE_HOME, setSessionCookie } from '@/lib/session';
import { email as vEmail, password as vPassword, phone as vPhone, readJson, str, strOrNull } from '@/lib/validate';

// Public self-registration always creates a CUSTOMER account
// (staff accounts can only be created by an admin).
export const POST = route(async ({ request }) => {
  const body = await readJson(request);
  const fullName = str(body.full_name, { name: 'Full name', min: 2, max: 100 });
  const email = vEmail(body.email);
  const password = vPassword(body.password);
  const phone = vPhone(body.phone);
  const address = strOrNull(body.address, { name: 'Address', max: 255 });
  const city = strOrNull(body.city, { name: 'City', max: 100 });

  const hash = await bcrypt.hash(password, 10);

  // users + customers rows are created atomically inside the stored procedure
  const userId = await callProcWithOut('sp_register_customer', [fullName, email, hash, phone, address, city]);

  const user = await queryOne<{ user_id: number; full_name: string; customer_id: number }>(
    `SELECT u.user_id, u.full_name, c.customer_id
       FROM users u JOIN customers c ON c.user_id = u.user_id WHERE u.user_id = ?`,
    [userId]
  );
  if (!user) throw new Error('Registration did not create a customer row');
  await setSessionCookie({ uid: user.user_id, name: user.full_name, role: 'customer', cid: user.customer_id, mid: null });
  return { name: user.full_name, role: 'customer', home: ROLE_HOME.customer };
});
