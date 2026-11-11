import type { Env, PagesFunction } from '../../_lib/types.ts';
import { clearedCookie } from '../../_lib/desk-auth.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';

/** POST /api/desk/logout: clears this phone's session cookie. */
export const onRequest: PagesFunction<Env> = async ({ request }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  return json({ signedIn: false }, 200, { 'Set-Cookie': clearedCookie() });
};
