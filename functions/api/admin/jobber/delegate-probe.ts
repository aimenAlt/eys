import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { sha256, timingSafeEqual } from '../../../_lib/crypto.ts';
import { adminJobberDeps, bearerToken } from '../../../_lib/admin.ts';
import { json, methodNotAllowed } from '../../../_lib/http.ts';
import { JOBBER_API_VERSION, JOBBER_GRAPHQL_URL, JobberError, getAccessToken, jwtScopes } from '../../../_lib/jobber.ts';
import { adminKey } from '../../../_lib/env.ts';

/**
 * TEMPORARY (2026-11-15), removed in the next push: GET
 * /api/admin/jobber/delegate-probe asks Jobber for Client.clientHubDelegateLoginUrl
 * for the Quote Desk's test client only (Malik Alt, quote #272), so the
 * /q/<code>/open design can be checked against the live connection before it
 * ships. Only a caller holding the one-off probe token (its SHA-256 below)
 * gets an answer. Never any other client.
 */
const PROBE_TOKEN_SHA256 = '0f85e2accb84263c1c0167042ebc63e5e8cd418de580b5a48235339f0c956de4';
const TEST_CLIENT_ID = 'Z2lkOi8vSm9iYmVyL0NsaWVudC8xNDYxNjI5MjA=';

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const presented = bearerToken(request);
  if (!presented || !(await timingSafeEqual(hex(await sha256(presented)), PROBE_TOKEN_SHA256))) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!adminKey(env) || !env.EYS_AI_DB) return json({ error: 'not_configured' }, 503);
  const deps = adminJobberDeps(env);
  try {
    const token = await getAccessToken(deps);
    const ask = async (query: string, variables: Record<string, unknown> = {}) => {
      const response = await fetch(JOBBER_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      const body = (await response.json().catch(() => null)) as { data?: Record<string, unknown> | null; errors?: { message?: string; extensions?: unknown }[] } | null;
      return {
        http: response.status,
        data: body?.data ?? null,
        errors: (body?.errors ?? []).map((e) => ({ message: (e.message ?? '').slice(0, 300), extensions: e.extensions ?? null })),
      };
    };
    const delegate = await ask('query EysDelegateProbe($id: EncodedId!) { client(id: $id) { id clientHubDelegateLoginUrl } }', { id: TEST_CLIENT_ID });
    const fields = await ask('query EysDelegateProbeFields { __type(name: "Client") { fields { name } } }');
    const names = ((fields.data?.__type as { fields?: { name: string }[] } | null)?.fields ?? []).map((f) => f.name);
    const url = (delegate.data?.client as { clientHubDelegateLoginUrl?: string | null } | null)?.clientHubDelegateLoginUrl ?? null;
    return json({
      api_version: JOBBER_API_VERSION,
      token_scopes: jwtScopes(token),
      client_field_count: names.length,
      client_hub_fields_visible: names.filter((n) => /clientHub|login|delegate/i.test(n)),
      url,
      delegate_http: delegate.http,
      delegate_errors: delegate.errors,
      fields_errors: fields.errors,
    });
  } catch (error) {
    return json({ error: 'jobber_unavailable', error_class: error instanceof JobberError ? error.errorClass : 'internal' }, 502);
  }
};
