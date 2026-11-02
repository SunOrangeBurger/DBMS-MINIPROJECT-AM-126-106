import { route } from '@/lib/api';
import { callProc, queryOne } from '@/lib/db';
import { assertAssignedToJob } from '@/lib/guards';
import { idParam } from '@/lib/validate';
import { vectorIndexAppointment } from '@/lib/vector';

// Complete the job and create the invoice (labour + parts + 5% tax) in one database transaction
export const POST = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertAssignedToJob(session, id);
    await callProc('sp_finish_job', [id]);
    const invoice = await queryOne(
      `SELECT invoice_id, labor_cost, parts_cost, tax_amount, total_amount, payment_status
         FROM invoices WHERE appointment_id = ?`,
      [id]
    );
    vectorIndexAppointment(id);
    return { ok: true, invoice };
  },
  { roles: ['staff'] }
);
