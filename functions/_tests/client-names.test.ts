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
import { e164, EMPTY_CALL_AFTER, isEmptyCall, isPlaceholderName, MAX_TRANSCRIPT_READS, nameFromTranscript, phoneFromPlaceholder, realNameFrom, sweepPlaceholderNames } from '../_lib/client-names.ts';
import type { QuoDeps } from '../_lib/quo.ts';
import type { DeskJobber } from '../_lib/desk-jobber.ts';
import { jobberWebhookSignature } from '../_lib/jobber-webhook.ts';
import { photosKey } from '../_lib/request-photos.ts';
import { ADMIN_KEY, check } from './helpers.ts';
import { BASE, deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

const SECRET = 'client-secret';
const PLACEHOLDER = 'New Call [+18325550100]';

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
  assert.equal(isPlaceholderName('  New Text [+18325550100] '), true);
  assert.equal(isPlaceholderName('New Call [18325550100]'), true);
  assert.equal(isPlaceholderName('Iris Park'), false);
  assert.equal(isPlaceholderName('New Caller [+18325550100]'), false);
  assert.equal(isPlaceholderName('New Call [+183280]'), false);
  assert.deepEqual(realNameFrom('Nora Diaz'), { firstName: 'Nora', lastName: 'Diaz' });
  assert.deepEqual(realNameFrom('Paula  Reyes'), { firstName: 'Paula', lastName: 'Reyes' });
  assert.deepEqual(realNameFrom('devon hale'), { firstName: 'devon', lastName: 'hale' }, "the customer's casing is kept");
  assert.deepEqual(realNameFrom('Mary Ann Smith'), { firstName: 'Mary', lastName: 'Ann Smith' });
  assert.deepEqual(realNameFrom('  Cher '), { firstName: 'Cher', lastName: '' });
  for (const bad of ['', '   ', '(832) 800-7390', 'a@b.com', 'Jo 12345', PLACEHOLDER, 'x'.repeat(81), null, undefined]) {
    assert.equal(realNameFrom(bad as string), null, `refuses ${JSON.stringify(bad)}`);
  }
  assert.ok(realNameFrom('x'.repeat(80)), '80 characters is allowed');
});

await check('sweep: renames only placeholder clients, sends only firstName and lastName, never touches a real name', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Nora Diaz', '2026-11-19T15:00:00Z');
  addRequest(h, 'r2', 'c2', 'Iris Park', 'Someone Else', '2026-11-19T16:00:00Z');
  addRequest(h, 'r3', 'c3', 'New Text [+12815550142]', 'devon hale', '2026-11-19T17:00:00Z');
  addRequest(h, 'r4', 'c4', 'New Call [+17135550100]', '(713) 555-0100', '2026-11-19T18:00:00Z');
  const summary = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { dryRun: false }));
  assert.equal(summary.checked, 4);
  assert.deepEqual(summary.renamed.map((r) => [r.from, r.to]).sort(), [
    [PLACEHOLDER, 'Nora Diaz'],
    ['New Text [+12815550142]', 'devon hale'],
  ]);
  assert.equal(summary.skipped, 2);
  assert.deepEqual(summary.failed, []);
  const edits = clientEdits(h);
  assert.equal(edits.length, 2);
  assert.deepEqual(edits.map((c) => c.variables).sort((a, b) => String(a.clientId).localeCompare(String(b.clientId))), [
    { clientId: 'c1', input: { firstName: 'Nora', lastName: 'Diaz' } },
    { clientId: 'c3', input: { firstName: 'devon', lastName: 'hale' } },
  ]);
  assert.equal(h.jobber.clientNames.has('c2'), false, 'the real name stays');
  const events = eventsFor(h, 'client_renamed');
  assert.equal(events.length, 2);
  assert.ok(events.every((e) => e.actor === 'name-fix' && e.quote_id === null));
  assert.ok(events.some((e) => e.detail === `${PLACEHOLDER} -> Nora Diaz`));
});

await check('sweep: a client with two requests is renamed once from the newest usable one, and a second sweep renames nothing', async () => {
  const h = await deskHarness();
  addRequest(h, 'old', 'c1', PLACEHOLDER, 'Nora Diaz', '2026-11-18T15:00:00Z');
  addRequest(h, 'new', 'c1', PLACEHOLDER, 'Nora B Diaz', '2026-11-19T15:00:00Z');
  addRequest(h, 'newest-bad', 'c1', PLACEHOLDER, '(832) 800-7390', '2026-11-19T20:00:00Z');
  const first = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h)));
  assert.deepEqual(first.renamed.map((r) => r.to), ['Nora B Diaz']);
  assert.equal(clientEdits(h).length, 1);
  const second = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h)));
  assert.deepEqual(second.renamed, []);
  assert.equal(clientEdits(h).length, 1, 'idempotent');
});

