import type { Env, PagesFunction } from '../../_lib/types.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';
import { healthReport } from '../../_lib/health.ts';

/** GET /api/ai/health — configuration and connection state, booleans only. */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed(['GET', 'HEAD']);
  }
  return json(await healthReport(env, Date.now()));
};
