/**
 * The text for callers who hang up on Sona: signature, dedupe, who answered,
 * the 7-day and quiet-hours rules, and the exact text.
 */
import assert from 'node:assert/strict';
import type { Env, PagesContext } from '../_lib/types.ts';
import { onRequest as webhook } from '../api/quo/webhook.ts';
import { onRequest as flush } from '../api/quo/flush.ts';
import { signQuoWebhook, verifyQuoSignature } from '../_lib/quo.ts';
import {
  HANGUP_TEXT,
  ensureHangupSchema,
  flushQueue,
  handleCall,
  inSendingHours,
  isUsNumber,
  nextMorning,
  whoAnswered,
  type CallEvent,
  type HangupDeps,
} from '../_lib/hangup.ts';
import { ensureDeskSchema } from '../_lib/desk-db.ts';
import { ensureSchema } from '../_lib/db.ts';
import { check, createTestD1, testEnv, type TestD1 } from './helpers.ts';
import { BASE, withFetch } from './desk-helpers.ts';

const SECRET = `whsec_${Buffer.from('a-test-signing-key-32-bytes-long!').toString('base64')}`;
const CALLER = '+12815550177';
/** 2:00 PM CST on Wed 11 Nov 2026. */
const AFTERNOON = Date.UTC(2026, 10, 11, 20, 0, 0);
/** 9:30 PM CST the same day. */
const NIGHT = Date.UTC(2026, 10, 12, 3, 30, 0);

interface Fake {
  calls: Map<string, Record<string, unknown>>;
  messages: { id: string; to: string[]; text: string; createdAt: string; direction: string; userId: string | null }[];
  posts: { to: string[]; content: string; from: string }[];
  optOut: boolean;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function fakeQuo(): Fake {
  const fake: Fake = {
    calls: new Map(),
    messages: [],
    posts: [],
    optOut: false,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      const call = /^\/calls\/(.+)$/.exec(url.pathname);
      if (call) {
        const found = fake.calls.get(decodeURIComponent(call[1]));
        return found ? Response.json({ data: found }) : Response.json({ title: 'Not Found' }, { status: 404 });
      }
      if (url.pathname === '/messages' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        fake.posts.push(body);
        if (fake.optOut) return Response.json({ title: 'User Opted Out' }, { status: 400 });
        return Response.json({ data: { id: `MS${fake.posts.length}`, status: 'queued' } }, { status: 202 });
      }
      if (url.pathname === '/messages') {
        const to = url.searchParams.get('to');
        const after = Date.parse(url.searchParams.get('createdAt[gt]') ?? '1970-01-01');
        return Response.json({
          data: fake.messages.filter((m) => (!to || m.to.includes(to)) && Date.parse(m.createdAt) > after && m.direction === 'outgoing'),
        });
      }
      return Response.json({ title: 'Not Found' }, { status: 404 });
    },
  };
  return fake;
}

interface Setup {
  db: TestD1;
  env: Env;
  quo: Fake;
  clock: { t: number };
  deps: HangupDeps;
}

async function setup(overrides: Partial<Env> = {}): Promise<Setup> {
  const db = createTestD1();
  const env = testEnv(db, { QUO_API_KEY: 'quo-test-key', QUO_WEBHOOK_SECRET: SECRET, HANGUP_TEXT_ENABLED: 'true', ...overrides });
  await ensureSchema(db);
  await ensureDeskSchema(db);
  await ensureHangupSchema(db);
  const quo = fakeQuo();
  const clock = { t: AFTERNOON };
  return { db, env, quo, clock, deps: { env, db, fetch: quo.fetch, now: () => clock.t } };
}

function sonaCall(s: Setup, id: string, at = s.clock.t, extra: Record<string, unknown> = {}): CallEvent {
  s.quo.calls.set(id, { id, direction: 'incoming', aiHandled: 'ai-agent', answeredBy: 'SYUsona', participants: [{ phoneNumber: CALLER, actorId: null }, { phoneNumber: '+13468201629', actorId: 'SYUsona' }], ...extra });
  return { callId: id, phoneNumberId: 'PNeiWaFK2n', direction: 'incoming', status: 'ai-handled', caller: CALLER, createdAt: at - 40_000, completedAt: at };
}

function decisions(db: TestD1): string[] {
  return (db.raw.prepare('SELECT decision, reason FROM hangup_log ORDER BY id').all() as { decision: string; reason: string }[]).map((r) => `${r.decision}:${r.reason}`);
}

function payload(callId: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: `EV${callId}`,
    apiVersion: '2026-03-30',
    createdAt: new Date(AFTERNOON).toISOString(),
    type: 'call.completed',
    data: {
      resource: { id: callId, direction: 'incoming', status: 'ai-handled', createdAt: new Date(AFTERNOON - 40_000).toISOString(), completedAt: new Date(AFTERNOON).toISOString(), duration: 12, ...extra },
      context: { phoneNumberId: 'PNeiWaFK2n', participants: { workspace: ['+13468201629'], external: [CALLER] } },
    },
  });
}

