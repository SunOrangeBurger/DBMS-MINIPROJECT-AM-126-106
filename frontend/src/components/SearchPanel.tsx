'use client';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from '@/lib/client';
import { day } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Alert, Badge, Card, Empty } from './ui';

const EXAMPLES = [
  'weird noise when I press the brake',
  'car will not start in the morning',
  'air conditioner blowing warm air',
  'electric car refuses to charge',
];

interface SearchResult {
  mode: 'semantic' | 'fulltext' | 'hybrid';
  model?: string;
  notice?: string;
  results: Row[];
}

/** Used by the mechanic ("Similar issues") and admin ("Search") pages. */
export default function SearchPanel({ extra }: { extra?: ReactNode }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('semantic');
  const [state, setState] = useState<{ loading: boolean; error: string; data: SearchResult | null }>({ loading: false, error: '', data: null });

  async function run(text: string) {
    const t = text.trim();
    if (t.length < 2) return;
    setState({ loading: true, error: '', data: null });
    try {
      const data = await api<SearchResult>(`/api/search?${new URLSearchParams({ q: t, mode, k: '6' })}`);
      setState({ loading: false, error: '', data });
    } catch (err) {
      setState({ loading: false, error: (err as Error).message, data: null });
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(q);
  }

  const { loading, error, data } = state;

  return (
    <div className="stack">
      <Card title="Find similar past issues">
        <form onSubmit={submit}>
          <div className="filters">
            <div style={{ flex: 4 }}>
              <label htmlFor="q">Describe the problem in your own words</label>
              <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. grinding sound from the wheels when stopping" />
            </div>
            <div>
              <label htmlFor="mode">Search method</label>
              <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="semantic">Semantic (vector / Chroma)</option>
                <option value="hybrid">Hybrid (meaning + keywords)</option>
                <option value="fulltext">Keyword (MySQL FULLTEXT)</option>
              </select>
            </div>
            <div style={{ flex: 0 }}>
              <button className="btn" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
            </div>
          </div>
        </form>
        <div className="btn-row">
          <span className="muted">Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="btn secondary small" onClick={() => { setQ(ex); run(ex); }}>{ex}</button>
          ))}
        </div>
        <p className="field-hint" style={{ marginBottom: 0 }}>
          Semantic search compares the <em>meaning</em> of the text (embeddings + cosine similarity), so it can match
          &ldquo;squeaking when braking&rdquo; to &ldquo;weird noise on the brake pedal&rdquo;. Keyword search only matches shared words. Compare both!
        </p>
      </Card>

      {extra}

      {error ? <Alert type="error">{error}</Alert> : null}
      {data?.notice ? <Alert type="info">{data.notice}</Alert> : null}

      {data ? (
        <Card
          title={`Results (${data.results.length})`}
          actions={<span className="muted">{data.mode === 'fulltext' ? 'MySQL full-text search' : `${data.mode === 'hybrid' ? 'Hybrid' : 'Vector'} search · model: ${data.model}`}</span>}
        >
          {data.results.length === 0 ? (
            <Empty>No close matches. Try describing the symptom differently.</Empty>
          ) : (
            data.results.map((r) => (
              <div className="result-card" key={r.appointment_id}>
                <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.make} {r.model}</strong>{' '}
                    <span className="muted">· {r.registration_no} · {r.service_name} · {day(r.scheduled_date)}</span>{' '}
                    <Badge value={r.status} />
                  </div>
                  <div className="score" title={r.metric}>
                    {Number(r.score).toFixed(3)} <span className="muted" style={{ fontWeight: 400 }}>{r.metric}</span>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div className="muted">Customer said</div>
                  <div>{r.complaint_notes}</div>
                </div>
                {r.diagnosis_notes ? (
                  <div style={{ marginTop: 8 }}>
                    <div className="muted">Mechanic found</div>
                    <div>{r.diagnosis_notes}</div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </Card>
      ) : null}
    </div>
  );
}
