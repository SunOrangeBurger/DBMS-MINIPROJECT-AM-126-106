import { route } from '@/lib/api';
import { callProc } from '@/lib/db';
import { idParam } from '@/lib/validate';

export const POST = route(
  async ({ params }) => {
    await callProc('sp_cancel_appointment', [idParam(params.id)]);
    return { ok: true };
  },
  { roles: ['admin'] }
);
