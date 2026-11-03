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

## One-command demo startup

After completing the database and `.env.local` setup above, start the web app and semantic-search service together:

```bash
chmod +x scripts/start-demo.sh   # needed only once
./scripts/start-demo.sh
```

The script checks configuration, installs missing Node/Python dependencies, verifies MySQL by safely seeding demo password hashes,
waits for the embedding model and both health endpoints, and then prints the login URL. It keeps both services attached to the terminal;
press `Ctrl+C` once to stop them cleanly. Temporary logs are printed on startup and retained after shutdown.

If your environment file or ports differ:

```bash
ENV_FILE=/absolute/path/to/.env.local APP_PORT=3001 VECTOR_PORT=8002 ./scripts/start-demo.sh
```

The launcher overrides `VECTOR_SERVICE_URL` for that process so both services remain aligned and bound to localhost only.

## Presentation flow (12–15 minutes)

Use this order so the demo tells one coherent story instead of becoming a tour of screens.

### 1. Frame the problem (1 minute)

Open with the service-centre problem: appointments, mechanics, stock and billing are highly related and need transactional guarantees,
while complaint and diagnosis notes are free text whose *meaning* cannot be retrieved reliably with keyword matching. AutoCare therefore
uses MySQL as the system of record and Chroma only as a rebuildable retrieval index.

Internal justification: this is deliberately not “two databases for everything.” Structured facts stay in MySQL because foreign keys,
constraints, joins and transactions are the right tools. Only the language-search problem goes to the vector database.

### 2. Show the data design (1–2 minutes)

Show `docs/DBMS_MINIPROJECT_ER.drawio.png`, then `sql/01_schema.sql` or `docs/DATA_DICTIONARY.md`.

- Point out the `users` supertype with customer/mechanic profiles.
- Explain the two many-to-many relationships: appointments ↔ mechanics and appointments ↔ parts.
- Call out the one-to-one appointment invoice and the `price_at_use` snapshot, which prevents later catalogue-price changes from rewriting history.
- Mention 3NF and the audit tables written by triggers.

### 3. Customer workflow (2 minutes)

Sign in as `arjun@example.com` / `Admin123`. Add or inspect a vehicle, book a future appointment, and show the appointment/invoice views.

Internal justification: the browser never supplies a customer id that is trusted. The signed session identifies the customer, and every
query is ownership-filtered on the server. The booking stored procedure and transaction keep related writes atomic.

### 4. Mechanic workflow and database rules (2 minutes)

Sign in as `anitha.staff@autocare.com`. Open an assigned job, start it, record a diagnosis, add a spare part, and complete it.

Explain that stock checks/deductions, status transitions and invoice arithmetic are database rules—not UI conventions. A second client or
direct SQL write still meets the same constraints. If time permits, deliberately request more stock than is available to show the trigger's
error, then show the generated invoice (`labour + parts + 5% tax`) and status audit trail.

### 5. Admin operations and analytics (2 minutes)

Sign in as `admin@autocare.com`. Show dashboard KPIs, low stock, mechanic workload, appointment assignment, billing and one report from the
Reports tab. Attempting an overlapping mechanic assignment demonstrates the double-booking trigger.

Internal justification: analytical SQL is a fixed server-side whitelist, not arbitrary SQL from the browser. This keeps the report feature
powerful without creating a SQL-injection surface.

### 6. Semantic-search proof (3 minutes)

In the admin Search/Reports area, ensure vector health shows `all-MiniLM-L6-v2`, `degraded=false`, and `metric=cosine`. Reindex once, then run:

1. `high-pitched screech when slowing down`
2. `cabin stays hot even with the climate control on`
3. `EV will not recharge from the wall box`

Compare Semantic, Keyword and Hybrid modes. The first two queries intentionally avoid important words from the matching notes. Keyword
search uses MySQL `FULLTEXT`; semantic search embeds the query and notes into 384-dimensional MiniLM vectors and retrieves nearby vectors
from Chroma's cosine HNSW index. Hybrid search uses reciprocal-rank fusion so strong results from either method can surface without trying
to compare two incompatible raw score scales.

Internal justification: Chroma stores the appointment id plus search metadata, not the authoritative business record. Results are joined
back to `vw_service_history` in MySQL. If Chroma is stopped, the API visibly falls back to FULLTEXT; if MySQL is briefly unavailable during
a rebuild, the last working vector collection is preserved.

### 7. Security and reliability (1 minute)

Summarize bcrypt password hashes, HMAC-signed `httpOnly`/`SameSite` session cookies, role checks, active-user revalidation, login throttling,
parameterized SQL, environment-only credentials and the optional internal vector-service token. Mention that vector indexing is scheduled
with Next.js `after()` so it finishes after the response without slowing or jeopardizing the core appointment workflow.

### 8. Verification and close (1 minute)

Run these before the presentation and keep the successful output available:

```bash
cd frontend && npm run build
cd ../vector && .venv/bin/python -m unittest discover -p 'test_*.py' -v
cd ../frontend && npm run test:api
cd ../vector && .venv/bin/python selftest.py
```

Close with the key claim: relational integrity handles operational correctness; vector retrieval adds meaning-aware reuse of past diagnoses;
the API and role-based UI make both safely usable in a realistic workflow.

### Demo logins (password `Admin123`)
| Role | Email |
|---|---|
| Admin | `admin@autocare.com` |
| Mechanic | `anitha.staff@autocare.com` |
| Customer | `arjun@example.com` |

## What maps to the guidelines
| Requirement | Where |
|---|---|
| ER diagram, relational schema | `docs/DBMS_MINIPROJECT_ER.drawio.png`, `docs/DBMS_MINIPROJECT_ER-REL.drawio.png`, `docs/DESIGN_DOCUMENT.md`, `sql/01_schema.sql` |
| DDL / DML / queries | `sql/01`–`07`, `08_alter_and_extensions.sql` |
| ≥4 advanced features | views, stored procedures + function, triggers (8), transactions, indexes incl. FULLTEXT |
| Vector DB + justification | `vector/`, `docs/DESIGN_DOCUMENT.md` §4, §10 |
| Web UI + API layer | `frontend/src/app`, `frontend/src/app/api` |
| Role-based auth (3 roles) | signed httpOnly cookie, `route()` wrapper in `frontend/src/lib/api.ts` |
| DB-level validation | CHECK constraints, triggers (stock, double-booking, odometer), procedures with SIGNAL |
| Security | bcrypt hashes, env-var credentials, parameterised queries, login throttle, ownership checks |
| Architecture | `docs/architecture.png` |

## Verification status

Verified on 2026-11-03 with MySQL 8.4, Next.js 16.4.3, Chroma 1.5.9 and the real MiniLM model:

- Production frontend build: pass.
- Vector-core unit tests: 4/4 pass, including preserving the last working collection after a failed rebuild.
- Full authenticated API/database suite: 24/24 pass.
- Meaning-only semantic self-test: 4/4 pass with `all-MiniLM-L6-v2`, 15 indexed sample notes and cosine distance.
- Manual reliability checks: login throttling (sixth failure → 429), vector-down FULLTEXT fallback, and transaction rollback all pass.
- Local demo launcher: verified from dependency/config checks through clean two-service shutdown.

The only presentation artifact still requiring the team's final environment is the screenshot set in `docs/screenshots/README.md`.
Capture it after loading the final presentation database so the images match the data you will actually show.
