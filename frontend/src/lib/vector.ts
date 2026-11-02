// Client for the Python / Chroma semantic-search service (server-side only).
// The service lives in /vector (FastAPI) and embeds complaint + diagnosis notes.

const base = () => (process.env.VECTOR_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/$/, '');

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  if (process.env.VECTOR_SERVICE_TOKEN) h['X-Internal-Token'] = process.env.VECTOR_SERVICE_TOKEN;
  return h;
}

export interface VectorHit {
  appointment_id: number;
  similarity: number;
  distance: number;
}

export async function vectorSearch(q: string, k = 5): Promise<{ model: string; degraded?: boolean; results: VectorHit[] }> {
  const url = `${base()}/search?${new URLSearchParams({ q, k: String(k) })}`;
  const res = await fetch(url, { headers: headers(), cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Vector service answered ${res.status}`);
  return res.json();
}

/** Best effort: keep the vector index in step with MySQL. Never throws. */
export function vectorIndexAppointment(appointmentId: number): void {
  fetch(`${base()}/index/${Number(appointmentId)}`, {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  }).catch(() => {});
}

export async function vectorReindex(): Promise<{ indexed: number }> {
  const res = await fetch(`${base()}/reindex`, {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Vector service answered ${res.status}`);
  return res.json();
}

export interface VectorHealth {
  up: boolean;
  embedding_model?: string;
  documents?: number;
  metric?: string;
  degraded?: boolean;
  last_error?: string | null;
}

export async function vectorHealth(): Promise<VectorHealth> {
  try {
    const res = await fetch(`${base()}/health`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { up: false };
    return { up: true, ...(await res.json()) };
  } catch {
    return { up: false };
  }
}
