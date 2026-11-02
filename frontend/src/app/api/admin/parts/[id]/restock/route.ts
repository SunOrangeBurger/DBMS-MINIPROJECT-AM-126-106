import { route } from '@/lib/api';
import { callProc, queryOne } from '@/lib/db';
import { idParam, int, readJson } from '@/lib/validate';

export const POST = route(
  async ({ request, params }) => {
    const id = idParam(params.id);
    const qty = int((await readJson(request)).quantity, { name: 'Quantity', min: 1, max: 100000 });
    await callProc('sp_restock_part', [id, qty]); // stock update + audit row in one transaction
    const part = await queryOne<{ stock_qty: number }>('SELECT stock_qty FROM spare_parts WHERE part_id = ?', [id]);
    return { ok: true, stock_qty: part?.stock_qty ?? 0 };
  },
  { roles: ['admin'] }
);
