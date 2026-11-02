import { route } from '@/lib/api';
import { callProc } from '@/lib/db';
import { assertAssignedToJob } from '@/lib/guards';
import { idParam } from '@/lib/validate';

// Remove a part from a job - trg_restore_stock_after_part_delete puts the stock back
export const DELETE = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    const partId = idParam(params.partId, 'partId');
    await assertAssignedToJob(session, id);
    await callProc('sp_remove_part_from_appointment', [id, partId]);
    return { ok: true };
  },
  { roles: ['staff'] }
);
