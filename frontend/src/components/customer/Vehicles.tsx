'use client';
import type { FormEvent } from 'react';
import { api, makeRunner, useApi, useFlash, useForm } from '@/lib/client';
import { day } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

const EMPTY = { registration_no: '', make: '', model: '', year: String(new Date().getFullYear()), fuel_type: 'petrol', odometer_km: '0' };

export default function Vehicles() {
  const { data, error, loading, reload } = useApi('/api/customer/vehicles');
  const flash = useFlash();
  const run = makeRunner(flash, reload);
  const form = useForm(EMPTY);

  async function add(e: FormEvent) {
    e.preventDefault();
    const v = form.values;
    const ok = await run(
      () => api('/api/customer/vehicles', { method: 'POST', body: { ...v, year: Number(v.year), odometer_km: Number(v.odometer_km) } }),
      'Vehicle added'
    );
    if (ok) form.reset(EMPTY);
  }

  async function updateOdometer(v: Row) {
    const input = window.prompt(`New odometer reading for ${v.registration_no} (km):`, String(v.odometer_km));
    if (input === null) return;
    await run(() => api(`/api/customer/vehicles/${v.vehicle_id}`, { method: 'PATCH', body: { odometer_km: Number(input) } }), 'Odometer updated');
  }

  async function remove(v: Row) {
    if (!window.confirm(`Delete ${v.make} ${v.model} (${v.registration_no})?`)) return;
    await run(() => api(`/api/customer/vehicles/${v.vehicle_id}`, { method: 'DELETE' }), 'Vehicle deleted');
  }

  return (
    <div className="stack">
      <Alert flash={flash.flash} />
      <Card title="Add a vehicle">
        <form onSubmit={add}>
          <div className="form-grid">
            <div><label htmlFor="reg">Registration number</label><input id="reg" required placeholder="KA19AB1234" {...form.bind('registration_no')} /></div>
            <div>
              <label htmlFor="fuel">Fuel type</label>
              <select id="fuel" {...form.bind('fuel_type')}>
                {['petrol', 'diesel', 'electric', 'hybrid', 'cng'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div><label htmlFor="make">Make</label><input id="make" required placeholder="Maruti Suzuki" {...form.bind('make')} /></div>
            <div><label htmlFor="model">Model</label><input id="model" required placeholder="Swift" {...form.bind('model')} /></div>
            <div><label htmlFor="year">Year</label><input id="year" type="number" required min={1950} max={2100} {...form.bind('year')} /></div>
            <div><label htmlFor="odo">Odometer (km)</label><input id="odo" type="number" required min={0} {...form.bind('odometer_km')} /></div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 14 }}>Add vehicle</button>
        </form>
      </Card>

      <Card title="Registered vehicles">
        {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
          <Table
            rows={data.vehicles}
            empty="You have not added a vehicle yet."
            rowKey={(r) => r.vehicle_id}
            columns={[
              { label: 'Vehicle', render: (r) => (<><strong>{r.make} {r.model}</strong> <span className="muted">({r.year})</span><div className="sub">{r.registration_no}</div></>) },
              { label: 'Fuel', render: (r) => <Badge value={r.fuel_type} tone="info" /> },
              { label: 'Odometer', align: 'right', render: (r) => `${Number(r.odometer_km).toLocaleString('en-IN')} km` },
              { label: 'Services', align: 'right', key: 'service_count' },
              { label: 'Last serviced', render: (r) => (r.last_serviced ? day(r.last_serviced) : '—') },
              {
                label: '',
                render: (r) => (
                  <div className="btn-row">
                    <button className="btn secondary small" onClick={() => updateOdometer(r)}>Update odometer</button>
                    <button className="btn danger small" onClick={() => remove(r)}>Delete</button>
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
