import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { adminJobberDeps, bearerToken, checkAdminKey } from '../../../_lib/admin.ts';
import { isLiveHost } from '../../../_lib/env.ts';
import { json, methodNotAllowed, readJsonBody } from '../../../_lib/http.ts';
import { JobberError } from '../../../_lib/jobber.ts';
import { addRequestPhotos, parsePhotosBody, photosKey } from '../../../_lib/request-photos.ts';

const MAX_BODY = 32 * 1024;

/**
 * POST /api/admin/jobber/request-photos with `Authorization: Bearer <key>`,
 * where the key is AI_ADMIN_KEY or the routine's photos key derived from it.
 * Body: {requestId, note, media: [{url, sentAt, contentType?}], dryRun?}.
 * Adds the customer's photos texted to Quo to their Jobber request as one
 * note with the files attached. Only www.eyshandyman.com writes; any other
 * host answers as a dry run.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now(), async (key) => [await photosKey(key)]);
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  const body = await readJsonBody(request, MAX_BODY);
  if (!body.ok) return json({ error: 'invalid_body', errors: [body.error] }, body.status);
  const parsed = parsePhotosBody(body.value);
  if (!parsed.ok) return json({ error: 'invalid_body', errors: parsed.errors }, 400);

  try {
    const result = await addRequestPhotos(adminJobberDeps(env), parsed.input, { live: isLiveHost(request) });
    return json(result.body, result.status);
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    return json({ error: 'jobber_unavailable', error_class: errorClass }, 502);
  }
};
