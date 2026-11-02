'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, makeRunner, useApi, useFlash, useForm } from '@/lib/client';
import { dt, inr, tomorrowAtTen } from '@/lib/format';
import type { AppointmentDetailData, Row } from '@/lib/types';
import AppointmentDetail from '@/components/AppointmentDetail';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

export default function Appointments() {
  const appts = useApi('/api/customer/appointments');
  const vehicles = useApi('/api/customer/vehicles');
  const services = useApi('/api/service-types');
  const flash = useFlash();
  const run = makeRunner(flash, appts.reload);
  const form = useForm({ vehicle_id: '', service_type_id: '', scheduled_date: tomorrowAtTen(), priority: 'normal', complaint_notes: '' });
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = useApi<AppointmentDetailData>(openId ? `/api/customer/appointments/${openId}` : null);

  const chosen = (services.data?.services as Row[] | undefined)?.find((s) => String(s.service_type_id) === form.values.service_type_id);
  const noVehicles = vehicles.data && vehicles.data.vehicles.length === 0;

  async function book(e: FormEvent) {
    e.preventDefault();
    const v = form.values;
    const ok = await run(
      () => api('/api/customer/appointments', { method: 'POST', body: { ...v, vehicle_id: Number(v.vehicle_id), service_type_id: Number(v.service_type_id) } }),
      'Appointment booked! A mechanic will be assigned shortly.'
    );
    if (ok) form.reset({ ...v, complaint_notes: '', priority: 'normal' });
  }

  async function cancel(a: Row) {
    if (!window.confirm('Cancel this appointment?')) return;
    await run(() => api(`/api/customer/appointments/${a.appointment_id}/cancel`, { method: 'POST' }), 'Appointment cancelled');
  }

  if (openId) {
    return (
      <div className="stack">
        <div><button className="btn secondary" onClick={() => setOpenId(null)}>← Back to my appointments</button></div>
        {detail.loading && !detail.data ? <Loading /> : detail.error ? <Alert type="error">{detail.error}</Alert> : detail.data ? <AppointmentDetail detail={detail.data} /> : null}
      </div>
    );
  }

  return (
    <div className="stack">
      <Alert flash={flash.flash} />

      <Card title="Book a service">
        {noVehicles ? (
          <Alert type="info">Add a vehicle in the &ldquo;My vehicles&rdquo; tab before booking.</Alert>
        ) : (
          <form onSubmit={book}>
            <div className="form-grid">
              <div>
                <label htmlFor="vehicle">Vehicle</label>
                <select id="vehicle" required {...form.bind('vehicle_id')}>
                  <option value="">Select a vehicle…</option>
                  {((vehicles.data?.vehicles ?? []) as Row[]).map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>{v.make} {v.model} — {v.registration_no}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="service">Service</label>
                <select id="service" required {...form.bind('service_type_id')}>
                  <option value="">Select a service…</option>
                  {((services.data?.services ?? []) as Row[]).map((s) => (
                    <option key={s.service_type_id} value={s.service_type_id}>{s.name} — from {inr(s.base_price)}</option>
                  ))}
                </select>
                {chosen ? <div className="field-hint">{chosen.description} · about {chosen.est_duration_min} min</div> : null}
              </div>
              <div><label htmlFor="when">Date &amp; time</label><input id="when" type="datetime-local" required {...form.bind('scheduled_date')} /></div>
              <div>
                <label htmlFor="prio">Priority</label>
                <select id="prio" {...form.bind('priority')}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="full">
                <label htmlFor="complaint">Describe the problem</label>
                <textarea id="complaint" required minLength={5} maxLength={2000} placeholder="e.g. Squeaking noise when I brake at low speed" {...form.bind('complaint_notes')} />
                <div className="field-hint">Mechanics search past repairs by the meaning of this text (vector search).</div>
              </div>
            </div>
            <button className="btn" type="submit" style={{ marginTop: 14 }}>Book appointment</button>
          </form>
        )}
      </Card>

      <Card title="My appointments">
        {appts.loading && !appts.data ? <Loading /> : appts.error ? <Alert type="error">{appts.error}</Alert> : (
          <Table
            rows={appts.data.appointments}
            empty="No appointments yet."
            rowKey={(r) => r.appointment_id}
            columns={[
              { label: 'Vehicle', render: (r) => (<><strong>{r.make} {r.model}</strong><div className="sub">{r.registration_no}</div></>) },
              { label: 'Service', render: (r) => (<>{r.service_name} {r.priority === 'urgent' ? <Badge value="urgent" /> : null}</>) },
              { label: 'When', render: (r) => dt(r.scheduled_date) },
              { label: 'Mechanic', render: (r) => r.mechanics_assigned || <span className="muted">—</span> },
              { label: 'Status', render: (r) => <Badge value={r.status} /> },
              { label: 'Bill', align: 'right', render: (r) => (r.total_amount != null ? inr(r.total_amount) : '—') },
              {
                label: '',
                render: (r) => (
                  <div className="btn-row">
                    <button className="btn secondary small" onClick={() => setOpenId(r.appointment_id)}>Details</button>
                    {r.status === 'scheduled' ? <button className="btn danger small" onClick={() => cancel(r)}>Cancel</button> : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
