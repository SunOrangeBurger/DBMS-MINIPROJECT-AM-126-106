import { route } from '@/lib/api';
import { callProc } from '@/lib/db';
import { assertAssignedToJob } from '@/lib/guards';
import { idParam } from '@/lib/validate';

export const POST = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertAssignedToJob(session, id);
    await callProc('sp_start_appointment', [id]); // scheduled -> in_progress (a trigger logs the change)
    return { ok: true };
  },
  { roles: ['staff'] }
);
