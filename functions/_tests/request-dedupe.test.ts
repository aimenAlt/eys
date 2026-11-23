/**
 * Quo's Jobber integration opens a "Quo Request" for every call; when the
 * customer then fills in the request form, Jobber files a second request under
 * the same client. The dedupe copies the call's notes and files onto the form
 * request, then archives the Quo one: the pairing rules, the idempotent merge,
 * the sweep, the Jobber webhook, the 10-minute flush ping and the admin route.
 */
import assert from 'node:assert/strict';
import type { Env, PagesContext } from '../_lib/types.ts';
import { onRequest as webhook } from '../api/jobber/webhook.ts';
import { onRequest as flush } from '../api/quo/flush.ts';
import { onRequest as dedupeRoute } from '../api/admin/jobber/dedupe-requests.ts';
import { findDuplicates, requestNumber, sweepDuplicates, type DedupeRequest } from '../_lib/request-dedupe.ts';
import type { DeskJobber } from '../_lib/desk-jobber.ts';
import { jobberWebhookSignature } from '../_lib/jobber-webhook.ts';
import { photosKey } from '../_lib/request-photos.ts';
import { ADMIN_KEY, check } from './helpers.ts';
import { BASE, deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

const SECRET = 'client-secret';
const NOW = Date.UTC(2026, 10, 20, 18, 0, 0);
const QUO_PHOTO = 'https://share.quo.com/media/abc123';

function jobberOf(h: DeskHarness): DeskJobber {
  return { deps: h.deps(), db: h.db };
}

function req(id: string, o: Partial<DedupeRequest> & { quo?: boolean } = {}): DedupeRequest {
  return {
    id,
    title: o.quo ? 'Quo Request' : 'Request for Nora',
    source: o.quo ? 'Quo ' : 'external',
    requestStatus: 'new',
    createdAt: '2026-11-20T16:55:00Z',
    client: { id: 'c1', name: 'Nora Diaz' },
    quotes: { nodes: [] },
    assessment: null,
    ...o,
  };
}

const noteOf = (id: string, message: string, urls: string[] = [], createdAt = '2026-11-20T16:56:00Z') => ({
  __typename: 'RequestNote',
  id,
  message,
  createdAt,
  fileAttachments: { nodes: urls.map((url, i) => ({ id: `${id}-f${i}`, url, fileName: `p${i}.jpg`, contentType: 'image/jpeg' })) },
});

function addPair(h: DeskHarness, o: { quoFiles?: string[]; formCreatedAt?: string; clientId?: string } = {}) {
  const clientId = o.clientId ?? 'c1';
  h.jobber.requests.set('quo-1', {
    ...req('quo-1', { quo: true, client: { id: clientId, name: 'Nora Diaz' } }),
    notes: { nodes: [noteOf('qn1', 'Caller wants a TV mounted.', o.quoFiles ?? []), noteOf('qn2', 'Back door sticks too.', [], '2026-11-20T16:57:00Z')] },
  });
  h.jobber.requests.set('form-1', {
    ...req('form-1', { createdAt: o.formCreatedAt ?? '2026-11-20T17:30:00Z', client: { id: clientId, name: 'Nora Diaz' } }),
    notes: { nodes: [] },
  });
}

const notesCalls = (h: DeskHarness) => h.jobber.mutationCalls.filter((c) => c.name === 'requestCreateNote');
const archiveCalls = (h: DeskHarness) => h.jobber.mutationCalls.filter((c) => c.name === 'requestArchive');
const eventsFor = (h: DeskHarness, action: string) =>
  h.db.raw.prepare('SELECT actor, quote_id, detail FROM desk_events WHERE action = ?').all(action) as { actor: string; quote_id: string | null; detail: string }[];
const statusOf = (h: DeskHarness, id: string) => h.jobber.requests.get(id)?.requestStatus;

await check('findDuplicates: a Quo request and a form request for the same client pair up, keeping the form', () => {
  const pairs = findDuplicates([req('f', { createdAt: '2026-11-20T17:30:00Z' }), req('q', { quo: true })], NOW);
  assert.deepEqual(pairs.map((p) => [p.archive.id, p.keep.id]), [['q', 'f']]);
  const byTitle = findDuplicates([req('f'), req('q', { source: 'something', title: 'Quo Request' })], NOW);
  assert.equal(byTitle.length, 1, 'the title alone also marks a Quo request');
});

await check('findDuplicates: never picks a Quo request with no form request, a quote, an assessment, or a status other than new', () => {
  assert.deepEqual(findDuplicates([req('q', { quo: true })], NOW), []);
  assert.deepEqual(findDuplicates([req('q', { quo: true }), req('q2', { quo: true, createdAt: '2026-11-20T17:00:00Z' })], NOW), [], 'two Quo requests are not a pair');
  const form = req('f');
  assert.deepEqual(findDuplicates([form, req('q', { quo: true, quotes: { nodes: [{ id: 'quote-1' }] } })], NOW), []);
  assert.deepEqual(findDuplicates([form, req('q', { quo: true, assessment: { id: 'a1' } })], NOW), []);
  assert.deepEqual(findDuplicates([form, req('q', { quo: true, requestStatus: 'converted' })], NOW), []);
  assert.deepEqual(findDuplicates([req('f', { requestStatus: 'archived' }), req('q', { quo: true })], NOW), [], 'an archived form request does not count');
});

await check('findDuplicates: the form request must be within 7 days; the closest wins; either order', () => {
  assert.deepEqual(findDuplicates([req('f', { createdAt: '2026-11-30T17:00:00Z' }), req('q', { quo: true, createdAt: '2026-11-20T16:00:00Z' })], NOW), [], '10 days apart');
  const pairs = findDuplicates(
    [req('far', { createdAt: '2026-11-23T16:55:00Z' }), req('near', { createdAt: '2026-11-20T18:00:00Z' }), req('q', { quo: true })],
    NOW,
  );
  assert.deepEqual(pairs.map((p) => p.keep.id), ['near']);
  const after = findDuplicates([req('f', { createdAt: '2026-11-20T10:00:00Z' }), req('q', { quo: true, createdAt: '2026-11-20T16:55:00Z' })], NOW);
  assert.equal(after.length, 1, 'a Quo request created after the form is still a pair');
});

await check('findDuplicates: clients never mix', () => {
  const pairs = findDuplicates(
    [req('f1', { client: { id: 'c1', name: 'A' } }), req('q2', { quo: true, client: { id: 'c2', name: 'B' } }), req('q1', { quo: true, client: { id: 'c1', name: 'A' } })],
    NOW,
  );
  assert.deepEqual(pairs.map((p) => [p.archive.id, p.keep.id]), [['q1', 'f1']]);
});

await check('merge: one note on the form request with the header, the call notes, the marker and the files; the Quo request is archived after the read-back', async () => {
  const h = await deskHarness();
  addPair(h, { quoFiles: [QUO_PHOTO, 'https://share.quo.com/media/def456'] });
  const summary = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  assert.equal(summary.checked, 2);
  assert.deepEqual(summary.merged.map((m) => [m.archiveId, m.keepId]), [['quo-1', 'form-1']]);
  assert.deepEqual([summary.pending, summary.failed], [[], []]);
  assert.equal(summary.dryRun, false);
  const notes = notesCalls(h);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].variables.id, 'form-1');
  const input = notes[0].variables.input as { message: string; attachments: { url: string }[] };
  assert.deepEqual(input.attachments, [{ url: QUO_PHOTO }, { url: 'https://share.quo.com/media/def456' }]);
  const lines = input.message.split('\n');
  assert.match(lines[0], /^From the call \(Quo request #quo-1, Nov 20, 10:55 AM\):$/);
  assert.ok(input.message.indexOf('Caller wants a TV mounted.') < input.message.indexOf('Back door sticks too.'));
  assert.equal(lines.at(-1), 'Merged from Quo request quo-1');
  assert.equal(statusOf(h, 'quo-1'), 'archived');
  assert.equal(statusOf(h, 'form-1'), 'new', 'the form request and any real client are never archived');
  assert.deepEqual(archiveCalls(h).map((c) => c.variables), [{ id: 'quo-1' }]);
  const order = h.jobber.mutationCalls.map((c) => c.name);
  assert.deepEqual(order, ['requestCreateNote', 'requestArchive']);
  const events = eventsFor(h, 'request_merged');
  assert.equal(events.length, 1);
  assert.ok(events[0].actor === 'dedupe' && events[0].quote_id === null);
  assert.equal(events[0].detail, 'Quo #quo-1 -> form #form-1 (client Nora Diaz)');
});

await check('merge: a second sweep writes nothing', async () => {
  const h = await deskHarness();
  addPair(h);
  await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  const before = h.jobber.mutationCalls.length;
  const again = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  assert.deepEqual([again.merged, again.pending, again.failed], [[], [], []]);
  assert.equal(h.jobber.mutationCalls.length, before);
});

await check('merge: a note already holding the marker is not copied again, but the open Quo request is still archived', async () => {
  const h = await deskHarness();
  addPair(h);
  (h.jobber.requests.get('form-1')!.notes as { nodes: unknown[] }).nodes.push(noteOf('old', 'From the call (Quo request #quo-1, Nov 20, 10:55 AM):\n\nCaller wants a TV mounted.\n\nMerged from Quo request quo-1'));
  const summary = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  assert.deepEqual(notesCalls(h), [], 'no second copy');
  assert.equal(archiveCalls(h).length, 1);
  assert.equal(summary.merged.length, 1);
});

await check('merge: files that have not landed leave both requests open and pending; the next sweep archives once they land, without a second copy', async () => {
  const h = await deskHarness();
  addPair(h, { quoFiles: [QUO_PHOTO] });
  h.jobber.filesLand = false;
  const first = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  assert.deepEqual(first.merged, []);
  assert.deepEqual(first.pending.map((p) => [p.archiveId, p.keepId]), [['quo-1', 'form-1']]);
  assert.deepEqual(archiveCalls(h), []);
  assert.equal(statusOf(h, 'quo-1'), 'new');
  assert.equal(notesCalls(h).length, 1);
  h.jobber.landFiles();
  const second = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  assert.equal(second.merged.length, 1);
  assert.equal(notesCalls(h).length, 1, 'the marker prevented a second copy');
  assert.equal(statusOf(h, 'quo-1'), 'archived');
});

await check('merge: a Jobber rejection is reported as failed and logged, and the Quo request stays open', async () => {
  const h = await deskHarness();
  addPair(h);
  h.jobber.rejectRequestArchive = 'Cannot archive';
  const failed = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { now: NOW }));
  assert.equal(failed.failed.length, 1);
  assert.match(failed.failed[0].reason ?? '', /Cannot archive/);
  assert.equal(statusOf(h, 'quo-1'), 'new');
  assert.equal(eventsFor(h, 'request_merge_failed').length, 1);
  const h2 = await deskHarness();
  addPair(h2);
  h2.jobber.rejectRequestNote = 'Note rejected';
  const noNote = await withFetch(h2.jobber.fetch, () => sweepDuplicates(jobberOf(h2), { now: NOW }));
  assert.equal(noNote.failed.length, 1);
  assert.deepEqual(archiveCalls(h2), [], 'no archive without the copy');
});

