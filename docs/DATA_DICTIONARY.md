# AutoCare — Data Dictionary

## users
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| user_id | INT | PK, AUTO_INCREMENT | Unique user identifier |
| full_name | VARCHAR(100) | NOT NULL | User's full name |
| email | VARCHAR(150) | NOT NULL, UNIQUE | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | Encrypted password hash |
| role | ENUM | NOT NULL, DEFAULT 'customer' | admin / staff / customer |
| phone | VARCHAR(20) | CHECK: NULL or minimum 7 characters | Contact number |
| is_active | TINYINT(1) | NOT NULL, DEFAULT 1 | Account activation status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| last_login_at	| TIMESTAMP |	NULL, DEFAULT NULL | Last successful login; added through ALTER TABLE |


## customers
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| customer_id | INT | PK, AUTO_INCREMENT | Unique customer identifier|
| user_id | INT | FK → users.user_id, UNIQUE, NOT NULL | Associated user account |
| address | VARCHAR(255) | NULL | Customer address |
| city | VARCHAR(100) | NULL | City |
| loyalty_points | INT | INT	NOT NULL, DEFAULT 0, CHECK >= 0 | 	Loyalty points earned on paid invoices |

## mechanics
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| mechanic_id | INT | PK, AUTO_INCREMENT | Unique mechanic identifier |
| user_id | INT | FK → users.user_id, UNIQUE, NOT NULL | Associated user account |
| specialization | VARCHAR(100) | NULL | e.g. Engine, Electrical |
| experience_yrs | SMALLINT UNSIGNED | NOT NULL, DEFAULT 0 | Years of experience |
| hourly_rate | DECIMAL(8,2) | NOT NULL, DEFAULT 0.00, CHECK >= 0 | Billing rate |
| is_available | TINYINT(1) | NOT NULL, DEFAULT 1| Availability flag |

## vehicles
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| vehicle_id	| INT	| PK, AUTO_INCREMENT	| Unique vehicle identifier |
| customer_id	| INT	| FK → customers.customer_id, NOT NULL |	Vehicle owner |
| registration_no	| VARCHAR(20)	| NOT NULL, UNIQUE	| Vehicle registration number |
| make	| VARCHAR(50)	| NOT NULL	| Vehicle manufacturer |
| model	| VARCHAR(50)	| NOT NULL	| Vehicle model |
| year	| SMALLINT	| NOT NULL, CHECK BETWEEN 1950 AND 2100	| Manufacturing year|
| fuel_type	| ENUM |	NOT NULL, DEFAULT 'petrol'	| e.g. petrol,diesel,electric,hybrid,cng |
| odometer_km	| INT UNSIGNED	| NOT NULL, DEFAULT 0	| Current odometer reading |
| created_at	| TIMESTAMP	| DEFAULT CURRENT_TIMESTAMP	| Record creation timestamp |

## service_types
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| service_type_id | INT | PK, AUTO_INCREMENT | Unique service type identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | e.g. Oil Change |
| description | VARCHAR(500) | NULL | service description |
| base_price | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK >= 0 | Standard service charge |
| est_duration_min | SMALLINT UNSIGNED | NOT NULL, DEFAULT 60 | Planning estimate |

## spare_parts
| Column | Data Type | Constraints | Description |
|---|---|---|---|
| part_id | INT | PK, AUTO_INCREMENT | Unique spare part identifier |
| part_name | VARCHAR(100) | NOT NULL | Spare part name |
| part_code | VARCHAR(50) | NOT NULL, UNIQUE | Internal SKU |
| unit_price | DECIMAL(10,2) | NOT NULL, CHECK ≥ 0 | Current price |
| stock_qty | INT | DEFAULT 0, CHECK ≥ 0 | On-hand quantity |
| reorder_level | INT | NOT NULL, DEFAULT 5 | Low-stock threshold |

## service_appointments
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| appointment_id | INT | PK, AUTO_INCREMENT | Unique appointment identifier |
| vehicle_id | INT | FK → vehicles.vehicle_id, NOT NULL | Vehicle being serviced |
| service_type_id | INT | FK → service_types.service_type_id, NOT NULL | Type of job |
| scheduled_date | DATETIME | NOT NULL | Planned start |
| completed_date | DATETIME | NULL, CHECK >= scheduled_date when provided | Actual completion |
| status | ENUM | NOT NULL, DEFAULT 'scheduled' | scheduled/in_progress/completed/cancelled |
| priority	| ENUM |	NOT NULL, DEFAULT 'normal'	| Appointment priority; added through ALTER TABLE |
| complaint_notes | TEXT | NULL, maximum 2000 charcters | Customer's description of the problem |
| diagnosis_notes | TEXT | NULL | Mechanic's diagnosis and findings |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

