'use client';
import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Browser-side helpers: one fetch wrapper, a data-loading hook, a form hook.
// ---------------------------------------------------------------------------

/** fetch wrapper: JSON in/out. Throws Error(message) on any non-2xx answer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  let data: { error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status === 401 && !path.startsWith('/api/auth/') && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

/** GET a path; returns { data, error, loading, reload }. Pass null to skip loading. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useApi<T = any>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: path !== null,
  });

  const load = useCallback(async () => {
    if (path === null) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api<T>(path);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState({ data: null, error: (e as Error).message, loading: false });
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export interface Flash {
  type: 'ok' | 'error';
  text: string;
}

/** Banner message state: flash.ok('Saved'), flash.err('Nope'). */
export function useFlash() {
  const [flash, setFlash] = useState<Flash | null>(null);
  return {
    flash,
    ok: (text: string) => setFlash({ type: 'ok', text }),
    err: (text: string) => setFlash({ type: 'error', text }),
    clear: () => setFlash(null),
  };
}

export type FlashApi = ReturnType<typeof useFlash>;

/**
 * Run an async action, show success / error in the banner, then reload data.
 *   const run = makeRunner(flash, reload);
 *   await run(() => api(...), 'Saved');
 * Returns the action's result, or null if it failed.
 */
export function makeRunner(flash: FlashApi, reload?: () => Promise<void> | void) {
  return async function run<T>(fn: () => Promise<T>, success?: string | ((r: T) => string)): Promise<T | null> {
    flash.clear();
    try {
      const result = await fn();
      if (success) flash.ok(typeof success === 'function' ? success(result) : success);
      if (reload) await reload();
      return result;
    } catch (e) {
      flash.err((e as Error).message);
      return null;
    }
  };
}

/** Controlled-form helper. All values are strings; convert on submit. */
export function useForm(initial: Record<string, string>) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const bind = (name: string) => ({
    value: values[name] ?? '',
    onChange: (e: { target: { value: string } }) => set(name, e.target.value),
  });
  const reset = (next: Record<string, string> = initial) => setValues(next);
  return { values, set, bind, reset };
}
