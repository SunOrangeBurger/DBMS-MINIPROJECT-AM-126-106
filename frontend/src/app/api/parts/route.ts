import { route } from '@/lib/api';
import { query } from '@/lib/db';

// Read-only stock list for staff and admin
export const GET = route(
  async () => ({
    parts: await query(
      `SELECT part_id, part_name, part_code, unit_price, stock_qty, reorder_level,
              (stock_qty <= reorder_level) AS is_low
         FROM spare_parts ORDER BY part_name`
    ),
  }),
  { roles: ['admin', 'staff'] }
);
