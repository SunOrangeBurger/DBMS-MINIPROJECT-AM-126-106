import { route } from '@/lib/api';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { loadAppointmentDetail } from '@/lib/queries';
import { idParam } from '@/lib/validate';

export const GET = route(
  async ({ params }) => {
    const detail = await loadAppointmentDetail(idParam(params.id));
    if (!detail) throw new HttpError(404, 'Appointment not found');
    const allMechanics = await query(
      `SELECT m.mechanic_id, u.full_name, m.specialization, m.is_available
         FROM mechanics m JOIN users u ON u.user_id = m.user_id
        WHERE u.is_active = 1
        ORDER BY u.full_name`
    );
    return { ...detail, allMechanics };
  },
  { roles: ['admin'] }
);
