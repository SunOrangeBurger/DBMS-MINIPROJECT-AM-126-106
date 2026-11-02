import { route } from '@/lib/api';
import { query, queryOne } from '@/lib/db';

// Jobs assigned to the signed-in mechanic + their workload numbers (from the view)
export const GET = route(
  async ({ session }) => ({
    jobs: await query(
      `SELECT h.appointment_id, h.registration_no, h.make, h.model, h.service_name,
              h.scheduled_date, h.status, h.complaint_notes, am.role_in_job, sa.priority
         FROM appointment_mechanics am
         JOIN vw_service_history h ON h.appointment_id = am.appointment_id
         JOIN service_appointments sa ON sa.appointment_id = am.appointment_id
        WHERE am.mechanic_id = ?
        ORDER BY FIELD(h.status, 'in_progress', 'scheduled', 'completed', 'cancelled'), h.scheduled_date`,
      [session.mid]
    ),
    workload: await queryOne('SELECT * FROM vw_mechanic_workload WHERE mechanic_id = ?', [session.mid]),
  }),
  { roles: ['staff'] }
);
