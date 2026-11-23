/**
 * The auto follow-up text (functions/_lib/info-ask.ts): a new caller whose
 * Quo request is still missing their name, address or photos gets one text
 * asking for them, and their replies land on the Jobber request. Every name,
 * number and address here is made up: this repo is public.
 */
import assert from 'node:assert/strict';
import type { Env, PagesContext } from '../_lib/types.ts';
import type { ClaudeDeps } from '../_lib/claude.ts';
import type { QuoDeps, QuoMessage } from '../_lib/quo.ts';
import type { DeskJobber } from '../_lib/desk-jobber.ts';
import {
  ASK_AFTER,
  ASK_WITHIN,
  BUSY_WINDOW,
  DAILY_CAP,
  REPLY_WINDOW,
  draftAsk,
  infoAsk,
  setInfoAskMode,
  sweepInfoAsks,
  templateAsk,
  textProblem,
  ensureInfoAskSchema,
  type InfoAskDeps,
  type Missing,
} from '../_lib/info-ask.ts';
import { onRequest as adminRoute } from '../api/admin/info-ask.ts';
import { photosKey } from '../_lib/request-photos.ts';
import { ADMIN_KEY, check } from './helpers.ts';
import { deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

/** Monday Nov 23 2026, 12:00 in Katy (inside 8:00 to 20:00). */
const NOW = Date.UTC(2026, 10, 23, 18, 0, 0);
const PHONE = '+18325550123';
const EYS = '[+13468201629]';
const CALLER = `[${PHONE}]`;
const transcript = (...lines: string[]) => `Call Transcript\nhttps://my.quo.com/inbox/PNeiWaFK2n/c/CNtest\n\nCall Time: Nov 23, 2026 at 10:00am\n\n${lines.join('\n')}\n`;
const CALL = transcript(`${EYS}: How can I help?`, `${CALLER}: I need a TV mounted over the fireplace.`);

function addCall(h: DeskHarness, id: string, o: { phone?: string; name?: string; createdAt?: number; clientCreatedAt?: number; notes?: { message: string; files?: number }[]; property?: string; status?: string; quote?: boolean; source?: string } = {}) {
  const phone = o.phone ?? PHONE;
  const createdAt = o.createdAt ?? NOW - 2 * 60 * 60_000;
  h.jobber.requests.set(id, {
    id,
    title: o.source === 'external' ? null : 'Quo Request',
    source: o.source ?? 'Quo ',
    requestStatus: o.status ?? 'new',
    createdAt: new Date(createdAt).toISOString(),
    property: o.property ? { id: o.property } : null,
    client: { id: `c-${id}`, name: o.name ?? `New Call [${phone}]`, firstName: '', createdAt: new Date(o.clientCreatedAt ?? createdAt).toISOString(), phones: [{ number: phone }] },
    quotes: { nodes: o.quote ? [{ id: 'quote-1' }] : [] },
    assessment: null,
    notes: {
      nodes: (o.notes ?? [{ message: CALL }]).map((n, i) => ({
        __typename: 'RequestNote',
        id: `${id}-n${i}`,
        message: n.message,
        createdAt: new Date(createdAt).toISOString(),
        fileAttachments: { nodes: Array.from({ length: n.files ?? 0 }, (_, k) => ({ id: `${id}-f${k}`, url: `https://files.test/${k}.jpg` })) },
      })),
    },
  });
}

/** Quo: GET /messages filtered like the real API, POST /messages recorded. */
class FakeQuo {
  messages: QuoMessage[] = [];
  sent: { to: string; content: string }[] = [];
  sendStatus = 202;
  down = false;
  deps: QuoDeps = {
    key: 'quo-test-key',
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://api.quo.com');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'quo-test-key');
      assert.equal(headers.get('Quo-Api-Version'), '2026-03-30');
      if (this.down) return new Response('busy', { status: 503 });
      if (url.pathname === '/messages' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { to: string[]; content: string; from: string };
        assert.equal(body.from, 'PNeiWaFK2n', 'always from the EYS inbox');
        if (this.sendStatus >= 300) return Response.json({ title: this.sendStatus === 400 ? 'User Opted Out' : 'busy' }, { status: this.sendStatus });
        this.sent.push({ to: body.to[0], content: body.content });
        return Response.json({ data: { id: `AC${this.sent.length}`, status: 'queued' } }, { status: 202 });
      }
      if (url.pathname === '/messages') {
        const direction = url.searchParams.get('direction');
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const after = Date.parse(url.searchParams.get('createdAt[gt]') ?? '1970-01-01T00:00:00Z');
        const data = this.messages
          .filter((m) => (!direction || m.direction === direction) && (!from || m.from === from) && (!to || (m.to ?? []).includes(to)) && Date.parse(m.createdAt ?? '') > after)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return Response.json({ data, nextCursor: null });
      }
      throw new Error(`unexpected Quo call ${url.pathname}`);
    }) as typeof fetch,
  };
  customerTexts(at: number, text: string, media: string[] = []) {
    this.messages.push({ id: `AC-in-${this.messages.length}`, direction: 'incoming', from: PHONE, to: ['+13468201629'], text, createdAt: new Date(at).toISOString(), media: media.map((url) => ({ url, type: 'image/jpeg' })) });
  }
  teamTexts(at: number, text: string) {
    this.messages.push({ id: `AC-out-${this.messages.length}`, direction: 'outgoing', from: '+13468201629', to: [PHONE], text, createdAt: new Date(at).toISOString() });
  }
}

