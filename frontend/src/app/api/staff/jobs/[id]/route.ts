import { route } from '@/lib/api';
import { execute, query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { assertAssignedToJob } from '@/lib/guards';
import { loadAppointmentDetail } from '@/lib/queries';
import { idParam, readJson, strOrNull } from '@/lib/validate';
import { vectorIndexAppointment } from '@/lib/vector';

export const GET = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertAssignedToJob(session, id);
    const detail = await loadAppointmentDetail(id);
    if (!detail) throw new HttpError(404, 'Job not found');
    const catalog = await query(`SELECT part_id, part_name, part_code, unit_price, stock_qty FROM spare_parts ORDER BY part_name`);
    return { ...detail, catalog };
  },
  { roles: ['staff'] }
);

// Save the mechanic's diagnosis notes
export const PATCH = route(
  async ({ request, params, session }) => {
    const id = idParam(params.id);
    await assertAssignedToJob(session, id);
    const notes = strOrNull((await readJson(request)).diagnosis_notes, { name: 'Diagnosis notes', max: 2000 });
    const r = await execute(
      `UPDATE service_appointments SET diagnosis_notes = ?
        WHERE appointment_id = ? AND status IN ('scheduled', 'in_progress')`,
      [notes, id]
    );
    if (r.affectedRows === 0) throw new HttpError(422, 'Notes can only be edited while the job is scheduled or in progress');
    vectorIndexAppointment(id);
    return { ok: true };
  },
  { roles: ['staff'] }
);
