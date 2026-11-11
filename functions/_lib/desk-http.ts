import type { Env, PagesContext } from './types.ts';
import { LIVE_ORIGIN } from './env.ts';
import { json } from './http.ts';
import { deskConfigured, sessionName } from './desk-auth.ts';
import { ensureSchema } from './db.ts';
import { ensureDeskSchema } from './desk-db.ts';

/** "true" exactly turns texting on; QUOTE_SEND_ENABLED defaults to off. */
export function quoteSendEnabled(env: Env): boolean {
  return env.QUOTE_SEND_ENABLED?.trim() === 'true';
}

export type DeskAuth = { ok: true; name: string; now: number } | { ok: false; response: Response };

/**
 * Every desk API call: D1 ready, signed in, and for writes a same-origin JSON
 * request (the cookie is SameSite=Lax; this closes the rest of the CSRF door).
 */
export async function deskAuth(context: PagesContext<Env>, write = false): Promise<DeskAuth> {
  const { request, env } = context;
  if (!deskConfigured(env) || !env.EYS_AI_DB) {
    return { ok: false, response: json({ error: 'not_configured' }, 503) };
  }
  if (write) {
    const origin = request.headers.get('Origin');
    const allowed = new Set([LIVE_ORIGIN, new URL(request.url).origin]);
    if (!origin || !allowed.has(origin)) return { ok: false, response: json({ error: 'bad_origin' }, 403) };
  }
  const now = Date.now();
  const name = await sessionName(env, request, now);
  if (!name) return { ok: false, response: json({ error: 'signed_out' }, 401) };
  await ensureSchema(env.EYS_AI_DB);
  await ensureDeskSchema(env.EYS_AI_DB);
  return { ok: true, name, now };
}