await check('sweep: dryRun reports what it would rename and writes nothing; a Jobber rejection is reported as failed and logged', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Nora Diaz');
  const dry = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { dryRun: true }));
  assert.deepEqual(dry.renamed.map((r) => r.to), ['Nora Diaz']);
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
  addRequest(h, 'r-hook', 'c1', PLACEHOLDER, 'Nora Diaz');
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
  assert.deepEqual(clientEdits(h).map((c) => c.variables), [{ clientId: 'c1', input: { firstName: 'Nora', lastName: 'Diaz' } }]);
});

await check('webhook: REQUEST_UPDATE works too, a failure is logged not thrown, and a quote topic still behaves as before', async () => {
  const h = await deskHarness();
  addRequest(h, 'r-up', 'c1', PLACEHOLDER, 'Nora Diaz');
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
  assert.deepEqual(h.jobber.clientNames.get('c1')?.name, 'Nora Diaz');
  h.jobber.operations.length = 0;
  assert.equal((await run('QUOTE_UPDATE', 'no-such-quote')).status, 200);
  assert.equal(clientEdits(h).length, 2, 'a quote topic never renames');
  assert.ok(!h.jobber.operations.includes('EysClientNameRequest'));
});

await check('flush: the name sweep runs on the first ping and not on a second ping in the same 10-minute window', async () => {
  const h = await deskHarness();
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Nora Diaz');
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
  addRequest(h, 'r1', 'c1', PLACEHOLDER, 'Nora Diaz');
  assert.equal((await adminPost(h, {}, { key: '' })).status, 401);
  assert.equal((await adminPost(h, {}, { key: 'wrong' })).status, 401);
  assert.deepEqual(clientEdits(h), []);
  const dry = await adminPost(h, { dryRun: true }, { key: await photosKey(ADMIN_KEY) });
  assert.equal(dry.status, 200);
  assert.deepEqual((await dry.json()).renamed.map((r: { to: string }) => r.to), ['Nora Diaz']);
  assert.deepEqual(clientEdits(h), [], 'dryRun writes nothing');
  const preview = await adminPost(h, {}, { host: 'preview.eys-site.pages.dev' });
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).dryRun, true, 'a non-live host is always a dry run');
  assert.deepEqual(clientEdits(h), [], 'a non-live host writes nothing');
  const live = await adminPost(h, {}, { key: await photosKey(ADMIN_KEY) });
  assert.equal(live.status, 200);
  const body = await live.json();
  assert.deepEqual(body.renamed.map((r: { to: string }) => r.to), ['Nora Diaz']);
  assert.equal(body.dryRun, false);
  assert.equal(clientEdits(h).length, 1);
});

// ---------------------------------------------------------------------------
// Callers who never fill in the form: Quo contact names, names said on the
// call, and empty calls. Transcript lines below are made up, in the shape of
// live Quo transcripts (Nov 2026). No real customer data: this repo is public.
// ---------------------------------------------------------------------------

const EYS = '[+13468201629]';
const CALLER = '[+18325550100]';
const transcript = (...lines: string[]) => `Call Transcript\nhttps://my.quo.com/inbox/PNeiWaFK2n/c/CNtest?at=ACtest\n\nCall Time: Nov 20, 2026 at 6:35pm\n\n${lines.join('\n')}\n`;

