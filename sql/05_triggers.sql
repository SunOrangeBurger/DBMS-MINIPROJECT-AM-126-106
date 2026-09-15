-- ============================================================
-- AutoCare: 05_triggers.sql
-- Advanced Feature #3: TRIGGERS
-- ============================================================
USE autocare;

DELIMITER //

-- Trigger 1: Deduct stock automatically when a part is used in an appointment
CREATE TRIGGER trg_deduct_stock_after_part_use
AFTER INSERT ON appointment_parts
FOR EACH ROW
BEGIN
    UPDATE spare_parts
    SET stock_qty = stock_qty - NEW.quantity_used
    WHERE part_id = NEW.part_id;
END //

-- Trigger 2: Prevent using more stock than available (data integrity)
CREATE TRIGGER trg_check_stock_before_part_use
BEFORE INSERT ON appointment_parts
FOR EACH ROW
BEGIN
    DECLARE v_stock INT;
    SELECT stock_qty INTO v_stock FROM spare_parts WHERE part_id = NEW.part_id;
    IF v_stock IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Spare part does not exist';
    ELSEIF v_stock < NEW.quantity_used THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for requested part quantity';
    END IF;
END //

-- Trigger 3: Restore stock if a used-part row is deleted (e.g. job correction)
CREATE TRIGGER trg_restore_stock_after_part_delete
AFTER DELETE ON appointment_parts
FOR EACH ROW
BEGIN
    UPDATE spare_parts
    SET stock_qty = stock_qty + OLD.quantity_used
    WHERE part_id = OLD.part_id;
END //

-- Trigger 4: Award loyalty points to customer whenever an invoice is marked 'paid'
CREATE TRIGGER trg_award_loyalty_on_payment
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status <> 'paid' THEN
        UPDATE customers c
        JOIN vehicles v ON v.customer_id = c.customer_id
        JOIN service_appointments sa ON sa.vehicle_id = v.vehicle_id
        SET c.loyalty_points = c.loyalty_points + FLOOR(NEW.total_amount / 100)
        WHERE sa.appointment_id = NEW.appointment_id;
    END IF;
END //

DELIMITER ;
