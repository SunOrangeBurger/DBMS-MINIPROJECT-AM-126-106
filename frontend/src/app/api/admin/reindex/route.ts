import { route } from '@/lib/api';
import { HttpError } from '@/lib/errors';
import { vectorReindex } from '@/lib/vector';

// Rebuild the Chroma collection from the MySQL notes
export const POST = route(
  async () => {
    try {
      return await vectorReindex();
    } catch {
      throw new HttpError(503, 'The semantic search service is not reachable');
    }
  },
  { roles: ['admin'] }
);
