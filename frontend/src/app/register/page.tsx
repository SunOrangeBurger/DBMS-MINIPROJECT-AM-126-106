'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { api, useForm } from '@/lib/client';
import { Alert } from '@/components/ui';

export default function RegisterPage() {
  const form = useForm({ full_name: '', email: '', password: '', phone: '', address: '', city: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ home: string }>('/api/auth/register', { method: 'POST', body: form.values });
      window.location.href = res.home;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="brand">Auto<span>Care</span></div>
        <h1>Create a customer account</h1>
        <p className="muted" style={{ marginTop: 0 }}>Book services, track repairs and pay invoices online.</p>
        <Alert type="error">{error}</Alert>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="full">
              <label htmlFor="full_name">Full name</label>
              <input id="full_name" required minLength={2} maxLength={100} {...form.bind('full_name')} />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required {...form.bind('email')} />
            </div>
            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" required minLength={7} {...form.bind('phone')} />
            </div>
            <div className="full">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required minLength={8} autoComplete="new-password" {...form.bind('password')} />
              <div className="field-hint">At least 8 characters, with a letter and a number.</div>
            </div>
            <div>
              <label htmlFor="address">Address</label>
              <input id="address" {...form.bind('address')} />
            </div>
            <div>
              <label htmlFor="city">City</label>
              <input id="city" {...form.bind('city')} />
            </div>
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%', marginTop: 16 }}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
