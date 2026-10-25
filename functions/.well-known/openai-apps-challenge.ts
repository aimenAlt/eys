import type { Env, PagesFunction } from '../_lib/types.ts';
import { methodNotAllowed, text } from '../_lib/http.ts';

/**
 * OpenAI app domain verification: serves OPENAI_APPS_CHALLENGE_TOKEN as plain
 * text. 404 until the var is set in Cloudflare.
 */
export const onRequest: PagesFunction<Env> = ({ request, env }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed(['GET', 'HEAD']);
  const token = env.OPENAI_APPS_CHALLENGE_TOKEN?.trim();
  return token ? text(token) : text('Not found', 404);
};
