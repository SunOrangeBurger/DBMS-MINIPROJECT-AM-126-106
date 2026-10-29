# AutoCare — Vehicle Service & Maintenance Management System 

A database-driven system for managing customers, vehicles, service
appointments, mechanics, spare parts, billing, and service history at
a vehicle service center.

This repository currently covers the **database layer**: a MySQL
relational schema plus a Chroma vector-search layer for semantic
search over service complaint/diagnosis notes. The Next.js web
application is planned for a later phase.

## Project structure

```
autocare/
├── sql/
│   ├── 01_schema.sql              # DDL: tables, keys, constraints, indexes
│   ├── 02_sample_data.sql         # Sample DML (INSERT) data for demo/testing
│   ├── 03_views.sql               # 4 views
│   ├── 04_procedures.sql          # 2 stored procedures + 1 function
│   ├── 05_triggers.sql            # 4 triggers
│   ├── 06_transactions_demo.sql   # Transaction atomicity demo (commit + rollback)
│   └── 07_queries.sql             # JOIN / GROUP BY / HAVING / subquery examples
├── vector/
│   ├── semantic_search.py         # Chroma-based semantic search over service notes
│   └── requirements.txt
└── docs/
    ├── DESIGN_DOCUMENT.md         # Problem statement, objectives, design decisions
    └── DATA_DICTIONARY.md         # Column-level reference for every table
```

## Prerequisites

- MySQL 8.0+ (developed/tested against MySQL 8.4 syntax; verified to
  run correctly on MariaDB 10.11 as well)
- Python 3.10+ (for the vector search component)

## Setup — MySQL

```bash
mysql -u root -p < sql/01_schema.sql
mysql -u root -p < sql/02_sample_data.sql
mysql -u root -p < sql/03_views.sql
mysql -u root -p < sql/04_procedures.sql
mysql -u root -p < sql/05_triggers.sql
```

Run the transaction demo and query examples separately, once the
schema and data are in place:

```bash
mysql -u root -p autocare < sql/06_transactions_demo.sql
mysql -u root -p autocare < sql/07_queries.sql
```

Create an application-level DB user rather than using `root` day to
day (never hard-code credentials in application code — use
environment variables):

```sql
CREATE USER 'autocare_app'@'%' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON autocare.* TO 'autocare_app'@'%';
FLUSH PRIVILEGES;
```

## Setup — vector semantic search

```bash
cd vector
pip install -r requirements.txt

export DB_HOST=127.0.0.1
export DB_USER=autocare_app
export DB_PASSWORD='choose-a-strong-password'
export DB_NAME=autocare

python3 semantic_search.py
```

This builds a Chroma collection from `service_appointments`
complaint/diagnosis text and runs three demo similarity queries.

**Note on embeddings:** `semantic_search.py` includes an offline
TF-IDF embedding fallback (`TfidfEmbeddingFunction`) used during
development in a network-restricted sandbox. On a normal machine with
internet access, switch to `get_default_embedding_function()` in that
file (Chroma's built-in `all-MiniLM-L6-v2` sentence-transformer) for
genuine semantic — not just keyword-overlap — similarity. See the
docstring at the top of the file for details.

## What's demonstrated (mapped to project rubric)

| Requirement | Where |
|---|---|
| ER diagram + relational schema | `docs/DESIGN_DOCUMENT.md` (§5–6), `sql/01_schema.sql` |
| Entities, attributes, PK/FK, relationships, constraints | `docs/DATA_DICTIONARY.md` |
| DDL: CREATE / ALTER / DROP, PK/FK, constraints, indexes, views | `sql/01_schema.sql`, `sql/03_views.sql` |
| DML: INSERT / UPDATE / DELETE / SELECT | `sql/02_sample_data.sql`, `sql/07_queries.sql` |
| JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | `sql/07_queries.sql` (12 worked examples) |
| ≥4 advanced features | 5 implemented: views, procedures/functions, triggers, transactions, indexing (incl. FULLTEXT) — see `docs/DESIGN_DOCUMENT.md` §7 |
| Second database paradigm (vector) justified | `docs/DESIGN_DOCUMENT.md` §4, §10; `vector/semantic_search.py` |
| Data validation/integrity at DB level | CHECK constraints, triggers rejecting overselling stock (`sql/01_schema.sql`, `sql/05_triggers.sql`) |
| Security basics | Passwords stored as hashes only (`users.password_hash`), no plaintext credentials in code — see `vector/semantic_search.py` env-var usage |

**Not yet built (next phase):** Next.js frontend, API routes,
authentication middleware, role-based UI. The `users.role` column and
1:1 `customers`/`mechanics` profile tables are already designed to
support Admin / Staff(Mechanic) / Customer roles when that phase
begins.

## Verification

Every SQL file and the vector search script were executed against a
live server during development (not just written) — see
`docs/DESIGN_DOCUMENT.md` §9 for the specific test cases run
(trigger rejection on overselling stock, transaction rollback
proof, stored procedure error handling, semantic search accuracy).
