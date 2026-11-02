'use client';
import { useState } from 'react';
import { useApi } from '@/lib/client';
import { dt } from '@/lib/format';
import { Alert, Badge, Card, Loading, Stat, Table } from '@/components/ui';
import JobDetail from './JobDetail';

export default function Jobs() {
  const { data, error, loading, reload } = useApi('/api/staff/jobs');
  const [openId, setOpenId] = useState<number | null>(null);

  if (openId) {
    return <JobDetail id={openId} onBack={() => { setOpenId(null); reload(); }} />;
  }
  if (loading && !data) return <Loading />;
  if (error) return <Alert type="error">{error}</Alert>;
  const { jobs, workload } = data;

  return (
    <div className="stack">
      {workload ? (
        <div className="grid cols-3">
          <Stat label="Active jobs" value={workload.active_jobs} hint="scheduled + in progress" />
          <Stat label="Completed" value={workload.completed_jobs} />
          <Stat label="Total assigned" value={workload.total_jobs} hint={workload.specialization} />
        </div>
      ) : null}
      <Card title="Jobs assigned to me">
        <Table
          rows={jobs}
          empty="No jobs have been assigned to you yet."
          rowKey={(r) => r.appointment_id}
          columns={[
            { label: '#', key: 'appointment_id' },
            { label: 'Vehicle', render: (r) => (<><strong>{r.make} {r.model}</strong><div className="sub">{r.registration_no}</div></>) },
            { label: 'Service', render: (r) => (<>{r.service_name} {r.priority === 'urgent' ? <Badge value="urgent" /> : null}</>) },
            { label: 'Problem reported', render: (r) => <span className="sub">{String(r.complaint_notes || '').slice(0, 90)}{String(r.complaint_notes || '').length > 90 ? '…' : ''}</span> },
            { label: 'When', render: (r) => dt(r.scheduled_date) },
            { label: 'My role', key: 'role_in_job' },
            { label: 'Status', render: (r) => <Badge value={r.status} /> },
            { label: '', render: (r) => <button className="btn secondary small" onClick={() => setOpenId(r.appointment_id)}>Open</button> },
          ]}
        />
      </Card>
    </div>
  );
}
