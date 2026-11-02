'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, makeRunner, useApi, useFlash, useForm } from '@/lib/client';
import { dt, inr } from '@/lib/format';
import type { AppointmentDetailData, Row } from '@/lib/types';
import AppointmentDetail from '@/components/AppointmentDetail';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

type AdminDetail = AppointmentDetailData & { allMechanics: Row[] };

function Manage({ id, onBack }: { id: number; onBack: () => void }) {
  const { data, error, loading, reload } = useApi<AdminDetail>(`/api/admin/appointments/${id}`);
  const flash = useFlash();
  const run = makeRunner(flash, reload);
  const form = useForm({ mechanic_id: '', role_in_job: 'lead' });

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert type="error">{error || 'Not found'}</Alert>;

  const open = ['scheduled', 'in_progress'].includes(data.appointment.status);
  const assigned = new Set(data.mechanics.map((m) => m.mechanic_id));

  async function assign(e: FormEvent) {
    e.preventDefault();
    const ok = await run(
      () => api(`/api/admin/appointments/${id}/assign`, { method: 'POST', body: { mechanic_id: Number(form.values.mechanic_id), role_in_job: form.values.role_in_job } }),
      'Mechanic assigned'
    );
    if (ok) form.reset({ mechanic_id: '', role_in_job: 'assistant' });
  }
  async function unassign(m: Row) {
    await run(() => api(`/api/admin/appointments/${id}/assign?mechanic_id=${m.mechanic_id}`, { method: 'DELETE' }), 'Mechanic removed');
  }
  async function cancel() {
    if (!window.confirm('Cancel this appointment? Reserved parts go back to stock.')) return;
    await run(() => api(`/api/admin/appointments/${id}/cancel`, { method: 'POST' }), 'Appointment cancelled');
  }

  return (
    <div className="stack">
      <div className="btn-row">
        <button className="btn secondary" onClick={onBack}>← All appointments</button>
        {data.appointment.status === 'scheduled' ? <button className="btn danger" onClick={cancel}>Cancel appointment</button> : null}
      </div>
      <Alert flash={flash.flash} />

      {open ? (
        <Card title="Assign mechanics">
          <Table
            rows={data.mechanics}
            empty="Nobody is assigned yet."
            rowKey={(r) => r.mechanic_id}
            columns={[
              { label: 'Mechanic', key: 'full_name' },
              { label: 'Specialization', key: 'specialization' },
              { label: 'Role', key: 'role_in_job' },
              { label: '', render: (r) => <button className="btn danger small" onClick={() => unassign(r)}>Remove</button> },
            ]}
          />
          <form onSubmit={assign} style={{ marginTop: 14 }}>
            <div className="filters" style={{ marginBottom: 0 }}>
              <div style={{ flex: 3 }}>
                <label htmlFor="mech">Add mechanic</label>
                <select id="mech" required {...form.bind('mechanic_id')}>
                  <option value="">Select a mechanic…</option>
                  {data.allMechanics.filter((m) => !assigned.has(m.mechanic_id)).map((m) => (
                    <option key={m.mechanic_id} value={m.mechanic_id}>{m.full_name} — {m.specialization}{m.is_available ? '' : ' (unavailable)'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="role">Role</label>
                <select id="role" {...form.bind('role_in_job')}>
                  <option value="lead">Lead</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <div style={{ flex: 0 }}><button className="btn" type="submit">Assign</button></div>
            </div>
            <div className="field-hint">The database refuses to double-book a mechanic for overlapping jobs (trigger).</div>
          </form>
        </Card>
      ) : null}

      <AppointmentDetail detail={data} />
    </div>
  );
}

export default function Appointments() {
  const filters = useForm({ status: '', q: '', from: '', to: '' });
  const [applied, setApplied] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, error, loading } = useApi(`/api/admin/appointments${applied}`);

  if (openId) return <Manage id={openId} onBack={() => setOpenId(null)} />;

  function apply(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    Object.entries(filters.values).forEach(([k, v]) => { if (v) p.set(k, v); });
    setApplied(p.toString() ? `?${p}` : '');
  }

  return (
    <Card title="All appointments">
      <form onSubmit={apply} className="filters">
        <div style={{ flex: 2 }}><label htmlFor="q">Search</label><input id="q" placeholder="Plate, customer or service" {...filters.bind('q')} /></div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" {...filters.bind('status')}>
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div><label htmlFor="from">From</label><input id="from" type="date" {...filters.bind('from')} /></div>
        <div><label htmlFor="to">To</label><input id="to" type="date" {...filters.bind('to')} /></div>
        <div style={{ flex: 0 }}><button className="btn" type="submit">Filter</button></div>
      </form>

      {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
        <Table
          rows={data.appointments}
          empty="No appointments match these filters."
          rowKey={(r) => r.appointment_id}
          columns={[
            { label: '#', key: 'appointment_id' },
            { label: 'Vehicle', render: (r) => (<><strong>{r.make} {r.model}</strong><div className="sub">{r.registration_no}</div></>) },
            { label: 'Customer', key: 'customer_name' },
            { label: 'Service', render: (r) => (<>{r.service_name} {r.priority === 'urgent' ? <Badge value="urgent" /> : null}</>) },
            { label: 'When', render: (r) => dt(r.scheduled_date) },
            { label: 'Mechanics', render: (r) => r.mechanics_assigned || <span className="muted">Unassigned</span> },
            { label: 'Status', render: (r) => <Badge value={r.status} /> },
            { label: 'Bill', align: 'right', render: (r) => (r.total_amount != null ? inr(r.total_amount) : '—') },
            { label: '', render: (r) => <button className="btn secondary small" onClick={() => setOpenId(r.appointment_id)}>Manage</button> },
          ]}
        />
      )}
    </Card>
  );
}
