import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { toHttpError } from '@/lib/errors';
import { vectorHealth } from '@/lib/vector';

// Public health check shown on the login page (helps with first-run problems)
export async function GET() {
  let db: { ok: boolean; message?: string } = { ok: true };
  try {
    await queryOne('SELECT 1 AS ok');
    const procs = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM information_schema.routines
        WHERE routine_schema = DATABASE() AND routine_name = 'sp_register_customer'`
    );
    if (!procs || Number(procs.n) === 0) {
      db = { ok: false, message: 'Database found, but the extra stored procedures are missing. Re-run sql/00_install_all.sql.' };
    }
  } catch (err) {
    db = { ok: false, message: toHttpError(err).message };
  }
  const vector = await vectorHealth();
  return NextResponse.json({ db, vector });
}
