'use client';
import { useApi } from '@/lib/client';
import { inr } from '@/lib/format';
import Shell from '@/components/Shell';
import { Stat, Tabs } from '@/components/ui';
import Vehicles from '@/components/customer/Vehicles';
import Appointments from '@/components/customer/Appointments';
import Invoices from '@/components/customer/Invoices';

export default function CustomerPage() {
  const { data, reload } = useApi('/api/customer/summary');
  const s = data?.summary;
  return (
    <Shell role="customer">
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <Stat label="Vehicles" value={s ? s.vehicles : '…'} />
        <Stat label="Loyalty points" value={s ? s.loyalty_points : '…'} hint="1 point per ₹100 paid" />
        <Stat label="Lifetime spend" value={s ? inr(s.lifetime_spend) : '…'} hint="paid invoices" />
        <Stat label="Amount due" value={s ? inr(s.amount_due) : '…'} hint={s && s.amount_due > 0 ? 'see the Invoices tab' : 'all settled'} />
      </div>
      <Tabs
        tabs={[
          { id: 'vehicles', label: 'My vehicles', render: () => <Vehicles /> },
          { id: 'appointments', label: 'Book & track services', render: () => <Appointments /> },
          { id: 'invoices', label: 'Invoices', render: () => <Invoices onPaid={reload} /> },
        ]}
      />
    </Shell>
  );
}
