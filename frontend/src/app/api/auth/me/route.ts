import { route } from '@/lib/api';

// Who am I? (also confirms the account is still active)
export const GET = route(
  async ({ session }) => ({ user: { id: session.uid, name: session.name, role: session.role } }),
  { roles: ['admin', 'staff', 'customer'] }
);
