-- ============================================================
-- AutoCare: 09_app_procedures.sql
-- Stored procedures used by the Next.js application. Business rules
-- live in the database so they cannot be bypassed by the app layer.
-- Run AFTER 04, 05 and 08.
-- ============================================================
USE autocare;

DELIMITER //

-- ------------------------------------------------------------
-- Register a customer: users row + customers row, atomically
-- ------------------------------------------------------------
CREATE PROCEDURE sp_register_customer (
    IN  p_full_name     VARCHAR(100),
    IN  p_email         VARCHAR(150),
    IN  p_password_hash VARCHAR(255),
    IN  p_phone         VARCHAR(20),
    IN  p_address       VARCHAR(255),
    IN  p_city          VARCHAR(100),
    OUT p_user_id       INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    INSERT INTO users (full_name, email, password_hash, role, phone)
    VALUES (p_full_name, p_email, p_password_hash, 'customer', p_phone);
    SET p_user_id = LAST_INSERT_ID();
    INSERT INTO customers (user_id, address, city) VALUES (p_user_id, p_address, p_city);
    COMMIT;
END //

-- ------------------------------------------------------------
-- Create a staff member: users row + mechanics row, atomically
-- ------------------------------------------------------------
CREATE PROCEDURE sp_create_staff (
    IN  p_full_name      VARCHAR(100),
    IN  p_email          VARCHAR(150),
    IN  p_password_hash  VARCHAR(255),
    IN  p_phone          VARCHAR(20),
    IN  p_specialization VARCHAR(100),
    IN  p_experience_yrs INT,
    IN  p_hourly_rate    DECIMAL(8,2),
    OUT p_user_id        INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    INSERT INTO users (full_name, email, password_hash, role, phone)
    VALUES (p_full_name, p_email, p_password_hash, 'staff', p_phone);
    SET p_user_id = LAST_INSERT_ID();
    INSERT INTO mechanics (user_id, specialization, experience_yrs, hourly_rate)
    VALUES (p_user_id, p_specialization, p_experience_yrs, p_hourly_rate);
    COMMIT;
END //

-- ------------------------------------------------------------
-- Assign a mechanic to an appointment (validates state; the
-- double-booking trigger enforces the overlap rule)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_assign_mechanic (
    IN p_appointment_id INT,
    IN p_mechanic_id    INT,
    IN p_role_in_job    VARCHAR(50)
)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_avail  INT DEFAULT NULL;

    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;
    SELECT is_available INTO v_avail FROM mechanics WHERE mechanic_id = p_mechanic_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_avail IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mechanic not found';
    ELSEIF v_status IN ('completed','cancelled') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot assign mechanics to a completed or cancelled appointment';
    ELSEIF v_avail = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mechanic is currently marked unavailable';
    ELSE
        INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job)
        VALUES (p_appointment_id, p_mechanic_id, COALESCE(p_role_in_job, 'assistant'));
    END IF;
END //

-- ------------------------------------------------------------
-- Start a job: scheduled -> in_progress
-- ------------------------------------------------------------
CREATE PROCEDURE sp_start_appointment (IN p_appointment_id INT)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_status <> 'scheduled' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only scheduled appointments can be started';
    ELSE
        UPDATE service_appointments SET status = 'in_progress' WHERE appointment_id = p_appointment_id;
    END IF;
END //

-- ------------------------------------------------------------
-- Finish a job: only in-progress jobs, then reuse the existing
-- transactional procedure that completes the job and bills it
-- ------------------------------------------------------------
CREATE PROCEDURE sp_finish_job (IN p_appointment_id INT)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_status <> 'in_progress' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only in-progress jobs can be completed and billed';
    ELSE
        CALL sp_complete_appointment_and_bill(p_appointment_id);
    END IF;
END //

-- ------------------------------------------------------------
-- Add a part to a job. If the part is already on the job the
-- quantities are merged: delete old row (trigger restores stock),
-- insert merged row (trigger checks + deducts stock) -- all or nothing.
-- ------------------------------------------------------------
CREATE PROCEDURE sp_add_part_to_appointment (
    IN p_appointment_id INT,
    IN p_part_id        INT,
    IN p_quantity       INT
)
BEGIN
    DECLARE v_status   VARCHAR(20)   DEFAULT NULL;
    DECLARE v_price    DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_existing INT           DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be a positive number';
    END IF;

    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;
    SELECT unit_price INTO v_price FROM spare_parts WHERE part_id = p_part_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_price IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Spare part does not exist';
    ELSEIF v_status NOT IN ('scheduled','in_progress') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parts can only be changed on scheduled or in-progress jobs';
    END IF;

    START TRANSACTION;

    SELECT COALESCE(SUM(quantity_used), 0) INTO v_existing
      FROM appointment_parts
     WHERE appointment_id = p_appointment_id AND part_id = p_part_id;

    IF v_existing > 0 THEN
        DELETE FROM appointment_parts
         WHERE appointment_id = p_appointment_id AND part_id = p_part_id;
    END IF;

    INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
    VALUES (p_appointment_id, p_part_id, p_quantity + v_existing, v_price);

    COMMIT;
END //

-- ------------------------------------------------------------
-- Remove a part from a job (trigger restores the stock)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_remove_part_from_appointment (
    IN p_appointment_id INT,
    IN p_part_id        INT
)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_status NOT IN ('scheduled','in_progress') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parts can only be changed on scheduled or in-progress jobs';
    ELSE
        DELETE FROM appointment_parts
         WHERE appointment_id = p_appointment_id AND part_id = p_part_id;
        IF ROW_COUNT() = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'That part is not on this appointment';
        END IF;
    END IF;
END //

-- ------------------------------------------------------------
-- Cancel a scheduled appointment; any reserved parts go back to
-- stock (row-level delete trigger) -- atomically
-- ------------------------------------------------------------
CREATE PROCEDURE sp_cancel_appointment (IN p_appointment_id INT)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT status INTO v_status FROM service_appointments WHERE appointment_id = p_appointment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Appointment not found';
    ELSEIF v_status <> 'scheduled' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only scheduled appointments can be cancelled';
    END IF;

    START TRANSACTION;
    DELETE FROM appointment_parts WHERE appointment_id = p_appointment_id;
    UPDATE service_appointments SET status = 'cancelled' WHERE appointment_id = p_appointment_id;
    COMMIT;
END //

-- ------------------------------------------------------------
-- Pay an invoice (the loyalty-points trigger fires on this update)
-- ------------------------------------------------------------
CREATE PROCEDURE sp_pay_invoice (IN p_invoice_id INT)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;
    SELECT payment_status INTO v_status FROM invoices WHERE invoice_id = p_invoice_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice not found';
    ELSEIF v_status <> 'pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice is already paid or refunded';
    ELSE
        UPDATE invoices SET payment_status = 'paid' WHERE invoice_id = p_invoice_id;
    END IF;
END //

-- ------------------------------------------------------------
-- Restock a spare part and keep an audit row, atomically
-- ------------------------------------------------------------
CREATE PROCEDURE sp_restock_part (
    IN p_part_id INT,
    IN p_qty     INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_qty IS NULL OR p_qty <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Restock quantity must be a positive number';
    END IF;

    START TRANSACTION;
    UPDATE spare_parts SET stock_qty = stock_qty + p_qty WHERE part_id = p_part_id;
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Spare part does not exist';
    END IF;
    INSERT INTO part_restock_log (part_id, quantity_added) VALUES (p_part_id, p_qty);
    COMMIT;
END //

DELIMITER ;
