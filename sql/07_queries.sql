-- ============================================================
-- AutoCare: 07_queries.sql
-- Meaningful queries: JOIN, GROUP BY, HAVING, ORDER BY,
-- aggregate functions, subqueries (correlated & non-correlated)
-- ============================================================
USE autocare;

-- Q1. All vehicles belonging to a specific customer (simple JOIN)
SELECT v.registration_no, v.make, v.model, v.year
FROM vehicles v
JOIN customers c ON c.customer_id = v.customer_id
JOIN users u ON u.user_id = c.user_id
WHERE u.full_name = 'Arjun Mehta';

-- Q2. Total revenue generated per month (aggregate + GROUP BY + ORDER BY)
SELECT
    DATE_FORMAT(i.issued_at, '%Y-%m') AS billing_month,
    COUNT(*) AS invoices_issued,
    SUM(i.total_amount) AS total_revenue
FROM invoices i
GROUP BY billing_month
ORDER BY billing_month;

-- Q3. Mechanics who have completed more than 1 job (GROUP BY + HAVING)
SELECT
    u.full_name AS mechanic_name,
    m.specialization,
    COUNT(am.appointment_id) AS jobs_handled
FROM mechanics m
JOIN users u ON u.user_id = m.user_id
JOIN appointment_mechanics am ON am.mechanic_id = m.mechanic_id
JOIN service_appointments sa ON sa.appointment_id = am.appointment_id
WHERE sa.status = 'completed'
GROUP BY u.full_name, m.specialization
HAVING COUNT(am.appointment_id) > 1
ORDER BY jobs_handled DESC;

-- Q4. Customers who have spent more than the average customer lifetime spend
-- (non-correlated subquery using the fn_customer_lifetime_spend function)
SELECT
    u.full_name,
    fn_customer_lifetime_spend(c.customer_id) AS lifetime_spend
FROM customers c
JOIN users u ON u.user_id = c.user_id
WHERE fn_customer_lifetime_spend(c.customer_id) > (
    SELECT AVG(fn_customer_lifetime_spend(customer_id)) FROM customers
)
ORDER BY lifetime_spend DESC;

-- Q5. Vehicles that have never been serviced (NOT EXISTS correlated subquery)
SELECT v.registration_no, v.make, v.model
FROM vehicles v
WHERE NOT EXISTS (
    SELECT 1 FROM service_appointments sa WHERE sa.vehicle_id = v.vehicle_id
);

-- Q6. Spare parts that are currently below their reorder level (simple filter + view use)
SELECT * FROM vw_low_stock_parts;

-- Q7. Most frequently used spare parts overall (JOIN + GROUP BY + ORDER BY + LIMIT)
SELECT
    sp.part_name,
    SUM(ap.quantity_used) AS total_units_used,
    SUM(ap.quantity_used * ap.price_at_use) AS total_value_used
FROM appointment_parts ap
JOIN spare_parts sp ON sp.part_id = ap.part_id
GROUP BY sp.part_name
ORDER BY total_units_used DESC
LIMIT 5;

-- Q8. Appointments where the diagnosis mentions "brake" (full-text search — see idx_appt_notes_fts)
SELECT appointment_id, complaint_notes, diagnosis_notes
FROM service_appointments
WHERE MATCH(complaint_notes, diagnosis_notes) AGAINST ('brake' IN NATURAL LANGUAGE MODE);

-- Q9. Each customer's most recent appointment (correlated subquery)
SELECT
    u.full_name,
    v.registration_no,
    sa.scheduled_date,
    sa.status
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
ORDER BY sa.scheduled_date DESC;

-- Q10. Revenue contribution ranked by service type (view + ORDER BY)
SELECT * FROM vw_revenue_by_service ORDER BY total_revenue DESC;

-- Q11. Update example: mark a mechanic as unavailable
UPDATE mechanics SET is_available = 0 WHERE mechanic_id = 2;

-- Q12. Delete example: remove a cancelled appointment's mechanic assignment
-- (safe because appointment_mechanics has ON DELETE CASCADE from appointments,
--  but this shows a direct DML delete on the junction table itself)
DELETE FROM appointment_mechanics WHERE appointment_id = 8 AND mechanic_id = 1;