await check('sweep: dryRun returns the pairs and writes nothing', async () => {
  const h = await deskHarness();
  addPair(h, { quoFiles: [QUO_PHOTO] });
  const dry = await withFetch(h.jobber.fetch, () => sweepDuplicates(jobberOf(h), { dryRun: true, now: NOW }));
  assert.equal(dry.dryRun, true);
  assert.deepEqual(dry.merged.map((m) => [m.archiveId, m.keepId]), [['quo-1', 'form-1']]);
  assert.deepEqual(h.jobber.mutationCalls, []);
  assert.equal(eventsFor(h, 'request_merged').length, 0);
});

async function signed(topic: string, itemId: string, occurredAt = '2026-11-20T19:00:00Z') {
  const raw = JSON.stringify({ data: { webHookEvent: { topic, appId: 'app', accountId: 'acct', itemId, occurredAt } } });
  return new Request(`${BASE}/api/jobber/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Jobber-Hmac-SHA256': await jobberWebhookSignature(SECRET, raw) },
    body: raw,
  });
}

await check('webhook: REQUEST_CREATE merges in the background after the name fix; the reply never waits on Jobber', async () => {
  const h = await deskHarness();
  addPair(h);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const slow = async (input: RequestInfo | URL, init?: RequestInit) => {
    await gate;
    return h.jobber.fetch(input, init);
  };
  const background: Promise<unknown>[] = [];
  await withFetch(slow, async () => {
    const response = await webhook({
      request: await signed('REQUEST_CREATE', 'form-1'),
      env: h.env,
      params: {},
      data: {},
      waitUntil: (p) => background.push(p),
      next: async () => new Response(null, { status: 404 }),
    } as PagesContext<Env>);
    assert.equal(response.status, 200, 'answered while Jobber was still blocked');
    assert.deepEqual(h.jobber.mutationCalls, [], 'nothing written yet');
    release();
    await Promise.all(background);
  });
  assert.equal(statusOf(h, 'quo-1'), 'archived');
  const ops = h.jobber.operations;
  assert.ok(ops.indexOf('EysClientNameRequest') < ops.indexOf('EysDedupeSweep'), 'names first, then dedupe');
});

await check('webhook: REQUEST_UPDATE does not run the dedupe', async () => {
  const h = await deskHarness();
  addPair(h);
  const background: Promise<unknown>[] = [];
  await withFetch(h.jobber.fetch, async () => {
    await webhook({
      request: await signed('REQUEST_UPDATE', 'form-1'),
      env: h.env,
      params: {},
      data: {},
      waitUntil: (p) => background.push(p),
      next: async () => new Response(null, { status: 404 }),
    } as PagesContext<Env>);
    await Promise.all(background);
  });
  assert.ok(!h.jobber.operations.includes('EysDedupeSweep'));
});

await check('flush: names first, then dedupe, once per 10-minute window; the reply is unchanged', async () => {
  const h = await deskHarness();
  addPair(h);
  const realNow = Date.now;
  const base = Math.floor(Date.UTC(2026, 10, 20, 15, 0, 0) / 600_000) * 600_000;
  let t = base + 1000;
  Date.now = () => t;
  const ping = async () => {
    const background: Promise<unknown>[] = [];
    return withFetch(h.jobber.fetch, async () => {
      const r = await flush({ request: new Request(`${BASE}/api/quo/flush`, { method: 'POST' }), env: h.env, params: {}, data: {}, waitUntil: (p) => background.push(p), next: async () => new Response(null) } as PagesContext<Env>);
      await Promise.all(background);
      return r;
    });
  };
  try {
    const first = await ping();
    assert.equal(first.status, 200);
    assert.equal((await first.json()).processed, 0);
    const ops = h.jobber.operations;
    assert.ok(ops.indexOf('EysClientNameSweep') >= 0 && ops.indexOf('EysClientNameSweep') < ops.indexOf('EysDedupeSweep'));
    assert.equal(statusOf(h, 'quo-1'), 'archived');
    t += 60_000;
    await ping();
    assert.equal(h.jobber.operations.filter((o) => o === 'EysDedupeSweep').length, 1, 'same window: no second sweep');
    t = base + 600_000 + 1000;
    await ping();
    assert.equal(h.jobber.operations.filter((o) => o === 'EysDedupeSweep').length, 2, 'the next window sweeps again');
  } finally {
    Date.now = realNow;
  }
});

function adminPost(h: DeskHarness, body: unknown, options: { key?: string; host?: string } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.20' });
  if (options.key !== '') headers.set('Authorization', `Bearer ${options.key ?? ADMIN_KEY}`);
  const request = new Request(`https://${options.host ?? 'www.eyshandyman.com'}/api/admin/jobber/dedupe-requests`, { method: 'POST', headers, body: JSON.stringify(body) });
  return withFetch(h.jobber.fetch, async () =>
    dedupeRoute({ request, env: h.env, params: {}, data: {}, waitUntil: () => {}, next: async () => new Response(null, { status: 404 }) } as PagesContext<Env>),
  );
}

await check('admin route: 401 without the key, the routine key works, dryRun and a non-live host write nothing', async () => {
  const h = await deskHarness();
  addPair(h);
  assert.equal((await adminPost(h, {}, { key: '' })).status, 401);
  assert.equal((await adminPost(h, {}, { key: 'wrong' })).status, 401);
  assert.deepEqual(h.jobber.mutationCalls, []);
  const dry = await adminPost(h, { dryRun: true }, { key: await photosKey(ADMIN_KEY) });
  assert.equal(dry.status, 200);
  assert.deepEqual((await dry.json()).merged.map((m: { archiveId: string }) => m.archiveId), ['quo-1']);
  assert.deepEqual(h.jobber.mutationCalls, [], 'dryRun writes nothing');
  const preview = await adminPost(h, {}, { host: 'preview.eys-site.pages.dev' });
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).dryRun, true, 'a non-live host is always a dry run');
  assert.deepEqual(h.jobber.mutationCalls, []);
  const live = await adminPost(h, {}, { key: await photosKey(ADMIN_KEY) });
  assert.equal(live.status, 200);
  const body = await live.json();
  assert.equal(body.dryRun, false);
  assert.equal(body.merged.length, 1);
  assert.equal(statusOf(h, 'quo-1'), 'archived');
});

await check('the merge note names the request by the number Essa sees in Jobber', () => {
  assert.equal(requestNumber('Z2lkOi8vSm9iYmVyL1JlcXVlc3QvMzYzNzk5ODY='), '36379986');
  assert.equal(requestNumber('quo-1'), 'quo-1');
  assert.equal(requestNumber('not base64!'), 'not base64!');
});
