import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { adminJobberDeps, adminPage, escapeHtml } from '../../../_lib/admin.ts';
import { ensureSchema, takeOAuthState } from '../../../_lib/db.ts';
import { adminKey } from '../../../_lib/env.ts';
import { html, methodNotAllowed } from '../../../_lib/http.ts';
import { JobberError, exchangeCode, fetchAccount, saveConnection } from '../../../_lib/jobber.ts';

const EXPECTED_NAME = /elevate your space/i;

function page(title: string, body: string, status: number): Response {
  return html(adminPage(title, body), status);
}

const RESTART = '<p><a href="/api/admin/jobber/connect">Start again</a></p>';

/**
 * Jobber redirects here after "Allow access". Validates the one-time state,
 * exchanges the code (with the PKCE verifier), and stores the tokens only if
 * the connected account is Elevate Your Space Handyman (or exactly
 * JOBBER_EXPECTED_ACCOUNT). Never displays a token.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const url = new URL(request.url);
  const denied = url.searchParams.get('error');
  if (denied) {
    return page('Jobber not connected', `<p>Jobber returned: ${escapeHtml(denied.slice(0, 100))}.</p>${RESTART}`, 400);
  }
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const db = env.EYS_AI_DB;
  if (!db || !adminKey(env) || !env.JOBBER_CLIENT_ID || !env.JOBBER_CLIENT_SECRET) {
    return page('Jobber not connected', '<p>This site is not configured to connect yet.</p>', 503);
  }
  if (!code || !state) return page('Jobber not connected', `<p>The link is missing its code.</p>${RESTART}`, 400);

  await ensureSchema(db);
  const verifier = await takeOAuthState(db, state, Date.now());
  if (!verifier) {
    return page('Jobber not connected', `<p>This link expired or was already used.</p>${RESTART}`, 400);
  }

  const deps = adminJobberDeps(env);
  try {
    const tokens = await exchangeCode(deps, code, verifier);
    const account = await fetchAccount(deps, tokens.access);
    const expected = env.JOBBER_EXPECTED_ACCOUNT?.trim().toLowerCase();
    const matches = EXPECTED_NAME.test(account.name) || (expected ? account.name.trim().toLowerCase() === expected : false);
    if (!matches) {
      return page(
        'Wrong Jobber account',
        `<p>The account you allowed is <strong>${escapeHtml(account.name)}</strong>, not Elevate Your Space Handyman. Nothing was saved.</p>${RESTART}`,
        403,
      );
    }
    await saveConnection(deps, tokens, account);
    console.log(JSON.stringify({ evt: 'ai_intake_admin', status: 'connected' }));
    return page('Connected', `<p>Jobber is connected to <strong>${escapeHtml(account.name)}</strong>.</p>`, 200);
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    console.log(JSON.stringify({ evt: 'ai_intake_admin', status: 'connect_failed', error_class: errorClass }));
    return page('Jobber not connected', `<p>Jobber did not complete the connection (${escapeHtml(errorClass)}).</p>${RESTART}`, 502);
  }
};
