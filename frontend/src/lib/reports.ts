// Whitelisted, read-only SQL reports shown on /admin/reports.
// They mirror the "important queries" in sql/07_queries.sql, and each one names
// the SQL concepts it demonstrates. Nothing here accepts user-supplied SQL.
export interface Report {
  name: string;
  title: string;
  concept: string;
  sql: string;
}

export const REPORTS: Report[] = [
  {
    name: 'monthly-revenue',
    title: 'Revenue per month',
    concept: 'Aggregate functions + GROUP BY + ORDER BY',
    sql: `SELECT DATE_FORMAT(i.issued_at, '%Y-%m') AS billing_month,
       COUNT(*)            AS invoices_issued,
       SUM(i.total_amount) AS total_revenue
FROM invoices i
GROUP BY billing_month
ORDER BY billing_month`,
  },
  {
    name: 'busy-mechanics',
    title: 'Mechanics with more than one completed job',
    concept: 'JOIN + GROUP BY + HAVING',
    sql: `SELECT u.full_name AS mechanic_name, m.specialization,
       COUNT(am.appointment_id) AS jobs_handled
FROM mechanics m
JOIN users u ON u.user_id = m.user_id
JOIN appointment_mechanics am ON am.mechanic_id = m.mechanic_id
JOIN service_appointments sa ON sa.appointment_id = am.appointment_id
WHERE sa.status = 'completed'
GROUP BY u.full_name, m.specialization
HAVING COUNT(am.appointment_id) > 1
ORDER BY jobs_handled DESC`,
  },
  {
    name: 'high-value-customers',
    title: 'Customers who spent more than the average customer',
    concept: 'Stored function + non-correlated subquery',
    sql: `SELECT u.full_name,
       fn_customer_lifetime_spend(c.customer_id) AS lifetime_spend
FROM customers c
JOIN users u ON u.user_id = c.user_id
WHERE fn_customer_lifetime_spend(c.customer_id) > (
    SELECT AVG(fn_customer_lifetime_spend(customer_id)) FROM customers
)
ORDER BY lifetime_spend DESC`,
  },
  {
    name: 'never-serviced',
    title: 'Vehicles that have never been serviced',
    concept: 'Correlated subquery (NOT EXISTS)',
    sql: `SELECT v.registration_no, v.make, v.model
FROM vehicles v
WHERE NOT EXISTS (
    SELECT 1 FROM service_appointments sa WHERE sa.vehicle_id = v.vehicle_id
)`,
  },
  {
    name: 'top-parts',
    title: 'Most used spare parts',
    concept: 'JOIN + SUM + GROUP BY + ORDER BY + LIMIT',
    sql: `SELECT sp.part_name,
       SUM(ap.quantity_used)                   AS total_units_used,
       SUM(ap.quantity_used * ap.price_at_use) AS total_value_used
FROM appointment_parts ap
JOIN spare_parts sp ON sp.part_id = ap.part_id
GROUP BY sp.part_name
ORDER BY total_units_used DESC
LIMIT 5`,
  },
  {
    name: 'latest-per-customer',
    title: "Each customer's most recent appointment",
    concept: 'Correlated subquery with MAX',
    sql: `SELECT u.full_name, v.registration_no, sa.scheduled_date, sa.status
FROM service_appointments sa
JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
JOIN customers c ON c.customer_id = v.customer_id
JOIN users u ON u.user_id = c.user_id
WHERE sa.scheduled_date = (
    SELECT MAX(sa2.scheduled_date)
    FROM service_appointments sa2
    JOIN vehicles v2 ON v2.vehicle_id = sa2.vehicle_id
    WHERE v2.customer_id = c.customer_id
)
ORDER BY sa.scheduled_date DESC`,
  },
  {
    name: 'fulltext-brake',
    title: 'Full-text search: appointments mentioning "brake"',
    concept: 'FULLTEXT index + MATCH ... AGAINST',
    sql: `SELECT appointment_id, complaint_notes, diagnosis_notes,
       MATCH(complaint_notes, diagnosis_notes) AGAINST ('brake' IN NATURAL LANGUAGE MODE) AS relevance
FROM service_appointments
WHERE MATCH(complaint_notes, diagnosis_notes) AGAINST ('brake' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC`,
  },
  {
    name: 'status-counts',
    title: 'Appointments by status',
    concept: 'GROUP BY with COUNT',
    sql: `SELECT status, COUNT(*) AS appointments
FROM service_appointments
GROUP BY status
ORDER BY appointments DESC`,
  },
  {
    name: 'view-revenue-by-service',
    title: 'View: revenue by service type',
    concept: 'View (vw_revenue_by_service)',
    sql: `SELECT * FROM vw_revenue_by_service ORDER BY total_revenue DESC`,
  },
  {
    name: 'view-mechanic-workload',
    title: 'View: mechanic workload',
    concept: 'View (vw_mechanic_workload) with conditional aggregation',
    sql: `SELECT * FROM vw_mechanic_workload ORDER BY active_jobs DESC`,
  },
  {
    name: 'view-low-stock',
    title: 'View: parts at or below reorder level',
    concept: 'View (vw_low_stock_parts)',
    sql: `SELECT * FROM vw_low_stock_parts ORDER BY stock_qty`,
  },
  {
    name: 'status-audit-log',
    title: 'Recent appointment status changes (trigger audit trail)',
    concept: 'Trigger-populated audit table + JOIN',
    sql: `SELECT l.log_id, l.appointment_id, v.registration_no, l.old_status, l.new_status, l.changed_at
FROM appointment_status_log l
JOIN service_appointments sa ON sa.appointment_id = l.appointment_id
JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
ORDER BY l.log_id DESC
LIMIT 20`,
  },
];
