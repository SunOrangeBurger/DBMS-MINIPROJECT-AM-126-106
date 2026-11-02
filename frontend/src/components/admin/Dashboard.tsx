'use client';
import { useApi } from '@/lib/client';
import { inr, label } from '@/lib/format';
import { Alert, Badge, BarChart, Card, Loading, Stat, Table } from '@/components/ui';

export default function Dashboard() {
  const { data, error, loading } = useApi('/api/admin/dashboard');
  if (loading && !data) return <Loading />;
  if (error) return <Alert type="error">{error}</Alert>;
  const { kpis, monthly, byService, workload, lowStock, topParts, topCustomers, statusCounts, vector } = data;

  return (
    <div className="stack">
      <div className="grid cols-4">
        <Stat label="Open jobs" value={kpis.open_jobs} hint="scheduled + in progress" />
        <Stat label="Revenue collected" value={inr(kpis.revenue_collected)} hint={`${kpis.completed_jobs} completed jobs`} />
        <Stat label="Revenue pending" value={inr(kpis.revenue_pending)} hint="unpaid invoices" />
        <Stat label="Low-stock parts" value={kpis.low_stock_parts} hint={`${kpis.customers} customers`} />
      </div>

      <div className="grid cols-2">
        <Card title="Revenue per month">
          <BarChart items={monthly.map((m: Record<string, unknown>) => ({ label: String(m.month), value: Number(m.revenue) }))} format={inr} />
        </Card>
        <Card title="Revenue by service type (view)">
          <BarChart items={byService.map((s: Record<string, unknown>) => ({ label: String(s.service_name), value: Number(s.total_revenue) }))} format={inr} />
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Mechanic workload (view)">
          <Table
            rows={workload}
            rowKey={(r) => r.mechanic_id}
            columns={[
              { label: 'Mechanic', render: (r) => (<>{r.mechanic_name}<div className="sub">{r.specialization}</div></>) },
              { label: 'Active', align: 'right', key: 'active_jobs' },
              { label: 'Done', align: 'right', key: 'completed_jobs' },
              { label: 'Total', align: 'right', key: 'total_jobs' },
            ]}
          />
        </Card>
        <Card title="Appointments by status">
          <BarChart items={statusCounts.map((s: Record<string, unknown>) => ({ label: label(s.status), value: Number(s.n) }))} />
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Low-stock parts (view)">
          <Table
            rows={lowStock}
            empty="All parts are above their reorder level."
            rowKey={(r) => r.part_id}
            columns={[
              { label: 'Part', render: (r) => (<>{r.part_name}<div className="sub">{r.part_code}</div></>) },
              { label: 'In stock', align: 'right', key: 'stock_qty' },
              { label: 'Reorder at', align: 'right', key: 'reorder_level' },
            ]}
          />
        </Card>
        <Card title="Most used parts">
          <Table
            rows={topParts}
            rowKey={(r) => r.part_name}
            columns={[
              { label: 'Part', key: 'part_name' },
              { label: 'Units', align: 'right', key: 'units_used' },
              { label: 'Value', align: 'right', render: (r) => inr(r.value_used) },
            ]}
          />
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Top customers (SQL function)">
          <Table
            rows={topCustomers}
            rowKey={(r) => r.full_name}
            columns={[
              { label: 'Customer', key: 'full_name' },
              { label: 'Lifetime spend', align: 'right', render: (r) => inr(r.lifetime_spend) },
              { label: 'Points', align: 'right', key: 'loyalty_points' },
            ]}
          />
        </Card>
        <Card title="Semantic search service">
          {vector.up ? (
            <dl className="kv">
              <dt>Status</dt><dd><Badge value="active" /></dd>
              <dt>Embedding model</dt><dd>{vector.embedding_model}</dd>
              <dt>Indexed notes</dt><dd>{vector.documents}</dd>
              <dt>Metric</dt><dd>{vector.metric}</dd>
            </dl>
          ) : (
            <Alert type="info">The vector service is not running. Start it (see README) to enable semantic search. Keyword search still works.</Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
