# AutoCare — Vehicle Service & Maintenance Management System
## Database Design Document (Level 3 DBMS Project)

---

## 1. Problem Statement

Independent vehicle service centers typically manage customer records,
job cards, spare-part stock, and billing on paper or in disconnected
spreadsheets. This causes duplicated data entry, no visibility into
which mechanic is overloaded, stockouts discovered only when a part is
needed mid-job, and no way to learn from past diagnoses when a new
customer describes a similar-sounding problem in different words.

AutoCare centralizes this into one relational system, and augments it
with a semantic search layer so staff can retrieve **similar past
complaints/diagnoses even when the customer's wording doesn't match
historical records exactly** — a genuine limitation of pure SQL
(`LIKE`/full-text search only matches shared vocabulary, not meaning).

## 2. Objectives

- Maintain a single source of truth for customers, vehicles, mechanics,
  parts inventory, appointments, and billing.
- Enforce data integrity at the database level (not just in application
  code) — valid foreign keys, non-negative stock/prices, no overselling
  of parts.
- Automate repetitive, error-prone bookkeeping (stock deduction,
  invoice totals, loyalty points) using triggers and stored procedures
  rather than scattering that logic across application code.
- Provide semantic ("similar issue") search over free-text complaint
  and diagnosis notes, which structured columns/full-text search cannot
  do well.

## 3. Scope

**In scope (this phase):** relational schema, sample data, views,
stored procedures/functions, triggers, transactions, indexing
(including full-text), and a vector-search prototype over service
notes.

**Out of scope (this phase, planned for later):** the Next.js web
application, its API layer, and authentication middleware. The
`users` table and `role` column are already designed to support this
so the next phase is additive, not a redesign.

## 4. Why two database paradigms (justification)

| Data | Best-fit paradigm | Why |
|---|---|---|
| Customers, vehicles, appointments, parts, invoices | **Relational (MySQL)** | Highly structured, strongly related (foreign keys), needs transactional guarantees (stock deduction + billing must be atomic), and needs precise aggregate reporting (revenue by month, by mechanic). |
| Complaint/diagnosis free text | **Vector DB (Chroma)** | Unstructured natural language where two write-ups of the *same* underlying issue can share almost no vocabulary ("weird noise when braking" vs. "grinding sound near the wheel"). A relational `LIKE`/FULLTEXT match is keyword-based and misses this; a vector embedding captures semantic similarity so mechanics can find precedent regardless of phrasing. |

This is a genuine two-paradigm justification, not a "use NoSQL because
it's required" justification — the structured data stays relational
specifically *because* it benefits from constraints and joins, and only
the free-text portion moves to a vector store.

## 5. Entities, attributes, keys (summary — full DDL in `sql/01_schema.sql`)

| Entity | Primary Key | Notable Foreign Keys | Notable Constraints |
|---|---|---|---|
| `users` | user_id | — | UNIQUE(email), role ENUM |
| `customers` | customer_id | user_id → users | UNIQUE(user_id), loyalty_points ≥ 0 |
| `mechanics` | mechanic_id | user_id → users | UNIQUE(user_id), hourly_rate ≥ 0 |
| `vehicles` | vehicle_id | customer_id → customers | UNIQUE(registration_no), year range check |
| `service_types` | service_type_id | — | UNIQUE(name), base_price ≥ 0 |
| `spare_parts` | part_id | — | UNIQUE(part_code), stock_qty ≥ 0 |
| `service_appointments` | appointment_id | vehicle_id, service_type_id | completed_date ≥ scheduled_date |
| `appointment_mechanics` | (appointment_id, mechanic_id) | both FKs | composite PK = M:M junction |
| `appointment_parts` | (appointment_id, part_id) | both FKs | quantity_used > 0, composite PK = M:M junction |
| `invoices` | invoice_id | appointment_id | UNIQUE(appointment_id) = 1:1, amounts ≥ 0 |

Full column-level data dictionary: see `docs/DATA_DICTIONARY.md`.

## 6. Relationships

