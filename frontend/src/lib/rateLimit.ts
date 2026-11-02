import { HttpError } from './errors';

// Tiny in-memory login throttle: 5 failed attempts per "ip|email" per 15 minutes.
// Good enough for a single-process student project; use Redis for a real deployment.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

const g = globalThis as unknown as { __autocareFails?: Map<string, number[]> };

function store(): Map<string, number[]> {
  if (!g.__autocareFails) g.__autocareFails = new Map();
  return g.__autocareFails;
}

function recent(key: string): number[] {
  const now = Date.now();
  const list = (store().get(key) || []).filter((t) => now - t < WINDOW_MS);
  store().set(key, list);
  return list;
}

export function assertNotLocked(key: string): void {
  if (recent(key).length >= MAX_FAILS) {
    throw new HttpError(429, 'Too many failed sign-in attempts. Try again in a few minutes.');
  }
}

export function recordFailure(key: string): void {
  recent(key).push(Date.now());
}

export function clearFailures(key: string): void {
  store().delete(key);
}
