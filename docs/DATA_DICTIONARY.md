# AutoCare — Data Dictionary

## users
| Column | Type | Constraints | Description |
|---|---|---|---|
| user_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| full_name | VARCHAR(100) | NOT NULL | Person's display name |
| email | VARCHAR(150) | NOT NULL, UNIQUE | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt/argon2 hash — never plaintext |
| role | ENUM | NOT NULL, default 'customer' | admin / staff / customer |
| phone | VARCHAR(20) | CHECK length ≥ 7 if present | Contact number |
| is_active | TINYINT(1) | default 1 | Soft-disable flag |
| created_at | TIMESTAMP | default CURRENT_TIMESTAMP | Audit field |

## customers
| Column | Type | Constraints | Description |
|---|---|---|---|
| customer_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| user_id | INT | FK → users, UNIQUE, NOT NULL | 1:1 link to login |
| address | VARCHAR(255) | | Street address |
| city | VARCHAR(100) | | City |
| loyalty_points | INT | default 0, CHECK ≥ 0 | Earned on paid invoices |

## mechanics
| Column | Type | Constraints | Description |
|---|---|---|---|
| mechanic_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| user_id | INT | FK → users, UNIQUE, NOT NULL | 1:1 link to login |
| specialization | VARCHAR(100) | | e.g. Engine, Electrical |
| experience_yrs | SMALLINT UNSIGNED | default 0 | Years of experience |
| hourly_rate | DECIMAL(8,2) | CHECK ≥ 0 | Billing rate |
| is_available | TINYINT(1) | default 1 | Scheduling flag |

## vehicles
| Column | Type | Constraints | Description |
|---|---|---|---|
| vehicle_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| customer_id | INT | FK → customers, NOT NULL | Owner |
| registration_no | VARCHAR(20) | NOT NULL, UNIQUE | License plate |
| make | VARCHAR(50) | NOT NULL | Manufacturer |
| model | VARCHAR(50) | NOT NULL | Model name |
| year | SMALLINT | CHECK 1950–2100 | Manufacture year |
| fuel_type | ENUM | default 'petrol' | petrol/diesel/electric/hybrid/cng |
| odometer_km | INT UNSIGNED | default 0 | Current mileage |
| created_at | TIMESTAMP | default CURRENT_TIMESTAMP | Audit field |

## service_types
| Column | Type | Constraints | Description |
|---|---|---|---|
| service_type_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| name | VARCHAR(100) | NOT NULL, UNIQUE | e.g. "Oil Change" |
| description | VARCHAR(500) | | Long description |
| base_price | DECIMAL(10,2) | CHECK ≥ 0 | Standard labor charge |
| est_duration_min | SMALLINT UNSIGNED | default 60 | Planning estimate |

## spare_parts
| Column | Type | Constraints | Description |
|---|---|---|---|
| part_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| part_name | VARCHAR(100) | NOT NULL | Display name |
| part_code | VARCHAR(50) | NOT NULL, UNIQUE | Internal SKU |
| unit_price | DECIMAL(10,2) | CHECK ≥ 0 | Current price |
| stock_qty | INT | default 0, CHECK ≥ 0 | On-hand quantity |
| reorder_level | INT | default 5 | Low-stock threshold |

## service_appointments
| Column | Type | Constraints | Description |
|---|---|---|---|
| appointment_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| vehicle_id | INT | FK → vehicles, NOT NULL | Vehicle serviced |
| service_type_id | INT | FK → service_types, NOT NULL | Type of job |
| scheduled_date | DATETIME | NOT NULL | Planned start |
| completed_date | DATETIME | CHECK ≥ scheduled_date if set | Actual completion |
| status | ENUM | default 'scheduled' | scheduled/in_progress/completed/cancelled |
| complaint_notes | TEXT | | Customer's free-text description (embedded for vector search) |
| diagnosis_notes | TEXT | | Mechanic's free-text findings (embedded for vector search) |
| created_at | TIMESTAMP | default CURRENT_TIMESTAMP | Audit field |

## appointment_mechanics (junction)
| Column | Type | Constraints | Description |
|---|---|---|---|
| appointment_id | INT | PK(composite), FK → service_appointments | |
| mechanic_id | INT | PK(composite), FK → mechanics | |
| role_in_job | VARCHAR(50) | default 'assistant' | lead / assistant |
| assigned_at | TIMESTAMP | default CURRENT_TIMESTAMP | Audit field |

## appointment_parts (junction)
| Column | Type | Constraints | Description |
|---|---|---|---|
| appointment_id | INT | PK(composite), FK → service_appointments | |
| part_id | INT | PK(composite), FK → spare_parts | |
| quantity_used | INT | default 1, CHECK > 0 | Units consumed |
| price_at_use | DECIMAL(10,2) | NOT NULL | Snapshot of unit_price at time of use |

## invoices
| Column | Type | Constraints | Description |
|---|---|---|---|
| invoice_id | INT | PK, AUTO_INCREMENT | Surrogate key |
| appointment_id | INT | FK → service_appointments, UNIQUE, NOT NULL | 1:1 link |
| labor_cost | DECIMAL(10,2) | default 0, CHECK ≥ 0 | From service_types.base_price |
| parts_cost | DECIMAL(10,2) | default 0, CHECK ≥ 0 | Sum of quantity_used × price_at_use |
| tax_amount | DECIMAL(10,2) | default 0, CHECK ≥ 0 | 5% of (labor+parts) in this build |
| total_amount | DECIMAL(10,2) | default 0, CHECK ≥ 0 | labor + parts + tax |
| payment_status | ENUM | default 'pending' | pending/paid/refunded |
| issued_at | TIMESTAMP | default CURRENT_TIMESTAMP | Audit field |

## Indexes (beyond PK/FK auto-indexes)
| Index | Table | Columns | Purpose |
|---|---|---|---|
| idx_vehicle_customer | vehicles | customer_id | Fast lookup of a customer's vehicles |
| idx_appt_vehicle_status | service_appointments | vehicle_id, status | Filter a vehicle's open/completed jobs |
| idx_appt_scheduled_date | service_appointments | scheduled_date | Calendar/date-range queries |
| idx_mechanic_specialization | mechanics | specialization | Find mechanics by skill |
| idx_part_stock | spare_parts | stock_qty | Low-stock scans |
| idx_appt_notes_fts | service_appointments | complaint_notes, diagnosis_notes | FULLTEXT keyword search |
