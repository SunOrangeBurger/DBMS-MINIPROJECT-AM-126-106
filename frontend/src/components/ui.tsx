'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { label as pretty } from '@/lib/format';
import type { Flash } from '@/lib/client';
import type { Row } from '@/lib/types';

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {title || actions ? (
        <div className="card-head">
          {title ? <h2>{title}</h2> : <span />}
          {actions ? <div className="btn-row">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  scheduled: 'info', in_progress: 'warn', completed: 'ok', cancelled: 'muted',
  pending: 'warn', paid: 'ok', refunded: 'muted',
  urgent: 'danger', normal: 'muted',
  admin: 'danger', staff: 'info', customer: 'ok',
  active: 'ok', inactive: 'muted', low: 'danger', ok: 'ok',
};

export function Badge({ value, tone }: { value: unknown; tone?: string }) {
  const key = String(value);
  return <span className={`badge badge-${tone || TONES[key] || 'muted'}`}>{pretty(value)}</span>;
}

/** Message banner. Pass a `flash` object, or `type` + children. */
export function Alert({ flash, type, children }: { flash?: Flash | null; type?: 'ok' | 'error' | 'info'; children?: ReactNode }) {
  const t = flash ? flash.type : type;
  const text = flash ? flash.text : children;
  if (!text) return null;
  return (
    <div className={`alert ${t}`} role={t === 'error' ? 'alert' : 'status'}>
      {text}
    </div>
  );
}

export function Loading({ children = 'Loading…' }: { children?: ReactNode }) {
  return <div className="loading">{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export interface Column {
  label: string;
  key?: string;
  align?: 'right';
  render?: (row: Row) => ReactNode;
}

export function Table({ columns, rows, empty = 'Nothing to show yet.', rowKey }: { columns: Column[]; rows: Row[]; empty?: string; rowKey?: (row: Row) => string | number }) {
  if (!rows || rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={`${c.label}-${i}`} className={c.align === 'right' ? 'num' : ''}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey ? rowKey(row) : i}>
              {columns.map((c, j) => (
                <td key={`${c.label}-${j}`} className={c.align === 'right' ? 'num' : ''}>
                  {c.render ? c.render(row) : (row[c.key as string] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bar chart (pure CSS). */
export function BarChart({ items, format = (v) => String(v) }: { items: { label: string; value: number }[]; format?: (v: number) => string }) {
  if (!items || items.length === 0) return <Empty>No data yet.</Empty>;
  const max = Math.max(...items.map((i) => Number(i.value) || 0), 1);
  return (
    <div className="bars">
      {items.map((it) => (
        <div className="bar-row" key={it.label}>
          <div className="bar-label" title={it.label}>{it.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(2, (Number(it.value) / max) * 100)}%` }} />
          </div>
          <div className="bar-val">{format(Number(it.value))}</div>
        </div>
      ))}
    </div>
  );
}

/** Simple tab bar; only the active tab is mounted (so data loads on demand). */
export function Tabs({ tabs }: { tabs: { id: string; label: string; render: () => ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === current.id} className={`tab ${t.id === current.id ? 'active' : ''}`} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {current.render()}
    </>
  );
}
