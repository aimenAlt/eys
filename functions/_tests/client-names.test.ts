/**
 * Placeholder clients ("New Call [+1...]", made by Quo's Jobber integration)
 * get the name the customer typed on the request form (Request.contactName):
 * the name rules, the sweep, the Jobber webhook, the 15-minute flush ping and
 * the routine's admin route. A real client name is never overwritten.
 */
import assert from 'node:assert/strict';
import type { Env, PagesContext } from '../_lib/types.ts';
import { onRequest as webhook } from '../api/jobber/webhook.ts';
import { onRequest as flush } from '../api/quo/flush.ts';
import { onRequest as fixNames } from '../api/admin/jobber/fix-client-names.ts';
import { isPlaceholderName, realNameFrom, sweepPlaceholderNames } from '../_lib/client-names.ts';
import type { DeskJobber } from '../_lib/desk-jobber.ts';
import { jobberWebhookSignature } from '../_lib/jobber-webhook.ts';
import { photosKey } from '../_lib/request-photos.ts';
import { ADMIN_KEY, check } from './helpers.ts';
import { BASE, deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

const SECRET = 'client-secret';
const PLACEHOLDER = 'New Call [+18328007390]';

function jobberOf(h: DeskHarness): DeskJobber {
  return { deps: h.deps(), db: h.db };
}

function addRequest(h: DeskHarness, id: string, clientId: string, clientName: string, contactName: string | null, createdAt = '2026-11-19T15:00:00Z') {
  h.jobber.requests.set(id, { id, contactName, createdAt, client: { id: clientId, name: clientName, firstName: '', lastName: '' } });
}

function clientEdits(h: DeskHarness) {
  return h.jobber.mutationCalls.filter((c) => c.name === 'clientEdit');
}

function eventsFor(h: DeskHarness, action: string) {
  return h.db.raw.prepare('SELECT actor, quote_id, detail FROM desk_events WHERE action = ?').all(action) as { actor: string; quote_id: string | null; detail: string }[];
}

await check('names: only Quo placeholders count, and only a real typed name is used', () => {
  assert.equal(isPlaceholderName(PLACEHOLDER), true);
  assert.equal(isPlaceholderName('  New Text [+18328007390] '), true);
  assert.equal(isPlaceholderName('New Call [18328007390]'), true);
  assert.equal(isPlaceholderName('Jada Idokogi'), false);
  assert.equal(isPlaceholderName('New Caller [+18328007390]'), false);
  assert.equal(isPlaceholderName('New Call [+183280]'), false);
  assert.deepEqual(realNameFrom('Dosa Adem'), { firstName: 'Dosa', lastName: 'Adem' });
  assert.deepEqual(realNameFrom('Marline  Karas'), { firstName: 'Marline', lastName: 'Karas' });
  assert.deepEqual(realNameFrom('kenneth onwodi'), { firstName: 'kenneth', lastName: 'onwodi' }, "the customer's casing is kept");
  assert.deepEqual(realNameFrom('Mary Ann Smith'), { firstName: 'Mary', lastName: 'Ann Smith' });
  assert.deepEqual(realNameFrom('  Cher '), { firstName: 'Cher', lastName: '' });
  for (const bad of ['', '   ', '(832) 800-7390', 'a@b.com', 'Jo 12345', PLACEHOLDER, 'x'.repeat(81), null, undefined]) {
    assert.equal(realNameFrom(bad as string), null, `refuses ${JSON.stringify(bad)}`);
  }
  assert.ok(realNameFrom('x'.repeat(80)), '80 characters is allowed');
});

await check('sweep: renames only placeholder clients, sends only firstName and lastName, never touches a real name', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Dosa Adem', '2026-11-19T15:00:00Z');
  addRequest(h, 'r2', 'c2', 'Jada Idokogi', 'Someone Else', '2026-11-19T16:00:00Z');
  addRequest(h, 'r3', 'c3', 'New Text [+12815550142]', 'kenneth onwodi', '2026-11-19T17:00:00Z');
  addRequest(h, 'r4', 'c4', 'New Call [+17135550100]', '(713) 555-0100', '2026-11-19T18:00:00Z');
  const summary = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { dryRun: false }));
  assert.equal(summary.checked, 4);
  assert.deepEqual(summary.renamed.map((r) => [r.from, r.to]).sort(), [
    [PLACEHOLDER, 'Dosa Adem'],
    ['New Text [+12815550142]', 'kenneth onwodi'],
  ]);
  assert.equal(summary.skipped, 2);
  assert.deepEqual(summary.failed, []);
  const edits = clientEdits(h);
  assert.equal(edits.length, 2);
  assert.deepEqual(edits.map((c) => c.variables).sort((a, b) => String(a.clientId).localeCompare(String(b.clientId))), [
    { clientId: 'c1', input: { firstName: 'Dosa', lastName: 'Adem' } },
    { clientId: 'c3', input: { firstName: 'kenneth', lastName: 'onwodi' } },
  ]);
  assert.equal(h.jobber.clientNames.has('c2'), false, 'the real name stays');
  const events = eventsFor(h, 'client_renamed');
  assert.equal(events.length, 2);
  assert.ok(events.every((e) => e.actor === 'name-fix' && e.quote_id === null));
  assert.ok(events.some((e) => e.detail === `${PLACEHOLDER} -> Dosa Adem`));
});

