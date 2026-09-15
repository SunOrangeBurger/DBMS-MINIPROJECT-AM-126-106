-- ============================================================
-- AutoCare - Vehicle Service & Maintenance Management System
-- 01_schema.sql : Core DDL (tables, keys, constraints)
-- Target: MySQL 8.4+
-- ============================================================

DROP DATABASE IF EXISTS autocare;
CREATE DATABASE autocare CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE autocare;

-- ------------------------------------------------------------
-- 1. USERS & AUTH (role-based: admin, staff, customer)
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,           -- store bcrypt/argon2 hash, never plaintext
    role           ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
    phone          VARCHAR(20),
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_phone CHECK (phone IS NULL OR CHAR_LENGTH(phone) >= 7)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. CUSTOMER  (1:1 extension of a 'customer' role user)
-- ------------------------------------------------------------
CREATE TABLE customers (
    customer_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL UNIQUE,
    address        VARCHAR(255),
    city           VARCHAR(100),
    loyalty_points INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_customer_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_loyalty_nonneg CHECK (loyalty_points >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. MECHANIC / STAFF  (1:1 extension of a 'staff' role user)
-- ------------------------------------------------------------
CREATE TABLE mechanics (
    mechanic_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL UNIQUE,
    specialization VARCHAR(100),                     -- e.g. 'Engine', 'Electrical', 'Brakes'
    experience_yrs SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    hourly_rate    DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    is_available   TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_mechanic_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_hourly_rate CHECK (hourly_rate >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. VEHICLE  (owned by a customer)
-- ------------------------------------------------------------
CREATE TABLE vehicles (
    vehicle_id     INT AUTO_INCREMENT PRIMARY KEY,
    customer_id    INT NOT NULL,
    registration_no VARCHAR(20) NOT NULL UNIQUE,
    make           VARCHAR(50) NOT NULL,
    model          VARCHAR(50) NOT NULL,
    year           SMALLINT NOT NULL,
    fuel_type      ENUM('petrol','diesel','electric','hybrid','cng') NOT NULL DEFAULT 'petrol',
    odometer_km    INT UNSIGNED NOT NULL DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_vehicle_year CHECK (year BETWEEN 1950 AND 2100)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. SERVICE TYPE (catalog: Oil Change, Brake Repair, etc.)
-- ------------------------------------------------------------
CREATE TABLE service_types (
    service_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(100) NOT NULL UNIQUE,
    description      VARCHAR(500),
    base_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    est_duration_min SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    CONSTRAINT chk_service_price CHECK (base_price >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. SPARE PART (inventory)
-- ------------------------------------------------------------
CREATE TABLE spare_parts (
    part_id        INT AUTO_INCREMENT PRIMARY KEY,
    part_name      VARCHAR(100) NOT NULL,
    part_code      VARCHAR(50) NOT NULL UNIQUE,
    unit_price     DECIMAL(10,2) NOT NULL,
    stock_qty      INT NOT NULL DEFAULT 0,
    reorder_level  INT NOT NULL DEFAULT 5,
    CONSTRAINT chk_part_price CHECK (unit_price >= 0),
    CONSTRAINT chk_stock_nonneg CHECK (stock_qty >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. SERVICE APPOINTMENT (central transaction table)
-- ------------------------------------------------------------
CREATE TABLE service_appointments (
    appointment_id   INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id       INT NOT NULL,
    service_type_id  INT NOT NULL,
    scheduled_date   DATETIME NOT NULL,
    completed_date   DATETIME NULL,
    status           ENUM('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
    complaint_notes  TEXT,            -- customer's description of the issue (source for vector embeddings)
    diagnosis_notes  TEXT,            -- mechanic's diagnosis/findings (also embedded)
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_appt_service_type FOREIGN KEY (service_type_id) REFERENCES service_types(service_type_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_appt_dates CHECK (completed_date IS NULL OR completed_date >= scheduled_date)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. APPOINTMENT <-> MECHANIC  (M:M junction)
-- ------------------------------------------------------------
CREATE TABLE appointment_mechanics (
    appointment_id INT NOT NULL,
    mechanic_id    INT NOT NULL,
    role_in_job    VARCHAR(50) DEFAULT 'assistant',   -- e.g. 'lead', 'assistant'
    assigned_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (appointment_id, mechanic_id),
    CONSTRAINT fk_am_appointment FOREIGN KEY (appointment_id) REFERENCES service_appointments(appointment_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_am_mechanic FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. APPOINTMENT <-> SPARE PART  (M:M junction with quantity + price-at-time)
-- ------------------------------------------------------------
CREATE TABLE appointment_parts (
    appointment_id   INT NOT NULL,
    part_id          INT NOT NULL,
    quantity_used    INT NOT NULL DEFAULT 1,
    price_at_use     DECIMAL(10,2) NOT NULL,   -- snapshot of unit_price when used (billing accuracy)
    PRIMARY KEY (appointment_id, part_id),
    CONSTRAINT fk_ap_appointment FOREIGN KEY (appointment_id) REFERENCES service_appointments(appointment_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ap_part FOREIGN KEY (part_id) REFERENCES spare_parts(part_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_qty_positive CHECK (quantity_used > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. INVOICE (1:1 with appointment)
-- ------------------------------------------------------------
CREATE TABLE invoices (
    invoice_id      INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id  INT NOT NULL UNIQUE,
    labor_cost      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    parts_cost      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status  ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending',
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_appointment FOREIGN KEY (appointment_id) REFERENCES service_appointments(appointment_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_amounts_nonneg CHECK (labor_cost >= 0 AND parts_cost >= 0 AND tax_amount >= 0 AND total_amount >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Indexes (beyond PK/FK auto-indexes) for common lookup patterns
-- ------------------------------------------------------------
CREATE INDEX idx_vehicle_customer ON vehicles(customer_id);
CREATE INDEX idx_appt_vehicle_status ON service_appointments(vehicle_id, status);
CREATE INDEX idx_appt_scheduled_date ON service_appointments(scheduled_date);
CREATE INDEX idx_mechanic_specialization ON mechanics(specialization);
CREATE INDEX idx_part_stock ON spare_parts(stock_qty);
CREATE FULLTEXT INDEX idx_appt_notes_fts ON service_appointments(complaint_notes, diagnosis_notes);
