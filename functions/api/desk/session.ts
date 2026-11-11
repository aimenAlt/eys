import type { Env, PagesFunction } from '../../_lib/types.ts';
import { deskConfigured, sessionName } from '../../_lib/desk-auth.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';

/** GET /api/desk/session: who is signed in, if anyone. */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const configured = deskConfigured(env);
  const name = configured ? await sessionName(env, request, Date.now()) : null;
  return json({ configured, signedIn: Boolean(name), name });
};
