'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/client';
import type { Role } from '@/lib/types';
import { Loading } from './ui';

const HOME: Record<Role, string> = { admin: '/admin', staff: '/staff', customer: '/customer' };
const TITLE: Record<Role, string> = { admin: 'Administrator', staff: 'Mechanic', customer: 'Customer' };

/**
 * Page frame for a signed-in area. Asks the server who the user is
 * (/api/auth/me) and sends them to the right place if they are not allowed here.
 * The real protection is in the API routes; this only gives a friendly redirect.
 */
export default function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    api<{ user: { name: string; role: Role } }>('/api/auth/me')
      .then(({ user }) => {
        if (user.role !== role) window.location.replace(HOME[user.role]);
        else setUser(user);
      })
      .catch(() => window.location.replace('/login'));
  }, [role]);

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  if (!user) return <Loading>Checking your session…</Loading>;

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            Auto<span>Care</span>
            <span className="role-chip">{TITLE[role]}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="userbox">
            <span>{user.name}</span>
            <button className="btn secondary small" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
