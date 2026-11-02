import { route } from '@/lib/api';
import { callProc, queryOne } from '@/lib/db';
import { assertOwnsInvoice } from '@/lib/guards';
import { idParam } from '@/lib/validate';

export const POST = route(
  async ({ params, session }) => {
    const id = idParam(params.id);
    await assertOwnsInvoice(session, id);
    // sp_pay_invoice marks it paid; trg_award_loyalty_on_payment then adds the loyalty points
    await callProc('sp_pay_invoice', [id]);
    const me = await queryOne<{ loyalty_points: number }>('SELECT loyalty_points FROM customers WHERE customer_id = ?', [session.cid]);
    return { ok: true, loyalty_points: me?.loyalty_points ?? 0 };
  },
  { roles: ['customer'] }
);
