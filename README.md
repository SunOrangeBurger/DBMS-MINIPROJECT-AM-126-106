# AutoCare — Vehicle Service & Maintenance Management

MySQL (relational) + Chroma (vector search) + a Next.js web app with three role-based portals
(customer, mechanic/staff, admin).

```
sql/        DDL, sample data, views, procedures, triggers, transactions, queries  (00_install_all.sql runs everything)
vector/     Python FastAPI + Chroma semantic search over complaint / diagnosis notes
frontend/   Next.js 16 app: UI + API routes (all DB access is server-side)
docs/       Design document, data dictionary, ER diagram, architecture diagram
```

## Run it (about 10 minutes)

You need: **MySQL 8+**, **Node 20+**, **Python 3.10+**.

### 1. Database
Open the MySQL client from the **repo root** (`mysql -u root -p`) and run:

```sql
source sql/00_install_all.sql;

CREATE USER 'autocare_app'@'localhost' IDENTIFIED BY 'ChooseAPassword1';
GRANT ALL PRIVILEGES ON autocare.* TO 'autocare_app'@'localhost';
FLUSH PRIVILEGES;
```
(Use `source` inside the client — PowerShell does not support `mysql < file`.)

### 2. Web app
```bash
cd frontend
cp .env.example .env.local        # Windows: copy .env.example .env.local
```
Edit `.env.local`: set `DB_PASSWORD` to the password above and `SESSION_SECRET` to a random string of 32+ characters
(`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

```bash
npm install
npm run seed      # sets real bcrypt hashes for the demo accounts (password: Admin123)
npm run dev       # http://localhost:3000
```

### 3. Semantic search (second terminal; optional but needed for the vector-DB demo)
```bash
cd vector
pip install -r requirements.txt
# macOS/Linux:  export DB_USER=autocare_app DB_PASSWORD='ChooseAPassword1' DB_NAME=autocare
# PowerShell:   $env:DB_USER="autocare_app"; $env:DB_PASSWORD="ChooseAPassword1"; $env:DB_NAME="autocare"
python -m uvicorn service:app --port 8001
```
First start downloads the MiniLM model (internet needed once). Then use **Reindex** in the admin Reports tab, or just search.
Check it: open http://127.0.0.1:8001/health — `embedding_model` must be `all-MiniLM-L6-v2` and `degraded` must be `false`
(if it says `tfidf-fallback` the model download failed and search is only keyword-like). `python selftest.py` runs 4 meaning-only queries.
Weak matches below `MIN_SIMILARITY` (default 0.2) are hidden; set the env var to change it.

### 4. Check everything works
With the app running: `cd frontend && npm run test:api` — prints PASS/FAIL for ~20 end-to-end checks
(auth, roles, triggers, procedures, invoice maths, search).

### Demo logins (password `Admin123`)
| Role | Email |
|---|---|
| Admin | `admin@autocare.com` |
| Mechanic | `anitha.staff@autocare.com` |
| Customer | `arjun@example.com` |

## What maps to the guidelines
| Requirement | Where |
|---|---|
| ER diagram, relational schema | `docs/ER_diagram.png`, `docs/Relational_Schema.png`, `docs/DESIGN_DOCUMENT.md`, `sql/01_schema.sql` |
| DDL / DML / queries | `sql/01`–`07`, `08_alter_and_extensions.sql` |
| ≥4 advanced features | views, stored procedures + function, triggers (8), transactions, indexes incl. FULLTEXT |
| Vector DB + justification | `vector/`, `docs/DESIGN_DOCUMENT.md` §4, §10 |
| Web UI + API layer | `frontend/src/app`, `frontend/src/app/api` |
| Role-based auth (3 roles) | signed httpOnly cookie, `route()` wrapper in `frontend/src/lib/api.ts` |
| DB-level validation | CHECK constraints, triggers (stock, double-booking, odometer), procedures with SIGNAL |
| Security | bcrypt hashes, env-var credentials, parameterised queries, login throttle, ownership checks |
| Architecture | `docs/architecture.png` |

## Honest status
The SQL, API and UI were written and type-checked, and the session/validation/error-mapping logic is unit-tested,
but the full stack could not be executed in the authoring environment (no MySQL/npm access). Run
`npm run test:api` first after setup and fix/report anything marked FAIL before the demo.
