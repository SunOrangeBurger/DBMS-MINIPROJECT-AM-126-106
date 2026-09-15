-- ============================================================
-- AutoCare: 04_procedures.sql
-- Advanced Feature #2: STORED PROCEDURES / FUNCTIONS
-- ============================================================
USE autocare;

DELIMITER //

-- Procedure 1: Book a new appointment (validates vehicle + service type exist)
CREATE PROCEDURE sp_book_appointment (
    IN  p_vehicle_id      INT,
    IN  p_service_type_id INT,
    IN  p_scheduled_date  DATETIME,
    IN  p_complaint_notes TEXT,
    OUT p_appointment_id  INT
)
BEGIN
    DECLARE v_exists INT;
    DECLARE s_exists INT;

    SELECT COUNT(*) INTO v_exists FROM vehicles WHERE vehicle_id = p_vehicle_id;
    SELECT COUNT(*) INTO s_exists FROM service_types WHERE service_type_id = p_service_type_id;

    IF v_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid vehicle_id: vehicle does not exist';
    ELSEIF s_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid service_type_id: service type does not exist';
    ELSE
        INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, complaint_notes, status)
        VALUES (p_vehicle_id, p_service_type_id, p_scheduled_date, p_complaint_notes, 'scheduled');
        SET p_appointment_id = LAST_INSERT_ID();
    END IF;
END //

-- Procedure 2: Complete an appointment and auto-generate its invoice
-- (labor cost from service base_price + mechanic hourly_rate*hours could be refined;
--  here we take service base_price as labor, sum parts, add 5% tax)
CREATE PROCEDURE sp_complete_appointment_and_bill (
    IN p_appointment_id INT
)
BEGIN
    DECLARE v_labor_cost   DECIMAL(10,2);
    DECLARE v_parts_cost   DECIMAL(10,2);
    DECLARE v_tax          DECIMAL(10,2);
    DECLARE v_total        DECIMAL(10,2);
    DECLARE v_status       VARCHAR(20);

    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_status = 'completed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment already completed and billed';
    ELSE
        START TRANSACTION;

        UPDATE service_appointments
        SET status = 'completed', completed_date = NOW()
        WHERE appointment_id = p_appointment_id;

        SELECT st.base_price INTO v_labor_cost
        FROM service_appointments sa
        JOIN service_types st ON st.service_type_id = sa.service_type_id
        WHERE sa.appointment_id = p_appointment_id;

        SELECT COALESCE(SUM(quantity_used * price_at_use), 0) INTO v_parts_cost
        FROM appointment_parts
        WHERE appointment_id = p_appointment_id;

        SET v_tax   = ROUND((v_labor_cost + v_parts_cost) * 0.05, 2);
        SET v_total = v_labor_cost + v_parts_cost + v_tax;

        INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status)
        VALUES (p_appointment_id, v_labor_cost, v_parts_cost, v_tax, v_total, 'pending')
        ON DUPLICATE KEY UPDATE
            labor_cost = v_labor_cost, parts_cost = v_parts_cost,
            tax_amount = v_tax, total_amount = v_total;

        COMMIT;
    END IF;
END //

-- Function: compute a customer's lifetime spend (used in reporting/queries)
CREATE FUNCTION fn_customer_lifetime_spend (p_customer_id INT)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(i.total_amount), 0) INTO v_total
    FROM invoices i
    JOIN service_appointments sa ON sa.appointment_id = i.appointment_id
    JOIN vehicles v ON v.vehicle_id = sa.vehicle_id
    WHERE v.customer_id = p_customer_id
      AND i.payment_status = 'paid';
    RETURN v_total;
END //

DELIMITER ;
