import { route } from '@/lib/api';
import { execute, query } from '@/lib/db';
import { int, money, readJson, str } from '@/lib/validate';

export const GET = route(
  async () => ({
    parts: await query(
      `SELECT p.part_id, p.part_name, p.part_code, p.unit_price, p.stock_qty, p.reorder_level,
              (p.stock_qty <= p.reorder_level) AS is_low,
              (SELECT MAX(r.restocked_at) FROM part_restock_log r WHERE r.part_id = p.part_id) AS last_restocked
         FROM spare_parts p ORDER BY p.part_name`
    ),
  }),
  { roles: ['admin'] }
);

export const POST = route(
  async ({ request }) => {
    const b = await readJson(request);
    const r = await execute(
      'INSERT INTO spare_parts (part_name, part_code, unit_price, stock_qty, reorder_level) VALUES (?, ?, ?, ?, ?)',
      [
        str(b.part_name, { name: 'Part name', max: 100 }),
        str(b.part_code, { name: 'Part code', max: 50 }).toUpperCase(),
        money(b.unit_price, { name: 'Unit price' }),
        int(b.stock_qty ?? 0, { name: 'Opening stock', min: 0, max: 1000000 }),
        int(b.reorder_level ?? 5, { name: 'Reorder level', min: 0, max: 1000000 }),
      ]
    );
    return { part_id: r.insertId };
  },
  { roles: ['admin'] }
);
