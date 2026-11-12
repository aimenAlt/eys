import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { bearerToken, checkAdminKey } from '../../../_lib/admin.ts';
import { deskJobberDeps } from '../../../_lib/desk-jobber.ts';
import { isLiveHost } from '../../../_lib/env.ts';
import { json, methodNotAllowed, readJsonBody } from '../../../_lib/http.ts';
import { JobberError } from '../../../_lib/jobber.ts';
import { addInternalNote, parseQuoteNoteBody } from '../../../_lib/quote-note.ts';
import { photosKey } from '../../../_lib/request-photos.ts';

const MAX_BODY = 64 * 1024;

/**
 * POST /api/admin/jobber/quote-note with `Authorization: Bearer <key>`, where
 * the key is AI_ADMIN_KEY or the quoting routine's key derived from it.
 * Body: {quoteId, message, dryRun?}. Saves Eyad's internal note on a draft
 * quote (Jobber's quoteCreateNote; staff-only, never shown to the client).
 * Drafts only, never twice, read back after. Only www.eyshandyman.com writes;
 * any other host answers as a dry run.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now(), async (key) => [await photosKey(key)]);
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  const body = await readJsonBody(request, MAX_BODY);
  if (!body.ok) return json({ error: 'invalid_body', errors: [body.error] }, body.status);
  const parsed = parseQuoteNoteBody(body.value);
  if (!parsed.ok) return json({ error: 'invalid_body', errors: parsed.errors }, 400);

  const jobber = deskJobberDeps(env, waitUntil);
  if (!jobber) return json({ error: 'not_configured' }, 503);
  try {
    const result = await addInternalNote(jobber, parsed.input, { live: isLiveHost(request) });
    return json(result.body, result.status);
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    if (errorClass === 'not_connected') return json({ error: 'jobber_not_connected', written: false }, 503);
    return json({ error: 'jobber_unavailable', error_class: errorClass, written: 'unknown' }, 502);
  }
};
