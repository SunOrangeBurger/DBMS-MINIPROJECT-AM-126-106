import { route } from '@/lib/api';
import { query } from '@/lib/db';

export const GET = route(
  async ({ session }) => ({
    invoices: await query(
      `SELECT i.invoice_id, i.appointment_id, i.labor_cost, i.parts_cost, i.tax_amount, i.total_amount,
              i.payment_status, i.issued_at,
              v.registration_no, v.make, v.model, st.name AS service_name
         FROM invoices i
         JOIN service_appointments sa ON sa.appointment_id = i.appointment_id
         JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
         JOIN service_types st ON st.service_type_id = sa.service_type_id
        WHERE v.customer_id = ?
        ORDER BY i.issued_at DESC`,
      [session.cid]
    ),
  }),
  { roles: ['customer'] }
);
