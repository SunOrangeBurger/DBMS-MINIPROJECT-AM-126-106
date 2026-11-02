'use client';
import Shell from '@/components/Shell';
import SearchPanel from '@/components/SearchPanel';
import { Tabs } from '@/components/ui';
import Jobs from '@/components/staff/Jobs';
import Stock from '@/components/staff/Stock';

export default function StaffPage() {
  return (
    <Shell role="staff">
      <Tabs
        tabs={[
          { id: 'jobs', label: 'My jobs', render: () => <Jobs /> },
          { id: 'search', label: 'Similar issues', render: () => <SearchPanel /> },
          { id: 'stock', label: 'Parts stock', render: () => <Stock /> },
        ]}
      />
    </Shell>
  );
}
