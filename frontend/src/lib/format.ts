// Display helpers (browser side)
export function inr(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value));
}

function toDate(s: unknown): Date | null {
  if (!s) return null;
  const d = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dt(value: unknown): string {
  const d = toDate(value);
  if (!d) return value ? String(value) : '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function day(value: unknown): string {
  const d = toDate(value);
  if (!d) return value ? String(value) : '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function label(value: unknown): string {
  return value ? String(value).replace(/_/g, ' ') : '—';
}

/** Value for <input type="datetime-local">: tomorrow at 10:00 */
export function tomorrowAtTen(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
