import type { D1Database, Env } from './types.ts';
import { keyedHash, decryptSecret } from './crypto.ts';
import { DAY, HOUR, MINUTE } from './db.ts';
import { adminKey } from './env.ts';
import { kvGet } from './desk-db.ts';
import { EYS_PHONE_NUMBER_ID, QUO_API, QUO_API_VERSION, listMessages, quoKey, sendText, type QuoDeps } from './quo.ts';

/**
 * The text for callers who hang up on Sona.
 *
 * Sona (Quo's AI agent) answers (346) 820-1629 after a 25-second ring and
 * cannot do anything once a call ends, so a caller who hangs up right after
 * the greeting hears nothing more from EYS. Quo's call.completed webhook
 * lands here; when Sona (not a person) answered and nobody texted them, they
 * get one plain text, between 8:00 and 20:00 Chicago time.
 *
 * Everything is behind HANGUP_TEXT_ENABLED (default off). With it off, every
 * decision is still worked out and logged as "skipped: disabled (would send)",
 * so the log shows what turning it on would do.
 */

export const HANGUP_TEXT =
  "Hey, it's EYS Handyman. Looks like we got cut off. Feel free to text us some pics of what you need done.";

export const HANGUP_WINDOW = 7 * DAY;
export const QUIET_START_HOUR = 20;
export const QUIET_END_HOUR = 8;
const PHONE_LABEL = 'eys-hangup/phone-hash/v1';

