'use client';
import { dt, inr, label } from '@/lib/format';
import type { AppointmentDetailData } from '@/lib/types';
import { Badge, Card, Table } from './ui';

/** Read-only appointment summary: header, mechanics, status history, parts and invoice. */
export default function AppointmentDetail({ detail }: { detail: AppointmentDetailData }) {
  const { appointment: a, parts, mechanics, log } = detail;
  return (
    <div className="stack">
      <Card title={`Appointment #${a.appointment_id}`}>
        <dl className="kv">
          <dt>Vehicle</dt><dd>{a.make} {a.model} · {a.registration_no}</dd>
          <dt>Customer</dt><dd>{a.customer_name}</dd>
          <dt>Service</dt><dd>{a.service_name} {a.priority === 'urgent' ? <Badge value="urgent" /> : null}</dd>
          <dt>Scheduled</dt><dd>{dt(a.scheduled_date)}</dd>
          <dt>Completed</dt><dd>{a.completed_date ? dt(a.completed_date) : '—'}</dd>
          <dt>Status</dt><dd><Badge value={a.status} /></dd>
          <dt>Customer&apos;s description</dt><dd><div className="note-box">{a.complaint_notes || '—'}</div></dd>
          <dt>Mechanic&apos;s diagnosis</dt><dd><div className="note-box">{a.diagnosis_notes || 'Not diagnosed yet'}</div></dd>
        </dl>
      </Card>

      <div className="grid cols-2">
        <Card title="Mechanics">
          <Table
            rows={mechanics}
            empty="No mechanic assigned yet."
            rowKey={(r) => r.mechanic_id}
            columns={[
              { label: 'Name', key: 'full_name' },
              { label: 'Specialization', key: 'specialization' },
              { label: 'Role', render: (r) => label(r.role_in_job) },
            ]}
          />
        </Card>
        <Card title="Status history">
          <Table
            rows={log}
            empty="No status changes yet."
            columns={[
              { label: 'From', render: (r) => <Badge value={r.old_status} /> },
              { label: 'To', render: (r) => <Badge value={r.new_status} /> },
              { label: 'When', render: (r) => dt(r.changed_at) },
            ]}
          />
        </Card>
      </div>

      <Card title="Parts used">
        <Table
          rows={parts}
          empty="No parts used."
          rowKey={(r) => r.part_id}
          columns={[
            { label: 'Part', render: (r) => (<>{r.part_name}<div className="sub">{r.part_code}</div></>) },
            { label: 'Qty', align: 'right', key: 'quantity_used' },
            { label: 'Unit price', align: 'right', render: (r) => inr(r.price_at_use) },
            { label: 'Line total', align: 'right', render: (r) => inr(r.line_total) },
          ]}
        />
      </Card>

      {a.invoice_id ? (
        <Card title="Invoice">
          <dl className="kv">
            <dt>Labour</dt><dd>{inr(a.labor_cost)}</dd>
            <dt>Parts</dt><dd>{inr(a.parts_cost)}</dd>
            <dt>Tax (5%)</dt><dd>{inr(a.tax_amount)}</dd>
            <dt>Total</dt><dd><strong>{inr(a.total_amount)}</strong></dd>
            <dt>Payment</dt><dd><Badge value={a.payment_status} /></dd>
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
