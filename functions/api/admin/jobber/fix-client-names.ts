import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { bearerToken, checkAdminKey } from '../../../_lib/admin.ts';
import { deskJobberDeps } from '../../../_lib/desk-jobber.ts';
import { isLiveHost } from '../../../_lib/env.ts';
import { json, methodNotAllowed } from '../../../_lib/http.ts';
import { JobberError } from '../../../_lib/jobber.ts';
import { sweepPlaceholderNames } from '../../../_lib/client-names.ts';
import { photosKey } from '../../../_lib/request-photos.ts';

/**
 * POST /api/admin/jobber/fix-client-names with `Authorization: Bearer <key>`
 * (AI_ADMIN_KEY or the routine's key derived from it) and body
 * `{ "dryRun": true }` (optional). Sweeps Jobber's newest 50 requests and
 * renames Quo placeholder clients ("New Call [+1...]") from the name typed on
 * the request form. Writes only on the live host; any other host is a dry run.
 * Returns { checked, renamed, skipped, failed, dryRun }.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now(), async (key) => [await photosKey(key)]);
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  let dryRun = false;
  try {
    const body = (await request.json()) as { dryRun?: unknown } | null;
    if (body && body.dryRun !== undefined) {
      if (typeof body.dryRun !== 'boolean') return json({ error: 'invalid_body', errors: ['dryRun: true or false'] }, 400);
      dryRun = body.dryRun;
    }
  } catch {
    // No body: a live run.
  }
  const jobber = deskJobberDeps(env, waitUntil);
  if (!jobber) return json({ error: 'not_configured' }, 503);

  try {
    const summary = await sweepPlaceholderNames(jobber, { dryRun: dryRun || !isLiveHost(request) });
    return json({ status: 'ok', ...summary });
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    if (errorClass === 'not_connected') return json({ error: 'jobber_not_connected' }, 503);
    return json({ error: 'jobber_unavailable', error_class: errorClass }, 502);
  }
};
