'use client';
import { useApi } from '@/lib/client';
import { inr } from '@/lib/format';
import { Alert, Badge, Card, Loading, Table } from '@/components/ui';

export default function Stock() {
  const { data, error, loading } = useApi('/api/parts');
  return (
    <Card title="Parts stock" actions={<span className="muted">Read-only. Stock changes automatically when parts are used on jobs.</span>}>
      {loading && !data ? <Loading /> : error ? <Alert type="error">{error}</Alert> : (
        <Table
          rows={data.parts}
          rowKey={(r) => r.part_id}
          columns={[
            { label: 'Part', render: (r) => (<>{r.part_name}<div className="sub">{r.part_code}</div></>) },
            { label: 'Unit price', align: 'right', render: (r) => inr(r.unit_price) },
            { label: 'In stock', align: 'right', key: 'stock_qty' },
            { label: 'Reorder at', align: 'right', key: 'reorder_level' },
            { label: '', render: (r) => (r.is_low ? <Badge value="low" /> : <Badge value="ok" />) },
          ]}
        />
      )}
    </Card>
  );
}