await check('call names: the caller introducing themselves, or answering the name question, and nothing EYS or Sona says', () => {
  assert.deepEqual(nameFromTranscript(transcript(`${EYS}: How may I help you?`, `${CALLER}: Hello.`, `${CALLER}: This is Maya.`, `${CALLER}: I was just talking to you about the wall accent.`)), { firstName: 'Maya', lastName: '' });
  assert.deepEqual(nameFromTranscript(transcript(`${CALLER}: Hi.`, `${CALLER}: My name is Lena Ortiz.`, `${CALLER}: I'm trying to see if you guys were available today.`)), { firstName: 'Lena', lastName: 'Ortiz' });
  assert.deepEqual(nameFromTranscript(transcript(`${CALLER}: Hey.`, `${CALLER}: Good morning.`, `${CALLER}: This is Omar.`)), { firstName: 'Omar', lastName: '' });
  assert.deepEqual(nameFromTranscript(transcript(`${CALLER}: How are you doing? My name is Ravi. So do you hang curtains?`)), { firstName: 'Ravi', lastName: '' });
  assert.deepEqual(nameFromTranscript(transcript(`${EYS}: What's your first and last name?`, `${CALLER}: Nora Diaz.`)), { firstName: 'Nora', lastName: 'Diaz' });
  assert.deepEqual(nameFromTranscript(transcript(`${EYS}: What's your first and last name?`, `${CALLER}: Yes, it's Mary Ann Smith.`)), { firstName: 'Mary', lastName: 'Ann Smith' });
  for (const lines of [
    [`${EYS}: This is Sona.`, `${EYS}: How can I help?`, `${CALLER}: I need to repair a baseboard.`],
    [`${EYS}: This is Sam from the office.`, `${CALLER}: Okay.`],
    [`${EYS}: What's your first and last name?`, `${EYS}: Are you still there?`, `${CALLER}: Hello?`],
    [`${EYS}: What's your first and last name?`, `${CALLER}: Either.`],
    [`${EYS}: What's your first and last name?`, `${CALLER}: I mean, it's just a baseboard that's been chewed up.`],
    [`${CALLER}: This is Elevate Your Space?`],
    [`${CALLER}: Yeah, this is about the curtains.`],
    [`${CALLER}: T h e o, Grant.`],
    [`${CALLER}: This is Okay.`],
  ]) {
    assert.equal(nameFromTranscript(transcript(...lines)), null, `no name in ${JSON.stringify(lines)}`);
  }
  assert.equal(nameFromTranscript('Photos texted to Quo (+13468201629)\nThis is Maya.'), null, 'only a call transcript note counts');
  assert.equal(nameFromTranscript(null), null);
});

await check('call names: phone numbers in placeholders, and which calls count as empty', () => {
  assert.equal(phoneFromPlaceholder('New Call [+18325550112]'), '+18325550112');
  assert.equal(phoneFromPlaceholder('New Text [8325550120]'), '+18325550120');
  assert.equal(phoneFromPlaceholder('Maya'), null);
  assert.equal(e164('(832) 555-0100'), '+18325550100');
  assert.equal(e164('123'), null);
  assert.equal(isEmptyCall([{ message: transcript(`${EYS}: Hello?`), files: 0 }]), true, 'only EYS spoke');
  assert.equal(isEmptyCall([{ message: transcript(`${EYS}: Oh, ist nicht auf dem`), files: 0 }]), true);
  assert.equal(isEmptyCall([{ message: transcript(`${EYS}: Hello?`, `${CALLER}: Hi.`), files: 0 }]), false, 'the caller spoke');
  assert.equal(isEmptyCall([{ message: transcript(`${EYS}: Hello?`), files: 1 }]), false, 'a file is never empty');
  assert.equal(isEmptyCall([{ message: transcript(`${EYS}: Hello?`), files: 0 }, { message: 'Need pics name and address', files: 0 }]), false, 'a note from the team');
  assert.equal(isEmptyCall([]), false, 'no notes: unknown, left alone');
});

const NOW = Date.parse('2026-11-23T15:00:00Z');

function addQuoRequest(
  h: DeskHarness,
  id: string,
  clientId: string,
  clientName: string,
  notes: { message: string; files?: number }[],
  extra: Record<string, unknown> = {},
) {
  h.jobber.requests.set(id, {
    id,
    contactName: null,
    createdAt: '2026-11-23T12:00:00Z',
    updatedAt: '2026-11-23T12:00:01Z',
    title: 'Quo Request',
    source: 'Quo ',
    requestStatus: 'new',
    client: { id: clientId, name: clientName, firstName: '', lastName: '' },
    quotes: { nodes: [] },
    assessment: null,
    notes: {
      nodes: notes.map((n, i) => ({
        __typename: 'RequestNote',
        id: `${id}-n${i}`,
        message: n.message,
        createdAt: '2026-11-23T12:00:01Z',
        fileAttachments: { nodes: Array.from({ length: n.files ?? 0 }, (_, k) => ({ id: `${id}-f${k}`, url: `https://files.test/${id}/${k}.jpg` })) },
      })),
    },
    ...extra,
  });
}

