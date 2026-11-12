import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { bearerToken, checkAdminKey } from '../../../_lib/admin.ts';
import { deskJobberDeps } from '../../../_lib/desk-jobber.ts';
import { json, methodNotAllowed } from '../../../_lib/http.ts';
import { JobberError } from '../../../_lib/jobber.ts';
import { REQUEST_ID, readRoutineRequest } from '../../../_lib/request-read.ts';
import { photosKey } from '../../../_lib/request-photos.ts';

/**
 * GET /api/admin/jobber/request?id=<encoded request id> with
 * `Authorization: Bearer <key>`, where the key is AI_ADMIN_KEY or the quoting
 * routine's key derived from it (the same one the photos route takes).
 * Returns the request's form answers, notes and photos, which the Jobber
 * connector can't give, so the routine needs no browser signed in to Jobber.
 * Read only; nothing is written to Jobber.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now(), async (key) => [await photosKey(key)]);
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  const id = (new URL(request.url).searchParams.get('id') ?? '').trim();
  if (!REQUEST_ID.test(id)) {
    return json({ error: 'invalid_id', errors: ["id: the request's encoded Jobber id (search_requests or get_request → id)"] }, 400);
  }
  const jobber = deskJobberDeps(env, waitUntil);
  if (!jobber) return json({ error: 'not_configured' }, 503);

  try {
    const found = await readRoutineRequest(jobber, id);
    if (!found) return json({ error: 'request_not_found' }, 404);
    return json({ status: 'ok', request: found });
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    if (errorClass === 'not_connected') return json({ error: 'jobber_not_connected' }, 503);
    return json({ error: 'jobber_unavailable', error_class: errorClass }, 502);
  }
};
