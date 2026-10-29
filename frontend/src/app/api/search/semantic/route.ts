import { NextResponse } from 'next/server';
import { getSemanticCorpus } from '@/lib/db';
import { SemanticSearchEngine } from '@/lib/vectorSearch';

export async function POST(req: Request) {
  try {
    const { query, topK } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const corpus = await getSemanticCorpus();
    const engine = new SemanticSearchEngine(corpus);
    const results = engine.query(query.trim(), topK || 3);

    return NextResponse.json({
      query: query.trim(),
      total_indexed: corpus.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
