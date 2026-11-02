import { route } from '@/lib/api';
import { query } from '@/lib/db';
import { oneOf } from '@/lib/validate';

export const GET = route(
  async ({ request }) => {
    const raw = new URL(request.url).searchParams.get('status');
    const status = raw ? oneOf(raw, ['pending', 'paid', 'refunded'] as const, 'Status') : null;
    return {
      invoices: await query(
        `SELECT i.invoice_id, i.appointment_id, i.labor_cost, i.parts_cost, i.tax_amount, i.total_amount,
                i.payment_status, i.issued_at,
                u.full_name AS customer_name, v.registration_no, st.name AS service_name
           FROM invoices i
           JOIN service_appointments sa ON sa.appointment_id = i.appointment_id
           JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
           JOIN customers c ON c.customer_id = v.customer_id
           JOIN users u ON u.user_id = c.user_id
           JOIN service_types st ON st.service_type_id = sa.service_type_id
          ${status ? 'WHERE i.payment_status = ?' : ''}
          ORDER BY i.issued_at DESC`,
        status ? [status] : []
      ),
    };
  },
  { roles: ['admin'] }
);
