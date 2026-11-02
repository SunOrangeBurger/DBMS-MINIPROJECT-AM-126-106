// ---------------------------------------------------------------------------
// Turn database / validation errors into clean HTTP errors.
// Business-rule violations raised inside MySQL (SIGNAL SQLSTATE '45000' in
// triggers and stored procedures) become 422 responses carrying the message
// written in the database, so the UI shows the database's own explanation.
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DUP_HINTS: [RegExp, string][] = [
  [/email/i, 'That email address is already registered'],
  [/registration_no/i, 'A vehicle with that registration number already exists'],
  [/part_code/i, 'A part with that code already exists'],
  [/PRIMARY/i, 'That record already exists'],
];

interface MysqlLikeError {
  errno?: number;
  code?: string;
  sqlState?: string;
  sqlMessage?: string;
}

export function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  const e = (err ?? {}) as MysqlLikeError;

  // Raised by SIGNAL in triggers / stored procedures
  if (e.sqlState === '45000' && e.sqlMessage) return new HttpError(422, e.sqlMessage);

  if (e.errno === 1062) {
    const hint = DUP_HINTS.find(([re]) => re.test(e.sqlMessage || ''));
    return new HttpError(409, hint ? hint[1] : 'Duplicate value');
  }
  // 3819 = MySQL CHECK violation, 4025 = MariaDB CHECK violation
  if (e.errno === 3819 || e.errno === 4025) {
    const m = /constraint '?`?(\w+)/i.exec(e.sqlMessage || '');
    return new HttpError(422, `Rejected by a database rule${m ? ` (${m[1]})` : ''}`);
  }
  if (e.errno === 1452) return new HttpError(422, 'A referenced record does not exist');
  if (e.errno === 1451) return new HttpError(409, 'Cannot delete: other records still depend on this one');
  if (e.errno === 1406 || e.errno === 1265) return new HttpError(422, 'A value is too long or invalid for its column');
  if (e.errno === 1048) return new HttpError(400, 'A required value is missing');

  // Cannot reach MySQL at all
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST'].includes(e.code || '')) {
    return new HttpError(503, 'Cannot reach the MySQL database. Is it running, and are the DB_* values in frontend/.env.local correct?');
  }
  if (e.errno === 1045) return new HttpError(503, 'MySQL rejected the username or password in frontend/.env.local');
  if (e.errno === 1049) return new HttpError(503, 'The "autocare" database does not exist yet. Run sql/00_install_all.sql first.');
  if (e.errno === 1146) return new HttpError(503, 'A table is missing. Re-run sql/00_install_all.sql.');
  if (e.errno === 1305) return new HttpError(503, 'A stored procedure is missing. Re-run sql/00_install_all.sql.');

  console.error('[unhandled error]', err);
  const msg = err instanceof Error && err.message.startsWith('Missing environment variable') ? err.message : 'Something went wrong on the server';
  return new HttpError(500, msg);
}
