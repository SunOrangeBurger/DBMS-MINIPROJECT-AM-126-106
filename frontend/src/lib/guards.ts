import { HttpError } from './errors';
import { queryOne } from './db';
import type { Session } from './session';

// Row-level authorisation helpers (who may touch WHICH record).

/** Customer may only use vehicles they own. */
export async function assertOwnsVehicle(session: Session, vehicleId: number): Promise<void> {
  const row = await queryOne('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND customer_id = ?', [vehicleId, session.cid]);
  if (!row) throw new HttpError(404, 'Vehicle not found');
}

/** Customer may only see/cancel appointments of their own vehicles. */
export async function assertOwnsAppointment(session: Session, appointmentId: number): Promise<void> {
  const row = await queryOne(
    `SELECT sa.appointment_id FROM service_appointments sa
       JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
      WHERE sa.appointment_id = ? AND v.customer_id = ?`,
    [appointmentId, session.cid]
  );
  if (!row) throw new HttpError(404, 'Appointment not found');
}

/** Customer may only pay their own invoices. */
export async function assertOwnsInvoice(session: Session, invoiceId: number): Promise<void> {
  const row = await queryOne(
    `SELECT i.invoice_id FROM invoices i
       JOIN service_appointments sa ON sa.appointment_id = i.appointment_id
       JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
      WHERE i.invoice_id = ? AND v.customer_id = ?`,
    [invoiceId, session.cid]
  );
  if (!row) throw new HttpError(404, 'Invoice not found');
}

/** Staff may only work on jobs they are assigned to. */
export async function assertAssignedToJob(session: Session, appointmentId: number): Promise<void> {
  const row = await queryOne('SELECT 1 AS ok FROM appointment_mechanics WHERE appointment_id = ? AND mechanic_id = ?', [
    appointmentId,
    session.mid,
  ]);
  if (!row) throw new HttpError(404, 'Job not found');
}
