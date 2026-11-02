import { route } from '@/lib/api';
import { query } from '@/lib/db';
import type { Row } from '@/lib/db';
import { HttpError } from '@/lib/errors';
import { int, oneOf, str } from '@/lib/validate';
import { vectorSearch } from '@/lib/vector';

const COLUMNS = `h.appointment_id, h.registration_no, h.make, h.model, h.service_name, h.status,
                 h.scheduled_date, h.complaint_notes, h.diagnosis_notes`;

// Search past service notes.
//   mode=semantic -> Chroma vector search (meaning); results are joined back to MySQL
//   mode=fulltext -> MySQL FULLTEXT index (shared keywords)
//   mode=hybrid   -> both, merged with reciprocal rank fusion
// Semantic mode falls back to FULLTEXT (clearly labelled) if the vector service is not running.
export const GET = route(
  async ({ request }) => {
    const sp = new URL(request.url).searchParams;
    const q = str(sp.get('q'), { name: 'Search text', min: 2, max: 300 });
    const mode = oneOf(sp.get('mode') || 'semantic', ['semantic', 'fulltext', 'hybrid'] as const, 'Mode');
    const k = int(sp.get('k') || 5, { name: 'k', min: 1, max: 20 });

    if (mode === 'fulltext') return { mode, results: await fulltext(q, k) };

    try {
      const found = await vectorSearch(q, mode === 'hybrid' ? 20 : k);
      const ids = found.results.map((r) => r.appointment_id);
      const details: Row[] = ids.length
        ? await query(`SELECT ${COLUMNS} FROM vw_service_history h WHERE h.appointment_id IN (?)`, [ids])
        : [];
      const byId = new Map(details.map((d) => [d.appointment_id as number, d]));
      const semantic = found.results
        .filter((r) => byId.has(r.appointment_id))
        .map((r) => ({ ...byId.get(r.appointment_id), score: r.similarity, metric: 'cosine similarity' }));
      const notice = found.degraded
        ? 'The sentence-embedding model could not be loaded, so the vector service is using a keyword-style fallback. Check internet access and restart it.'
        : undefined;

      if (mode === 'hybrid') {
        // Reciprocal rank fusion: items ranked well by BOTH meaning and keywords float to the top.
        const kw = await fulltext(q, 20);
        const fused = new Map<number, { row: Row; score: number }>();
        const add = (rows: Row[]) =>
          rows.forEach((row, i) => {
            const id = row.appointment_id as number;
            const cur = fused.get(id) ?? { row, score: 0 };
            cur.score += 1 / (60 + i + 1);
            fused.set(id, cur);
          });
        add(semantic);
        add(kw);
        const results = [...fused.values()]
          .sort((a, b) => b.score - a.score)
          .slice(0, k)
          .map(({ row, score }) => ({ ...row, score: Number((score * 60).toFixed(3)), metric: 'hybrid rank score' }));
        return { mode: 'hybrid', model: found.model, notice, results };
      }
      return { mode: 'semantic', model: found.model, notice, results: semantic.slice(0, k) };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.error('[search] vector service unavailable, using FULLTEXT:', (err as Error).message);
      return {
        mode: 'fulltext',
        notice: 'The semantic search service is not running, so MySQL full-text search was used instead.',
        results: await fulltext(q, k),
      };
    }
  },
  { roles: ['admin', 'staff'] }
);

async function fulltext(q: string, k: number): Promise<Row[]> {
  const rows = await query(
    `SELECT ${COLUMNS},
            MATCH(sa.complaint_notes, sa.diagnosis_notes) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
       FROM service_appointments sa
       JOIN vw_service_history h ON h.appointment_id = sa.appointment_id
      WHERE MATCH(sa.complaint_notes, sa.diagnosis_notes) AGAINST (? IN NATURAL LANGUAGE MODE)
      ORDER BY score DESC
      LIMIT ?`,
    [q, q, k]
  );
  return rows.map((r) => ({ ...r, metric: 'MySQL relevance' }));
}
