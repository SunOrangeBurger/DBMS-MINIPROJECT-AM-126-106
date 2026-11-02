import { route } from '@/lib/api';
import { execute } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { idParam } from '@/lib/validate';

// ON DELETE RESTRICT on appointment_parts makes MySQL refuse to delete a part that was ever used on a job
export const DELETE = route(
  async ({ params }) => {
    const r = await execute('DELETE FROM spare_parts WHERE part_id = ?', [idParam(params.id)]);
    if (r.affectedRows === 0) throw new HttpError(404, 'Part not found');
    return { ok: true };
  },
  { roles: ['admin'] }
);
