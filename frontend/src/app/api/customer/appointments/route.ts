import { route } from '@/lib/api';
import { query, withTransaction } from '@/lib/db';
import type { Row } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { assertOwnsVehicle } from '@/lib/guards';
import { dateTime, int, oneOf, readJson, str } from '@/lib/validate';
import { vectorIndexAppointment } from '@/lib/vector';

export const GET = route(
  async ({ session }) => ({
    // vw_service_history VIEW, plus priority and invoice id
    appointments: await query(
      `SELECT h.appointment_id, h.registration_no, h.make, h.model, h.service_name,
              h.scheduled_date, h.completed_date, h.status, h.complaint_notes,
              h.mechanics_assigned, h.total_amount, h.payment_status,
              sa.priority, i.invoice_id
         FROM vw_service_history h
         JOIN service_appointments sa ON sa.appointment_id = h.appointment_id
         LEFT JOIN invoices i ON i.appointment_id = h.appointment_id
        WHERE h.customer_id = ?
        ORDER BY h.scheduled_date DESC`,
      [session.cid]
    ),
  }),
  { roles: ['customer'] }
);

export const POST = route(
  async ({ request, session }) => {
    const body = await readJson(request);
    const vehicleId = int(body.vehicle_id, { name: 'Vehicle', min: 1 });
    const serviceTypeId = int(body.service_type_id, { name: 'Service', min: 1 });
    const when = dateTime(body.scheduled_date, 'Appointment date');
    const complaint = str(body.complaint_notes, { name: 'Description of the problem', min: 5, max: 2000 });
    const priority = oneOf(body.priority ?? 'normal', ['normal', 'urgent'] as const, 'Priority');

    if (new Date(when.replace(' ', 'T')) <= new Date()) throw new HttpError(400, 'Appointment date must be in the future');
    await assertOwnsVehicle(session, vehicleId);

    // sp_book_appointment + the priority update run in ONE transaction
    const appointmentId = await withTransaction(async (conn) => {
      await conn.query('SET @autocare_out = NULL');
      await conn.query('CALL sp_book_appointment(?, ?, ?, ?, @autocare_out)', [vehicleId, serviceTypeId, when, complaint]);
      const [rows] = await conn.query('SELECT @autocare_out AS id');
      const id = Number((rows as Row[])[0].id);
      if (priority === 'urgent') {
        await conn.query('UPDATE service_appointments SET priority = ? WHERE appointment_id = ?', ['urgent', id]);
      }
      return id;
    });

    vectorIndexAppointment(appointmentId); // keep the semantic index current (best effort)
    return { appointment_id: appointmentId };
  },
  { roles: ['customer'] }
);
