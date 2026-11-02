'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, makeRunner, useApi, useFlash, useForm } from '@/lib/client';
import { dt, inr } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

const EMPTY = { part_name: '', part_code: '', unit_price: '', stock_qty: '0', reorder_level: '5' };

export default function Inventory() {
  const { data, error, loading, reload } = useApi('/api/admin/parts');
  const flash = useFlash();
  const run = makeRunner(flash, reload);
  const form = useForm(EMPTY);
  const [qty, setQty] = useState<Record<string, string>>({}); // part_id -> restock quantity

  async function add(e: FormEvent) {
    e.preventDefault();
    const v = form.values;
    const ok = await run(
      () => api('/api/admin/parts', { method: 'POST', body: { ...v, unit_price: Number(v.unit_price), stock_qty: Number(v.stock_qty), reorder_level: Number(v.reorder_level) } }),
      'Part added'
    );
    if (ok) form.reset(EMPTY);
  }
  async function restock(p: Row) {
    const n = Number(qty[String(p.part_id)]);
    if (!n || n < 1) { flash.err('Enter a restock quantity of at least 1'); return; }
    const ok = await run(() => api<{ stock_qty: number }>(`/api/admin/parts/${p.part_id}/restock`, { method: 'POST', body: { quantity: n } }), (r) => `Restocked. Now ${r.stock_qty} in stock.`);
    if (ok) setQty((q) => ({ ...q, [String(p.part_id)]: '' }));
  }
  async function remove(p: Row) {
    if (!window.confirm(`Delete ${p.part_name}?`)) return;
    await run(() => api(`/api/admin/parts/${p.part_id}`, { method: 'DELETE' }), 'Part deleted');
  }

  return (
    <div className="stack">
      <Alert flash={flash.flash} />
      <Card title="Add a part">
        <form onSubmit={add}>
          <div className="form-grid">
            <div><label htmlFor="pn">Part name</label><input id="pn" required {...form.bind('part_name')} /></div>
            <div><label htmlFor="pc">Part code</label><input id="pc" required {...form.bind('part_code')} /></div>
            <div><label htmlFor="pp">Unit price (₹)</label><input id="pp" type="number" step="0.01" min="0" required {...form.bind('unit_price')} /></div>
            <div><label htmlFor="sq">Opening stock</label><input id="sq" type="number" min="0" required {...form.bind('stock_qty')} /></div>
            <div><label htmlFor="rl">Reorder level</label><input id="rl" type="number" min="0" required {...form.bind('reorder_level')} /></div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 14 }}>Add part</button>
        </form>
      </Card>

      <Card title="Spare parts">
        {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
          <Table
            rows={data.parts}
            rowKey={(r) => r.part_id}
            columns={[
              { label: 'Part', render: (r) => (<>{r.part_name}<div className="sub">{r.part_code}</div></>) },
              { label: 'Unit price', align: 'right', render: (r) => inr(r.unit_price) },
              { label: 'Stock', align: 'right', render: (r) => (<>{r.stock_qty} {r.is_low ? <Badge value="low" /> : null}</>) },
              { label: 'Reorder at', align: 'right', key: 'reorder_level' },
              { label: 'Last restock', render: (r) => (r.last_restocked ? dt(r.last_restocked) : '—') },
              {
                label: 'Restock',
                render: (r) => (
                  <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                    <input aria-label={`Restock quantity for ${r.part_name}`} type="number" min="1" style={{ width: 80 }} value={qty[String(r.part_id)] ?? ''} onChange={(e) => setQty((q) => ({ ...q, [String(r.part_id)]: e.target.value }))} />
                    <button className="btn small" onClick={() => restock(r)}>Add</button>
                  </div>
                ),
              },
              { label: '', render: (r) => <button className="btn danger small" onClick={() => remove(r)}>Delete</button> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
