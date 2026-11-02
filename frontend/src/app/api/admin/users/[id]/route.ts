import { route } from '@/lib/api';
import { execute } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { idParam, readJson } from '@/lib/validate';

// Activate / deactivate an account (a deactivated user is locked out immediately, see lib/api.ts)
// and toggle a mechanic's availability.
export const PATCH = route(
  async ({ request, params, session }) => {
    const id = idParam(params.id);
    const b = await readJson(request);

    if (typeof b.is_active === 'boolean') {
      if (id === session.uid && !b.is_active) throw new HttpError(400, 'You cannot deactivate your own account');
      const r = await execute('UPDATE users SET is_active = ? WHERE user_id = ?', [b.is_active ? 1 : 0, id]);
      if (r.affectedRows === 0) throw new HttpError(404, 'User not found');
    }
    if (typeof b.is_available === 'boolean') {
      await execute('UPDATE mechanics SET is_available = ? WHERE user_id = ?', [b.is_available ? 1 : 0, id]);
    }
    return { ok: true };
  },
  { roles: ['admin'] }
);
