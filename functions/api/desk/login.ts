import type { Env, PagesFunction } from '../../_lib/types.ts';
import { login, sessionCookie } from '../../_lib/desk-auth.ts';
import { ensureDeskSchema, logDeskEvent } from '../../_lib/desk-db.ts';
import { LIVE_ORIGIN } from '../../_lib/env.ts';
import { json, methodNotAllowed, readJsonBody } from '../../_lib/http.ts';

/** POST /api/desk/login {pin}: a signed 90-day session cookie, or how many tries are left. */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const origin = request.headers.get('Origin');
  if (!origin || (origin !== LIVE_ORIGIN && origin !== new URL(request.url).origin)) {
    return json({ error: 'bad_origin' }, 403);
  }
  const body = await readJsonBody(request, 256);
  if (!body.ok) return json({ error: 'bad_request' }, body.status);
  const pin = typeof (body.value as { pin?: unknown }).pin === 'string' ? ((body.value as { pin: string }).pin) : '';
  const now = Date.now();
  const result = await login(env, request, pin, now);
  if (result.status === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (result.status === 'locked') return json({ error: 'locked' }, 429);
  if (result.status === 'bad_pin') return json({ error: 'bad_pin', triesLeft: result.triesLeft }, 401);
  if (env.EYS_AI_DB) {
    await ensureDeskSchema(env.EYS_AI_DB);
    await logDeskEvent(env.EYS_AI_DB, { actor: result.person.name, action: 'login', now });
  }
  return json({ signedIn: true, name: result.person.name }, 200, { 'Set-Cookie': sessionCookie(result.token) });
};
