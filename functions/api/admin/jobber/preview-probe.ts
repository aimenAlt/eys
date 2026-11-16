import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { sha256, timingSafeEqual } from '../../../_lib/crypto.ts';
import { adminJobberDeps, bearerToken } from '../../../_lib/admin.ts';
import { json, methodNotAllowed } from '../../../_lib/http.ts';
import { JOBBER_API_VERSION, JOBBER_GRAPHQL_URL, JobberError, getAccessToken } from '../../../_lib/jobber.ts';
import { adminKey } from '../../../_lib/env.ts';
import { ensureDeskSchema, findQLink } from '../../../_lib/desk-db.ts';

/**
 * TEMPORARY (2026-11-15), removed in the same push sequence: GET
 * /api/admin/jobber/preview-probe asks Jobber for Quote.previewUrl on the
 * Quote Desk's test quote only (#272, test client Malik Alt, code unzwTDvh),
 * so the /q/<code>/open design can be checked against the live connection
 * before it ships. Only a caller holding the one-off probe token (its SHA-256
 * below) gets an answer. Read only. Never any other quote or client.
 */
const PROBE_TOKEN_SHA256 = '5aebe8247c0da7837d317a75fda44db00c35d25b8961a72321ae6cd3111379ee';
const TEST_CODE = 'unzwTDvh';
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
  const db = env.EYS_AI_DB;
  if (!adminKey(env) || !db) return json({ error: 'not_configured' }, 503);
  await ensureDeskSchema(db);
  const link = await findQLink(db, TEST_CODE, Date.now());
  if (!link || link.client_id !== TEST_CLIENT_ID) return json({ error: 'test_link_missing' }, 404);
  try {
    const token = await getAccessToken(adminJobberDeps(env));
    const response = await fetch(JOBBER_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query:
          'query EysPreviewProbe($id: EncodedId!) { quote(id: $id) { id quoteNumber quoteStatus clientHubUri previewUrl client { id } } }',
        variables: { id: link.quote_id },
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      data?: { quote?: { client?: { id?: string } | null } & Record<string, unknown> | null } | null;
      errors?: { message?: string; extensions?: unknown }[];
    } | null;
    const quote = body?.data?.quote ?? null;
    if (quote && quote.client?.id !== TEST_CLIENT_ID) return json({ error: 'not_test_client' }, 403);
    return json({
      api_version: JOBBER_API_VERSION,
      http: response.status,
      quote,
      errors: (body?.errors ?? []).map((e) => ({ message: (e.message ?? '').slice(0, 300), extensions: e.extensions ?? null })),
    });
  } catch (error) {
    return json({ error: 'jobber_unavailable', error_class: error instanceof JobberError ? error.errorClass : 'internal' }, 502);
  }
};
