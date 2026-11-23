import type { Env, PagesFunction } from '../../_lib/types.ts';
import { bearerToken, checkAdminKey } from '../../_lib/admin.ts';
import { ensureSchema } from '../../_lib/db.ts';
import { ensureDeskSchema, logDeskEvent } from '../../_lib/desk-db.ts';
import { deskJobberDeps } from '../../_lib/desk-jobber.ts';
import { isLiveHost } from '../../_lib/env.ts';
import { json, methodNotAllowed, readJsonBody } from '../../_lib/http.ts';
import { JobberError } from '../../_lib/jobber.ts';
import { quoKey } from '../../_lib/quo.ts';
import { claudeDeps } from '../../_lib/claude.ts';
import { ensureInfoAskSchema, infoAskMode, previewInfoAsk, setInfoAskMode, sweepInfoAsks, type InfoAskDeps } from '../../_lib/info-ask.ts';
import { photosKey } from '../../_lib/request-photos.ts';

const MODES = new Set(['off', 'dry', 'live']);

/**
 * POST /api/admin/info-ask with `Authorization: Bearer <AI_ADMIN_KEY or the
 * routine key>`. The auto follow-up text (functions/_lib/info-ask.ts):
 * - `{}` or `{"dryRun": true}`: one sweep now (a dry run on any host but the live one);
 * - `{"mode": "off" | "dry" | "live"}`: sets the mode the 10-minute sweep uses;
 * - `{"preview": "<request id>"}`: what the text would say for that request and
 *   what Claude reads from that number's texts, with nothing sent or written.
 * Every answer includes the current mode.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now(), async (key) => [await photosKey(key)]);
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  const body = await readJsonBody(request, 4 * 1024);
  const value = (body.ok ? body.value : {}) as { dryRun?: unknown; mode?: unknown; preview?: unknown };
  const jobber = deskJobberDeps(env, waitUntil);
  if (!jobber) return json({ error: 'not_configured' }, 503);
  await ensureSchema(jobber.db);
  await ensureDeskSchema(jobber.db);
  await ensureInfoAskSchema(jobber.db);
  const now = Date.now();

  if (value.mode !== undefined) {
    if (typeof value.mode !== 'string' || !MODES.has(value.mode)) return json({ error: 'invalid_body', errors: ["mode: 'off', 'dry' or 'live'"] }, 400);
    if (!isLiveHost(request)) return json({ error: 'not_live_host', mode: await infoAskMode(jobber.db) }, 409);
    await setInfoAskMode(jobber.db, value.mode as 'off' | 'dry' | 'live', now);
    await logDeskEvent(jobber.db, { actor: 'admin', action: 'info_ask_mode', detail: value.mode, now });
    return json({ status: 'ok', mode: value.mode });
  }

  const key = quoKey(env);
  const deps: InfoAskDeps = {
    j: jobber,
    env,
    quo: key ? { key, fetch: (input, init) => fetch(input, init) } : null,
    claude: claudeDeps(env, (input, init) => fetch(input, init)),
    now,
  };
  try {
    if (value.preview !== undefined) {
      if (typeof value.preview !== 'string' || !/^[A-Za-z0-9+/=_-]{8,200}$/.test(value.preview)) return json({ error: 'invalid_body', errors: ["preview: a request's encoded Jobber id"] }, 400);
      return json({ status: 'ok', mode: await infoAskMode(jobber.db), preview: await previewInfoAsk(deps, value.preview) });
    }
    const dryRun = value.dryRun === true || !isLiveHost(request);
    return json({ status: 'ok', ...(await sweepInfoAsks(deps, { dryRun })) });
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    return json({ error: 'jobber_unavailable', error_class: errorClass }, 502);
  }
};
