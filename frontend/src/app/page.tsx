'use client';
import { useEffect } from 'react';
import { api } from '@/lib/client';
import { Loading } from '@/components/ui';

const HOME = { admin: '/admin', staff: '/staff', customer: '/customer' } as const;

// Landing: send the visitor to their own area, or to the login page.
export default function Home() {
  useEffect(() => {
    api<{ user: { role: keyof typeof HOME } }>('/api/auth/me')
      .then(({ user }) => window.location.replace(HOME[user.role]))
      .catch(() => window.location.replace('/login'));
  }, []);
  return <Loading />;
}