const SCHEMA = [
  // Every decision, sent or skipped, with the reason. Numbers are kept as a
  // keyed hash and the last four digits only.
  `CREATE TABLE IF NOT EXISTS hangup_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    call_id TEXT,
    phone_hash TEXT,
    last4 TEXT,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL,
    message_id TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS hangup_log_at ON hangup_log (at)',
  // A call is decided once, however many deliveries or webhooks report it.
  `CREATE TABLE IF NOT EXISTS hangup_calls (
    call_id TEXT PRIMARY KEY,
    at INTEGER NOT NULL
  )`,
  // The one-per-number-per-7-days guard.
  `CREATE TABLE IF NOT EXISTS hangup_sent (
    phone_hash TEXT PRIMARY KEY,
    last_sent_at INTEGER NOT NULL,
    call_id TEXT
  )`,
  // Texts waiting for 8:00. The number is kept only until then.
  `CREATE TABLE IF NOT EXISTS hangup_queue (
    phone_hash TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    call_id TEXT,
    queued_at INTEGER NOT NULL,
    due_at INTEGER NOT NULL
  )`,
];

const ready = new WeakSet<object>();

export async function ensureHangupSchema(db: D1Database): Promise<void> {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

export function hangupEnabled(env: Env): boolean {
  return env.HANGUP_TEXT_ENABLED?.trim() === 'true';
}

/** +1 NANP numbers only: +1, then an area code and exchange that cannot start with 0 or 1. */
export function isUsNumber(e164: string): boolean {
  return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(e164);
}

export function skipList(env: Env): Set<string> {
  return new Set(
    (env.HANGUP_SKIP_NUMBERS ?? '')
      .split(',')
      .map((n) => n.trim().replace(/[^\d+]/g, ''))
      .filter(Boolean),
  );
}

// ---------------------------------------------------------------------------
// Chicago clock
// ---------------------------------------------------------------------------

function chicagoParts(at: number): { year: number; month: number; day: number; hour: number; minute: number; offsetMinutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(at));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const offset = /GMT([+-]\d+)(?::(\d+))?/.exec(get('timeZoneName'));
  const offsetMinutes = offset ? Number(offset[1]) * 60 + Math.sign(Number(offset[1])) * Number(offset[2] ?? 0) : -360;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    offsetMinutes,
  };
}

export function inSendingHours(at: number): boolean {
  const { hour } = chicagoParts(at);
  return hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR;
}

/** The next 8:00 in Chicago at or after `at` (today's if it is still early, else tomorrow's). */
export function nextMorning(at: number): number {
  const p = chicagoParts(at);
  const dayOffset = p.hour >= QUIET_END_HOUR ? 1 : 0;
  // 8:00 local on the chosen day, using that day's own offset (DST changes overnight).
  const guess = Date.UTC(p.year, p.month - 1, p.day + dayOffset, QUIET_END_HOUR, 0, 0) - p.offsetMinutes * MINUTE;
  const actualOffset = chicagoParts(guess).offsetMinutes;
  return Date.UTC(p.year, p.month - 1, p.day + dayOffset, QUIET_END_HOUR, 0, 0) - actualOffset * MINUTE;
}

// ---------------------------------------------------------------------------
// Quo: the call itself
// ---------------------------------------------------------------------------

export interface QuoCall {
  id: string;
  direction?: string | null;
  status?: string | null;
  createdAt?: string | null;
  answeredAt?: string | null;
  completedAt?: string | null;
  answeredBy?: string | null;
  aiHandled?: string | null;
  participants?: ({ phoneNumber?: string; actorId?: string | null } | string)[] | null;
}

export async function fetchCall(deps: QuoDeps, callId: string): Promise<QuoCall | null> {
  try {
    const response = await deps.fetch(`${QUO_API}/calls/${encodeURIComponent(callId)}`, {
      headers: { Authorization: deps.key, 'Quo-Api-Version': QUO_API_VERSION, Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: QuoCall };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export type Answered = 'sona' | 'team' | 'nobody';

/**
 * Who answered. Quo's REST call has `answeredBy` (a person is `US…`, a system
 * actor such as Sona is `SYU…`), `aiHandled: 'ai-agent'`, and actors in
 * `participants`. The webhook's own status says `ai-handled` for a call Sona
 * took. A person anywhere in the call (answered, or took a transfer) means a
 * team member spoke to them: no text.
 */
export function whoAnswered(webhookStatus: string | null | undefined, call: QuoCall | null): Answered {
  const actors = (call?.participants ?? [])
    .map((p) => (typeof p === 'string' ? null : p.actorId ?? null))
    .filter((a): a is string => Boolean(a));
  if ((call?.answeredBy ?? '').startsWith('US') || actors.some((a) => a.startsWith('US'))) return 'team';
  if (call?.aiHandled === 'ai-agent' || (call?.answeredBy ?? '').startsWith('SYU') || webhookStatus === 'ai-handled') return 'sona';
  if (!call && webhookStatus === 'answered') return 'team';
  return 'nobody';
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export interface HangupDeps {
  env: Env;
  db: D1Database;
  fetch: typeof fetch;
  now: () => number;
}

export interface CallEvent {
  callId: string;
  phoneNumberId: string | null;
  direction: string | null;
  status: string | null;
  caller: string | null;
  createdAt: number | null;
  completedAt: number | null;
}

async function phoneHash(env: Env, e164: string): Promise<string | null> {
  const key = adminKey(env);
  return key ? keyedHash(key, PHONE_LABEL, e164) : null;
}

async function log(
  deps: HangupDeps,
  entry: { callId: string | null; hash: string | null; phone: string | null; decision: 'sent' | 'skipped' | 'queued' | 'failed'; reason: string; messageId?: string | null },
): Promise<void> {
  await deps.db
    .prepare('INSERT INTO hangup_log (at, call_id, phone_hash, last4, decision, reason, message_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
    .bind(deps.now(), entry.callId, entry.hash, entry.phone ? entry.phone.slice(-4) : null, entry.decision, entry.reason, entry.messageId ?? null)
    .run();
}

export type Decision = { decision: 'sent' | 'skipped' | 'queued' | 'failed'; reason: string };

/**
 * The texting rules shared by a fresh call and a queued one: skip list, our
 * own 7-day guard, any text from the EYS inbox to that number in the last 7
 * days (Sona's own Send SMS during the call included), and opt-outs.
 */
async function textingChecks(
  deps: HangupDeps,
  quo: QuoDeps,
  phone: string,
  hash: string,
  callStart: number | null,
): Promise<string | null> {
  const now = deps.now();
  if (skipList(deps.env).has(phone)) return 'skip_list';
  const sent = await deps.db.prepare('SELECT last_sent_at FROM hangup_sent WHERE phone_hash = ?1').bind(hash).first<{ last_sent_at: number }>();
  if (sent && sent.last_sent_at > now - HANGUP_WINDOW) return 'already_texted_7d';
  const messages = await listMessages(quo, phone, now - HANGUP_WINDOW, 'outgoing');
  if (messages === null) return 'quo_unavailable';
  if (messages.length > 0) {
    const during = callStart !== null && messages.some((m) => Date.parse(m.createdAt ?? '') >= callStart - MINUTE);
    return during ? 'sona_texted' : 'recent_outbound_7d';
  }
  return null;
}

/** Claims the number for 7 days. Only one caller wins; false means someone else already texted. */
async function claimNumber(deps: HangupDeps, hash: string, callId: string | null): Promise<boolean> {
  const now = deps.now();
  const row = await deps.db
    .prepare(
      `INSERT INTO hangup_sent (phone_hash, last_sent_at, call_id) VALUES (?1, ?2, ?3)
       ON CONFLICT(phone_hash) DO UPDATE SET last_sent_at = excluded.last_sent_at, call_id = excluded.call_id
       WHERE hangup_sent.last_sent_at < ?4
       RETURNING phone_hash`,
    )
    .bind(hash, now, callId, now - HANGUP_WINDOW)
    .first<{ phone_hash: string }>();
  return Boolean(row);
}

async function send(deps: HangupDeps, quo: QuoDeps, phone: string, hash: string, callId: string | null): Promise<Decision> {
  if (!(await claimNumber(deps, hash, callId))) {
    await log(deps, { callId, hash, phone, decision: 'skipped', reason: 'already_texted_7d' });
    return { decision: 'skipped', reason: 'already_texted_7d' };
  }
  const result = await sendText(quo, phone, HANGUP_TEXT);
  if (result.ok) {
    await log(deps, { callId, hash, phone, decision: 'sent', reason: 'sona_hangup', messageId: result.id });
    return { decision: 'sent', reason: 'sona_hangup' };
  }
  if (result.definite && /opted out/i.test(result.reason)) {
    await log(deps, { callId, hash, phone, decision: 'skipped', reason: 'opted_out' });
    return { decision: 'skipped', reason: 'opted_out' };
  }
  if (result.definite) {
    // Nothing went out: free the number so a later call can try again.
    await deps.db.prepare('DELETE FROM hangup_sent WHERE phone_hash = ?1 AND call_id IS ?2').bind(hash, callId).run();
  }
  await log(deps, { callId, hash, phone, decision: 'failed', reason: result.reason.slice(0, 120) });
  return { decision: 'failed', reason: result.reason };
}

/** One call.completed event, start to finish. */
export async function handleCall(deps: HangupDeps, event: CallEvent): Promise<Decision> {
  const now = deps.now();
  const skip = async (reason: string, phone: string | null = event.caller, hash: string | null = null): Promise<Decision> => {
    await log(deps, { callId: event.callId, hash, phone, decision: 'skipped', reason });
    return { decision: 'skipped', reason };
  };
  if (event.phoneNumberId && event.phoneNumberId !== EYS_PHONE_NUMBER_ID) return skip('other_inbox', null);
  if (event.direction !== 'incoming') return skip('outbound_call', null);

  const fresh = await deps.db
    .prepare('INSERT OR IGNORE INTO hangup_calls (call_id, at) VALUES (?1, ?2)')
    .bind(event.callId, now)
    .run();
  if ((fresh.meta.changes ?? 0) === 0) return { decision: 'skipped', reason: 'duplicate_call' };

  const phone = (event.caller ?? '').trim();
  if (!phone) return skip('no_caller_number', null);
  if (!isUsNumber(phone)) return skip('non_us', phone);
  const hash = await phoneHash(deps.env, phone);
  if (!hash) return skip('not_configured', phone);
  const key = quoKey(deps.env);
  if (!key) return skip('no_quo_key', phone, hash);
  const quo: QuoDeps = { key, fetch: deps.fetch };

  const answered = whoAnswered(event.status, await fetchCall(quo, event.callId));
  if (answered === 'team') return skip('team_answered', phone, hash);
  if (answered !== 'sona') return skip('not_answered_by_sona', phone, hash);

  const blocked = await textingChecks(deps, quo, phone, hash, event.createdAt);
  if (blocked) return skip(blocked, phone, hash);

  if (!inSendingHours(now)) {
    if (!hangupEnabled(deps.env)) return skip('disabled (would queue for 8:00)', phone, hash);
    const queued = await deps.db
      .prepare('INSERT OR IGNORE INTO hangup_queue (phone_hash, phone, call_id, queued_at, due_at) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(hash, phone, event.callId, now, nextMorning(now))
      .run();
    if ((queued.meta.changes ?? 0) === 0) return skip('already_queued', phone, hash);
    await log(deps, { callId: event.callId, hash, phone, decision: 'queued', reason: 'quiet_hours' });
    return { decision: 'queued', reason: 'quiet_hours' };
  }
  if (!hangupEnabled(deps.env)) return skip('disabled (would send)', phone, hash);
  return send(deps, quo, phone, hash, event.callId);
}

/**
 * Sends whatever is due from the overnight queue, re-checking every rule
 * first (someone may have texted them since). Runs on every Quo webhook and
 * on the scheduled ping (workers/hangup-flush). Safe to call any time.
 */
export async function flushQueue(deps: HangupDeps): Promise<Decision[]> {
  const now = deps.now();
  if (!inSendingHours(now)) return [];
  const due = (
    await deps.db
      .prepare('SELECT phone_hash, phone, call_id, queued_at FROM hangup_queue WHERE due_at <= ?1 ORDER BY due_at LIMIT 20')
      .bind(now)
      .all<{ phone_hash: string; phone: string; call_id: string | null; queued_at: number }>()
  ).results;
  const out: Decision[] = [];
  for (const row of due) {
    // Take the row first: a second flush running at the same moment gets nothing.
    const taken = await deps.db.prepare('DELETE FROM hangup_queue WHERE phone_hash = ?1 RETURNING phone_hash').bind(row.phone_hash).first();
    if (!taken) continue;
    const key = quoKey(deps.env);
    if (!hangupEnabled(deps.env) || !key) {
      await log(deps, { callId: row.call_id, hash: row.phone_hash, phone: row.phone, decision: 'skipped', reason: 'disabled' });
      out.push({ decision: 'skipped', reason: 'disabled' });
      continue;
    }
    const quo: QuoDeps = { key, fetch: deps.fetch };
    const blocked = await textingChecks(deps, quo, row.phone, row.phone_hash, null);
    if (blocked) {
      await log(deps, { callId: row.call_id, hash: row.phone_hash, phone: row.phone, decision: 'skipped', reason: blocked });
      out.push({ decision: 'skipped', reason: blocked });
      continue;
    }
    out.push(await send(deps, quo, row.phone, row.phone_hash, row.call_id));
  }
  return out;
}

/** Old decisions and call ids go after 90 days. */
export async function purgeHangup(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM hangup_log WHERE at < ?1').bind(now - 90 * DAY),
    db.prepare('DELETE FROM hangup_calls WHERE at < ?1').bind(now - 90 * DAY),
    db.prepare('DELETE FROM hangup_sent WHERE last_sent_at < ?1').bind(now - HANGUP_WINDOW - HOUR),
  ]);
}

// ---------------------------------------------------------------------------
// Webhook payloads
// ---------------------------------------------------------------------------

function time(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * call.completed in Quo's current payload (`data.resource` + `data.context`)
 * or the legacy one (`data.object`). Null for anything else.
 */
export function parseCallCompleted(body: unknown): CallEvent | null {
  const root = body as { type?: string; data?: Record<string, unknown> } | null;
  if (!root || root.type !== 'call.completed' || !root.data) return null;
  const resource = (root.data.resource ?? root.data.object) as Record<string, unknown> | undefined;
  if (!resource || typeof resource.id !== 'string') return null;
  const context = (root.data.context ?? {}) as { phoneNumberId?: string; participants?: { external?: string[] } };
  const external = context.participants?.external?.[0];
  const legacyFrom = typeof resource.from === 'string' ? resource.from : null;
  const direction = typeof resource.direction === 'string' ? resource.direction : null;
  return {
    callId: resource.id,
    phoneNumberId: context.phoneNumberId ?? (typeof resource.phoneNumberId === 'string' ? resource.phoneNumberId : null),
    direction,
    status: typeof resource.status === 'string' ? resource.status : null,
    caller: external ?? (direction === 'incoming' ? legacyFrom : null),
    createdAt: time(resource.createdAt),
    completedAt: time(resource.completedAt),
  };
}

/** The webhook signing secret: QUO_WEBHOOK_SECRET, else the key saved when the desk registered the webhook. */
export async function quoWebhookSecret(env: Env, db: D1Database): Promise<string | null> {
  const fromEnv = (env.QUO_WEBHOOK_SECRET ?? '').trim();
  if (fromEnv) return fromEnv;
  const key = adminKey(env);
  if (!key) return null;
  const saved = await kvGet<{ key?: string }>(db, 'quo_webhook');
  return saved?.key ? decryptSecret(key, saved.key) : null;
}