/** A fake Quo answering GET /contacts/search?phoneNumber[in]=... from `saved`. */
function fakeQuo(saved: Record<string, { firstName: string | null; lastName: string | null }>) {
  const asked: string[][] = [];
  const quo: QuoDeps = {
    key: 'quo-test-key',
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      assert.equal(url.origin + url.pathname, 'https://api.quo.com/contacts/search');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'quo-test-key', 'bare key, no Bearer');
      assert.equal(headers.get('Quo-Api-Version'), '2026-03-30');
      const phones = (url.searchParams.get('phoneNumber[in]') ?? '').split(',');
      asked.push(phones);
      const data = phones
        .filter((p) => saved[p])
        .map((p) => ({ id: `ct-${p}`, ...saved[p], properties: [{ type: 'phone-number', value: p }] }));
      return Response.json({ data, nextCursor: null });
    }) as typeof fetch,
  };
  return { quo, asked };
}

function requestArchives(h: DeskHarness) {
  return h.jobber.mutationCalls.filter((c) => c.name === 'requestArchive').map((c) => c.variables.id);
}

await check('sweep: a caller with no form gets the name saved in Quo, else the name said on the call; nobody else is touched', async () => {
  const h = await deskHarness();
  addQuoRequest(h, 'q-theo', 'c-theo', 'New Call [+18325550111]', [{ message: transcript(`${CALLER}: Interested in a potential media wall.`) }]);
  addQuoRequest(h, 'q-maya', 'c-maya', 'New Call [+18325550112]', [{ message: transcript(`${CALLER}: This is Maya.`, `${CALLER}: About the wall accent.`) }]);
  addQuoRequest(h, 'q-anon', 'c-anon', 'New Call [+18325550113]', [{ message: transcript(`${CALLER}: I was calling to get a quote on hanging curtain tracks.`) }]);
  addQuoRequest(h, 'q-named', 'c-named', 'Sam Doyle', [{ message: transcript(`${CALLER}: This is Bob.`) }]);
  const { quo, asked } = fakeQuo({ '+18325550111': { firstName: 'Theo', lastName: 'Grant' }, '+18325550113': { firstName: null, lastName: null } });
  const summary = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { quo, now: NOW }));
  assert.equal(asked.length, 1, 'one Quo call');
  assert.deepEqual([...asked[0]].sort(), ['+18325550111', '+18325550112', '+18325550113'], 'every unnamed placeholder asked at once');
  assert.deepEqual(
    summary.renamed.map((r) => [r.clientId, r.to, r.source]).sort(),
    [
      ['c-maya', 'Maya', 'call'],
      ['c-theo', 'Theo Grant', 'quo'],
    ],
  );
  assert.deepEqual(summary.unnamed.map((u) => u.clientId), ['c-anon'], 'no name anywhere: still listed, not guessed');
  assert.deepEqual(summary.archived, []);
  assert.equal(h.jobber.clientNames.has('c-named'), false, 'a real name is never replaced');
  assert.deepEqual(h.jobber.clientNames.get('c-maya'), { firstName: 'Maya', lastName: '', name: 'Maya' });
  const details = eventsFor(h, 'client_renamed').map((e) => e.detail).sort();
  assert.deepEqual(details, ['New Call [+18325550111] -> Theo Grant (saved in Quo)', 'New Call [+18325550112] -> Maya (said on the call)']);
});

await check('sweep: a transcript read without a name is not read again until the request changes, and reads per sweep are capped', async () => {
  const h = await deskHarness();
  addQuoRequest(h, 'q-anon', 'c-anon', 'New Call [+18325550113]', [{ message: transcript(`${CALLER}: Quote on curtain tracks?`) }]);
  const reads = () => h.jobber.operations.filter((o) => o === 'EysDedupeRead').length;
  await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW }));
  assert.equal(reads(), 1);
  await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW }));
  assert.equal(reads(), 1, 'unchanged request: not read again');
  const r = h.jobber.requests.get('q-anon')!;
  r.updatedAt = '2026-11-23T14:00:00Z';
  (r.notes as { nodes: Record<string, unknown>[] }).nodes.push({ __typename: 'RequestNote', id: 'later', message: transcript(`${CALLER}: My name is Dana Cole.`), createdAt: '2026-11-23T14:00:00Z', fileAttachments: { nodes: [] } });
  const later = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW }));
  assert.equal(reads(), 2, 'changed: read again');
  assert.deepEqual(later.renamed.map((x) => x.to), ['Dana Cole']);

  const many = await deskHarness();
  for (let i = 0; i < MAX_TRANSCRIPT_READS + 3; i++) addQuoRequest(many, `q${i}`, `c${i}`, `New Call [+1832555${String(1000 + i)}]`, [{ message: transcript(`${CALLER}: Quote please.`) }]);
  await withFetch(many.jobber.fetch, () => sweepPlaceholderNames(jobberOf(many), { now: NOW }));
  assert.equal(many.jobber.operations.filter((o) => o === 'EysDedupeRead').length, MAX_TRANSCRIPT_READS);
  await withFetch(many.jobber.fetch, () => sweepPlaceholderNames(jobberOf(many), { now: NOW }));
  assert.equal(many.jobber.operations.filter((o) => o === 'EysDedupeRead').length, MAX_TRANSCRIPT_READS + 3, 'the rest on the next sweep');
});