/** One delivery, its background work awaited, on the test clock (not the wall clock). */
async function deliver(s: Setup, raw: string, id: string, signature?: string, timestamp = Math.floor(s.clock.t / 1000)): Promise<Response> {
  const realNow = Date.now;
  Date.now = () => s.clock.t;
  try {
    return await deliverNow(s, raw, id, signature, timestamp);
  } finally {
    Date.now = realNow;
  }
}

async function deliverNow(s: Setup, raw: string, id: string, signature: string | undefined, timestamp: number): Promise<Response> {
  const background: Promise<unknown>[] = [];
  const request = new Request(`${BASE}/api/quo/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': String(timestamp),
      'webhook-signature': signature ?? (await signQuoWebhook(SECRET, id, timestamp, raw)),
    },
    body: raw,
  });
  const context: PagesContext<Env> = { request, env: s.env, params: {}, data: {}, waitUntil: (p) => background.push(p), next: async () => new Response(null) };
  const response = await webhook(context);
  await Promise.all(background);
  return response;
}

// ---------------------------------------------------------------------------

await check('the text, exactly, with no dash, emoji, sign-off or STOP line', () => {
  assert.equal(HANGUP_TEXT, "Hey, it's EYS Handyman. Looks like we got cut off. Feel free to text us some pics of what you need done.");
  assert.ok(!/[–—]|STOP|\p{Extended_Pictographic}|\n/u.test(HANGUP_TEXT));
});

await check('Quo signature: Standard Webhooks v1 over id.timestamp.body, base64 key after whsec_; legacy openphone-signature too', async () => {
  const raw = '{"type":"call.completed"}';
  const now = Date.now();
  const ts = Math.floor(now / 1000);
  const sig = await signQuoWebhook(SECRET, 'msg_1', ts, raw);
  const req = (headers: Record<string, string>) => new Request(BASE, { method: 'POST', headers });
  assert.deepEqual(await verifyQuoSignature(SECRET, req({ 'webhook-id': 'msg_1', 'webhook-timestamp': String(ts), 'webhook-signature': `v1,bogus ${sig}` }), raw, now), { ok: true, deliveryId: 'msg_1' });
  assert.equal((await verifyQuoSignature(SECRET, req({ 'webhook-id': 'msg_1', 'webhook-timestamp': String(ts), 'webhook-signature': sig }), raw.replace('call', 'cal'), now)).ok, false, 'tampered body');
  assert.equal((await verifyQuoSignature(SECRET, req({ 'webhook-id': 'msg_2', 'webhook-timestamp': String(ts), 'webhook-signature': sig }), raw, now)).ok, false, 'id is signed');
  const stale = await verifyQuoSignature(SECRET, req({ 'webhook-id': 'msg_1', 'webhook-timestamp': String(ts), 'webhook-signature': sig }), raw, now + 10 * 60_000);
  assert.deepEqual(stale, { ok: false, reason: 'stale' });
  assert.deepEqual(await verifyQuoSignature(SECRET, req({}), raw, now), { ok: false, reason: 'unsigned' });
  assert.deepEqual(await verifyQuoSignature(undefined, req({}), raw, now), { ok: false, reason: 'no_secret' });
  // Legacy: hmac;1;<ms>;<base64 of HMAC(base64-decoded key, ms + "." + body)>.
  const { createHmac } = await import('node:crypto');
  const keyBytes = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const legacy = createHmac('sha256', keyBytes).update(`${now}.${raw}`).digest('base64');
  assert.equal((await verifyQuoSignature(SECRET, req({ 'openphone-signature': `hmac;1;${now};${legacy}` }), raw, now)).ok, true);
  const s = await setup();
  assert.equal((await deliver(s, payload('AC1'), 'msg_9', 'v1,bm9wZQ==')).status, 401);
  assert.deepEqual(decisions(s.db), [], 'unsigned deliveries decide nothing');
});

await check('a Sona call with no text gets one hang-up text from the EYS inbox', async () => {
  const s = await setup();
  await withFetch(s.quo.fetch, async () => {
    s.quo.calls.set('AC1', { id: 'AC1', direction: 'incoming', aiHandled: 'ai-agent', answeredBy: 'SYUsona' });
    assert.equal((await deliver(s, payload('AC1'), 'msg_1')).status, 200);
  });
  assert.equal(s.quo.posts.length, 1);
  assert.deepEqual(s.quo.posts[0], { from: 'PNeiWaFK2n', to: [CALLER], content: HANGUP_TEXT });
  const row = s.db.raw.prepare('SELECT decision, reason, last4, message_id, phone_hash FROM hangup_log').get() as Record<string, string>;
  assert.equal(row.decision, 'sent');
  assert.equal(row.last4, '0177');
  assert.equal(row.message_id, 'MS1');
  assert.ok(!JSON.stringify(row).includes('2815550177'), 'no full number in the log');
});

await check('dedupe: the same delivery twice, and the same call under two deliveries, decide once', async () => {
  const s = await setup();
  await withFetch(s.quo.fetch, async () => {
    s.quo.calls.set('AC2', { id: 'AC2', direction: 'incoming', aiHandled: 'ai-agent' });
    const raw = payload('AC2');
    await deliver(s, raw, 'msg_2');
    const again = await deliver(s, raw, 'msg_2');
    assert.equal((await again.json()).duplicate, true);
    await deliver(s, raw, 'msg_2b');
  });
  assert.equal(s.quo.posts.length, 1);
  assert.deepEqual(decisions(s.db), ['sent:sona_hangup']);
});

await check('7-day rule: any text from the inbox to that number in the last week, or our own earlier one, means no text', async () => {
  const s = await setup();
  s.quo.messages.push({ id: 'MSold', to: [CALLER], text: 'Here is the link', createdAt: new Date(AFTERNOON - 3 * 86_400_000).toISOString(), direction: 'outgoing', userId: 'USessa' });
  assert.deepEqual(await handleCall(s.deps, sonaCall(s, 'AC3')), { decision: 'skipped', reason: 'recent_outbound_7d' });
  s.quo.messages = [];
  const t = await setup();
  assert.equal((await handleCall(t.deps, sonaCall(t, 'AC4'))).decision, 'sent');
  t.clock.t += 2 * 86_400_000;
  assert.deepEqual(await handleCall(t.deps, sonaCall(t, 'AC5')), { decision: 'skipped', reason: 'already_texted_7d' });
  t.clock.t += 6 * 86_400_000;
  assert.equal((await handleCall(t.deps, sonaCall(t, 'AC6'))).decision, 'sent', 'a week later they can get one again');
  assert.equal(t.quo.posts.length, 2);
});

await check('Sona already texted during the call: no text', async () => {
  const s = await setup();
  s.quo.messages.push({ id: 'MSsona', to: [CALLER], text: 'Thanks for calling EYS Handyman', createdAt: new Date(AFTERNOON - 20_000).toISOString(), direction: 'outgoing', userId: 'SYUsona' });
  assert.deepEqual(await handleCall(s.deps, sonaCall(s, 'AC7')), { decision: 'skipped', reason: 'sona_texted' });
  assert.equal(s.quo.posts.length, 0);
});

await check('a team member answered, or took a transfer: no text', async () => {
  const s = await setup();
  const event = sonaCall(s, 'AC8', s.clock.t, { aiHandled: null, answeredBy: 'USmark' });
  assert.deepEqual(await handleCall(s.deps, { ...event, status: 'answered' }), { decision: 'skipped', reason: 'team_answered' });
  const transfer = sonaCall(s, 'AC9', s.clock.t, { participants: [{ phoneNumber: CALLER, actorId: null }, { phoneNumber: '+13468201629', actorId: 'SYUsona' }, { phoneNumber: '+13468201629', actorId: 'USessa' }] });
  assert.deepEqual(await handleCall(s.deps, transfer), { decision: 'skipped', reason: 'team_answered' });
  assert.equal(whoAnswered('answered', null), 'team', 'no call details: an answered call is assumed a person');
  assert.equal(whoAnswered('unanswered', { id: 'x', aiHandled: null, answeredBy: null }), 'nobody');
  assert.equal(whoAnswered('ai-handled', null), 'sona');
  assert.equal(s.quo.posts.length, 0);
});

await check('quiet hours: after 20:00 it waits for 8:00 Chicago, and the flush re-checks before sending', async () => {
  const s = await setup();
  s.clock.t = NIGHT;
  assert.equal(inSendingHours(NIGHT), false);
  assert.deepEqual(await handleCall(s.deps, sonaCall(s, 'AC10')), { decision: 'queued', reason: 'quiet_hours' });
  const due = (s.db.raw.prepare('SELECT due_at FROM hangup_queue').get() as { due_at: number }).due_at;
  assert.equal(new Date(due).toISOString(), '2026-11-12T14:00:00.000Z', '8:00 CST is 14:00 UTC');
  s.clock.t = due - 60_000;
  assert.deepEqual(await flushQueue(s.deps), [], '7:59 is still quiet');
  s.clock.t = due + 60_000;
  assert.deepEqual(await flushQueue(s.deps), [{ decision: 'sent', reason: 'sona_hangup' }]);
  assert.deepEqual(await flushQueue(s.deps), [], 'sent once');
  assert.equal(s.quo.posts.length, 1);
  assert.equal(s.db.raw.prepare('SELECT COUNT(*) AS n FROM hangup_queue').get()!.n, 0, 'the number is gone from the queue');

  // Queued overnight, but Essa texted them first thing: the flush skips it.
  const t = await setup();
  t.clock.t = NIGHT;
  await handleCall(t.deps, sonaCall(t, 'AC11'));
  t.quo.messages.push({ id: 'MSmorning', to: [CALLER], text: 'Morning, saw your call', createdAt: new Date(NIGHT + 10 * 3_600_000).toISOString(), direction: 'outgoing', userId: 'USessa' });
  t.clock.t = NIGHT + 11 * 3_600_000;
  assert.deepEqual(await flushQueue(t.deps), [{ decision: 'skipped', reason: 'recent_outbound_7d' }]);
  assert.equal(t.quo.posts.length, 0);
});

await check('the overnight queue also flushes on the next webhook and on the scheduled ping', async () => {
  const s = await setup();
  s.clock.t = NIGHT;
  await handleCall(s.deps, sonaCall(s, 'AC12'));
  // The routes run on the real clock: move the due time into the past.
  s.db.raw.prepare('UPDATE hangup_queue SET due_at = ?').run(Date.now() - 1000);
  const realNow = Date.now;
  const morning = Date.UTC(2026, 10, 12, 15, 30, 0); // 9:30 AM CST
  Date.now = () => morning;
  try {
    await withFetch(s.quo.fetch, async () => {
      const response = await flush({ request: new Request(`${BASE}/api/quo/flush`, { method: 'POST' }), env: s.env, params: {}, data: {}, waitUntil: () => {}, next: async () => new Response(null) });
      assert.equal((await response.json()).processed, 1);
    });
  } finally {
    Date.now = realNow;
  }
  assert.equal(s.quo.posts.length, 1);
});

await check('HANGUP_TEXT_ENABLED off: every decision is still made and logged, nothing is sent or queued', async () => {
  const s = await setup({ HANGUP_TEXT_ENABLED: undefined });
  assert.deepEqual(await handleCall(s.deps, sonaCall(s, 'AC13')), { decision: 'skipped', reason: 'disabled (would send)' });
  s.clock.t = NIGHT;
  assert.deepEqual(await handleCall(s.deps, sonaCall(s, 'AC14')), { decision: 'skipped', reason: 'disabled (would queue for 8:00)' });
  assert.equal(s.quo.posts.length, 0);
  assert.equal(s.db.raw.prepare('SELECT COUNT(*) AS n FROM hangup_queue').get()!.n, 0);
});

await check('skips: non-US numbers, the skip list, other inboxes, outbound calls, missed calls, opt-outs', async () => {
  const s = await setup({ HANGUP_SKIP_NUMBERS: '+17135550100, +12815550177' });
  assert.equal((await handleCall(s.deps, sonaCall(s, 'AC15'))).reason, 'skip_list');
  const t = await setup();
  assert.equal((await handleCall(t.deps, { ...sonaCall(t, 'AC16'), caller: '+442071838750' })).reason, 'non_us');
  assert.equal((await handleCall(t.deps, { ...sonaCall(t, 'AC17'), phoneNumberId: 'PNother' })).reason, 'other_inbox');
  assert.equal((await handleCall(t.deps, { ...sonaCall(t, 'AC18'), direction: 'outgoing' })).reason, 'outbound_call');
  assert.equal((await handleCall(t.deps, { ...sonaCall(t, 'AC19', t.clock.t, { aiHandled: null, answeredBy: null, participants: [] }), status: 'unanswered' })).reason, 'not_answered_by_sona');
  t.quo.optOut = true;
  assert.deepEqual(await handleCall(t.deps, sonaCall(t, 'AC20')), { decision: 'skipped', reason: 'opted_out' });
  assert.ok(isUsNumber('+12815550177') && !isUsNumber('+11815550177') && !isUsNumber('+1281555017'));
});

await check('8:00 Chicago across the DST change', () => {
  // Sat 31 Oct 2026, 11 PM CDT → Sun 1 Nov, 8:00 CST (DST ended overnight) = 14:00 UTC.
  assert.equal(new Date(nextMorning(Date.UTC(2026, 10, 1, 4, 0, 0))).toISOString(), '2026-11-01T14:00:00.000Z');
  // 3 AM CDT in summer → 8:00 CDT the same day = 13:00 UTC.
  assert.equal(new Date(nextMorning(Date.UTC(2026, 6, 15, 8, 0, 0))).toISOString(), '2026-07-15T13:00:00.000Z');
  assert.equal(inSendingHours(Date.UTC(2026, 10, 11, 14, 0, 0)), true, '8:00 CST');
  assert.equal(inSendingHours(Date.UTC(2026, 10, 12, 2, 0, 0)), false, '20:00 CST');
});
