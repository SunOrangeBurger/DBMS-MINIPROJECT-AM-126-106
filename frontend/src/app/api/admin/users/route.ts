import bcrypt from 'bcryptjs';
import { route } from '@/lib/api';
import { callProcWithOut, query } from '@/lib/db';
import { email as vEmail, int, money, password as vPassword, phone as vPhone, readJson, str, strOrNull } from '@/lib/validate';

export const GET = route(
  async () => ({
    users: await query(
      `SELECT u.user_id, u.full_name, u.email, u.role, u.phone, u.is_active, u.created_at, u.last_login_at,
              m.mechanic_id, m.specialization, m.is_available, c.loyalty_points
         FROM users u
         LEFT JOIN mechanics m ON m.user_id = u.user_id
         LEFT JOIN customers c ON c.user_id = u.user_id
        ORDER BY FIELD(u.role, 'admin', 'staff', 'customer'), u.full_name`
    ),
  }),
  { roles: ['admin'] }
);

// Create a STAFF member (users row + mechanics row, atomically inside sp_create_staff)
export const POST = route(
  async ({ request }) => {
    const b = await readJson(request);
    const hash = await bcrypt.hash(vPassword(b.password), 10);
    const userId = await callProcWithOut('sp_create_staff', [
      str(b.full_name, { name: 'Full name', min: 2, max: 100 }),
      vEmail(b.email),
      hash,
      vPhone(b.phone),
      strOrNull(b.specialization, { name: 'Specialization', max: 100 }),
      int(b.experience_yrs ?? 0, { name: 'Experience (years)', min: 0, max: 60 }),
      money(b.hourly_rate ?? 0, { name: 'Hourly rate', max: 100000 }),
    ]);
    return { user_id: userId };
  },
  { roles: ['admin'] }
);
