'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { api, useForm } from '@/lib/client';
import { Alert } from '@/components/ui';

const DEMO = [
  ['Administrator', 'admin@autocare.com'],
  ['Mechanic', 'anitha.staff@autocare.com'],
  ['Customer', 'arjun@example.com'],
];

interface Status {
  db: { ok: boolean; message?: string };
  vector: { up: boolean; embedding_model?: string; documents?: number };
}

export default function LoginPage() {
  const form = useForm({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    api<Status>('/api/status').then(setStatus).catch(() => setStatus(null));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ home: string }>('/api/auth/login', { method: 'POST', body: form.values });
      window.location.href = res.home; // full page load so the new cookie is used everywhere
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">Auto<span>Care</span></div>
        <h1>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>Vehicle service &amp; maintenance management</p>

        <Alert type="error">{error}</Alert>
        <form onSubmit={submit} className="stack">
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" required {...form.bind('email')} />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required {...form.bind('password')} />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          New customer? <Link href="/register">Create an account</Link>
        </p>

        <div className="demo-box">
          <strong>Demo accounts</strong> (password <code>Admin123</code>, set by <code>npm run seed</code>)
          <table>
            <tbody>
              {DEMO.map(([role, mail]) => (
                <tr key={mail}>
                  <td>{role}</td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => { form.set('email', mail); form.set('password', 'Admin123'); }}>
                      {mail}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="status-line">
          <span><span className={`dot ${status ? (status.db.ok ? 'on' : 'off') : ''}`} />MySQL: {status ? (status.db.ok ? 'connected' : status.db.message) : 'checking…'}</span>
          <span><span className={`dot ${status ? (status.vector.up ? 'on' : 'off') : ''}`} />Semantic search: {status ? (status.vector.up ? `running (${status.vector.embedding_model}, ${status.vector.documents} notes)` : 'not running (optional, falls back to keyword search)') : 'checking…'}</span>
        </div>
      </div>
    </div>
  );
}
