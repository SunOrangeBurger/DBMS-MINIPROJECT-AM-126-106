'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, makeRunner, useApi, useFlash, useForm } from '@/lib/client';
import { dt, inr } from '@/lib/format';
import type { AppointmentDetailData, Row } from '@/lib/types';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

type JobData = AppointmentDetailData & { catalog: Row[] };

export default function JobDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { data, error, loading, reload } = useApi<JobData>(`/api/staff/jobs/${id}`);
  const flash = useFlash();
  const run = makeRunner(flash, reload);
  const partForm = useForm({ part_id: '', quantity: '1' });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (data) setNotes(data.appointment.diagnosis_notes || '');
  }, [data]);

  // Similar past jobs for this complaint (semantic search; falls back to full-text)
  const complaint = data ? String(data.appointment.complaint_notes || '').slice(0, 280) : '';
  const similar = useApi<{ mode: string; notice?: string; results: Row[] }>(
    complaint ? `/api/search?${new URLSearchParams({ q: complaint, mode: 'semantic', k: '4' })}` : null
  );

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert type="error">{error || 'Job not found'}</Alert>;

  const { appointment: a, parts, catalog } = data;
  const open = a.status === 'scheduled' || a.status === 'in_progress';
  const picked = catalog.find((p) => String(p.part_id) === partForm.values.part_id);
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.line_total), 0);
  const others = (similar.data?.results ?? []).filter((r) => String(r.appointment_id) !== String(id));

  async function saveNotes() {
    await run(() => api(`/api/staff/jobs/${id}`, { method: 'PATCH', body: { diagnosis_notes: notes } }), 'Diagnosis saved');
  }
  async function addPart(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => api(`/api/staff/jobs/${id}/parts`, { method: 'POST', body: { part_id: Number(partForm.values.part_id), quantity: Number(partForm.values.quantity) } }),
      'Part added. The database trigger updated the stock.'
    );
    if (ok) partForm.reset({ part_id: '', quantity: '1' });
  }
  async function removePart(p: Row) {
    await run(() => api(`/api/staff/jobs/${id}/parts/${p.part_id}`, { method: 'DELETE' }), 'Part removed. The stock was restored.');
  }
  async function start() {
    await run(() => api(`/api/staff/jobs/${id}/start`, { method: 'POST' }), 'Job started');
  }
  async function complete() {
    if (!window.confirm('Complete this job and generate the invoice? This cannot be undone.')) return;
    await run(
      () => api<{ invoice?: Row }>(`/api/staff/jobs/${id}/complete`, { method: 'POST' }),
      (r) => `Job completed. Invoice total ${inr(r.invoice?.total_amount)} (labour + parts + 5% tax).`
    );
  }

  return (
    <div className="stack">
      <div className="btn-row">
        <button className="btn secondary" onClick={onBack}>← My jobs</button>
        {a.status === 'scheduled' ? <button className="btn" onClick={start}>Start job</button> : null}
        {a.status === 'in_progress' ? <button className="btn" onClick={complete}>Complete &amp; bill</button> : null}
      </div>
      <Alert flash={flash.flash} />

      <div className="grid cols-2">
        <Card title={`Job #${a.appointment_id} · ${a.service_name}`}>
          <dl className="kv">
            <dt>Vehicle</dt><dd>{a.make} {a.model} · {a.registration_no}</dd>
            <dt>Scheduled</dt><dd>{dt(a.scheduled_date)}</dd>
            <dt>Status</dt><dd><Badge value={a.status} /> {a.priority === 'urgent' ? <Badge value="urgent" /> : null}</dd>
            <dt>Customer</dt><dd>{a.customer_name}</dd>
            <dt>Team</dt><dd>{a.mechanics_assigned || '—'}</dd>
            <dt>Customer reported</dt><dd><div className="note-box">{a.complaint_notes}</div></dd>
          </dl>
        </Card>

        <Card title="Diagnosis">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} disabled={!open} placeholder="What did you find and what did you do?" />
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={saveNotes} disabled={!open}>Save diagnosis</button>
            {!open ? <span className="muted">Completed or cancelled jobs are read-only.</span> : null}
          </div>
        </Card>
      </div>

      <Card title="Parts used">
        <Table
          rows={parts}
          empty="No parts logged yet."
          rowKey={(r) => r.part_id}
          columns={[
            { label: 'Part', render: (r) => (<>{r.part_name}<div className="sub">{r.part_code}</div></>) },
            { label: 'Qty', align: 'right', key: 'quantity_used' },
            { label: 'Unit price', align: 'right', render: (r) => inr(r.price_at_use) },
            { label: 'Line total', align: 'right', render: (r) => inr(r.line_total) },
            { label: '', render: (r) => (open ? <button className="btn danger small" onClick={() => removePart(r)}>Remove</button> : null) },
          ]}
        />
        {parts.length ? <p style={{ textAlign: 'right', marginBottom: 0 }}>Parts subtotal: <strong>{inr(partsTotal)}</strong></p> : null}

        {open ? (
          <form onSubmit={addPart} style={{ marginTop: 16 }}>
            <div className="filters" style={{ marginBottom: 0 }}>
              <div style={{ flex: 3 }}>
                <label htmlFor="part">Add a part</label>
                <select id="part" required {...partForm.bind('part_id')}>
                  <option value="">Select a part…</option>
                  {catalog.map((p) => (
                    <option key={p.part_id} value={p.part_id} disabled={p.stock_qty === 0}>{p.part_name} — {inr(p.unit_price)} ({p.stock_qty} in stock)</option>
                  ))}
                </select>
              </div>
              <div><label htmlFor="qty">Quantity</label><input id="qty" type="number" min={1} max={1000} required {...partForm.bind('quantity')} /></div>
              <div style={{ flex: 0 }}><button className="btn" type="submit">Add</button></div>
            </div>
            {picked ? <div className="field-hint">Asking for more than {picked.stock_qty} is rejected by the database (stock trigger).</div> : null}
          </form>
        ) : null}
      </Card>

      <Card title="Similar past jobs">
        {similar.loading && !similar.data ? <Loading>Searching past repairs…</Loading> : null}
        {similar.data?.notice ? <Alert type="info">{similar.data.notice}</Alert> : null}
        {!similar.loading && others.length === 0 ? <p className="muted" style={{ margin: 0 }}>No similar past jobs found.</p> : null}
        {others.map((r) => (
          <div className="result-card" key={r.appointment_id}>
            <div className="btn-row" style={{ justifyContent: 'space-between' }}>
              <strong>{r.make} {r.model} · {r.service_name}</strong>
              <span className="score">{Number(r.score).toFixed(3)}</span>
            </div>
            <div className="sub">Customer said: {r.complaint_notes}</div>
            {r.diagnosis_notes ? <div style={{ marginTop: 4 }}>Fix: {r.diagnosis_notes}</div> : null}
          </div>
        ))}
      </Card>
    </div>
  );
}