await check('sweep: an empty call is archived once it is an hour old; a call with words, files, a team note, a quote or another status is not', async () => {
  const h = await deskHarness();
  const empty = [{ message: transcript(`${EYS}: Hello?`) }];
  addQuoRequest(h, 'q-empty', 'c1', 'New Call [+18325550114]', empty);
  addQuoRequest(h, 'q-young', 'c2', 'New Call [+18325550115]', empty, { createdAt: new Date(NOW - EMPTY_CALL_AFTER + 60_000).toISOString() });
  addQuoRequest(h, 'q-words', 'c3', 'New Call [+18325550113]', [{ message: transcript(`${EYS}: Hello?`, `${CALLER}: Hi, curtains.`) }]);
  addQuoRequest(h, 'q-file', 'c4', 'New Call [+18325550112]', [{ message: transcript(`${EYS}: Hello?`) }, { message: 'Photos texted to Quo', files: 1 }]);
  addQuoRequest(h, 'q-team', 'c5', 'New Call [+18325550116]', [{ message: transcript(`${EYS}: Hello?`) }, { message: 'Need pics name and address' }]);
  addQuoRequest(h, 'q-quoted', 'c6', 'New Call [+18325550117]', empty, { quotes: { nodes: [{ id: 'quote-1' }] } });
  addQuoRequest(h, 'q-old', 'c7', 'New Call [+18325550118]', empty, { requestStatus: 'today' });
  addQuoRequest(h, 'q-form', 'c8', 'New Call [+18325550119]', empty, { source: 'external', title: null });

  const dry = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW, dryRun: true }));
  assert.deepEqual(dry.archived.map((a) => a.requestId), ['q-empty']);
  assert.deepEqual(requestArchives(h), [], 'dryRun archives nothing');

  const live = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW }));
  assert.deepEqual(live.archived.map((a) => a.requestId), ['q-empty']);
  assert.deepEqual(requestArchives(h), ['q-empty']);
  assert.equal(h.jobber.requests.get('q-empty')!.requestStatus, 'archived');
  assert.ok(!live.unnamed.some((u) => u.clientId === 'c1'), 'an archived empty call is not listed as needing a name');
  const logged = eventsFor(h, 'request_archived_empty');
  assert.equal(logged.length, 1);
  assert.doesNotMatch(logged[0].detail, /\d{10}/, 'no phone number in the log');

  const later = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW + EMPTY_CALL_AFTER }));
  assert.deepEqual(later.archived.map((a) => a.requestId), ['q-young'], 'the young one is looked at again once it is an hour old');
});

await check('sweep: an archive Jobber refuses is logged and left open; Quo being down skips that step and nothing else', async () => {
  const h = await deskHarness();
  addQuoRequest(h, 'q-empty', 'c1', 'New Call [+18325550114]', [{ message: transcript(`${EYS}: Hello?`) }]);
  addQuoRequest(h, 'q-maya', 'c2', 'New Call [+18325550112]', [{ message: transcript(`${CALLER}: This is Maya.`) }]);
  h.jobber.rejectRequestArchive = 'Request cannot be archived';
  const down: QuoDeps = { key: 'k', fetch: (async () => new Response('busy', { status: 503 })) as typeof fetch };
  const summary = await withFetch(h.jobber.fetch, () => sweepPlaceholderNames(jobberOf(h), { now: NOW, quo: down }));
  assert.deepEqual(summary.archived, []);
  assert.equal(eventsFor(h, 'request_archive_failed').length, 1);
  assert.equal(h.jobber.requests.get('q-empty')!.requestStatus, 'new');
  assert.deepEqual(summary.renamed.map((r) => r.to), ['Maya'], 'the call name still works with Quo down');
});
