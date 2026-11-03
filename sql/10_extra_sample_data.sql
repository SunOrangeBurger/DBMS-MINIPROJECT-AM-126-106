-- ============================================================
-- AutoCare: 10_extra_sample_data.sql
-- Extra demo data so the dashboards, charts and semantic search have
-- something meaningful to show. Run AFTER 01-05, 08, 09.
-- IDs are never hard-coded for new rows (LAST_INSERT_ID is used), so this
-- file is safe regardless of what other demo scripts were run before.
-- ============================================================
USE autocare;

-- Demo administrator used by the README / login page. The hash below is a PLACEHOLDER;
-- `npm run seed` (frontend/) replaces every placeholder hash with a real bcrypt hash.
INSERT INTO users (full_name, email, password_hash, role, phone)
VALUES ('Admin', 'admin@autocare.com', '$2b$12$abcdefghijklmnopqrstuv000', 'admin', '9900000000');

-- Make existing invoices carry the real completion date (spreads revenue over months)
UPDATE invoices i
JOIN service_appointments sa ON sa.appointment_id = i.appointment_id
SET i.issued_at = sa.completed_date
WHERE sa.completed_date IS NOT NULL;

-- ---------------- A. Honda City oil change (June) ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, completed_date, status, complaint_notes, diagnosis_notes)
VALUES (2, 1, '2026-06-12 10:00:00', '2026-06-12 10:30:00', 'completed',
        'Engine oil change due, the car has done 5000 km since the last service.',
        'Routine oil and filter change. Oil level and colour were normal.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 1, 'lead');
SELECT part_id, unit_price INTO @part, @price FROM spare_parts WHERE part_code = 'OIL-5W30';
INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@a, @part, 4, @price);
SELECT part_id, unit_price INTO @part, @price FROM spare_parts WHERE part_code = 'FLT-OIL01';
INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@a, @part, 1, @price);
INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status, issued_at)
VALUES (@a, 800.00, 1980.00, 139.00, 2919.00, 'paid', '2026-06-12 10:30:00');

-- ---------------- B. Creta brake judder (June) ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, completed_date, status, complaint_notes, diagnosis_notes)
VALUES (3, 2, '2026-06-28 09:00:00', '2026-06-28 09:45:00', 'completed',
        'Steering wheel vibrates and the brake pedal pulses when braking at highway speed.',
        'Front brake discs were warped. Resurfaced the discs and replaced the front brake pads.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 3, 'lead');
SELECT part_id, unit_price INTO @part, @price FROM spare_parts WHERE part_code = 'BRK-PAD-F';
INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@a, @part, 1, @price);
INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status, issued_at)
VALUES (@a, 600.00, 1200.00, 90.00, 1890.00, 'paid', '2026-06-28 09:45:00');

-- ---------------- C. Nexon EV will not charge (September) ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, completed_date, status, complaint_notes, diagnosis_notes)
VALUES (4, 6, '2026-09-18 11:00:00', '2026-09-18 12:30:00', 'completed',
        'Charging port light blinks red and the car refuses to charge from the home charger.',
        'Charge port temperature sensor connector was corroded. Cleaned and re-seated the connector, charging restored.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 2, 'lead');
INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status, issued_at)
VALUES (@a, 500.00, 0.00, 25.00, 525.00, 'paid', '2026-09-18 12:30:00');

-- ---------------- D. Royal Enfield hard starting (October, invoice pending) ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, completed_date, status, complaint_notes, diagnosis_notes)
VALUES (5, 3, '2026-10-05 10:00:00', '2026-10-05 13:00:00', 'completed',
        'Bike is hard to start in the morning and the chain makes a rattling noise.',
        'Spark plug was fouled and the chain was slack. Replaced the spark plug, adjusted and lubricated the chain.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 1, 'lead');
SELECT part_id, unit_price INTO @part, @price FROM spare_parts WHERE part_code = 'SPK-PLUG';
INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@a, @part, 1, @price);
INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status, issued_at)
VALUES (@a, 3500.00, 150.00, 182.50, 3832.50, 'pending', '2026-10-05 13:00:00');

-- ---------------- E. Swift AC smell (October, invoice pending) ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, completed_date, status, complaint_notes, diagnosis_notes)
VALUES (1, 5, '2026-10-12 14:00:00', '2026-10-12 15:00:00', 'completed',
        'Air conditioner smells musty and the cooling is weak at low engine speed.',
        'Cabin filter was clogged and refrigerant was slightly low. Cleaned the evaporator and refilled 1 kg of refrigerant.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 1, 'lead');
SELECT part_id, unit_price INTO @part, @price FROM spare_parts WHERE part_code = 'AC-GAS-01';
INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@a, @part, 1, @price);
INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status, issued_at)
VALUES (@a, 1200.00, 650.00, 92.50, 1942.50, 'pending', '2026-10-12 15:00:00');

-- ---------------- F. Honda City weak battery (October) ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, completed_date, status, complaint_notes, diagnosis_notes)
VALUES (2, 4, '2026-10-20 08:30:00', '2026-10-20 08:50:00', 'completed',
        'Headlights are dim at idle and the engine cranks slowly in cold weather.',
        'Alternator output was normal but the battery capacity was weak. Replaced the battery.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 2, 'lead');
SELECT part_id, unit_price INTO @part, @price FROM spare_parts WHERE part_code = 'BAT-45AH';
INSERT INTO appointment_parts (appointment_id, part_id, quantity_used, price_at_use)
VALUES (@a, @part, 1, @price);
INSERT INTO invoices (appointment_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status, issued_at)
VALUES (@a, 400.00, 4200.00, 230.00, 4830.00, 'paid', '2026-10-20 08:50:00');

-- ---------------- G. Upcoming (future-relative) scheduled jobs ----------------
INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, status, priority, complaint_notes)
VALUES (1, 1, TIMESTAMP(DATE(DATE_ADD(NOW(), INTERVAL 7 DAY)), '10:00:00'), 'scheduled', 'normal',
        'Oil change is due and there is a ticking noise from the engine at idle.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 1, 'lead');

INSERT INTO service_appointments (vehicle_id, service_type_id, scheduled_date, status, priority, complaint_notes)
VALUES (3, 3, TIMESTAMP(DATE(DATE_ADD(NOW(), INTERVAL 10 DAY)), '09:00:00'), 'scheduled', 'urgent',
        'Annual full service please. There is also a knocking sound over speed bumps.');
SET @a := LAST_INSERT_ID();
INSERT INTO appointment_mechanics (appointment_id, mechanic_id, role_in_job) VALUES (@a, 3, 'lead');
