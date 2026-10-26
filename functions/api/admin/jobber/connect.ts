import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { adminPage, checkAdminKey, escapeHtml } from '../../../_lib/admin.ts';
import { pkceChallenge, randomToken } from '../../../_lib/crypto.ts';
import { MINUTE, saveOAuthState } from '../../../_lib/db.ts';
import { jobberClientId, jobberClientSecret } from '../../../_lib/env.ts';
import { html, methodNotAllowed } from '../../../_lib/http.ts';
import { JOBBER_AUTHORIZE_URL, JOBBER_REDIRECT_URI } from '../../../_lib/jobber.ts';

const STATE_TTL = 10 * MINUTE;
const MAX_FORM_BYTES = 4096;

const FORM = adminPage(
  'Connect Jobber',
  `<p>Connects this site to Elevate Your Space Handyman's Jobber account so AI assistants can file requests.</p>
<form method="post" autocomplete="off">
<label for="key">Admin key</label>
<input id="key" name="key" type="password" required autocomplete="off">
<button type="submit">Check key</button>
</form>
<p class="muted">Next, Jobber will ask you to sign in and allow access. Never use "Test in GraphiQL" on this app: it starts a new connection and breaks this one.</p>`,
);

function page(title: string, message: string, status: number): Response {
  return html(adminPage(title, `<p>${message}</p><p><a href="/api/admin/jobber/connect">Back</a></p>`), status);
}

/**
 * GET: password form. POST: check AI_ADMIN_KEY (from the form body, never the
 * URL), store a one-time state + PKCE verifier for 10 minutes, and answer with
 * an ordinary link to Jobber. No redirect follows the form post: Chrome checks
 * form-action on every hop of such a redirect, and Jobber's sign-in may bounce
 * through hosts this page cannot list.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return html(FORM);
  if (request.method !== 'POST') return methodNotAllowed(['GET', 'POST']);

  if (Number(request.headers.get('Content-Length') ?? '0') > MAX_FORM_BYTES) {
    return page('Connect Jobber', 'That form submission was too large.', 413);
  }
  let presented = '';
  try {
    const form = await request.formData();
    const value = form.get('key');
    presented = typeof value === 'string' ? value.trim() : '';
  } catch {
    return page('Connect Jobber', 'That form submission could not be read.', 400);
  }

  const now = Date.now();
  const check = await checkAdminKey(env, request, presented, now);
  if (check === 'not_configured') {
    return page('Connect Jobber', 'This site is missing its D1 database or admin key, so it cannot connect yet.', 503);
  }
  if (check === 'locked') return page('Connect Jobber', 'Too many wrong keys from this network. Try again in an hour.', 429);
  if (check === 'bad_key') return page('Connect Jobber', 'That admin key is not right.', 403);
  const clientId = jobberClientId(env);
  if (!clientId || !jobberClientSecret(env) || !env.EYS_AI_DB) {
    return page('Connect Jobber', 'JOBBER_CLIENT_ID or JOBBER_CLIENT_SECRET is not set in Cloudflare yet.', 503);
  }

  const state = randomToken(32);
  const verifier = randomToken(48);
  await saveOAuthState(env.EYS_AI_DB, state, verifier, now + STATE_TTL);
  const authorize = new URL(JOBBER_AUTHORIZE_URL);
  authorize.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: JOBBER_REDIRECT_URI,
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
  }).toString();
  return html(
    adminPage(
      'Key accepted',
      `<p>Next, sign in to Jobber as the Elevate Your Space Handyman admin and press <strong>Allow Access</strong>. This link works once, for 10 minutes.</p>
<p><a href="${escapeHtml(authorize.toString())}" rel="noreferrer">Continue to Jobber</a></p>`,
    ),
  );
};
