import mysql from 'mysql2/promise';
import type { Pool, PoolConnection } from 'mysql2/promise';

// ---------------------------------------------------------------------------
// MySQL access layer.
//  * Credentials come ONLY from environment variables (frontend/.env.local).
//  * Values always reach SQL through ? placeholders (never string concatenation).
//  * There is NO fallback data: if MySQL is down the API says so clearly.
// ---------------------------------------------------------------------------

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy frontend/.env.example to frontend/.env.local and fill it in.`);
  }
  return value;
}

const globalForPool = globalThis as unknown as { __autocarePool?: Pool };

export function getPool(): Pool {
  if (!globalForPool.__autocarePool) {
    globalForPool.__autocarePool = mysql.createPool({
      host: required('DB_HOST'),
      port: Number(process.env.DB_PORT || 3306),
      user: required('DB_USER'),
      password: process.env.DB_PASSWORD ?? '',
      database: required('DB_NAME'),
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 5000,
      dateStrings: true, // DATETIME values arrive as 'YYYY-MM-DD HH:MM:SS' (no timezone surprises)
      // DECIMAL columns arrive as strings by default; turn them into numbers
      typeCast(field, next) {
        if (field.type === 'NEWDECIMAL' || field.type === 'DECIMAL') {
          const v = field.string();
          return v === null ? null : parseFloat(v);
        }
        return next();
      },
    });
  }
  return globalForPool.__autocarePool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

/** Run a parameterised statement and return the rows (SELECT) or the OK packet (INSERT/UPDATE/DELETE). */
export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

/** Run INSERT / UPDATE / DELETE and return { insertId, affectedRows }. */
export async function execute(sql: string, params: unknown[] = []): Promise<{ insertId: number; affectedRows: number }> {
  const [res] = await getPool().query(sql, params);
  const r = res as { insertId: number; affectedRows: number };
  return { insertId: r.insertId, affectedRows: r.affectedRows };
}

export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run several statements on ONE connection inside a transaction (COMMIT, or ROLLBACK on any error). */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* connection already gone */
    }
    throw err;
  } finally {
    conn.release();
  }
}

/** CALL a stored procedure without OUT parameters. `name` is always a literal from our own code. */
export async function callProc(name: string, args: unknown[] = []): Promise<void> {
  const placeholders = args.map(() => '?').join(', ');
  await getPool().query(`CALL ${name}(${placeholders})`, args);
}

/** CALL a stored procedure whose LAST parameter is an OUT parameter; returns that value. */
export async function callProcWithOut(name: string, inArgs: unknown[] = []): Promise<number> {
  const conn = await getPool().getConnection();
  try {
    const placeholders = [...inArgs.map(() => '?'), '@autocare_out'].join(', ');
    await conn.query('SET @autocare_out = NULL');
    await conn.query(`CALL ${name}(${placeholders})`, inArgs);
    const [rows] = await conn.query('SELECT @autocare_out AS value');
    return Number((rows as Row[])[0].value);
  } finally {
    conn.release();
  }
}
