import { route } from '@/lib/api';
import { query } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { REPORTS } from '@/lib/reports';

// GET /api/admin/reports            -> the list of available reports
// GET /api/admin/reports?name=<id>  -> run ONE whitelisted, read-only report
export const GET = route(
  async ({ request }) => {
    const name = new URL(request.url).searchParams.get('name');
    if (!name) return { reports: REPORTS.map(({ name, title, concept }) => ({ name, title, concept })) };
    const report = REPORTS.find((r) => r.name === name);
    if (!report) throw new HttpError(404, 'Unknown report');
    const rows = await query(report.sql);
    return { name: report.name, title: report.title, concept: report.concept, sql: report.sql, rows };
  },
  { roles: ['admin'] }
);
