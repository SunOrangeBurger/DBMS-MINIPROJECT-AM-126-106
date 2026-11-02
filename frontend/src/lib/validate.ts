import { HttpError } from './errors';

// Input validators for the API layer. The database enforces the same rules again
// with CHECK constraints, UNIQUE keys, foreign keys and triggers.

const bad = (msg: string) => new HttpError(400, msg);
type Opts = { name?: string; min?: number; max?: number; optional?: boolean };

export function str(value: unknown, { name = 'Value', min = 0, max = 255, optional = false }: Opts = {}): string {
  const out = strOrNull(value, { name, min, max, optional });
  if (out === null) throw bad(`${name} is required`);
  return out;
}

export function strOrNull(value: unknown, { name = 'Value', min = 0, max = 255, optional = true }: Opts = {}): string | null {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    throw bad(`${name} is required`);
  }
  if (typeof value !== 'string') throw bad(`${name} must be text`);
  const v = value.trim();
  if (!v) {
    if (optional) return null;
    throw bad(`${name} is required`);
  }
  if (v.length < min) throw bad(`${name} must be at least ${min} characters`);
  if (v.length > max) throw bad(`${name} must be at most ${max} characters`);
  return v;
}

export function email(value: unknown): string {
  const v = str(value, { name: 'Email', max: 150 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw bad('Enter a valid email address');
  return v;
}

export function password(value: unknown): string {
  const v = str(value, { name: 'Password', min: 8, max: 100 });
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) throw bad('Password must contain at least one letter and one number');
  return v;
}

export function phone(value: unknown): string | null {
  const v = strOrNull(value, { name: 'Phone', max: 20 });
  if (v === null) return null;
  if (!/^[0-9+\-\s()]{7,20}$/.test(v)) throw bad('Enter a valid phone number (at least 7 digits)');
  return v;
}

export function int(value: unknown, { name = 'Value', min = -2147483648, max = 2147483647 }: Opts = {}): number {
  if (value === undefined || value === null || value === '') throw bad(`${name} is required`);
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) throw bad(`${name} must be a whole number`);
  if (n < min) throw bad(`${name} must be at least ${min}`);
  if (n > max) throw bad(`${name} must be at most ${max}`);
  return n;
}

export function money(value: unknown, { name = 'Amount', min = 0, max = 99999999 }: Opts = {}): number {
  if (value === undefined || value === null || value === '') throw bad(`${name} is required`);
  const n = Number(value);
  if (!Number.isFinite(n)) throw bad(`${name} must be a number`);
  if (n < min) throw bad(`${name} must be at least ${min}`);
  if (n > max) throw bad(`${name} is too large`);
  return Math.round(n * 100) / 100;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], name = 'Value'): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw bad(`${name} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

/** 'YYYY-MM-DDTHH:mm' (datetime-local) or 'YYYY-MM-DD HH:mm[:ss]' -> 'YYYY-MM-DD HH:mm:ss' */
export function dateTime(value: unknown, name = 'Date'): string {
  const v = str(value, { name, max: 30 });
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (!m) throw bad(`${name} must be a valid date and time`);
  const [, y, mo, d, h, mi, s = '00'] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
  if (Number.isNaN(date.getTime())) throw bad(`${name} must be a valid date and time`);
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

export function idParam(value: unknown, name = 'id'): number {
  return int(value, { name, min: 1 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body as Record<string, unknown>;
  } catch {
    throw bad('Request body must be valid JSON');
  }
}
