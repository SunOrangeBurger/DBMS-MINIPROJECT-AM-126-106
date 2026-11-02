import { route } from '@/lib/api';
import { callProc } from '@/lib/db';
import { assertAssignedToJob } from '@/lib/guards';
import { idParam, int, readJson } from '@/lib/validate';

// Add a spare part to a job. The database does the work:
//  - trg_check_stock_before_part_use rejects overselling
//  - trg_deduct_stock_after_part_use removes the stock
export const POST = route(
  async ({ request, params, session }) => {
    const id = idParam(params.id);
    await assertAssignedToJob(session, id);
    const body = await readJson(request);
    const partId = int(body.part_id, { name: 'Part', min: 1 });
    const quantity = int(body.quantity, { name: 'Quantity', min: 1, max: 1000 });
    await callProc('sp_add_part_to_appointment', [id, partId, quantity]);
    return { ok: true };
  },
  { roles: ['staff'] }
);