/** Claude: answers each POST /v1/messages with the next answer (an object becomes the JSON text). */
function fakeClaude(answers: (unknown | Response)[]) {
  const calls: { headers: Headers; body: Record<string, unknown> }[] = [];
  const deps: ClaudeDeps = {
    key: 'claude-test-key',
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input instanceof Request ? input.url : input));
      assert.equal(url.origin + url.pathname, 'https://api.anthropic.com/v1/messages');
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      const body = JSON.parse(String(init?.body ?? (input instanceof Request ? await input.text() : '{}'))) as Record<string, unknown>;
      calls.push({ headers, body });
      const answer = answers.length > 1 ? answers.shift() : answers[0];
      if (answer instanceof Response) return answer;
      return Response.json({
        id: `msg_${calls.length}`,
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [{ type: 'text', text: JSON.stringify(answer) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 20 },
      });
    }) as typeof fetch,
  };
  return { deps, calls };
}

function deps(h: DeskHarness, quo: FakeQuo | null, claude: ClaudeDeps | null = null, extra: Partial<InfoAskDeps> = {}): InfoAskDeps {
  const j: DeskJobber = { deps: h.deps(), db: h.db };
  return { j, env: h.env, quo: quo?.deps ?? null, claude, now: NOW, ...extra };
}

async function sweep(h: DeskHarness, d: InfoAskDeps, options: { dryRun?: boolean } = {}) {
  return withFetch(h.jobber.fetch, () => sweepInfoAsks(d, options));
}

async function live(h: DeskHarness) {
  await ensureInfoAskSchema(h.db);
  await setInfoAskMode(h.db, 'live', NOW);
}

function events(h: DeskHarness, action: string) {
  return h.db.raw.prepare('SELECT detail FROM desk_events WHERE action = ?').all(action) as { detail: string }[];
}

function notesOn(h: DeskHarness, id: string): string[] {
  return ((h.jobber.requests.get(id)!.notes as { nodes: { message: string }[] }).nodes ?? []).map((n) => n.message);
}

