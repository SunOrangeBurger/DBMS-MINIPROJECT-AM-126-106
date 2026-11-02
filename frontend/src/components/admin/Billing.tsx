'use client';
import { useState } from 'react';
import { api, makeRunner, useApi, useFlash } from '@/lib/client';
import { dt, inr } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Alert, Badge, Card, Loading, Stat, Table } from '@/components/ui';

export default function Billing() {
  const [status, setStatus] = useState('');
  const { data, error, loading, reload } = useApi(`/api/admin/invoices${status ? `?status=${status}` : ''}`);
  const flash = useFlash();
  const run = makeRunner(flash, reload);

  async function pay(inv: Row) {
    if (!window.confirm(`Record payment of ${inr(inv.total_amount)} for invoice #${inv.invoice_id}?`)) return;
    await run(() => api(`/api/admin/invoices/${inv.invoice_id}/pay`, { method: 'POST' }), 'Payment recorded (loyalty points awarded by a trigger)');
  }

  const invoices: Row[] = data?.invoices ?? [];
  const total = invoices.reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="stack">
      <Alert flash={flash.flash} />
      <div className="grid cols-3">
        <Stat label="Invoices shown" value={data ? invoices.length : '…'} />
        <Stat label="Total value" value={inr(total)} />
        <div className="stat">
          <label htmlFor="st" className="label">Filter by status</label>
          <select id="st" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>
      <Card title="Invoices">
        {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
          <Table
            rows={invoices}
            rowKey={(r) => r.invoice_id}
            columns={[
              { label: '#', key: 'invoice_id' },
              { label: 'Customer', render: (r) => (<>{r.customer_name}<div className="sub">{r.registration_no}</div></>) },
              { label: 'Service', key: 'service_name' },
              { label: 'Issued', render: (r) => dt(r.issued_at) },
              { label: 'Labour', align: 'right', render: (r) => inr(r.labor_cost) },
              { label: 'Parts', align: 'right', render: (r) => inr(r.parts_cost) },
              { label: 'Tax', align: 'right', render: (r) => inr(r.tax_amount) },
              { label: 'Total', align: 'right', render: (r) => <strong>{inr(r.total_amount)}</strong> },
              { label: 'Status', render: (r) => <Badge value={r.payment_status} /> },
              { label: '', render: (r) => (r.payment_status === 'pending' ? <button className="btn small" onClick={() => pay(r)}>Mark paid</button> : null) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
