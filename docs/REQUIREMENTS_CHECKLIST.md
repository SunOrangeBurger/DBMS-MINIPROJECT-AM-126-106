# Requirements checklist (course guidelines → where it is met)

Database option: **Option 2 – SQL (MySQL) + Vector DB (Chroma)**

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | Unique, non-CRUD project | Done | Triggers, procedures, semantic search, billing workflow |
| 2 | 2-member team, both contribute | **Team action** | Both must commit to Git; fill the contributions table in DESIGN_DOCUMENT |
| 3 | SQL + Vector DB | Done | MySQL + Chroma |
| 4 | ER diagram → relational schema; entities, attributes, PK, FK, relationships, constraints | Done | `ER_diagram.png`, `Relational_Schema.png`, DESIGN_DOCUMENT §6–8, DATA_DICTIONARY |
| 4 | Vector: data model, collection, indexes, embeddings, metadata, retrieval | Done | DESIGN_DOCUMENT §10 |
| 5 | CREATE / ALTER / DROP, keys, constraints, indexes, views | Done | `sql/01`, `03`, `08` |
| 6 | INSERT/UPDATE/DELETE/SELECT; JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | Done | `sql/07`, API |
| 7 | ≥4 advanced features | Done (7) | views, procedures/function, triggers, transactions, indexes, FULLTEXT, vector search |
| 8 | Vector explanation (what, model, storage, metric, retrieval) | Done | DESIGN_DOCUMENT §10 |
| 9 | Next.js interface with forms, tables, search, filters, dashboard | Done (written, not yet run by me) | `frontend/` |
| 10 | API layer; credentials in env vars | Done | `frontend/src/app/api`, `.env.example` |
| 11 | Auth, ≥2 roles | Done (3 roles) | `lib/session.ts`, `lib/api.ts` |
| 12 | DB-level validation and integrity | Done | CHECKs, UNIQUE, FK, triggers, procedures |
| 13 | Security: no plaintext passwords/credentials | Done | bcrypt, env vars, parameterised SQL |
| 14 | Documentation (14 items) | **Mostly** | Screenshots and filled test results still needed (§13, §14) |
| 15 | Git/GitHub, README, individual commits | **Team action** | README done; commit and push both members' work |
| 16 | Demo | **Team action** | Rehearse with `npm run test:api` and the Search comparison |
| 17 | Originality | Done | own domain and design |
