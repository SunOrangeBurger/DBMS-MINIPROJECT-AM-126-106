-- ============================================================
-- AutoCare: 08_alter_and_extensions.sql
-- Demonstrates ALTER / DROP INDEX / extra tables / extra triggers /
-- extra view. Run AFTER 01-05 (install order: see 00_install_all.sql).
--
-- NOTE: the ALTER TABLE statements below are NOT re-runnable on their own.
-- To re-install from scratch simply run 00_install_all.sql again (01_schema.sql
-- drops and recreates the whole database first).
-- ============================================================
USE autocare;

-- ------------------------------------------------------------
-- ALTER TABLE  (schema evolution after the first release)
-- ------------------------------------------------------------
-- Customers can now flag a booking as urgent.
ALTER TABLE service_appointments
    ADD COLUMN priority ENUM('normal','urgent') NOT NULL DEFAULT 'normal' AFTER status;

-- Track the last successful login (updated by the web app on login).
ALTER TABLE users
    ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL;

-- Database-level validation: keep free-text notes to a sane size.
ALTER TABLE service_appointments
    ADD CONSTRAINT chk_appt_complaint_len
    CHECK (complaint_notes IS NULL OR CHAR_LENGTH(complaint_notes) <= 2000);

-- ------------------------------------------------------------
-- DROP INDEX + CREATE INDEX  (replace a single-column index by a
-- composite one that also serves the low-stock view / reorder report)
-- ------------------------------------------------------------
DROP INDEX idx_part_stock ON spare_parts;
CREATE INDEX idx_part_stock_reorder ON spare_parts (stock_qty, reorder_level);
CREATE INDEX idx_invoice_status      ON invoices (payment_status);
CREATE INDEX idx_users_role          ON users (role);

-- ------------------------------------------------------------
-- New tables (audit trails written by triggers / procedures)
-- ------------------------------------------------------------
CREATE TABLE appointment_status_log (
    log_id         INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    old_status     ENUM('scheduled','in_progress','completed','cancelled') NOT NULL,
    new_status     ENUM('scheduled','in_progress','completed','cancelled') NOT NULL,
    changed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_appointment FOREIGN KEY (appointment_id)
        REFERENCES service_appointments(appointment_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_log_appointment ON appointment_status_log (appointment_id);

CREATE TABLE part_restock_log (
    restock_id     INT AUTO_INCREMENT PRIMARY KEY,
    part_id        INT NOT NULL,
    quantity_added INT NOT NULL,
    restocked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_restock_part FOREIGN KEY (part_id)
        REFERENCES spare_parts(part_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_restock_qty CHECK (quantity_added > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- More triggers
-- ------------------------------------------------------------
DELIMITER //

-- Trigger 5: audit every appointment status change
CREATE TRIGGER trg_log_appointment_status
AFTER UPDATE ON service_appointments
FOR EACH ROW
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO appointment_status_log (appointment_id, old_status, new_status)
        VALUES (NEW.appointment_id, OLD.status, NEW.status);
    END IF;
END //

-- Trigger 6: a mechanic cannot be assigned to two overlapping open jobs
-- (overlap = scheduled_date .. scheduled_date + service est_duration_min)
CREATE TRIGGER trg_prevent_mechanic_double_booking
BEFORE INSERT ON appointment_mechanics
FOR EACH ROW
BEGIN
    DECLARE v_start     DATETIME;
    DECLARE v_end       DATETIME;
    DECLARE v_conflicts INT DEFAULT 0;

    SELECT sa.scheduled_date,
           DATE_ADD(sa.scheduled_date, INTERVAL st.est_duration_min MINUTE)
      INTO v_start, v_end
      FROM service_appointments sa
      JOIN service_types st ON st.service_type_id = sa.service_type_id
     WHERE sa.appointment_id = NEW.appointment_id;

    SELECT COUNT(*) INTO v_conflicts
      FROM appointment_mechanics am
      JOIN service_appointments sa2 ON sa2.appointment_id = am.appointment_id
      JOIN service_types st2        ON st2.service_type_id = sa2.service_type_id
     WHERE am.mechanic_id = NEW.mechanic_id
       AND am.appointment_id <> NEW.appointment_id
       AND sa2.status IN ('scheduled','in_progress')
       AND sa2.scheduled_date < v_end
       AND DATE_ADD(sa2.scheduled_date, INTERVAL st2.est_duration_min MINUTE) > v_start;

    IF v_conflicts > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Mechanic already has an overlapping job at that time';
    END IF;
END //

-- Trigger 7: odometer readings can only go up (data integrity)
CREATE TRIGGER trg_vehicle_odometer_no_rollback
BEFORE UPDATE ON vehicles
FOR EACH ROW
BEGIN
    IF NEW.odometer_km < OLD.odometer_km THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Odometer reading cannot be lower than the previously recorded value';
    END IF;
END //

DELIMITER ;

-- ------------------------------------------------------------
-- Extra view: single-row KPI summary for the admin dashboard
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM service_appointments WHERE status IN ('scheduled','in_progress')) AS open_jobs,
    (SELECT COUNT(*) FROM service_appointments WHERE status = 'completed')                  AS completed_jobs,
    (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE payment_status = 'paid')      AS revenue_collected,
    (SELECT COALESCE(SUM(total_amount),0) FROM invoices WHERE payment_status = 'pending')   AS revenue_pending,
    (SELECT COUNT(*) FROM customers)                                                         AS customers,
    (SELECT COUNT(*) FROM vw_low_stock_parts)                                                AS low_stock_parts;
