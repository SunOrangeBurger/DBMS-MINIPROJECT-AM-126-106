'use client';

import React, { useState } from 'react';
import { LogIn, Key, Mail, ShieldCheck, UserCheck, AlertCircle, Wrench, User } from 'lucide-react';
import { User as UserType, UserRole } from '@/lib/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType, role: UserRole) => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [identifier, setIdentifier] = useState('Admin');
  const [password, setPassword] = useState('Admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        onSuccess(data.user, data.user.role);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (ident: string, pass: string) => {
    setIdentifier(ident);
    setPassword(pass);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ident, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        onSuccess(data.user, data.user.role);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #00F0FF, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060911' }}>
              <LogIn size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Sign In to AutoCare</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role-based access control</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose-primary)', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">Username or Email</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Admin or admin@autocare.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              <LogIn size={16} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>

            {/* Quick Demo Personas */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                1-Click Quick Demo Sign In:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
                  onClick={() => quickLogin('Admin', 'Admin123')}
                >
                  <ShieldCheck size={16} color="var(--cyan-primary)" />
                  <span style={{ fontWeight: 600 }}>Admin</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Username: "Admin" / Password: "Admin123"
                  </span>
                </button>

                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
                  onClick={() => quickLogin('anitha.staff@autocare.com', 'Admin123')}
                >
                  <Wrench size={16} color="var(--amber-primary)" />
                  <span style={{ fontWeight: 600 }}>Staff / Mechanic</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Anitha Rao (Engine Lead)
                  </span>
                </button>

                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
                  onClick={() => quickLogin('arjun@example.com', 'Admin123')}
                >
                  <User size={16} color="var(--emerald-primary)" />
                  <span style={{ fontWeight: 600 }}>Customer</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Arjun Mehta (Swift / City)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
