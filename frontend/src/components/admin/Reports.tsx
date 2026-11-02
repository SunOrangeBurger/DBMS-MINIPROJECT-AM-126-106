'use client';
import { useState } from 'react';
import { api, useApi } from '@/lib/client';
import type { Row } from '@/lib/types';
import { Alert, Card, Loading, Table } from '@/components/ui';

interface ReportResult {
  title: string;
  concept: string;
  sql: string;
  rows: Row[];
}

export default function Reports() {
  const list = useApi<{ reports: { name: string; title: string; concept: string }[] }>('/api/admin/reports');
  const [state, setState] = useState<{ loading: boolean; error: string; report: ReportResult | null }>({ loading: false, error: '', report: null });

  async function run(name: string) {
    setState({ loading: true, error: '', report: null });
    try {
      const report = await api<ReportResult>(`/api/admin/reports?name=${encodeURIComponent(name)}`);
      setState({ loading: false, error: '', report });
    } catch (e) {
      setState({ loading: false, error: (e as Error).message, report: null });
    }
  }

  const { report } = state;
  const columns = report && report.rows.length
    ? Object.keys(report.rows[0]).map((k) => ({ label: k.replace(/_/g, ' '), render: (r: Row) => String(r[k] ?? '—') }))
    : [];

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <Card title="Important queries">
        {list.loading ? <Loading /> : list.error ? <Alert type="error">{list.error}</Alert> : (
          <div className="stack">
            {(list.data?.reports ?? []).map((r) => (
              <div key={r.name} className="result-card" style={{ marginTop: 0 }}>
                <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.title}</strong>
                    <div className="sub muted">{r.concept}</div>
                  </div>
                  <button className="btn small" onClick={() => run(r.name)}>Run</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="stack">
        {state.loading ? <Loading /> : null}
        {state.error ? <Alert type="error">{state.error}</Alert> : null}
        {report ? (
          <>
            <Card title={report.title} actions={<span className="muted">{report.concept}</span>}>
              <pre className="sql-box">{report.sql}</pre>
            </Card>
            <Card title={`Result (${report.rows.length} rows)`}>
              <Table rows={report.rows} columns={columns} empty="The query returned no rows." />
            </Card>
          </>
        ) : !state.loading && !state.error ? (
          <Card><p className="muted" style={{ margin: 0 }}>Pick a query and press Run to see the SQL and its live result.</p></Card>
        ) : null}
      </div>
    </div>
  );
}
