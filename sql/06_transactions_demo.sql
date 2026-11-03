-- ============================================================
-- AutoCare: 06_transactions_demo.sql
-- Advanced Feature #4: TRANSACTIONS
-- Demonstrates atomicity: booking an appointment + reserving parts
-- must either fully succeed or fully roll back.
-- ============================================================
USE autocare;

-- ------------------------------------------------------------
-- Demo A: Successful transaction
-- Book appointment for vehicle 3, use 2 spare parts, generate invoice pieces.
-- All statements commit together, or none do.
-- ------------------------------------------------------------
START TRANSACTION;

INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, complaint_notes, status)
VALUES (3, 5, '2026-09-25 10:00:00', 'AC not cooling, needs gas refill', 'scheduled');

SET @last_appt := LAST_INSERT_ID();

INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@last_appt, 6, 1, 650.00);   -- AC refrigerant, triggers stock deduction

INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job)
VALUES (@last_appt, 1, 'lead');

COMMIT;

SELECT 'Demo A committed. New appointment:' AS note, @last_appt AS appointment_id;

-- ------------------------------------------------------------
-- Demo B: Failed transaction (insufficient stock) -> full rollback
-- Attempt to book a job that needs more batteries (500) than are in
-- stock (6). The trg_check_stock_before_part_use trigger raises
-- SQLSTATE 45000 on the appointment_parts insert.
--
-- The EXIT HANDLER is the SQL equivalent of application code's
-- try { ...queries...; COMMIT } catch { ROLLBACK }. It makes the rollback
-- explicit and reliable even when a SQL client is configured to continue
-- after statement errors.
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS demo_failed_transaction;
DELIMITER //
CREATE PROCEDURE demo_failed_transaction()
BEGIN
    DECLARE v_fail_appt INT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @fail_appt := v_fail_appt;
        SET @rollback_observed := 1;
    END;

    SET @rollback_observed := 0;
    START TRANSACTION;

    INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, complaint_notes, status)
    VALUES (4, 4, '2026-09-26 09:00:00', 'Testing rollback scenario', 'scheduled');

    SET v_fail_appt := LAST_INSERT_ID();

    INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
    VALUES (v_fail_appt, 5, 500, 4200.00);   -- exceeds stock -> trigger raises error

    COMMIT;
END //
DELIMITER ;

CALL demo_failed_transaction();
DROP PROCEDURE demo_failed_transaction;

SELECT 'Demo B rolled back after the stock trigger rejected 500 batteries' AS note,
       @fail_appt AS attempted_id, @rollback_observed AS rollback_observed;
SELECT COUNT(*) AS should_be_zero FROM service_appointments WHERE appointment_id = @fail_appt;
