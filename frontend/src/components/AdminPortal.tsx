'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  PlusCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  ServiceAppointment,
  SparePart,
  ServiceHistoryView,
  MechanicWorkloadView,
  LowStockPartView,
  RevenueByServiceView,
} from '@/lib/types';

interface AdminPortalProps {
  onRefreshNeeded?: () => void;
}

export default function AdminPortal({ onRefreshNeeded }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'workload' | 'inventory' | 'appointments'>('revenue');
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueByServiceView[]>([]);
  const [workloadData, setWorkloadData] = useState<MechanicWorkloadView[]>([]);
  const [lowStockParts, setLowStockParts] = useState<LowStockPartView[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockModalPart, setRestockModalPart] = useState<SparePart | null>(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restocking, setRestocking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptRes, partsRes, revRes, workRes, lowRes] = await Promise.all([
        fetch('/api/appointments').then((r) => r.json()),
        fetch('/api/parts').then((r) => r.json()),
        fetch('/api/views/revenue').then((r) => r.json()),
        fetch('/api/views/workload').then((r) => r.json()),
        fetch('/api/views/low-stock').then((r) => r.json()),
      ]);

      setAppointments(Array.isArray(apptRes) ? apptRes : []);
      setParts(Array.isArray(partsRes) ? partsRes : []);
      setRevenueData(Array.isArray(revRes) ? revRes : []);
      setWorkloadData(Array.isArray(workRes) ? workRes : []);
      setLowStockParts(Array.isArray(lowRes) ? lowRes : []);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRevenue = appointments
    .filter((a) => a.invoice && a.invoice.payment_status === 'paid')
    .reduce((sum, a) => sum + (a.invoice?.total_amount || 0), 0);

  const activeJobsCount = appointments.filter((a) => a.status === 'scheduled' || a.status === 'in_progress').length;
  const completedJobsCount = appointments.filter((a) => a.status === 'completed').length;

  const handleRestock = async () => {
    if (!restockModalPart) return;
    setRestocking(true);
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: restockModalPart.part_id, amount: restockQty }),
      });
      if (res.ok) {
        setRestockModalPart(null);
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err) {
      console.error('Restock failed', err);
    } finally {
      setRestocking(false);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.vehicle?.registration_no.toLowerCase().includes(term) ||
      a.vehicle?.make.toLowerCase().includes(term) ||
      a.service_type?.name.toLowerCase().includes(term) ||
      a.status.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Workshop Header & Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF' }}>Admin Workshop Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live performance analytics, mechanic workload distribution, and inventory controls
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={loadData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-cyan">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-label">Total Realized Revenue</div>
            <div className="stat-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-label">Active Work Orders</div>
            <div className="stat-value">{activeJobsCount}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-icon-wrapper stat-icon-emerald">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-label">Completed Jobs</div>
            <div className="stat-value">{completedJobsCount}</div>
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className={`stat-icon-wrapper ${lowStockParts.length > 0 ? 'stat-icon-rose' : 'stat-icon-emerald'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-label">Low Stock Alerts</div>
            <div className="stat-value" style={{ color: lowStockParts.length > 0 ? 'var(--rose-primary)' : 'var(--emerald-primary)' }}>
              {lowStockParts.length}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          className={`role-tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          <TrendingUp size={16} />
          <span>Revenue Analytics (vw_revenue_by_service)</span>
        </button>
        <button
          className={`role-tab-btn ${activeTab === 'workload' ? 'active' : ''}`}
          onClick={() => setActiveTab('workload')}
        >
          <Wrench size={16} />
          <span>Mechanic Workload (vw_mechanic_workload)</span>
        </button>
        <button
          className={`role-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={16} />
          <span>Spare Parts & Stock Alerts ({lowStockParts.length})</span>
        </button>
        <button
          className={`role-tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Layers size={16} />
          <span>Master Appointment Registry</span>
        </button>
      </div>

      {/* TAB 1: Revenue by Service */}
      {activeTab === 'revenue' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Service Revenue Breakdown</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Generated from database view <code>vw_revenue_by_service</code>
              </p>
            </div>
            <span className="brand-badge">SQL VIEW #4</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service Package</th>
                  <th>Times Performed</th>
                  <th>Average Bill</th>
                  <th>Total Realized Revenue</th>
                  <th>Revenue Contribution</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((rev, idx) => {
                  const pct = totalRevenue > 0 ? ((rev.total_revenue / totalRevenue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{rev.service_name}</td>
                      <td>
                        <span className="network-badge online" style={{ fontSize: '0.8rem' }}>
                          {rev.times_performed} jobs
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{rev.avg_bill_amount.toLocaleString('en-IN')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                        ₹{rev.total_revenue.toLocaleString('en-IN')}
                      </td>
                      <td style={{ width: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="similarity-meter" style={{ flex: 1, height: '8px' }}>
                            <div className="similarity-meter-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Mechanic Workload */}
      {activeTab === 'workload' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Workshop Staff & Capacity</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Generated from database view <code>vw_mechanic_workload</code>
              </p>
            </div>
            <span className="brand-badge">SQL VIEW #2</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {workloadData.map((m) => (
              <div key={m.mechanic_id} className="glass-panel card-hoverable" style={{ padding: '20px', background: 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{m.mechanic_name}</h3>
                    <span className="status-badge status-scheduled" style={{ marginTop: '4px' }}>
                      {m.specialization || 'General Technician'}
                    </span>
                  </div>
                  <div className="network-badge online">
                    <CheckCircle2 size={12} />
                    <span>Active</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', margin: '16px 0', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 6px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL JOBS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{m.total_jobs}</div>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.08)', padding: '10px 6px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--amber-primary)' }}>ACTIVE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--amber-primary)' }}>{m.active_jobs}</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px 6px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--emerald-primary)' }}>COMPLETED</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>{m.completed_jobs}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span>Capacity Status:</span>
                  <span style={{ color: m.active_jobs > 1 ? 'var(--amber-primary)' : 'var(--emerald-primary)', fontWeight: 600 }}>
                    {m.active_jobs > 1 ? 'High Load' : 'Available for Booking'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Spare Parts Inventory */}
      {activeTab === 'inventory' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Parts Inventory & Reorder Monitoring</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Monitored by view <code>vw_low_stock_parts</code> with automatic deduction triggers
              </p>
            </div>
            {lowStockParts.length > 0 && (
              <div className="status-badge status-cancelled" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                <AlertTriangle size={14} />
                <span>{lowStockParts.length} Parts Below Reorder Level</span>
              </div>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part SKU</th>
                  <th>Part Name</th>
                  <th>Unit Price</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => {
                  const isLow = p.stock_qty <= p.reorder_level;
                  return (
                    <tr key={p.part_id} style={{ background: isLow ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>{p.part_code}</td>
                      <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{p.part_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{p.unit_price.toFixed(2)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isLow ? 'var(--rose-primary)' : '#FFFFFF' }}>
                        {p.stock_qty} units
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{p.reorder_level} units</td>
                      <td>
                        {isLow ? (
                          <span className="status-badge status-cancelled">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="status-badge status-completed">
                            <CheckCircle2 size={12} /> In Stock
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setRestockModalPart(p)}
                        >
                          <PlusCircle size={14} />
                          <span>Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Master Appointments */}
      {activeTab === 'appointments' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Master Service Work Orders</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Complete relational view across vehicles, mechanics, parts, and billing
              </p>
            </div>
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Filter by vehicle, service, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Scheduled Date</th>
                  <th>Assigned Mechanics</th>
                  <th>Status</th>
                  <th>Invoice Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((a) => (
                  <tr key={a.appointment_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{a.appointment_id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{a.vehicle?.make} {a.vehicle?.model}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>
                        {a.vehicle?.registration_no}
                      </div>
                    </td>
                    <td>{a.service_type?.name}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{a.scheduled_date}</td>
                    <td>
                      {a.mechanics && a.mechanics.length > 0 ? (
                        <span>{a.mechanics.map((m) => m.mechanic.user?.full_name).join(', ')}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${a.status}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {a.invoice ? `₹${a.invoice.total_amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      {a.invoice ? (
                        <span className={`status-badge status-${a.invoice.payment_status}`}>
                          {a.invoice.payment_status}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unbilled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModalPart && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Restock Inventory</h3>
              <button
                onClick={() => setRestockModalPart(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SELECTED SPARE PART</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>{restockModalPart.part_name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)', fontSize: '0.85rem' }}>
                  SKU: {restockModalPart.part_code} | Current Stock: {restockModalPart.stock_qty}
                </div>
              </div>

              <label className="form-label">Units to Add to Stock</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[5, 10, 20, 50].map((qty) => (
                  <button
                    key={qty}
                    className={`btn-secondary btn-sm ${restockQty === qty ? 'active' : ''}`}
                    onClick={() => setRestockQty(qty)}
                    style={{ borderColor: restockQty === qty ? 'var(--cyan-primary)' : 'var(--border-subtle)' }}
                  >
                    +{qty} units
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1"
                className="form-input"
                value={restockQty}
                onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRestockModalPart(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleRestock} disabled={restocking}>
                {restocking ? 'Updating...' : `Confirm +${restockQty} Units`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
