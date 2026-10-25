import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { adminJobberDeps, bearerToken, checkAdminKey } from '../../../_lib/admin.ts';
import { json, methodNotAllowed } from '../../../_lib/http.ts';
import { JobberError, probeSchema } from '../../../_lib/jobber.ts';

/**
 * GET /api/admin/jobber/probe with `Authorization: Bearer <AI_ADMIN_KEY>`.
 * Reads Jobber's schema by introspection so the write shapes can be confirmed
 * after connecting — without "Test in GraphiQL", which starts a new OAuth flow
 * and invalidates this app's refresh token.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now());
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });
  try {
    return json(await probeSchema(adminJobberDeps(env)));
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    return json({ error: 'jobber_unavailable', error_class: errorClass }, 502);
  }
};
