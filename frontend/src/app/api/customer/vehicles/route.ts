import { route } from '@/lib/api';
import { execute, query } from '@/lib/db';
import { parseVehicle } from '@/lib/parsers';
import { readJson } from '@/lib/validate';

export const GET = route(
  async ({ session }) => ({
    vehicles: await query(
      `SELECT v.vehicle_id, v.registration_no, v.make, v.model, v.year, v.fuel_type, v.odometer_km,
              (SELECT COUNT(*) FROM service_appointments sa WHERE sa.vehicle_id = v.vehicle_id) AS service_count,
              (SELECT MAX(sa.completed_date) FROM service_appointments sa
                WHERE sa.vehicle_id = v.vehicle_id AND sa.status = 'completed') AS last_serviced
         FROM vehicles v
        WHERE v.customer_id = ?
        ORDER BY v.make, v.model`,
      [session.cid]
    ),
  }),
  { roles: ['customer'] }
);

export const POST = route(
  async ({ request, session }) => {
    const v = parseVehicle(await readJson(request));
    const r = await execute(
      `INSERT INTO vehicles (customer_id, registration_no, make, model, year, fuel_type, odometer_km)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [session.cid, v.registration_no, v.make, v.model, v.year, v.fuel_type, v.odometer_km]
    );
    return { vehicle_id: r.insertId };
  },
  { roles: ['customer'] }
);
