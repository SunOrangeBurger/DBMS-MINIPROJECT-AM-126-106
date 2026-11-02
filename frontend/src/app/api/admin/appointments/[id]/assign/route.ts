import { route } from '@/lib/api';
import { callProc, execute, queryOne } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { idParam, int, oneOf, readJson } from '@/lib/validate';

// Assign: sp_assign_mechanic validates the state, and trg_prevent_mechanic_double_booking
// rejects overlapping jobs for the same mechanic.
export const POST = route(
  async ({ request, params }) => {
    const id = idParam(params.id);
    const body = await readJson(request);
    const mechanicId = int(body.mechanic_id, { name: 'Mechanic', min: 1 });
    const role = oneOf(body.role_in_job ?? 'assistant', ['lead', 'assistant'] as const, 'Role');
    await callProc('sp_assign_mechanic', [id, mechanicId, role]);
    return { ok: true };
  },
  { roles: ['admin'] }
);

export const DELETE = route(
  async ({ request, params }) => {
    const id = idParam(params.id);
    const mechanicId = int(new URL(request.url).searchParams.get('mechanic_id'), { name: 'Mechanic', min: 1 });
    const appt = await queryOne<{ status: string }>('SELECT status FROM service_appointments WHERE appointment_id = ?', [id]);
    if (!appt) throw new HttpError(404, 'Appointment not found');
    if (!['scheduled', 'in_progress'].includes(appt.status)) {
      throw new HttpError(422, 'Mechanics can only be changed on scheduled or in-progress appointments');
    }
    await execute('DELETE FROM appointment_mechanics WHERE appointment_id = ? AND mechanic_id = ?', [id, mechanicId]);
    return { ok: true };
  },
  { roles: ['admin'] }
);