await check('sweep: a client with two requests is renamed once from the newest usable one, and a second sweep renames nothing', async () => {
  const h = await deskHarness();
  addRequest(h, 'old', 'c1', PLACEHOLDER, 'Dosa Adem', '2026-11-18T15:00:00Z');
  addRequest(h, 'new', 'c1', PLACEHOLDER, 'Dosa B Adem', '2026-11-19T15:00:00Z');
  addRequest(h, 'newest-bad', 'c1', PLACEHOLDER, '(832) 800-7390', '2026-11-19T20:00:00Z');
  const first = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h)));
  assert.deepEqual(first.renamed.map((r) => r.to), ['Dosa B Adem']);
  assert.equal(clientEdits(h).length, 1);
  const second = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h)));
  assert.deepEqual(second.renamed, []);
  assert.equal(clientEdits(h).length, 1, 'idempotent');
});

await check('sweep: dryRun reports what it would rename and writes nothing; a Jobber rejection is reported as failed and logged', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Dosa Adem');
  const dry = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { dryRun: true }));
  assert.deepEqual(dry.renamed.map((r) => r.to), ['Dosa Adem']);
  assert.deepEqual(clientEdits(h), []);
  assert.equal(eventsFor(h, 'client_renamed').length, 0);
  h.jobber.rejectClientEdit = 'Name is invalid';
  const failed = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h)));
  assert.deepEqual(failed.renamed, []);
  assert.equal(failed.failed.length, 1);
  assert.match(failed.failed[0].reason ?? '', /Name is invalid/);
  assert.equal(eventsFor(h, 'client_rename_failed').length, 1);
});

