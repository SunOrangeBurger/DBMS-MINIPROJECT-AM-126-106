import { route } from '@/lib/api';
import { query, queryOne } from '@/lib/db';
import { vectorHealth } from '@/lib/vector';

// Every number on the admin dashboard comes from a view, a SQL function or an aggregate query.
export const GET = route(
  async () => {
    const [kpis, monthly, byService, workload, lowStock, topParts, topCustomers, statusCounts, vector] = await Promise.all([
      queryOne('SELECT * FROM vw_dashboard_kpis'),
      query(
        `SELECT DATE_FORMAT(issued_at, '%Y-%m') AS month, COUNT(*) AS invoices, SUM(total_amount) AS revenue
           FROM invoices GROUP BY month ORDER BY month`
      ),
      query('SELECT * FROM vw_revenue_by_service ORDER BY total_revenue DESC'),
      query('SELECT * FROM vw_mechanic_workload ORDER BY active_jobs DESC, mechanic_name'),
      query('SELECT * FROM vw_low_stock_parts ORDER BY stock_qty'),
      query(
        `SELECT sp.part_name, SUM(ap.quantity_used) AS units_used, SUM(ap.quantity_used * ap.price_at_use) AS value_used
           FROM appointment_parts ap JOIN spare_parts sp ON sp.part_id = ap.part_id
          GROUP BY sp.part_name ORDER BY units_used DESC LIMIT 5`
      ),
      query(
        `SELECT u.full_name, c.loyalty_points, fn_customer_lifetime_spend(c.customer_id) AS lifetime_spend
           FROM customers c JOIN users u ON u.user_id = c.user_id
          ORDER BY lifetime_spend DESC LIMIT 5`
      ),
      query('SELECT status, COUNT(*) AS n FROM service_appointments GROUP BY status'),
      vectorHealth(),
    ]);
    return { kpis, monthly, byService, workload, lowStock, topParts, topCustomers, statusCounts, vector };
  },
  { roles: ['admin'] }
);