- **Customer 1 — M Vehicle**: one customer can own many vehicles.
- **Vehicle 1 — M ServiceAppointment**: one vehicle has a history of many appointments.
- **ServiceType 1 — M ServiceAppointment**: one service type (e.g. "Oil Change") is used in many appointments.
- **ServiceAppointment M — M Mechanic**: via `appointment_mechanics` — supports multiple mechanics per job (lead + assistants).
- **ServiceAppointment M — M SparePart**: via `appointment_parts` — supports multiple parts per job, with quantity and a **price snapshot at time of use** (so a later price change doesn't retroactively alter historical invoices — an important real-world billing-accuracy decision).
- **ServiceAppointment 1 — 1 Invoice**: each appointment bills exactly once.
- **User 1 — 1 Customer** / **User 1 — 1 Mechanic**: role-specific profile data is kept out of the shared `users` table to avoid a wide table full of nullable columns; this is a deliberate normalization choice (see §8).

## 7. Advanced database features implemented (5 — exceeds the 4 minimum)

| # | Feature | Where | Purpose |
|---|---|---|---|
| 1 | **Views** | `sql/03_views.sql` | `vw_service_history` (full joined history), `vw_mechanic_workload`, `vw_low_stock_parts`, `vw_revenue_by_service` — hide join complexity from the application layer. |
| 2 | **Stored procedures/functions** | `sql/04_procedures.sql` | `sp_book_appointment` (validated insert), `sp_complete_appointment_and_bill` (multi-step business logic wrapped in a transaction), `fn_customer_lifetime_spend` (reusable scalar function used in reporting queries). |
| 3 | **Triggers** | `sql/05_triggers.sql` | Auto-deduct stock on part use, reject inserts that would oversell stock, restore stock on deletion, award loyalty points on payment — enforcing business rules the application layer cannot bypass. |
| 4 | **Transactions** | `sql/06_transactions_demo.sql`, and inside `sp_complete_appointment_and_bill` | Demonstrates atomicity: a multi-statement operation either fully commits or fully rolls back (tested live — see §9). |
| 5 | **Indexing (incl. full-text)** | `sql/01_schema.sql` | B-tree indexes on common filter columns (`vehicle_id, status`, `scheduled_date`, `specialization`, `stock_qty`) and a `FULLTEXT` index on `complaint_notes`/`diagnosis_notes` for keyword search, complementing the vector search for semantic search. |

## 8. Key design decisions (and why)

- **`users` + role-specific extension tables**, instead of one giant
  table with a `role` column and lots of nullable fields (e.g.
  `specialization` for a customer would always be NULL). This is
  standard normalization for "supertype/subtype" relationships and
  keeps each table's columns meaningful for every row.
- **`price_at_use` snapshot in `appointment_parts`** rather than
  always joining to `spare_parts.unit_price`. Part prices change over
  time; historical invoices must reflect the price *at the time the
  part was used*, not today's price. This is a common real-world
  billing correctness bug if overlooked.
- **`ServiceHistory` implemented as a VIEW (`vw_service_history`),
  not a stored table.** Storing service history separately would
  duplicate data already present in `service_appointments` +
  related tables, risking the two going out of sync. A view keeps a
  single source of truth and is always current.
- **Junction tables carry extra attributes** (`role_in_job` on
  `appointment_mechanics`, `quantity_used`/`price_at_use` on
  `appointment_parts`) rather than being bare M:M link tables — this
  is what "M:M with attributes" looks like in a real schema, not just
  a toy join table.
- **`ON DELETE CASCADE` vs `ON DELETE RESTRICT`** chosen per
  relationship's real-world meaning: deleting a vehicle should cascade
  to its appointments (the appointments are meaningless without the
  vehicle), but deleting a spare part or service type that has been
  used historically is **restricted** — you should not be able to
  silently delete a part type that appears in past invoices.

## 9. Verification performed

All SQL in this project was executed against a live MySQL-compatible
server (MariaDB 10.11, wire/SQL-compatible with the target MySQL 8.4)
during development — not just written and assumed correct:

- Schema created cleanly with all constraints (`01_schema.sql`).
- Sample data loaded without constraint violations (`02_sample_data.sql`).
- All 4 views return correctly joined/aggregated results.
- Stock triggers tested for all 3 cases: normal deduction, rejection on
  insufficient stock (`ERROR 1644 (45000): Insufficient stock...`), and
  restoration on delete.
- Loyalty-points trigger tested: confirmed points increased by
  `FLOOR(total_amount/100)` only when `payment_status` transitions to `'paid'`.
- `sp_book_appointment` tested for both valid input and invalid
  `vehicle_id` (clean `SIGNAL SQLSTATE` error, no partial insert).
- `sp_complete_appointment_and_bill` tested end-to-end: appointment
  marked completed, invoice auto-generated with correct labor+parts+tax math.
- Transaction rollback tested for real: a multi-statement transaction
  that fails partway (oversell attempt) leaves **zero** trace of the
  earlier, otherwise-valid `INSERT` — proving atomicity, not just
  claiming it.
- Vector search tested with 3 out-of-vocabulary style queries; each
  correctly retrieved the semantically matching appointment as the
  top (lowest-distance) result.

Note: MariaDB was used as a locally-runnable stand-in for MySQL during
this build/test cycle because a MySQL 8 server package was unavailable
in this sandboxed environment; `01_schema.sql` targets MySQL 8.4
syntax (e.g. `utf8mb4_0900_ai_ci` collation) as that's the student's
actual environment. Everything used here (DDL, triggers, procedures,
functions, transactions, FULLTEXT index) is standard MySQL-compatible
SQL and should run unmodified on MySQL 8.4.

## 10. Vector database design (Chroma)

- **Data embedded**: `complaint_notes` + `diagnosis_notes`, concatenated
  per appointment.
- **Embedding approach**: designed for a sentence-transformer model
  (`all-MiniLM-L6-v2` via Chroma's default embedding function) which
  captures semantic meaning, not just shared keywords. See
  `vector/semantic_search.py` docstring for a note on a network
  restriction encountered in the build sandbox and the offline
  TF-IDF stand-in used there for testing — swap back to the
  sentence-transformer default on a normal machine with internet access.
- **Storage**: Chroma `PersistentClient`, one collection
  (`service_notes`), one document per appointment, metadata =
  `{appointment_id, registration_no, vehicle}` for joining back to MySQL.
- **Similarity metric**: cosine similarity (Chroma/HNSW default for
  text embeddings).
- **Retrieval**: top-k nearest neighbours to a query string typed by
  staff (e.g. "customer says grinding noise from brakes"); the
  returned `appointment_id` is used to pull full context back from
  MySQL (vehicle, mechanic, invoice) via a normal join query.

## 11. Future enhancements

- Next.js web application (planned next phase) with role-based views
  for Admin / Staff(Mechanic) / Customer.
- Authentication via hashed passwords (bcrypt/argon2) and JWT or
  session-based auth in the API layer; `users.password_hash` is
  already sized/typed for this.
- Real sentence-transformer embeddings in production (swap-in, see §10).
- Appointment scheduling conflict checks (e.g. don't double-book a
  mechanic at the same time).
- Automated low-stock reorder notifications from `vw_low_stock_parts`.
