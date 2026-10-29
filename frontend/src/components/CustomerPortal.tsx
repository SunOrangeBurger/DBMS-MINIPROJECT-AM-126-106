'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  Award,
  Calendar,
  CreditCard,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Wrench,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Customer, Vehicle, ServiceType, ServiceAppointment, ServiceHistoryView } from '@/lib/types';

interface CustomerPortalProps {
  onRefreshNeeded?: () => void;
}

export default function CustomerPortal({ onRefreshNeeded }: CustomerPortalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [history, setHistory] = useState<ServiceHistoryView[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(1);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<number>(1);
  const [scheduledDate, setScheduledDate] = useState('2026-11-05 10:00:00');
  const [complaintNotes, setComplaintNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Add Vehicle Modal State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [vehReg, setVehReg] = useState('');
  const [vehMake, setVehMake] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehYear, setVehYear] = useState(2022);
  const [vehFuel, setVehFuel] = useState<'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng'>('petrol');
  const [vehOdo, setVehOdo] = useState(25000);
  const [addVehLoading, setAddVehLoading] = useState(false);

  // Payment state
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehRes, srvRes, histRes, apptRes] = await Promise.all([
        fetch('/api/vehicles').then((r) => r.json()),
        fetch('/api/services').then((r) => r.json()),
        fetch('/api/views/history').then((r) => r.json()),
        fetch('/api/appointments').then((r) => r.json()),
      ]);

      const allVehs: Vehicle[] = Array.isArray(vehRes) ? vehRes : [];
      setVehicles(allVehs);
      setServiceTypes(Array.isArray(srvRes) ? srvRes : []);
      setHistory(Array.isArray(histRes) ? histRes : []);

      // Derive distinct customers
      const custList: Customer[] = [
        { customer_id: 1, user_id: 5, loyalty_points: 120, user: { user_id: 5, full_name: 'Arjun Mehta', email: 'arjun@example.com', role: 'customer' } as any },
        { customer_id: 2, user_id: 6, loyalty_points: 45, user: { user_id: 6, full_name: 'Kavya Iyer', email: 'kavya@example.com', role: 'customer' } as any },
        { customer_id: 3, user_id: 7, loyalty_points: 0, user: { user_id: 7, full_name: 'Rohit Bhandary', email: 'rohit@example.com', role: 'customer' } as any },
        { customer_id: 4, user_id: 8, loyalty_points: 300, user: { user_id: 8, full_name: 'Sneha Pai', email: 'sneha@example.com', role: 'customer' } as any },
      ];
      setCustomers(custList);

      if (allVehs.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(allVehs[0].vehicle_id);
      }
    } catch (e) {
      console.error('Error loading customer portal', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentCustomer = customers.find((c) => c.customer_id === selectedCustomerId) || customers[0];
  const myVehicles = vehicles.filter((v) => v.customer_id === selectedCustomerId);
  const myHistory = history.filter((h) => h.customer_id === selectedCustomerId);

  // Tier calculation
  const points = currentCustomer?.loyalty_points || 0;
  let tier = 'Bronze Member';
  let tierColor = 'var(--text-muted)';
  if (points >= 250) {
    tier = 'Gold Member';
    tierColor = '#FBBF24';
  } else if (points >= 100) {
    tier = 'Silver Member';
    tierColor = '#E2E8F0';
  }

  // Handle Book Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError(null);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: selectedVehicleId,
          service_type_id: selectedServiceTypeId,
          scheduled_date: scheduledDate,
          complaint_notes: complaintNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.error || 'Failed to book appointment');
      } else {
        setIsBookingOpen(false);
        setComplaintNotes('');
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle Add Vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddVehLoading(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          registration_no: vehReg,
          make: vehMake,
          model: vehModel,
          year: vehYear,
          fuel_type: vehFuel,
          odometer_km: vehOdo,
        }),
      });
      if (res.ok) {
        setIsAddVehicleOpen(false);
        setVehReg('');
        setVehMake('');
        setVehModel('');
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e) {
      console.error('Failed to add vehicle', e);
    } finally {
      setAddVehLoading(false);
    }
  };

  // Handle Invoice Payment (triggers trg_award_loyalty_on_payment)
  const handlePayInvoice = async (invoiceId: number) => {
    setPayingInvoiceId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, { method: 'POST' });
      if (res.ok) {
        await loadData();
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e) {
      console.error('Payment failed', e);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      {/* Header & Persona Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF' }}>Customer Self-Service Portal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage your garage, schedule service visits, view itemized invoices, and track loyalty perks
          </p>
        </div>

        {/* Persona Switcher for Customers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-subtle)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <User size={16} color="var(--amber-primary)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer Account:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 10px', fontSize: '0.85rem' }}
            value={selectedCustomerId}
            onChange={(e) => {
              const cid = Number(e.target.value);
              setSelectedCustomerId(cid);
              const v = vehicles.find((veh) => veh.customer_id === cid);
              if (v) setSelectedVehicleId(v.vehicle_id);
            }}
          >
            {customers.map((c) => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.user?.full_name} ({c.loyalty_points} pts)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loyalty Widget */}
      <div className="loyalty-widget">
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #FFB800 0%, #EA580C 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060911', boxShadow: '0 0 20px rgba(255, 184, 0, 0.4)' }}>
            <Award size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                AUTO CARE REWARDS PROGRAM
              </span>
              <span className="network-badge" style={{ borderColor: tierColor, color: tierColor }}>
                <Sparkles size={11} /> {tier}
              </span>
            </div>
            <div className="points-counter">{points} Loyalty Points</div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Earn 1 loyalty point for every ₹100 spent when your invoice is settled (enforced by trigger <code>trg_award_loyalty_on_payment</code>).
            </p>
          </div>
        </div>

        <button className="btn-primary" onClick={() => setIsBookingOpen(true)}>
          <Calendar size={16} />
          <span>Book Service Appointment</span>
        </button>
      </div>

      {/* My Vehicles Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={18} color="var(--cyan-primary)" /> My Garage ({myVehicles.length} Registered)
          </h2>
          <button className="btn-secondary btn-sm" onClick={() => setIsAddVehicleOpen(true)}>
            <PlusCircle size={14} />
            <span>Register New Vehicle</span>
          </button>
        </div>

        {myVehicles.length === 0 ? (
          <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No vehicles registered yet. Click "Register New Vehicle" to add your car or motorcycle.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {myVehicles.map((v) => (
              <div key={v.vehicle_id} className="glass-panel card-hoverable" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, background: 'rgba(0,240,255,0.1)', color: 'var(--cyan-primary)', padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,240,255,0.3)' }}>
                    {v.registration_no}
                  </span>
                  <span className="network-badge online" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {v.fuel_type}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {v.make} {v.model}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Year: {v.year} | Mileage: {v.odometer_km?.toLocaleString()} km
                </div>

                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button
                    className="btn-secondary btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setSelectedVehicleId(v.vehicle_id);
                      setIsBookingOpen(true);
                    }}
                  >
                    Schedule Service for this Vehicle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service History & Invoices */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Service History & Invoices</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Joined view <code>vw_service_history</code> with real-time payment settlement
            </p>
          </div>
          <span className="brand-badge">SQL VIEW #1</span>
        </div>

        {myHistory.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No service records found for your account. Book a new appointment above!
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Scheduled Date</th>
                  <th>Complaint Notes</th>
                  <th>Assigned Mechanics</th>
                  <th>Status</th>
                  <th>Invoice Amount</th>
                  <th>Payment Action</th>
                </tr>
              </thead>
              <tbody>
                {myHistory.map((h) => (
                  <tr key={h.appointment_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{h.appointment_id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{h.make} {h.model}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan-primary)' }}>
                        {h.registration_no}
                      </div>
                    </td>
                    <td>{h.service_name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{h.scheduled_date}</td>
                    <td style={{ maxWidth: '200px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      "{h.complaint_notes || 'Routine checkup'}"
                    </td>
                    <td>
                      {h.mechanics_assigned ? (
                        <span style={{ fontSize: '0.8rem' }}>{h.mechanics_assigned}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Queued</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${h.status}`}>
                        {h.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {h.total_amount ? `₹${h.total_amount.toLocaleString('en-IN')}` : 'Pending Completion'}
                    </td>
                    <td>
                      {h.payment_status === 'paid' ? (
                        <span className="status-badge status-paid">
                          <CheckCircle2 size={12} /> Paid
                        </span>
                      ) : h.payment_status === 'pending' && h.total_amount ? (
                        <button
                          className="btn-emerald btn-sm"
                          onClick={() => handlePayInvoice(h.appointment_id)}
                          disabled={payingInvoiceId === h.appointment_id}
                        >
                          <CreditCard size={13} />
                          <span>{payingInvoiceId === h.appointment_id ? 'Settling...' : 'Pay Invoice'}</span>
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Invoice Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOOK APPOINTMENT MODAL */}
      {isBookingOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Schedule Service Appointment</h3>
              <button
                onClick={() => setIsBookingOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookAppointment}>
              <div className="modal-body">
                {bookingError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose-primary)', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                    <AlertCircle size={16} />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Select Registered Vehicle</label>
                  <select
                    className="form-select"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                    required
                  >
                    {myVehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.make} {v.model} ({v.registration_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Select Service Package</label>
                  <select
                    className="form-select"
                    value={selectedServiceTypeId}
                    onChange={(e) => setSelectedServiceTypeId(Number(e.target.value))}
                    required
                  >
                    {serviceTypes.map((st) => (
                      <option key={st.service_type_id} value={st.service_type_id}>
                        {st.name} — ₹{st.base_price.toFixed(2)} (~{st.est_duration_min} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Preferred Date & Time</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    placeholder="YYYY-MM-DD HH:MM:SS"
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label">Describe Vehicle Symptoms / Complaint</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="E.g. Grinding sound near brakes when slowing down, AC not cooling properly, battery sluggish in mornings..."
                    value={complaintNotes}
                    onChange={(e) => setComplaintNotes(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    This description is vectorized and indexed for semantic diagnostic retrieval.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsBookingOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={bookingLoading}>
                  {bookingLoading ? 'Executing sp_book_appointment...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VEHICLE MODAL */}
      {isAddVehicleOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Register New Vehicle</h3>
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicle}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label">Make / Manufacturer</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Honda, Toyota, Tata"
                      value={vehMake}
                      onChange={(e) => setVehMake(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Model</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. City, Harrier, Swift"
                      value={vehModel}
                      onChange={(e) => setVehModel(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label">Registration Plate No</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. KA19XY9988"
                      value={vehReg}
                      onChange={(e) => setVehReg(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Manufacturing Year</label>
                    <input
                      type="number"
                      min="1950"
                      max="2030"
                      className="form-input"
                      value={vehYear}
                      onChange={(e) => setVehYear(parseInt(e.target.value) || 2022)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="form-label">Fuel Type</label>
                    <select
                      className="form-select"
                      value={vehFuel}
                      onChange={(e) => setVehFuel(e.target.value as any)}
                    >
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="cng">CNG</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Current Odometer (km)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={vehOdo}
                      onChange={(e) => setVehOdo(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddVehicleOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={addVehLoading}>
                  {addVehLoading ? 'Adding...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
