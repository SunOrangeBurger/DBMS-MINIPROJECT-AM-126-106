'use client';
import { api, makeRunner, useApi, useFlash } from '@/lib/client';
import { dt, inr } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

export default function Invoices({ onPaid }: { onPaid?: () => void }) {
  const { data, error, loading, reload } = useApi('/api/customer/invoices');
  const flash = useFlash();
  const run = makeRunner(flash, reload);

  async function pay(inv: Row) {
    if (!window.confirm(`Pay ${inr(inv.total_amount)} for invoice #${inv.invoice_id}?`)) return;
    await run(
      () => api<{ loyalty_points: number }>(`/api/customer/invoices/${inv.invoice_id}/pay`, { method: 'POST' }),
      (r) => `Payment recorded. You now have ${r.loyalty_points} loyalty points.`
    );
    if (onPaid) onPaid();
  }

  return (
    <div className="stack">
      <Alert flash={flash.flash} />
      <Card title="Invoices" actions={<span className="muted">Paying earns loyalty points (1 per ₹100)</span>}>
        {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
          <Table
            rows={data.invoices}
            empty="No invoices yet."
            rowKey={(r) => r.invoice_id}
            columns={[
              { label: '#', key: 'invoice_id' },
              { label: 'Vehicle', render: (r) => (<>{r.make} {r.model}<div className="sub">{r.registration_no}</div></>) },
              { label: 'Service', key: 'service_name' },
              { label: 'Issued', render: (r) => dt(r.issued_at) },
              { label: 'Labour', align: 'right', render: (r) => inr(r.labor_cost) },
              { label: 'Parts', align: 'right', render: (r) => inr(r.parts_cost) },
              { label: 'Tax', align: 'right', render: (r) => inr(r.tax_amount) },
              { label: 'Total', align: 'right', render: (r) => <strong>{inr(r.total_amount)}</strong> },
              { label: 'Status', render: (r) => <Badge value={r.payment_status} /> },
              { label: '', render: (r) => (r.payment_status === 'pending' ? <button className="btn small" onClick={() => pay(r)}>Pay now</button> : null) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
