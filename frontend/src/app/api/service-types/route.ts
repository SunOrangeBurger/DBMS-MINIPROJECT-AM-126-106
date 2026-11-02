import { route } from '@/lib/api';
import { query } from '@/lib/db';

// Service catalogue - any signed-in user (customers need it to book)
export const GET = route(
  async () => ({
    services: await query(
      `SELECT service_type_id, name, description, base_price, est_duration_min
         FROM service_types ORDER BY name`
    ),
  }),
  { roles: ['admin', 'staff', 'customer'] }
);
