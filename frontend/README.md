# AutoCare frontend (Next.js)
See the root README for full setup. Quick: `cp .env.example .env.local` → edit → `npm install` → `npm run seed` → `npm run dev`.
Scripts: `dev`, `build`, `start`, `seed` (demo password hashes), `test:api` (end-to-end checks; app must be running).
Structure: `src/app/api` route handlers (wrapped by `lib/api.ts` `route()`), `src/components` UI per role, `src/lib` db/session/validation.
