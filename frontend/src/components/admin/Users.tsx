'use client';
import type { FormEvent } from 'react';
import { api, makeRunner, useApi, useFlash, useForm } from '@/lib/client';
import { dt } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

const EMPTY = { full_name: '', email: '', password: '', phone: '', specialization: '', experience_yrs: '0', hourly_rate: '0' };

export default function Users() {
  const { data, error, loading, reload } = useApi('/api/admin/users');
  const flash = useFlash();
  const run = makeRunner(flash, reload);
  const form = useForm(EMPTY);

  async function create(e: FormEvent) {
    e.preventDefault();
    const v = form.values;
    const ok = await run(
      () => api('/api/admin/users', { method: 'POST', body: { ...v, experience_yrs: Number(v.experience_yrs), hourly_rate: Number(v.hourly_rate) } }),
      'Staff member created'
    );
    if (ok) form.reset(EMPTY);
  }
  const toggleActive = (u: Row) => run(() => api(`/api/admin/users/${u.user_id}`, { method: 'PATCH', body: { is_active: !u.is_active } }), u.is_active ? 'Account deactivated' : 'Account activated');
  const toggleAvail = (u: Row) => run(() => api(`/api/admin/users/${u.user_id}`, { method: 'PATCH', body: { is_available: !u.is_available } }), 'Availability updated');

  return (
    <div className="stack">
      <Alert flash={flash.flash} />
      <Card title="Add a mechanic (staff account)">
        <form onSubmit={create}>
          <div className="form-grid">
            <div><label htmlFor="n">Full name</label><input id="n" required {...form.bind('full_name')} /></div>
            <div><label htmlFor="e">Email</label><input id="e" type="email" required {...form.bind('email')} /></div>
            <div><label htmlFor="p">Temporary password</label><input id="p" type="password" required minLength={8} autoComplete="new-password" {...form.bind('password')} /></div>
            <div><label htmlFor="ph">Phone</label><input id="ph" required minLength={7} {...form.bind('phone')} /></div>
            <div><label htmlFor="s">Specialization</label><input id="s" placeholder="Engine, Electrical…" {...form.bind('specialization')} /></div>
            <div><label htmlFor="x">Experience (years)</label><input id="x" type="number" min="0" max="60" {...form.bind('experience_yrs')} /></div>
            <div><label htmlFor="h">Hourly rate (₹)</label><input id="h" type="number" step="0.01" min="0" {...form.bind('hourly_rate')} /></div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 14 }}>Create staff account</button>
        </form>
      </Card>

      <Card title="All users">
        {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
          <Table
            rows={data.users}
            rowKey={(r) => r.user_id}
            columns={[
              { label: 'Name', render: (r) => (<>{r.full_name}<div className="sub">{r.email}</div></>) },
              { label: 'Role', render: (r) => <Badge value={r.role} /> },
              { label: 'Details', render: (r) => (r.role === 'staff' ? `${r.specialization || '—'}${r.is_available ? '' : ' · unavailable'}` : r.role === 'customer' ? `${r.loyalty_points} points` : '—') },
              { label: 'Last login', render: (r) => (r.last_login_at ? dt(r.last_login_at) : 'Never') },
              { label: 'Status', render: (r) => <Badge value={r.is_active ? 'active' : 'inactive'} /> },
              {
                label: '',
                render: (r) => (
                  <div className="btn-row">
                    <button className="btn secondary small" onClick={() => toggleActive(r)}>{r.is_active ? 'Deactivate' : 'Activate'}</button>
                    {r.role === 'staff' ? <button className="btn secondary small" onClick={() => toggleAvail(r)}>{r.is_available ? 'Set unavailable' : 'Set available'}</button> : null}
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