await check('text rules: the fixed text passes for every mix of missing items; anything breaking the rules is caught', () => {
  const all: Missing[][] = [['name'], ['address'], ['photos'], ['name', 'address'], ['name', 'address', 'photos'], ['address', 'photos']];
  for (const missing of all) {
    const text = templateAsk(null, missing);
    assert.equal(textProblem(text), null, text);
    assert.ok(text.length <= 320);
    for (const m of missing) assert.match(text, { name: /- your full name/, address: /- the address for the job/, photos: /- a few photos of the area/ }[m]);
  }
  assert.match(templateAsk('Maya', ['photos']), /^Hi Maya, it's EYS Handyman\./);
  const ok = "Hi Maya, it's EYS Handyman. Thanks for calling about the TV mount. Can you text back:\n- the address for the job\n- a photo of the wall";
  assert.equal(textProblem(ok), null);
  const cases: [string, string][] = [
    [ok.replace('. Thanks', ' — thanks'), 'long_dash'],
    [`${ok} 🙂`, 'emoji'],
    [`${ok}\n- your budget in $`, 'banned_word'],
    [`${ok} We're licensed.`, 'banned_word'],
    [`${ok} Quote today!`, 'banned_word'],
    [`${ok} See eyshandyman.com`, 'banned_word'],
    [`${ok} Our HOA experience`, 'banned_word'],
    [`${ok} Reply STOP to opt out`, 'banned_word'],
    [ok.replace(/\n- /g, ' and '), 'no_list'],
    [ok.replace("it's EYS Handyman", 'it is the handyman'), 'no_eys'],
    [`${ok}\n- ${'x'.repeat(300)}`, 'too_long'],
  ];
  for (const [text, problem] of cases) assert.equal(textProblem(text), problem, text);
});

await check('draft: Claude writes it with Opus 5.5, structured output and the refusal fallback; a bad text, a failure or no key falls back to the fixed text', async () => {
  const input = { firstName: 'Maya', missing: ['address', 'photos'] as Missing[], transcript: 'Caller: TV over the fireplace', texts: '' };
  const good = "Hi Maya, it's EYS Handyman. Thanks for calling about the TV over the fireplace. Can you text back:\n- the address for the job\n- a photo of the wall";
  const claude = fakeClaude([{ send: true, reason: 'missing address and photos', text: good }]);
  const draft = await draftAsk(claude.deps, input);
  assert.deepEqual({ by: draft.by, send: draft.send, text: draft.text }, { by: 'claude', send: true, text: good });
  const call = claude.calls[0];
  assert.equal(call.headers.get('x-api-key') ?? call.headers.get('authorization')?.replace(/^Bearer /, ''), 'claude-test-key', 'the key goes in a header');
  assert.match(call.headers.get('anthropic-beta') ?? '', /server-side-fallback-2026-07-01/);
  assert.equal(call.body.model, 'claude-opus-5-5');
  assert.equal(call.body.fallbacks, 'default');
  assert.equal((call.body.output_config as { format: { type: string } }).format.type, 'json_schema');
  assert.match(String((call.body.messages as { content: string }[])[0].content), /Missing for the quote: address for the job, photos of the area/);

  const banned = await draftAsk(fakeClaude([{ send: true, reason: '', text: `${good}\nIt starts at $200.` }]).deps, input);
  assert.deepEqual([banned.by, banned.reason], ['template', 'claude_text_banned_word']);
  assert.equal(banned.text, templateAsk('Maya', ['address', 'photos']));
  const no = await draftAsk(fakeClaude([{ send: false, reason: 'wrong number', text: '' }]).deps, input);
  assert.deepEqual([no.send, no.reason, no.text], [false, 'wrong number', '']);
  const down = await draftAsk(fakeClaude([Response.json({ type: 'error', error: { type: 'invalid_request_error', message: 'bad' } }, { status: 400 })]).deps, input);
  assert.deepEqual([down.by, down.reason], ['template', 'claude_unavailable']);
  const none = await draftAsk(null, input);
  assert.deepEqual([none.by, none.reason], ['template', 'no_claude_key']);
});

await check('dry (the default): decides and logs the text it would send, texts nobody, writes nothing to Jobber, and does not redo it every sweep', async () => {
  const h = await deskHarness();
  addCall(h, 'q1');
  const quo = new FakeQuo();
  const first = await sweep(h, deps(h, quo));
  assert.equal(first.mode, 'dry');
  assert.deepEqual(first.wouldAsk.map((a) => [a.requestId, a.by]), [['q1', 'template']]);
  assert.equal(first.wouldAsk[0].text, templateAsk(null, ['name', 'address', 'photos']));
  assert.deepEqual(quo.sent, []);
  assert.deepEqual(h.jobber.mutationCalls, []);
  assert.equal(events(h, 'info_ask_would_send').length, 1);
  const second = await sweep(h, deps(h, quo));
  assert.deepEqual(second.wouldAsk, []);
  assert.equal(events(h, 'info_ask_would_send').length, 1);
});

await check('live: one text to the caller from the EYS inbox, noted on the request, never sent twice', async () => {
  const h = await deskHarness();
  await live(h);
  addCall(h, 'q1');
  const quo = new FakeQuo();
  const good = "Hi, it's EYS Handyman. Thanks for calling about the TV mount. Can you text back:\n- your full name\n- the address for the job\n- a photo of the wall";
  const claude = fakeClaude([{ send: true, reason: 'new caller', text: good }]);
  const summary = await sweep(h, deps(h, quo, claude.deps));
  assert.deepEqual(summary.asked.map((a) => [a.requestId, a.by]), [['q1', 'claude']]);
  assert.deepEqual(quo.sent, [{ to: PHONE, content: good }]);
  const row = await infoAsk(h.db, 'q1');
  assert.equal(row?.state, 'sent');
  assert.equal(row?.phone, PHONE);
  assert.equal(row?.sent_at, NOW);
  assert.ok(notesOn(h, 'q1').some((n) => n.startsWith('Auto follow-up text sent to the customer') && n.includes(good)));
  await sweep(h, deps(h, quo, claude.deps, { now: NOW + 20 * 60_000 }));
  assert.equal(quo.sent.length, 1, 'never twice');
});

await check('who is not texted: too new, too old, an existing customer, a form request, quoted, a skip-list or foreign number, someone texting right now, quiet hours, asked lately, an empty call, nothing missing, Claude says no, the daily cap', async () => {
  const h = await deskHarness({ HANGUP_SKIP_NUMBERS: '+18325550199' });
  await live(h);
  addCall(h, 'young', { phone: '+18325550101', createdAt: NOW - ASK_AFTER + 60_000 });
  addCall(h, 'old', { phone: '+18325550102', createdAt: NOW - ASK_WITHIN - 60_000 });
  addCall(h, 'existing', { phone: '+18325550103', name: 'Sam Doyle', clientCreatedAt: NOW - 90 * 86_400_000 });
  addCall(h, 'form', { phone: '+18325550104', source: 'external' });
  addCall(h, 'quoted', { phone: '+18325550105', quote: true });
  addCall(h, 'skip', { phone: '+18325550199' });
  addCall(h, 'foreign', { phone: '+442071234567' });
  addCall(h, 'empty', { phone: '+18325550106', notes: [{ message: transcript(`${EYS}: Hello?`) }] });
  addCall(h, 'complete', { phone: '+18325550107', name: 'Iris Park', property: 'prop-1', notes: [{ message: CALL }, { message: 'Photos texted to Quo', files: 2 }] });
  const quo = new FakeQuo();
  const summary = await sweep(h, deps(h, quo));
  assert.deepEqual(quo.sent, []);
  assert.deepEqual(summary.skipped.map((s) => [s.requestId, s.reason]).sort(), [
    ['complete', 'nothing_missing'],
    ['empty', 'empty_call'],
    ['foreign', 'non_us'],
    ['skip', 'skip_list'],
  ]);
  assert.equal(summary.checked, 4, 'too new, too old, existing customer, form and quoted requests are not even candidates');

  // Someone is texting with them right now: wait, and text later.
  const busy = await deskHarness();
  await live(busy);
  addCall(busy, 'q1');
  const quoBusy = new FakeQuo();
  quoBusy.teamTexts(NOW - BUSY_WINDOW + 60_000, 'Here is our request form link');
  const waited = await sweep(busy, deps(busy, quoBusy));
  assert.deepEqual(waited.waiting.map((w) => w.reason), ['texting_now']);
  assert.equal(await infoAsk(busy.db, 'q1'), null, 'nothing recorded: it is looked at again');
  const later = await sweep(busy, deps(busy, quoBusy, null, { now: NOW + BUSY_WINDOW }));
  assert.equal(later.asked.length, 1);

  // At night it waits for 8:00.
  const night = await deskHarness();
  await live(night);
  addCall(night, 'q1', { createdAt: Date.UTC(2026, 10, 24, 3, 0, 0) - 2 * 3_600_000 });
  const quoNight = new FakeQuo();
  const atNight = await sweep(night, deps(night, quoNight, null, { now: Date.UTC(2026, 10, 24, 3, 0, 0) }));
  assert.deepEqual(atNight.waiting.map((w) => w.reason), ['quiet_hours']);
  assert.deepEqual(quoNight.sent, []);

  // The same caller calls again within 14 days: one ask is enough.
  const again = await deskHarness();
  await live(again);
  addCall(again, 'first');
  const quoAgain = new FakeQuo();
  await sweep(again, deps(again, quoAgain));
  addCall(again, 'second');
  (again.jobber.requests.get('second')!.client as { id: string }).id = 'c-first';
  const second = await sweep(again, deps(again, quoAgain, null, { now: NOW + 3_600_000 }));
  assert.deepEqual(second.skipped.map((s) => s.reason), ['asked_recently']);
  assert.equal(quoAgain.sent.length, 1);

  // Claude reads the call as one not to text.
  const vendor = await deskHarness();
  await live(vendor);
  addCall(vendor, 'q1');
  const quoVendor = new FakeQuo();
  const noText = await sweep(vendor, deps(vendor, quoVendor, fakeClaude([{ send: false, reason: 'sales call', text: '' }]).deps));
  assert.deepEqual(noText.skipped.map((s) => s.reason), ['not_texting: sales call']);
  assert.equal((await infoAsk(vendor.db, 'q1'))?.state, 'skipped');
  assert.deepEqual(quoVendor.sent, []);

  // The daily cap.
  const capped = await deskHarness();
  await live(capped);
  for (let i = 0; i < DAILY_CAP; i++) {
    capped.db.raw.prepare(`INSERT INTO info_asks (request_id, state, created_at, sent_at, updated_at) VALUES (?, 'sent', ?, ?, ?)`).run(`old-${i}`, NOW - 3_600_000, NOW - 3_600_000, NOW - 3_600_000);
  }
  addCall(capped, 'q1');
  const quoCapped = new FakeQuo();
  const cap = await sweep(capped, deps(capped, quoCapped));
  assert.deepEqual(cap.waiting.map((w) => w.reason), ['daily_cap']);
  assert.deepEqual(quoCapped.sent, []);
});

await check('send failures: a definite no is recorded as failed, an unclear answer as unknown, and neither is ever retried', async () => {
  for (const [status, state] of [[400, 'failed'], [503, 'unknown']] as const) {
    const h = await deskHarness();
    await live(h);
    addCall(h, 'q1');
    const quo = new FakeQuo();
    quo.sendStatus = status;
    const summary = await sweep(h, deps(h, quo));
    assert.equal(summary.failed.length, 1);
    const row = await infoAsk(h.db, 'q1');
    assert.equal(row?.state, state);
    assert.equal(row?.phone, null);
    quo.sendStatus = 202;
    await sweep(h, deps(h, quo, null, { now: NOW + 3_600_000 }));
    assert.deepEqual(quo.sent, [], `${state}: not retried`);
  }
});

await check('replies: texts and photos go on the request, Claude reads a name and an address, the client is renamed, the address added, and it is done once all three are in', async () => {
  const h = await deskHarness();
  await live(h);
  addCall(h, 'q1');
  const quo = new FakeQuo();
  await sweep(h, deps(h, quo));
  assert.equal(quo.sent.length, 1);

  // First reply: a name, no photo yet.
  quo.customerTexts(NOW + 10 * 60_000, 'Hi this is Dana Cole');
  const read1 = { first_name: 'Dana', last_name: 'Cole', street: '', city: '', state: '', zip: '', job: 'Mount a TV over the fireplace', summary: 'Dana gave her name.' };
  const added: { clientId: string; address: Record<string, string> }[] = [];
  const addProperty = async (clientId: string, address: Record<string, string>) => {
    added.push({ clientId, address });
    return 'prop-new';
  };
  const first = await sweep(h, deps(h, quo, fakeClaude([read1]).deps, { now: NOW + 20 * 60_000, addProperty }));
  assert.deepEqual(first.replies.map((r) => [r.messages, r.renamed, r.answered]), [[1, 'Dana Cole', false]]);
  assert.deepEqual(h.jobber.clientNames.get('c-q1'), { firstName: 'Dana', lastName: 'Cole', name: 'Dana Cole' });
  assert.ok(notesOn(h, 'q1').some((n) => n.startsWith('Customer texted back after the auto follow-up') && n.includes('Hi this is Dana Cole')));
  assert.ok(notesOn(h, 'q1').some((n) => n.startsWith("Read from the customer's texts (AI):") && n.includes('Job: Mount a TV')));
  assert.equal((await infoAsk(h.db, 'q1'))?.state, 'sent', 'still missing the address and a photo');

  // Second reply: the address and a photo.
  quo.customerTexts(NOW + 30 * 60_000, '12 Example Lane, Katy TX 77494. Here is the wall', ['https://share.quo.com/abc123']);
  const read2 = { ...read1, street: '12 Example Lane', city: 'Katy', state: 'TX', zip: '77494' };
  const second = await sweep(h, deps(h, quo, fakeClaude([read2]).deps, { now: NOW + 40 * 60_000, addProperty }));
  assert.deepEqual(second.replies.map((r) => [r.messages, r.photos, r.address, r.answered]), [[1, 1, '12 Example Lane, Katy, TX 77494', true]]);
  assert.deepEqual(added, [{ clientId: 'c-q1', address: { street1: '12 Example Lane', city: 'Katy', province: 'TX', postalCode: '77494' } }]);
  const photoNote = notesOn(h, 'q1').find((n) => n.includes('12 Example Lane, Katy TX 77494'))!;
  assert.match(photoNote, /Quo message times \(UTC\): /, 'the routine sees these photos as already attached');
  const row = await infoAsk(h.db, 'q1');
  assert.equal(row?.state, 'answered');
  assert.equal(row?.phone, null, 'the number is dropped once done');
  assert.equal(events(h, 'info_ask_answered').length, 1);

  // Nothing new: nothing happens.
  const calm = await sweep(h, deps(h, quo, fakeClaude([read2]).deps, { now: NOW + 50 * 60_000, addProperty }));
  assert.deepEqual(calm.replies, []);
});

await check('replies: without Claude the texts still land on the request; after 7 days the ask expires and the number is dropped', async () => {
  const h = await deskHarness();
  await live(h);
  addCall(h, 'q1');
  const quo = new FakeQuo();
  await sweep(h, deps(h, quo));
  quo.customerTexts(NOW + 10 * 60_000, 'It is the living room wall');
  const reply = await sweep(h, deps(h, quo, null, { now: NOW + 20 * 60_000 }));
  assert.deepEqual(reply.replies.map((r) => [r.messages, r.renamed]), [[1, null]]);
  assert.ok(notesOn(h, 'q1').some((n) => n.includes('It is the living room wall')));
  assert.ok(!notesOn(h, 'q1').some((n) => n.startsWith("Read from the customer's texts")));
  await sweep(h, deps(h, quo, null, { now: NOW + REPLY_WINDOW + 60_000 }));
  const row = await infoAsk(h.db, 'q1');
  assert.equal(row?.state, 'expired');
  assert.equal(row?.phone, null);
});

await check('off means off; dryRun never sends even when live', async () => {
  const h = await deskHarness();
  await ensureInfoAskSchema(h.db);
  await setInfoAskMode(h.db, 'off', NOW);
  addCall(h, 'q1');
  const quo = new FakeQuo();
  const off = await sweep(h, deps(h, quo));
  assert.equal(off.mode, 'off');
  assert.deepEqual([off.wouldAsk, off.asked], [[], []]);
  await setInfoAskMode(h.db, 'live', NOW);
  const dry = await sweep(h, deps(h, quo), { dryRun: true });
  assert.equal(dry.mode, 'dry');
  assert.equal(dry.wouldAsk.length, 1);
  assert.deepEqual(quo.sent, []);
});

function adminPost(h: DeskHarness, body: unknown, options: { key?: string; host?: string } = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.21' });
  if (options.key !== '') headers.set('Authorization', `Bearer ${options.key ?? ADMIN_KEY}`);
  const request = new Request(`https://${options.host ?? 'www.eyshandyman.com'}/api/admin/info-ask`, { method: 'POST', headers, body: JSON.stringify(body) });
  return withFetch(h.jobber.fetch, async () => adminRoute({ request, env: h.env, params: {}, data: {}, waitUntil: () => {}, next: async () => new Response(null, { status: 404 }) } as PagesContext<Env>));
}

await check('admin route: needs a key; sets the mode on the live host only; a sweep anywhere else is a dry run', async () => {
  const h = await deskHarness();
  assert.equal((await adminPost(h, { mode: 'live' }, { key: '' })).status, 401);
  assert.equal((await adminPost(h, { mode: 'loud' })).status, 400);
  const preview = await adminPost(h, { mode: 'live' }, { host: 'preview.eys-site.pages.dev' });
  assert.equal(preview.status, 409);
  const set = await adminPost(h, { mode: 'live' }, { key: await photosKey(ADMIN_KEY) });
  assert.deepEqual(await set.json(), { status: 'ok', mode: 'live' });
  assert.equal(events(h, 'info_ask_mode')[0].detail, 'live');
  const elsewhere = await adminPost(h, {}, { host: 'preview.eys-site.pages.dev' });
  assert.equal((await elsewhere.json()).mode, 'dry', 'not the live host: never sends');
});