async function signed(topic: string, itemId: string, occurredAt = '2026-11-20T19:00:00Z') {
  const raw = JSON.stringify({ data: { webHookEvent: { topic, appId: 'app', accountId: 'acct', itemId, occurredAt } } });
  return new Request(`${BASE}/api/jobber/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Jobber-Hmac-SHA256': await jobberWebhookSignature(SECRET, raw) },
    body: raw,
  });
}

await check('webhook: a signed REQUEST_CREATE renames the client in the background; the reply never waits on Jobber', async () => {
  const h = await deskHarness();
  addRequest(h, 'r-hook', 'c1', PLACEHOLDER, 'Dosa Adem');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const slow = async (input: RequestInfo | URL, init?: RequestInit) => {
    await gate;
    return h.jobber.fetch(input, init);
  };
  const background: Promise<unknown>[] = [];
  await withFetch(slow, async () => {
    const response = await webhook({
      request: await signed('REQUEST_CREATE', 'r-hook'),
      env: h.env,
      params: {},
      data: {},
      waitUntil: (p) => background.push(p),
      next: async () => new Response(null, { status: 404 }),
    } as PagesContext<Env>);
    assert.equal(response.status, 200, 'answered while Jobber was still blocked');
    assert.deepEqual(clientEdits(h), [], 'nothing written yet');
    release();
    await Promise.all(background);
  });
  assert.deepEqual(clientEdits(h).map((c) => c.variables), [{ clientId: 'c1', input: { firstName: 'Dosa', lastName: 'Adem' } }]);
});

await check('webhook: REQUEST_UPDATE works too, a failure is logged not thrown, and a quote topic still behaves as before', async () => {
  const h = await deskHarness();
  addRequest(h, 'r-up', 'c1', PLACEHOLDER, 'Dosa Adem');
  let n = 0;
  const run = async (topic: string, itemId: string) => {
    const background: Promise<unknown>[] = [];
    const response = await withFetch(h.jobber.fetch, async () => {
      const r = await webhook({
        request: await signed(topic, itemId, `2026-11-20T19:00:0${n++}Z`),
        env: h.env,
        params: {},
        data: {},
        waitUntil: (p) => background.push(p),
        next: async () => new Response(null, { status: 404 }),
      } as PagesContext<Env>);
      await Promise.all(background);
      return r;
    });
    return response;
  };
  h.jobber.rejectClientEdit = 'nope';
  assert.equal((await run('REQUEST_UPDATE', 'r-up')).status, 200);
  assert.equal(eventsFor(h, 'client_rename_failed').length, 1);
  h.jobber.rejectClientEdit = null;
  assert.equal((await run('REQUEST_UPDATE', 'r-up')).status, 200);
  assert.deepEqual(h.jobber.clientNames.get('c1')?.name, 'Dosa Adem');
  h.jobber.operations.length = 0;
  assert.equal((await run('QUOTE_UPDATE', 'no-such-quote')).status, 200);
  assert.equal(clientEdits(h).length, 2, 'a quote topic never renames');
  assert.ok(!h.jobber.operations.includes('EysClientNameRequest'));
});

await check('flush: the name sweep runs on the first ping and not on a second ping in the same 10-minute window', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Dosa Adem');
  const realNow = Date.now;
  const base = Math.floor(Date.UTC(2026, 10, 20, 15, 0, 0) / 600_000) * 600_000;
  let t = base + 1000;
  Date.now = () => t;
  const ping = async () => {
    const background: Promise<unknown>[] = [];
    const response = await withFetch(h.jobber.fetch, async () => {
      const r = await flush({ request: new Request(`${BASE}/api/quo/flush`, { method: 'POST' }), env: h.env, params: {}, data: {}, waitUntil: (p) => background.push(p), next: async () => new Response(null) } as PagesContext<Env>);
      await Promise.all(background);
      return r;
    });
    return response;
  };
  try {
    const first = await ping();
    assert.equal(first.status, 200);
    assert.equal((await first.json()).processed, 0, 'the flush answer is unchanged');
    assert.equal(clientEdits(h).length, 1);
    h.jobber.clientNames.clear();
    t += 60_000;
    await ping();
    assert.equal(clientEdits(h).length, 1, 'same window: no second sweep');
    assert.equal(h.jobber.operations.filter((o) => o === 'EysClientNameSweep').length, 1);
    t = base + 600_000 + 1000;
    await ping();
    assert.equal(h.jobber.operations.filter((o) => o === 'EysClientNameSweep').length, 2, 'the next window sweeps again');
  } finally {
    Date.now = realNow;
  }
});

function adminPost(h: DeskHarness, body: unknown, options: { key?: string; host?: string } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.20' });
  if (options.key !== '') headers.set('Authorization', `Bearer ${options.key ?? ADMIN_KEY}`);
  const request = new Request(`https://${options.host ?? 'www.eyshandyman.com'}/api/admin/jobber/fix-client-names`, { method: 'POST', headers, body: JSON.stringify(body) });
  return withFetch(h.jobber.fetch, async () =>
    fixNames({ request, env: h.env, params: {}, data: {}, waitUntil: () => {}, next: async () => new Response(null, { status: 404 }) } as PagesContext<Env>),
  );
}

await check('admin route: 401 without the key, the routine key works, dryRun and a non-live host write nothing', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Dosa Adem');
  assert.equal((await adminPost(h, {}, { key: '' })).status, 401);
  assert.equal((await adminPost(h, {}, { key: 'wrong' })).status, 401);
  assert.deepEqual(clientEdits(h), []);
  const dry = await adminPost(h, { dryRun: true }, { key: await photosKey(ADMIN_KEY) });
  assert.equal(dry.status, 200);
  assert.deepEqual((await dry.json()).renamed.map((r: { to: string }) => r.to), ['Dosa Adem']);
  assert.deepEqual(clientEdits(h), [], 'dryRun writes nothing');
  const preview = await adminPost(h, {}, { host: 'preview.eys-site.pages.dev' });
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).dryRun, true, 'a non-live host is always a dry run');
  assert.deepEqual(clientEdits(h), [], 'a non-live host writes nothing');
  const live = await adminPost(h, {}, { key: await photosKey(ADMIN_KEY) });
  assert.equal(live.status, 200);
  const body = await live.json();
  assert.deepEqual(body.renamed.map((r: { to: string }) => r.to), ['Dosa Adem']);
  assert.equal(body.dryRun, false);
  assert.equal(clientEdits(h).length, 1);
});
