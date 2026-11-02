import { route } from '@/lib/api';
import { queryOne } from '@/lib/db';

// Dashboard numbers for the signed-in customer (uses the fn_customer_lifetime_spend SQL function)
export const GET = route(
  async ({ session }) => ({
    summary: await queryOne(
      `SELECT c.loyalty_points,
              fn_customer_lifetime_spend(c.customer_id) AS lifetime_spend,
              (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.customer_id) AS vehicles,
              (SELECT COALESCE(SUM(i.total_amount), 0)
                 FROM invoices i
                 JOIN service_appointments sa ON sa.appointment_id = i.appointment_id
                 JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
                WHERE v.customer_id = c.customer_id AND i.payment_status = 'pending') AS amount_due
         FROM customers c WHERE c.customer_id = ?`,
      [session.cid]
    ),
  }),
  { roles: ['customer'] }
);
