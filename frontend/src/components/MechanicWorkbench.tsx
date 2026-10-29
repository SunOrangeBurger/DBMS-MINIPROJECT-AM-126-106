'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  PlusCircle,
  Package,
  FileText,
  AlertCircle,
  Car,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { ServiceAppointment, SparePart, Mechanic } from '@/lib/types';
import { SemanticSearchResult } from '@/lib/vectorSearch';

interface MechanicWorkbenchProps {
  onRefreshNeeded?: () => void;
}

export default function MechanicWorkbench({ onRefreshNeeded }: MechanicWorkbenchProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState<number>(1);
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [activeJob, setActiveJob] = useState<ServiceAppointment | null>(null);
  const [loading, setLoading] = useState(true);

  // Job edit state
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<number>(1);
  const [partQty, setPartQty] = useState<number>(1);
  const [partActionLoading, setPartActionLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);

  // Semantic search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mechRes, apptRes, partsRes] = await Promise.all([
        fetch('/api/mechanics').then((r) => r.json()),
        fetch('/api/appointments').then((r) => r.json()),
        fetch('/api/parts').then((r) => r.json()),
      ]);

      setMechanics(Array.isArray(mechRes) ? mechRes : []);
      setAppointments(Array.isArray(apptRes) ? apptRes : []);
      setSpareParts(Array.isArray(partsRes) ? partsRes : []);

      if (Array.isArray(mechRes) && mechRes.length > 0 && !selectedMechanicId) {
        setSelectedMechanicId(mechRes[0].mechanic_id);
      }
    } catch (e) {
      console.error('Error loading mechanic workbench data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentMechanic = mechanics.find((m) => m.mechanic_id === selectedMechanicId);

  // Filter jobs assigned to this mechanic
  const assignedJobs = appointments.filter((a) =>
    a.mechanics?.some((m) => m.mechanic.mechanic_id === selectedMechanicId)
  );

  const openJobModal = (job: ServiceAppointment) => {
    setActiveJob(job);
    setDiagnosisNotes(job.diagnosis_notes || '');
    setPartError(null);
    setSearchResults([]);
    setSearchQuery(job.complaint_notes || '');
  };

  const handleUpdateStatus = async (status: 'scheduled' | 'in_progress' | 'completed') => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/appointments/${activeJob.appointment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, diagnosis_notes: diagnosisNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveJob(updated);
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/appointments/${activeJob.appointment_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis_notes: diagnosisNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveJob(updated);
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e) {
      console.error('Failed to save diagnosis', e);
    }
  };

  const handleAddPart = async () => {
    if (!activeJob) return;
    setPartActionLoading(true);
    setPartError(null);
    try {
      const res = await fetch(`/api/appointments/${activeJob.appointment_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: selectedPartId, quantity: partQty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPartError(data.error || 'Failed to add spare part');
      } else {
        setActiveJob(data);
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e: any) {
      setPartError(e.message);
    } finally {
      setPartActionLoading(false);
    }
  };

  const handleCompleteAndBill = async () => {
    if (!activeJob) return;
    setCompleteLoading(true);
    try {
      const res = await fetch(`/api/appointments/${activeJob.appointment_id}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveJob(updated);
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e) {
      console.error('Complete appointment failed', e);
    } finally {
      setCompleteLoading(false);
    }
  };

  // Perform AI Semantic Search
  const runSemanticSearch = async (queryToRun?: string) => {
    const q = queryToRun || searchQuery;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK: 3 }),
      });
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch (e) {
      console.error('Semantic search failed', e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header & Mechanic Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF' }}>Technician & Mechanic Workbench</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Inspect assigned vehicles, query AI semantic precedent, log spare parts, and trigger billing
          </p>
        </div>

        {/* Persona Selector for Mechanics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-subtle)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <UserCheck size={16} color="var(--cyan-primary)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Technician:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.85rem' }}
            value={selectedMechanicId}
            onChange={(e) => setSelectedMechanicId(Number(e.target.value))}
          >
            {mechanics.map((m) => (
              <option key={m.mechanic_id} value={m.mechanic_id}>
                {m.user?.full_name} ({m.specialization})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mechanic Overview Bar */}
      {currentMechanic && (
        <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #00F0FF, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060911', fontWeight: 800, fontSize: '1.1rem' }}>
              {currentMechanic.user?.full_name?.[0] || 'M'}
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>{currentMechanic.user?.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Specialization: <strong style={{ color: 'var(--cyan-primary)' }}>{currentMechanic.specialization}</strong> | Experience: {currentMechanic.experience_yrs} yrs | Hourly Rate: ₹{currentMechanic.hourly_rate}/hr
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="network-badge online" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              <Clock size={14} />
              <span>{assignedJobs.filter((j) => j.status !== 'completed').length} Active Work Orders</span>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Job Queue */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>
          Assigned Work Orders Queue ({assignedJobs.length})
        </h2>

        {assignedJobs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No appointments currently assigned to this mechanic.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {assignedJobs.map((job) => (
              <div
                key={job.appointment_id}
                className="glass-panel card-hoverable"
                style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                onClick={() => openJobModal(job)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        WORK ORDER #{job.appointment_id}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {job.vehicle?.make} {job.vehicle?.model} ({job.vehicle?.year})
                      </h3>
                    </div>
                    <span className={`status-badge status-${job.status}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyan-primary)', marginBottom: '8px' }}>
                    Plate: {job.vehicle?.registration_no} | Odo: {job.vehicle?.odometer_km?.toLocaleString()} km
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--amber-primary)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                      CUSTOMER COMPLAINT:
                    </strong>
                    "{job.complaint_notes || 'Routine maintenance requested'}"
                  </div>

                  {job.diagnosis_notes && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--emerald-primary)', background: 'rgba(16,185,129,0.05)', padding: '8px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                      <strong>Diagnosis:</strong> {job.diagnosis_notes}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Scheduled: {job.scheduled_date}
                  </span>
                  <span style={{ color: 'var(--cyan-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Open Job Card <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JOB CARD DETAIL MODAL */}
      {activeJob && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>
                  JOB CARD #{activeJob.appointment_id}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  {activeJob.vehicle?.make} {activeJob.vehicle?.model} ({activeJob.vehicle?.registration_no})
                </h2>
              </div>
              <button
                onClick={() => setActiveJob(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Workflow Status Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)', padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>CURRENT WORK ORDER STATUS</span>
                  <span className={`status-badge status-${activeJob.status}`} style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    {activeJob.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {activeJob.status === 'scheduled' && (
                    <button className="btn-primary btn-sm" onClick={() => handleUpdateStatus('in_progress')}>
                      Begin Work (In Progress)
                    </button>
                  )}
                  {activeJob.status === 'in_progress' && (
                    <button className="btn-emerald btn-sm" onClick={handleCompleteAndBill} disabled={completeLoading}>
                      {completeLoading ? 'Executing Procedure...' : 'Complete & Generate Bill (sp_complete_appointment_and_bill)'}
                    </button>
                  )}
                  {activeJob.status === 'completed' && (
                    <span className="status-badge status-completed">
                      <CheckCircle2 size={14} /> Job Finalized & Invoiced
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Complaint */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber-primary)', textTransform: 'uppercase' }}>
                  Customer Stated Complaint
                </span>
                <p style={{ color: '#FFFFFF', fontSize: '0.95rem', marginTop: '4px' }}>
                  "{activeJob.complaint_notes || 'Routine checkup requested'}"
                </p>
              </div>

              {/* AI VECTOR PRECEDENT RETRIEVAL */}
              <div className="semantic-search-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--cyan-primary)" />
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>
                      AI Semantic Precedent Finder (Vector RAG)
                    </span>
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => runSemanticSearch(activeJob.complaint_notes || '')}
                    disabled={searching}
                  >
                    <Search size={13} />
                    <span>{searching ? 'Querying Vectors...' : 'Find Similar Past Issues'}</span>
                  </button>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Queries historical diagnoses using cosine vector similarity over <code>complaint_notes</code> and <code>diagnosis_notes</code>.
                </p>

                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {searchResults.map((res, i) => (
                      <div key={i} style={{ background: 'rgba(6,9,17,0.7)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--cyan-primary)', fontSize: '0.85rem' }}>
                            Historical Job #{res.document.appointment_id}: {res.document.metadata.vehicle}
                          </span>
                          <span className="network-badge online" style={{ fontSize: '0.75rem' }}>
                            Similarity: {(res.similarity * 100).toFixed(1)}% (dist: {res.distance})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <strong>Complaint:</strong> "{res.document.metadata.complaint_notes}"
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#34D399', marginTop: '4px' }}>
                          <strong>Precedent Diagnosis:</strong> {res.document.metadata.diagnosis_notes}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diagnosis Notes */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Mechanic Diagnosis Notes</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Record vehicle inspection findings, faulty components identified, and repair recommendations..."
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                />
                <button
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={handleSaveDiagnosis}
                >
                  Save Diagnosis
                </button>
              </div>

              {/* Spare Parts Logged */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Spare Parts Installed / Consumed
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Stock auto-deducted via trigger <code>trg_deduct_stock_after_part_use</code>
                  </span>
                </div>

                {/* Table of parts used */}
                {activeJob.parts && activeJob.parts.length > 0 ? (
                  <table className="data-table" style={{ marginBottom: '14px' }}>
                    <thead>
                      <tr>
                        <th>Part Name</th>
                        <th>Qty</th>
                        <th>Price at Use</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeJob.parts.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.part.part_name}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{p.quantity_used}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>₹{p.price_at_use.toFixed(2)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            ₹{(p.quantity_used * p.price_at_use).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    No parts added to this work order yet.
                  </div>
                )}

                {/* Add Part Form */}
                {activeJob.status !== 'completed' && (
                  <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                      Add Replacement Part from Inventory
                    </span>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        className="form-select"
                        style={{ flex: 1, minWidth: '220px' }}
                        value={selectedPartId}
                        onChange={(e) => setSelectedPartId(Number(e.target.value))}
                      >
                        {spareParts.map((sp) => (
                          <option key={sp.part_id} value={sp.part_id}>
                            {sp.part_name} (₹{sp.unit_price} — {sp.stock_qty} in stock)
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="form-input"
                        style={{ width: '80px' }}
                        value={partQty}
                        onChange={(e) => setPartQty(Math.max(1, parseInt(e.target.value) || 1))}
                      />

                      <button
                        className="btn-primary btn-sm"
                        onClick={handleAddPart}
                        disabled={partActionLoading}
                      >
                        <PlusCircle size={14} />
                        <span>{partActionLoading ? 'Adding...' : 'Add Part'}</span>
                      </button>
                    </div>

                    {partError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--rose-primary)', fontSize: '0.8rem', marginTop: '8px' }}>
                        <AlertCircle size={14} />
                        <span>{partError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice snapshot if completed */}
              {activeJob.invoice && (
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--emerald-primary)' }}>
                      Generated Invoice #{activeJob.invoice.invoice_id}
                    </span>
                    <span className={`status-badge status-${activeJob.invoice.payment_status}`}>
                      {activeJob.invoice.payment_status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.85rem' }}>
                    <div>Labor: ₹{activeJob.invoice.labor_cost.toFixed(2)}</div>
                    <div>Parts: ₹{activeJob.invoice.parts_cost.toFixed(2)}</div>
                    <div>Tax (5%): ₹{activeJob.invoice.tax_amount.toFixed(2)}</div>
                    <div style={{ fontWeight: 700, color: '#FFFFFF' }}>Total: ₹{activeJob.invoice.total_amount.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveJob(null)}>
                Close Job Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
