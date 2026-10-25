import assert from 'node:assert/strict';
import type { Env, PagesContext, PagesFunction } from '../_lib/types.ts';
import { onRequest as health } from '../api/ai/health.ts';
import { onRequest as info } from '../api/ai/info.ts';
import { onRequest as openapi } from '../api/ai/openapi.json.ts';
import { onRequest as serviceRequests } from '../api/ai/service-requests.ts';
import { onRequest as connect } from '../api/admin/jobber/connect.ts';
import { onRequest as callback } from '../api/admin/jobber/callback.ts';
import { onRequest as probe } from '../api/admin/jobber/probe.ts';
import { ADMIN_KEY, check, harness, validBody } from './helpers.ts';

const BASE = 'https://www.eyshandyman.com';

function call(fn: PagesFunction<Env>, env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const request = new Request(`${BASE}${path}`, init);
  const context: PagesContext<Env> = {
    request,
    env,
    params: {},
    data: {},
    waitUntil: () => {},
    next: async () => new Response('next', { status: 404 }),
  };
  return Promise.resolve(fn(context));
}

function assertApiHeaders(response: Response) {
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'no CORS');
}

await check('health: booleans only, no secrets, degrades without D1', async () => {
  const h = harness();
  const response = await call(health, h.env, '/api/ai/health');
  assertApiHeaders(response);
  const body = await response.json();
  assert.deepEqual(body.configured, { d1: true, jobber_client: true, jobber_secret: true, admin_key: true });
  assert.equal(body.jobber.connected, false);
  assert.ok(!JSON.stringify(body).includes(ADMIN_KEY) && !JSON.stringify(body).includes('client-secret'));
  const bare = await (await call(health, {}, '/api/ai/health')).json();
  assert.deepEqual(bare.configured, { d1: false, jobber_client: false, jobber_secret: false, admin_key: false });
  assert.equal((await call(health, h.env, '/api/ai/health', { method: 'POST' })).status, 405);
});

await check('info and openapi: GET only, no-store, consistent operation ids', async () => {
  const h = harness();
  const infoResponse = await call(info, {}, '/api/ai/info');
  assertApiHeaders(infoResponse);
  assert.equal((await infoResponse.json()).phone, '(346) 820-1629');
  const doc = await (await call(openapi, h.env, '/api/ai/openapi.json')).json();
  assert.equal(doc.openapi, '3.1.0');
  assert.equal(doc.servers[0].url, BASE);
  assert.equal(doc.paths['/api/ai/info'].get.operationId, 'getBusinessInfo');
  const post = doc.paths['/api/ai/service-requests'].post;
  assert.equal(post.operationId, 'submitServiceRequest');
  assert.equal(post['x-openai-isConsequential'], true);
  assert.equal((await call(info, {}, '/api/ai/info', { method: 'DELETE' })).status, 405);
});

await check('service-requests: POST JSON only, 16 KB cap, validate-only answer', async () => {
  const h = harness();
  const post = (body: BodyInit, type = 'application/json') =>
    call(serviceRequests, h.env, '/api/ai/service-requests', { method: 'POST', headers: { 'Content-Type': type }, body });
  assert.equal((await call(serviceRequests, h.env, '/api/ai/service-requests')).status, 405);
  assert.equal((await post('{}', 'text/plain')).status, 415);
  assert.equal((await post('{not json')).status, 400);
  assert.equal((await post(JSON.stringify({ job_details: 'x'.repeat(17000) }))).status, 413);
  const response = await post(JSON.stringify(validBody({ confirmed_by_customer: false })));
  assertApiHeaders(response);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ready_to_submit');
});

await check('connect: form never puts the key in a URL; 5 wrong keys per hour lock out', async () => {
  const h = harness();
  const page = await call(connect, h.env, '/api/admin/jobber/connect');
  const html = await page.text();
  assert.ok(html.includes('method="post"') && html.includes('type="password"'));
  assert.ok(page.headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"));

  const submit = (key: string, ip = '203.0.113.9') =>
    call(connect, h.env, '/api/admin/jobber/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': ip },
      body: new URLSearchParams({ key }).toString(),
    });
  for (let i = 0; i < 5; i++) assert.equal((await submit('wrong-key')).status, 403);
  assert.equal((await submit(ADMIN_KEY)).status, 429, 'locked even with the right key');
  const ok = await submit(ADMIN_KEY, '198.51.100.20');
  assert.equal(ok.status, 302);
  const location = new URL(ok.headers.get('Location') ?? '');
  assert.equal(location.origin + location.pathname, 'https://api.getjobber.com/api/oauth/authorize');
  assert.equal(location.searchParams.get('redirect_uri'), 'https://www.eyshandyman.com/api/admin/jobber/callback');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(!location.toString().includes(ADMIN_KEY));
  const state = location.searchParams.get('state');
  assert.ok(state && state.length >= 40);
});

async function startConnect(h: ReturnType<typeof harness>): Promise<string> {
  const response = await call(connect, h.env, '/api/admin/jobber/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key: ADMIN_KEY }).toString(),
  });
  return new URL(response.headers.get('Location') ?? '').searchParams.get('state') ?? '';
}

await check('callback: one-time state, account check, nothing saved for the wrong account', async () => {
  const h = harness();
  const realFetch = globalThis.fetch;
  globalThis.fetch = h.fake.fetch as typeof fetch;
  try {
    h.fake.accountName = 'Some Other Plumbing Co';
    const wrong = await call(callback, h.env, `/api/admin/jobber/callback?code=good-code&state=${await startConnect(h)}`);
    assert.equal(wrong.status, 403);
    assert.ok((await wrong.text()).includes('Some Other Plumbing Co'));
    assert.equal((h.db.raw.prepare('SELECT COUNT(*) AS n FROM jobber_tokens').get() as { n: number }).n, 0);

    h.fake.accountName = 'Elevate Your Space Handyman';
    const state = await startConnect(h);
    const good = await call(callback, h.env, `/api/admin/jobber/callback?code=good-code&state=${state}`);
    assert.equal(good.status, 200);
    const page = await good.text();
    assert.ok(page.includes('Connected') && !page.includes('access-') && !page.includes('refresh-'));
    const healthBody = await (await call(health, h.env, '/api/ai/health')).json();
    assert.deepEqual(healthBody.jobber, { connected: true, account_name: 'Elevate Your Space Handyman', token_status: 'valid' });

    const replay = await call(callback, h.env, `/api/admin/jobber/callback?code=good-code&state=${state}`);
    assert.equal(replay.status, 400, 'state is one-time');

    h.env.JOBBER_EXPECTED_ACCOUNT = 'EYS Renamed LLC';
    h.fake.accountName = 'eys renamed llc';
    const renamed = await call(callback, h.env, `/api/admin/jobber/callback?code=good-code&state=${await startConnect(h)}`);
    assert.equal(renamed.status, 200, 'JOBBER_EXPECTED_ACCOUNT matches case-insensitively');

    const probeDenied = await call(probe, h.env, '/api/admin/jobber/probe', { headers: { Authorization: 'Bearer nope' } });
    assert.equal(probeDenied.status, 401);
    const probeOk = await call(probe, h.env, '/api/admin/jobber/probe', { headers: { Authorization: `Bearer ${ADMIN_KEY}` } });
    assert.equal(probeOk.status, 200);
    assert.equal((await probeOk.json()).introspection, 'enabled');
  } finally {
    globalThis.fetch = realFetch;
  }
});