## appointment_mechanics 
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| appointment_id | INT | PK(composite), FK →  service_appointments.appointment_id, NOT NULL | Associated appointment |
| mechanic_id | INT | PK(composite), FK → mechanics.mechanic_id | Assigned mechanic |
| role_in_job | VARCHAR(50) | DEFAULT 'assistant'	| lead / assistant |
| assigned_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP	| Assignment timestamp |

Primary Key: (appointment_id, mechanic_id)

## appointment_parts 
| Attribute | Data Type | Constraints | Description |
|---|---|---|---|
| appointment_id | INT | PK(composite), FK →  service_appointments.appointment_id, NOT NULL | Associated appointment |
| part_id | INT | PK(composite), FK → spare_parts.part_id, NOT NULL | Used spare part |
| quantity_used | INT |  DEFAULT 1, CHECK > 0 | Units consumed |
| price_at_use | DECIMAL(10,2) | NOT NULL | unit_price at time of use |

Primary Key: (appointment_id, part_id)

## invoices
| Column | Type | Constraints | Description |
|---|---|---|---|
| invoice_id | INT | PK, AUTO_INCREMENT | Unique invoice identifier |
| appointment_id | INT | FK → service_appointments.appointment_id, UNIQUE, NOT NUL | Associated appointment |
| labor_cost | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK >= 0 | Labour charges |
| parts_cost | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK >= 0| Spare parts charges |
| tax_amount | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK >= 0 | Applicable tax |
| total_amount | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK >= 0 | Total invoice amount |
| payment_status | ENUM | NOT NULL, DEFAULT 'pending' | pending/paid/refunded |
| issued_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Invoice generation timestamp |

## appointment_status_log
| Attribute	| Data Type	| Constraints |	Description |
|---|---|---|---|
| log_id	| INT	| PK, AUTO_INCREMENT	| Unique log identifier |
| appointment_id	| INT |	FK → service_appointments.appointment_id, NOT NULL |	Associated appointment |
| old_status	| ENUM | NOT NULL |	'scheduled','in_progress','completed','cancelled'|
| new_status | ENUM |	NOT NULL |	Updated status |
| changed_at	| TIMESTAMP	| DEFAULT CURRENT_TIMESTAMP	| Status change timestamp |

## part_restock_log
| Attribute |	Data Type	| Constraints	| Description
|---|---|---|---|
| restock_id	| INT	| PK, AUTO_INCREMENT	| Unique restock identifier | 
| part_id	| INT	| FK → spare_parts.part_id, NOT NULL	| Restocked spare part |
| quantity_added |	INT |	NOT NULL, CHECK > 0	| Quantity added to inventory |
| restocked_at	| TIMESTAMP |	DEFAULT CURRENT_TIMESTAMP	| Restock timestamp |

## Indexes (beyond PK/FK auto-indexes)
| Index | Name | Table | Columns | Purpose |
|---|---|---|---|
| idx_vehicle_customer	| vehicles	| customer_id	| Retrieve vehicles belonging to a customer |
| idx_appt_vehicle_status	| service_appointments	| vehicle_id, status	| Filter appointments by vehicle and status |
| idx_appt_scheduled_date	| service_appointments	| scheduled_date	| Support date-based appointment searches |
| idx_mechanic_specialization	| mechanics	 | specialization	| Search mechanics by specialization |
| idx_appt_notes_fts	| service_appointments	| FULLTEXT(complaint_notes, diagnosis_notes) |	Keyword search across complaint and diagnosis notes |
| idx_part_stock_reorder |	spare_parts	stock_qty, reorder_level	| Support low-stock and reorder queries |
| idx_invoice_status	| invoices	| payment_status|	Filter invoices by payment status |
| idx_users_role	| users	| role |	Retrieve users based on role |
| idx_log_appointment	| appointment_status_log	| appointment_id	| Retrieve status history for an appointment |
