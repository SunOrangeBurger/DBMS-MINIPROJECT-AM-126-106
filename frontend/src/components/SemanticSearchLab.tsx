'use client';

import React, { useState } from 'react';
import { Search, Sparkles, Database, ArrowRight, CheckCircle2, Sliders, Layers } from 'lucide-react';
import { SemanticSearchResult } from '@/lib/vectorSearch';

export default function SemanticSearchLab() {
  const [query, setQuery] = useState('brakes making a weird sound');
  const [topK, setTopK] = useState(3);
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sampleQueries = [
    'brakes making a weird sound',
    'car battery seems dead, won\'t start',
    'air conditioning blowing hot air',
    'sluggish engine and oil warning on dash',
    'flickering lights in cabin and slow windows',
  ];

  const handleSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : query).trim();
    if (!q) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error('Semantic search failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span className="brand-badge">SECOND DATABASE PARADIGM</span>
          <span className="network-badge online">Cosine Similarity & Vector Embeddings</span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF' }}>
          AI Semantic Search & Diagnostic Precedent Lab
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '900px' }}>
          Traditional SQL (<code>LIKE</code> and <code>FULLTEXT</code>) only matches shared keywords. This vector retrieval layer
          indexes unstructured complaint notes and technician findings so staff can retrieve matching historical resolutions
          even when customer descriptions use completely different terminology.
        </p>
      </div>

      {/* Query Input Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '40px', fontSize: '1rem', padding: '12px 14px 12px 42px' }}
              placeholder="Type any free-text vehicle symptom or complaint..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <Search
              size={18}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan-primary)' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Top-K:</span>
            <select
              className="form-select"
              style={{ width: '80px' }}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>

          <button className="btn-primary" onClick={() => handleSearch()} disabled={loading}>
            <Sparkles size={16} />
            <span>{loading ? 'Computing Vectors...' : 'Execute Vector Search'}</span>
          </button>
        </div>

        {/* Quick Sample Queries */}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '8px' }}>
            Quick Benchmark Prompts:
          </span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                className="btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
              >
                "{sq}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results View */}
      {hasSearched && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
              Vector Retrieval Results ({results.length} Matches)
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Ranked by Lowest Cosine Distance (Highest Similarity)
            </span>
          </div>

          {results.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matches found for this query.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {results.map((res, idx) => (
                <div key={idx} className="glass-panel card-hoverable" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="brand-badge" style={{ background: 'rgba(0,240,255,0.2)' }}>
                          RANK #{idx + 1}
                        </span>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>
                          Job #{res.document.appointment_id}: {res.document.metadata.vehicle} ({res.document.metadata.registration_no})
                        </h3>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Linked to relational record <code>service_appointments.appointment_id = {res.document.appointment_id}</code>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                          {(res.similarity * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Similarity</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Cosine Distance: {res.distance}
                      </div>
                    </div>
                  </div>

                  {/* Similarity Meter Bar */}
                  <div className="similarity-meter" style={{ marginBottom: '16px', height: '8px' }}>
                    <div className="similarity-meter-fill" style={{ width: `${res.similarity * 100}%` }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-primary)', textTransform: 'uppercase' }}>
                        Past Customer Complaint
                      </span>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.875rem', marginTop: '4px' }}>
                        "{res.document.metadata.complaint_notes || 'None recorded'}"
                      </p>
                    </div>

                    <div style={{ background: 'rgba(16,185,129,0.05)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald-primary)', textTransform: 'uppercase' }}>
                        Recorded Mechanic Diagnosis
                      </span>
                      <p style={{ color: '#34D399', fontSize: '0.875rem', marginTop: '4px' }}>
                        {res.document.metadata.diagnosis_notes || 'Pending diagnosis'}
                      </p>
                    </div>
                  </div>

                  {(res.document.metadata.cost ?? 0) > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Precedent Total Billed: <strong>₹{(res.document.metadata.cost ?? 0).toLocaleString('en-IN')}</strong></span>
                      <span style={{ color: 'var(--cyan-primary)' }}>Verified Historical Solution</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Architecture Explanation Card */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(6,10,18,0.9), rgba(15,24,42,0.9))' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '10px' }}>
          Why Two Paradigms: Relational vs Vector
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
          AutoCare stores transactional entities (customers, vehicles, appointments, spare parts inventory, and invoices) in <strong>MySQL 8.4</strong> to guarantee ACID transactions, foreign keys, and trigger-enforced constraints.
          Simultaneously, free-text complaints and diagnoses are projected into a <strong>Vector Embedding Space</strong> so mechanics can query by meaning rather than syntax.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.8rem' }}>
          <div style={{ background: 'rgba(0,240,255,0.05)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,240,255,0.2)' }}>
            <strong style={{ color: 'var(--cyan-primary)', display: 'block', marginBottom: '4px' }}>Query Phrasing:</strong>
            "weird noise when braking" vs "grinding sound near wheels" have 0 keyword overlap, but match via vector similarity.
          </div>
          <div style={{ background: 'rgba(255,184,0,0.05)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,184,0,0.2)' }}>
            <strong style={{ color: 'var(--amber-primary)', display: 'block', marginBottom: '4px' }}>Relational Join:</strong>
            The vector engine returns <code>appointment_id</code>, allowing the UI to instantly pull customer, vehicle, and invoice history from MySQL.
          </div>
        </div>
      </div>
    </div>
  );
}
