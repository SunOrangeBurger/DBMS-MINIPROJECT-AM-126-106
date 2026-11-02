import { route } from '@/lib/api';
import { query } from '@/lib/db';
import { oneOf, strOrNull } from '@/lib/validate';

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

// All appointments with filters: ?status= &q= (plate / customer / service) &from= &to= (YYYY-MM-DD)
export const GET = route(
  async ({ request }) => {
    const sp = new URL(request.url).searchParams;
    const statusRaw = sp.get('status');
    const status = statusRaw ? oneOf(statusRaw, STATUSES, 'Status') : null;
    const q = strOrNull(sp.get('q'), { name: 'Search', max: 100 });
    const from = strOrNull(sp.get('from'), { name: 'From', max: 10 });
    const to = strOrNull(sp.get('to'), { name: 'To', max: 10 });

    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      where.push('h.status = ?');
      params.push(status);
    }
    if (q) {
      const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push('(h.registration_no LIKE ? OR h.customer_name LIKE ? OR h.service_name LIKE ?)');
      params.push(like, like, like);
    }
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where.push('h.scheduled_date >= ?');
      params.push(from);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      where.push('h.scheduled_date < DATE_ADD(?, INTERVAL 1 DAY)');
      params.push(to);
    }

    return {
      appointments: await query(
        `SELECT h.appointment_id, h.registration_no, h.make, h.model, h.customer_name, h.service_name,
                h.scheduled_date, h.status, h.mechanics_assigned, h.total_amount, h.payment_status, sa.priority
           FROM vw_service_history h
           JOIN service_appointments sa ON sa.appointment_id = h.appointment_id
           ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY h.scheduled_date DESC
          LIMIT 200`,
        params
      ),
    };
  },
  { roles: ['admin'] }
);
