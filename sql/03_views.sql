-- ============================================================
-- AutoCare: 03_views.sql
-- Advanced Feature #1: VIEWS
-- ============================================================
USE autocare;

-- View 1: Full service history per vehicle (joins appointment, service type, mechanics, invoice)
CREATE OR REPLACE VIEW vw_service_history AS
SELECT
    sa.appointment_id,
    v.registration_no,
    v.make,
    v.model,
    c.customer_id,
    u.full_name        AS customer_name,
    st.name             AS service_name,
    sa.scheduled_date,
    sa.completed_date,
    sa.status,
    sa.complaint_notes,
    sa.diagnosis_notes,
    GROUP_CONCAT(DISTINCT mu.full_name ORDER BY mu.full_name SEPARATOR ', ') AS mechanics_assigned,
    i.total_amount,
    i.payment_status
FROM service_appointments sa
JOIN vehicles v            ON v.vehicle_id = sa.vehicle_id
JOIN customers c           ON c.customer_id = v.customer_id
JOIN users u               ON u.user_id = c.user_id
JOIN service_types st      ON st.service_type_id = sa.service_type_id
LEFT JOIN appointment_mechanics am ON am.appointment_id = sa.appointment_id
LEFT JOIN mechanics m      ON m.mechanic_id = am.mechanic_id
LEFT JOIN users mu         ON mu.user_id = m.user_id
LEFT JOIN invoices i       ON i.appointment_id = sa.appointment_id
GROUP BY sa.appointment_id, v.registration_no, v.make, v.model, c.customer_id, u.full_name,
         st.name, sa.scheduled_date, sa.completed_date, sa.status, sa.complaint_notes,
         sa.diagnosis_notes, i.total_amount, i.payment_status;

-- View 2: Mechanic workload summary
CREATE OR REPLACE VIEW vw_mechanic_workload AS
SELECT
    m.mechanic_id,
    u.full_name AS mechanic_name,
    m.specialization,
    COUNT(am.appointment_id) AS total_jobs,
    SUM(CASE WHEN sa.status = 'completed' THEN 1 ELSE 0 END) AS completed_jobs,
    SUM(CASE WHEN sa.status IN ('scheduled','in_progress') THEN 1 ELSE 0 END) AS active_jobs
FROM mechanics m
JOIN users u ON u.user_id = m.user_id
LEFT JOIN appointment_mechanics am ON am.mechanic_id = m.mechanic_id
LEFT JOIN service_appointments sa ON sa.appointment_id = am.appointment_id
GROUP BY m.mechanic_id, u.full_name, m.specialization;

-- View 3: Low-stock spare parts (operational alert view)
CREATE OR REPLACE VIEW vw_low_stock_parts AS
SELECT part_id, part_name, part_code, stock_qty, reorder_level
FROM spare_parts
WHERE stock_qty <= reorder_level;

-- View 4: Revenue summary per service type
CREATE OR REPLACE VIEW vw_revenue_by_service AS
SELECT
    st.name AS service_name,
    COUNT(sa.appointment_id) AS times_performed,
    SUM(i.total_amount) AS total_revenue,
    AVG(i.total_amount) AS avg_bill_amount
FROM service_types st
JOIN service_appointments sa ON sa.service_type_id = st.service_type_id
JOIN invoices i ON i.appointment_id = sa.appointment_id
GROUP BY st.name;
