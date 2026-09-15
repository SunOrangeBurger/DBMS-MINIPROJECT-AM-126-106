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
-- IMPORTANT: because both statements run inside the SAME transaction,
-- the earlier, otherwise-valid INSERT into service_appointments is
-- rolled back too, even though only the second statement failed.
-- Verified behaviour: running this as a batch (mysql < file.sql),
-- the error aborts the session before COMMIT is reached, and MySQL/
-- MariaDB auto-rolls-back the open transaction -- the appointment
-- row never appears in the table. In application code (e.g. a
-- Node/Next.js API route), the equivalent is an explicit
-- try { ...queries... ; COMMIT } catch { ROLLBACK }.
-- ------------------------------------------------------------
START TRANSACTION;

INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, complaint_notes, status)
VALUES (4, 4, '2026-09-26 09:00:00', 'Testing rollback scenario', 'scheduled');

SET @fail_appt := LAST_INSERT_ID();

INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@fail_appt, 5, 500, 4200.00);   -- exceeds stock -> trigger raises error -> transaction aborts

COMMIT;

-- If the script reaches this point, prove nothing leaked:
SELECT 'Demo B: appointment should NOT exist after rollback' AS note, @fail_appt AS attempted_id;
SELECT COUNT(*) AS should_be_zero FROM service_appointments WHERE appointment_id = @fail_appt;
