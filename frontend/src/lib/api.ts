import { NextResponse } from 'next/server';
import { queryOne } from './db';
import { HttpError, toHttpError } from './errors';
import { readSession } from './session';
import type { Role, Session } from './session';

export interface Ctx {
  request: Request;
  params: Record<string, string>;
  session: Session;
}

/**
 * Wrap a route handler:
 *  - enforces a signed-in user with one of `roles` (omit roles for public routes)
 *  - re-checks users.is_active, so a deactivated account loses access immediately
 *  - turns every thrown error into a JSON { error } response with the right status
 *
 * The handler returns plain data (-> JSON 200) or a Response.
 * (The second argument is typed loosely on purpose: Next passes { params: Promise<...> }.)
 */
export function route(handler: (ctx: Ctx) => Promise<unknown>, opts: { roles?: Role[] } = {}) {
  return async (request: Request, context: { params: Promise<any> }): Promise<Response> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      let session = null as unknown as Session;
      if (opts.roles) {
        const s = await readSession();
        if (!s) throw new HttpError(401, 'Please sign in');
        if (!opts.roles.includes(s.role)) throw new HttpError(403, 'You do not have access to this resource');
        const row = await queryOne<{ is_active: number }>('SELECT is_active FROM users WHERE user_id = ?', [s.uid]);
        if (!row || !row.is_active) throw new HttpError(401, 'This account is no longer active');
        session = s;
      }
      const params = ((await context?.params) ?? {}) as Record<string, string>;
      const result = await handler({ request, params, session });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      const e = toHttpError(err);
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
  };
}
