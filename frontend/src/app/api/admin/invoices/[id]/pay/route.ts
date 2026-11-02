import { route } from '@/lib/api';
import { callProc } from '@/lib/db';
import { idParam } from '@/lib/validate';

// Record a counter payment (cash / card at the desk)
export const POST = route(
  async ({ params }) => {
    await callProc('sp_pay_invoice', [idParam(params.id)]);
    return { ok: true };
  },
  { roles: ['admin'] }
);
