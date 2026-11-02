import { query, queryOne } from './db';
import type { Row } from './db';

export interface AppointmentDetail {
  appointment: Row;
  parts: Row[];
  mechanics: Row[];
  log: Row[];
}

/**
 * Everything the detail screens need about one appointment.
 * The header comes from the vw_service_history VIEW, the rest from the junction tables.
 */
export async function loadAppointmentDetail(appointmentId: number): Promise<AppointmentDetail | null> {
  const appointment = await queryOne(
    `SELECT h.*, sa.priority, sa.vehicle_id,
            i.invoice_id, i.labor_cost, i.parts_cost, i.tax_amount
       FROM vw_service_history h
       JOIN service_appointments sa ON sa.appointment_id = h.appointment_id
       LEFT JOIN invoices i ON i.appointment_id = h.appointment_id
      WHERE h.appointment_id = ?`,
    [appointmentId]
  );
  if (!appointment) return null;

  const parts = await query(
    `SELECT ap.part_id, sp.part_name, sp.part_code, ap.quantity_used, ap.price_at_use,
            ap.quantity_used * ap.price_at_use AS line_total
       FROM appointment_parts ap
       JOIN spare_parts sp ON sp.part_id = ap.part_id
      WHERE ap.appointment_id = ?
      ORDER BY sp.part_name`,
    [appointmentId]
  );

  const mechanics = await query(
    `SELECT m.mechanic_id, u.full_name, m.specialization, am.role_in_job
       FROM appointment_mechanics am
       JOIN mechanics m ON m.mechanic_id = am.mechanic_id
       JOIN users u ON u.user_id = m.user_id
      WHERE am.appointment_id = ?
      ORDER BY am.role_in_job, u.full_name`,
    [appointmentId]
  );

  const log = await query(
    `SELECT old_status, new_status, changed_at
       FROM appointment_status_log WHERE appointment_id = ? ORDER BY log_id`,
    [appointmentId]
  );

  return { appointment, parts, mechanics, log };
}
