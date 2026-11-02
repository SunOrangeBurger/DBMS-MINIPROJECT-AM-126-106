import { route } from '@/lib/api';
import { execute, queryOne } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { assertOwnsVehicle } from '@/lib/guards';
import { idParam, int, readJson } from '@/lib/validate';

// Update the odometer. The trigger trg_vehicle_odometer_no_rollback rejects a lower value.
export const PATCH = route(
  async ({ request, params, session }) => {
    const id = idParam(params.id);
    await assertOwnsVehicle(session, id);
    const odometer = int((await readJson(request)).odometer_km, { name: 'Odometer', min: 0, max: 5000000 });
    await execute('UPDATE vehicles SET odometer_km = ? WHERE vehicle_id = ? AND customer_id = ?', [odometer, id, session.cid]);
    return { ok: true };
  },
  { roles: ['customer'] }
);

export const DELETE = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertOwnsVehicle(session, id);
    // vehicles -> appointments is ON DELETE CASCADE; never silently wipe service history and invoices
    const row = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM service_appointments WHERE vehicle_id = ?', [id]);
    if (row && row.n > 0) throw new HttpError(409, 'This vehicle has service history and cannot be deleted');
    await execute('DELETE FROM vehicles WHERE vehicle_id = ? AND customer_id = ?', [id, session.cid]);
    return { ok: true };
  },
  { roles: ['customer'] }
);
