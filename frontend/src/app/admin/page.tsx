'use client';
import { api, makeRunner, useFlash } from '@/lib/client';
import Shell from '@/components/Shell';
import SearchPanel from '@/components/SearchPanel';
import { Alert, Card, Tabs } from '@/components/ui';
import Dashboard from '@/components/admin/Dashboard';
import Appointments from '@/components/admin/Appointments';
import Billing from '@/components/admin/Billing';
import Inventory from '@/components/admin/Inventory';
import Users from '@/components/admin/Users';
import Reports from '@/components/admin/Reports';

function AdminSearch() {
  const flash = useFlash();
  const run = makeRunner(flash);
  return (
    <SearchPanel
      extra={
        <Card
          title="Vector index"
          actions={<button className="btn secondary small" onClick={() => run(() => api<{ indexed: number }>('/api/admin/reindex', { method: 'POST' }), (r) => `Re-indexed ${r.indexed} appointment notes`)}>Rebuild index</button>}
        >
          <p className="muted" style={{ margin: 0 }}>Notes are embedded when appointments are booked, diagnosed or completed. Rebuild the index if you changed the database directly.</p>
          <div style={{ marginTop: 10 }}><Alert flash={flash.flash} /></div>
        </Card>
      }
    />
  );
}

export default function AdminPage() {
  return (
    <Shell role="admin">
      <Tabs
        tabs={[
          { id: 'dashboard', label: 'Dashboard', render: () => <Dashboard /> },
          { id: 'appointments', label: 'Appointments', render: () => <Appointments /> },
          { id: 'billing', label: 'Billing', render: () => <Billing /> },
          { id: 'inventory', label: 'Inventory', render: () => <Inventory /> },
          { id: 'users', label: 'Users', render: () => <Users /> },
          { id: 'search', label: 'Semantic search', render: () => <AdminSearch /> },
          { id: 'reports', label: 'SQL reports', render: () => <Reports /> },
        ]}
      />
    </Shell>
  );
}
