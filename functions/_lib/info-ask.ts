import type { D1Database, Env } from './types.ts';
import { ensureDeskTypes, prune, type Sel } from './desk-schema.ts';
import { idType, run, schemaFor, type DeskJobber } from './desk-jobber.ts';
import { kvGet, kvSet, logDeskEvent } from './desk-db.ts';
import { DAY, MINUTE, bumpCounter, readCounter } from './db.ts';
import { EYS_NUMBER, listMessages, sendText, type QuoDeps, type QuoMessage } from './quo.ts';
import { inSendingHours, isUsNumber, skipList } from './hangup.ts';
import { applyName, e164, isEmptyCall, isPlaceholderName, phoneFromPlaceholder, realNameFrom, transcriptLines } from './client-names.ts';
import { addNote, fileUrls, isQuoRequest, noteList, NOTE_TYPES, readRequest, requestNumber, type DedupeRequest } from './request-dedupe.ts';
import { MAX_NOTE_CHARS, addRequestPhotos, canonicalTime, isQuoMediaUrl, type PhotoMedia } from './request-photos.ts';
import { createProperty, getPlan } from './jobber.ts';
import { claudeJson, type ClaudeDeps } from './claude.ts';

/**
 * The auto follow-up: a caller who left Jobber only a phone number gets one
 * text asking for what the quote still needs (their name, the job address,
 * photos), and whatever they text back is put on their Jobber request.
 *
 * Runs in the 10-minute sweep (POST /api/quo/flush), after the name fix and the
 * duplicate merge, in two phases:
 *
 * 1. Ask. A Quo per-call request ("Quo Request", status new, no quote) from a
 *    new caller, 30 minutes to 3 days old, still missing something. It waits
 *    while anyone texted with that number in the last 30 minutes (a person is
 *    on it) and outside 8:00 to 20:00 Central. It skips a caller already asked
 *    in the last 14 days, a number on HANGUP_SKIP_NUMBERS or outside the US, an
 *    empty call, and anything Claude judges wrong to text (wrong number, sales
 *    call, they already sent it all). Claude writes the text from the call and
 *    the recent texts; it is checked against the customer text rules and, if
 *    it fails or Claude is not set up, a fixed text is sent instead. At most 20
 *    a day. The text also goes on the request as a note.
 * 2. Replies. For 7 days, the customer's new texts to the EYS inbox go on the
 *    request as a note (photos attached, with the same "Quo message times"
 *    line the morning routine uses, so it never attaches them twice). Claude
 *    reads them for a name (renames a "New Call" client), an address (adds it
 *    to the client as a property) and the job. Done once the name, the address
 *    and a photo are all in.
 *
 * Mode (desk_kv 'info_ask_mode', set at POST /api/admin/info-ask): 'dry'
 * (default: decides, writes the text it would send to the log, sends and
 * writes nothing), 'live', or 'off'.
 */

export type InfoAskMode = 'off' | 'dry' | 'live';
export type Missing = 'name' | 'address' | 'photos';

const MODE_KEY = 'info_ask_mode';
const ACTOR = 'auto-follow-up';
/** Give the caller time to fill in the form from the missed-call text first. */
export const ASK_AFTER = 30 * MINUTE;
/** Older requests are someone's to follow up by hand. */
export const ASK_WITHIN = 3 * DAY;
/** A client this much older than the request is an existing customer, not a new caller. */
const NEW_CLIENT = 2 * DAY;
export const ASKED_RECENTLY = 14 * DAY;
/** A text either way this recently means a person is talking with them: wait. */
export const BUSY_WINDOW = 30 * MINUTE;
export const REPLY_WINDOW = 7 * DAY;
export const DAILY_CAP = 20;
const ASKS_PER_SWEEP = 4;
const MAX_TEXT = 320;
const SWEEP_SIZE = 100;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS info_asks (
    request_id TEXT PRIMARY KEY,
    client_id TEXT,
    phone TEXT,
    last4 TEXT,
    state TEXT NOT NULL,
    reason TEXT,
    body TEXT,
    message_id TEXT,
    seen TEXT NOT NULL DEFAULT '[]',
    photos INTEGER NOT NULL DEFAULT 0,
    property_id TEXT,
    created_at INTEGER NOT NULL,
    sent_at INTEGER,
    answered_at INTEGER,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS info_asks_client ON info_asks (client_id, created_at)',
  'CREATE INDEX IF NOT EXISTS info_asks_state ON info_asks (state, sent_at)',
];
const ready = new WeakSet<D1Database>();

export async function ensureInfoAskSchema(db: D1Database): Promise<void> {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

export async function infoAskMode(db: D1Database): Promise<InfoAskMode> {
  const mode = await kvGet<string>(db, MODE_KEY);
  return mode === 'live' || mode === 'off' ? mode : 'dry';
}

export async function setInfoAskMode(db: D1Database, mode: InfoAskMode, now: number): Promise<void> {
  await kvSet(db, MODE_KEY, mode, now);
}

export interface InfoAskRow {
  request_id: string;
  client_id: string | null;
  phone: string | null;
  last4: string | null;
  state: string;
  reason: string | null;
  body: string | null;
  message_id: string | null;
  seen: string;
  photos: number;
  property_id: string | null;
  created_at: number;
  sent_at: number | null;
  answered_at: number | null;
  updated_at: number;
}

export async function infoAsk(db: D1Database, requestId: string): Promise<InfoAskRow | null> {
  return (await db.prepare('SELECT * FROM info_asks WHERE request_id = ?1').bind(requestId).first<InfoAskRow>()) ?? null;
}

// ---------------------------------------------------------------------------
// The text
// ---------------------------------------------------------------------------

const ITEM: Record<Missing, string> = {
  name: 'your full name',
  address: 'the address for the job',
  photos: 'a few photos of the area',
};

/** The fixed text, used when Claude is not set up or its text fails the checks. */
export function templateAsk(firstName: string | null, missing: Missing[]): string {
  const hi = firstName ? `Hi ${firstName}` : 'Hi';
  return [`${hi}, it's EYS Handyman. Thanks for calling! To get your quote started, can you text back:`, ...missing.map((m) => `- ${ITEM[m]}`)].join('\n');
}

const BANNED = /licen[sc]ed|\binsured\b|\bHOA\b|\$|\bprices?\b|\bcosts?\b|discount|\bminutes?\b|\bhours?\b|\btoday\b|\btonight\b|\btomorrow\b|\basap\b|reply\s+stop|https?:|www\.|\.com\b/i;

/** Why a text breaks the customer text rules, or null when it is fine to send. */
export function textProblem(text: string): string | null {
  const t = text.trim();
  if (t.length < 20) return 'too_short';
  if (t.length > MAX_TEXT) return 'too_long';
  if (!/\bEYS\b/.test(t)) return 'no_eys';
  if (/[—–]/.test(t)) return 'long_dash';
  if (/\p{Extended_Pictographic}/u.test(t)) return 'emoji';
  if (BANNED.test(t)) return 'banned_word';
  if (!/^- \S/m.test(t)) return 'no_list';
  return null;
}

const ASK_SYSTEM = `You write one text message from Elevate Your Space Handyman ("EYS Handyman"), a handyman company in Katy, Texas, to a customer who called (346) 820-1629 but has not yet sent what the team needs to quote the job. The team reads the replies; your text only asks for what is missing.

The text:
- Starts with "Hi <first name>," when the first name is known, else "Hi,". Then says it's EYS Handyman and thanks them for calling, naming the job in a few of their own words (for example "about the accent wall").
- Then asks them to text back only the missing items, as a short list, one item per line, each line starting with "- ".
- Is under 300 characters in all. Plain and friendly, like a real person at a small local business.
- Never mentions prices, costs, discounts, timing, or how soon a quote, reply or visit will happen. Never says licensed or insured. Never mentions an HOA. No links, no emoji, no em or en dashes (use commas), no sign-off or name at the end, no "Reply STOP".
- Never asks for something they already gave on the call or by text.

Set send to false, with a short reason, when a text would be wrong: they already sent everything that is missing, they said they are not interested or found someone else, it was a wrong number, a sales, vendor or job-seeker call, spam, or a call about an existing job or invoice. Otherwise set send to true.`;

const ASK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['send', 'reason', 'text'],
  properties: {
    send: { type: 'boolean' },
    reason: { type: 'string' },
    text: { type: 'string' },
  },
};

const READ_SYSTEM = `You read text messages a customer sent to Elevate Your Space Handyman (EYS) after EYS asked for their name, the address for the job and photos. Pull out only what the customer actually wrote. Leave a field as an empty string when they did not give it; never guess or fill in from anywhere else. state is a two-letter code (TX when they say Texas or give a Texas city). zip is the 5-digit ZIP code. job is one short line, in plain words, on what they want done. summary is one or two plain sentences for the team about what the customer said, with no prices.`;

const READ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['first_name', 'last_name', 'street', 'city', 'state', 'zip', 'job', 'summary'],
  properties: {
    first_name: { type: 'string' },
    last_name: { type: 'string' },
    street: { type: 'string' },
    city: { type: 'string' },
    state: { type: 'string' },
    zip: { type: 'string' },
    job: { type: 'string' },
    summary: { type: 'string' },
  },
};

export interface ReadReply {
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  job: string;
  summary: string;
}

/** "Nov 20, 6:35 PM" in the shop's time zone. */
function chicago(iso: string | number | null | undefined): string {
  const ms = typeof iso === 'number' ? iso : Date.parse(iso ?? '');
  if (!Number.isFinite(ms)) return 'unknown time';
  return new Date(ms)
    .toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .replace(/[  ]/g, ' ');
}

function transcriptText(notes: { message?: string | null }[]): string {
  const lines = notes.flatMap((n) => transcriptLines(n.message) ?? []);
  const text = lines.map((l) => `${l.caller ? 'Caller' : 'EYS'}: ${l.text}`).join('\n');
  return text.length > 8000 ? text.slice(-8000) : text;
}

function textsText(messages: QuoMessage[]): string {
  const sorted = [...messages].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
  return sorted
    .slice(-20)
    .map((m) => {
      const files = (m.media ?? []).length;
      const who = m.direction === 'incoming' ? 'Customer' : 'EYS';
      return `${who} (${chicago(m.createdAt)}): ${(m.text ?? '').trim() || '(no text)'}${files ? ` [${files} photo${files === 1 ? '' : 's'}]` : ''}`;
    })
    .join('\n');
}

export interface AskDraft {
  send: boolean;
  reason: string;
  text: string;
  /** 'claude' when Claude wrote it and it passed the checks; 'template' otherwise. */
  by: 'claude' | 'template';
}

/** Claude's text when it passes the checks, else the fixed one. Claude may also say not to text at all. */
export async function draftAsk(
  claude: ClaudeDeps | null,
  input: { firstName: string | null; missing: Missing[]; transcript: string; texts: string },
): Promise<AskDraft> {
  const fallback = (reason: string): AskDraft => ({ send: true, reason, text: templateAsk(input.firstName, input.missing), by: 'template' });
  if (!claude) return fallback('no_claude_key');
  const prompt = [
    `Missing for the quote: ${input.missing.map((m) => ITEM[m].replace(/^your |^the |^a few /, '')).join(', ')}`,
    `First name: ${input.firstName ?? 'unknown'}`,
    '',
    'Call transcript (Caller and EYS):',
    input.transcript || '(none)',
    '',
    'Texts with this number in the last 7 days, oldest first:',
    input.texts || '(none)',
  ].join('\n');
  const answer = await claudeJson<{ send?: unknown; reason?: unknown; text?: unknown }>(claude, { system: ASK_SYSTEM, prompt, schema: ASK_SCHEMA, effort: 'medium' });
  if (!answer || typeof answer.send !== 'boolean') return fallback('claude_unavailable');
  const reason = typeof answer.reason === 'string' ? answer.reason.slice(0, 200) : '';
  if (!answer.send) return { send: false, reason: reason || 'claude_said_no', text: '', by: 'claude' };
  const text = typeof answer.text === 'string' ? answer.text.trim() : '';
  const problem = textProblem(text);
  if (problem) return fallback(`claude_text_${problem}`);
  return { send: true, reason, text, by: 'claude' };
}

/** What Claude read from the customer's replies, or null. */
export async function readReplies(claude: ClaudeDeps | null, messages: QuoMessage[]): Promise<ReadReply | null> {
  const texts = messages.filter((m) => (m.text ?? '').trim());
  if (!claude || texts.length === 0) return null;
  const answer = await claudeJson<ReadReply>(claude, { system: READ_SYSTEM, prompt: `The customer's texts, oldest first:\n${textsText(texts)}`, schema: READ_SCHEMA, effort: 'low', maxTokens: 4000 });
  if (!answer) return null;
  const clean = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return {
    first_name: clean(answer.first_name, 40),
    last_name: clean(answer.last_name, 40),
    street: clean(answer.street),
    city: clean(answer.city, 60),
    state: clean(answer.state, 2).toUpperCase(),
    zip: clean(answer.zip, 10),
    job: clean(answer.job, 200),
    summary: clean(answer.summary, 400),
  };
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

interface AskRequest extends DedupeRequest {
  property?: { id?: string } | null;
  client?: { id?: string | null; name?: string | null; firstName?: string | null; createdAt?: string | null; phones?: ({ number?: string | null } | null)[] | null } | null;
}

const REQUEST_SEL: Sel = {
  id: true,
  title: true,
  source: true,
  requestStatus: true,
  createdAt: true,
  property: { sel: { id: true } },
  client: { sel: { id: true, name: true, firstName: true, createdAt: true, phones: { sel: { number: true } } } },
  quotes: { args: { first: '1' }, sel: { nodes: { sel: { id: true } } } },
  assessment: { sel: { id: true } },
};

export interface InfoAskDeps {
  j: DeskJobber;
  env: Env;
  quo: QuoDeps | null;
  claude: ClaudeDeps | null;
  now: number;
  /** Adds an address to the client as a Jobber property; the intake's propertyCreate unless a test swaps it. */
  addProperty?: (clientId: string, address: { street1: string; city: string; province: string; postalCode: string }) => Promise<string>;
}

async function intakeAddProperty(j: DeskJobber, clientId: string, address: { street1: string; city: string; province: string; postalCode: string }): Promise<string> {
  return createProperty(j.deps, await getPlan(j.deps), clientId, address);
}

export interface InfoAskSummary {
  mode: InfoAskMode;
  checked: number;
  asked: { requestId: string; number: string; client: string | null; by: string; text: string }[];
  wouldAsk: { requestId: string; number: string; client: string | null; by: string; text: string }[];
  skipped: { requestId: string; number: string; reason: string }[];
  waiting: { requestId: string; number: string; reason: string }[];
  replies: { requestId: string; number: string; messages: number; photos: number; renamed: string | null; address: string | null; answered: boolean; read?: ReadReply | null }[];
  failed: { requestId: string; number: string; reason: string }[];
}

function isNewCaller(r: AskRequest): boolean {
  if (isPlaceholderName(r.client?.name)) return true;
  const requested = Date.parse(r.createdAt ?? '');
  const created = Date.parse(r.client?.createdAt ?? '');
  return Number.isFinite(requested) && Number.isFinite(created) && requested - created <= NEW_CLIENT;
}

export function isAskCandidate(r: AskRequest, now: number): boolean {
  if (!r.id || !isQuoRequest(r)) return false;
  if ((r.requestStatus ?? '').toLowerCase() !== 'new') return false;
  if ((r.quotes?.nodes ?? []).some(Boolean) || r.assessment) return false;
  const at = Date.parse(r.createdAt ?? '');
  if (!Number.isFinite(at)) return false;
  const age = now - at;
  if (age < ASK_AFTER || age > ASK_WITHIN) return false;
  return isNewCaller(r);
}

function phoneOf(r: AskRequest): string | null {
  const fromName = phoneFromPlaceholder(r.client?.name);
  if (fromName) return fromName;
  for (const p of r.client?.phones ?? []) {
    const n = e164(p?.number);
    if (n) return n;
  }
  return null;
}

function firstNameOf(r: AskRequest): string | null {
  if (isPlaceholderName(r.client?.name)) return null;
  const first = (r.client?.firstName ?? r.client?.name ?? '').trim().split(/\s+/)[0] ?? '';
  return /^\p{L}[\p{L}'’-]{0,30}$/u.test(first) ? first : null;
}

async function recordSkip(db: D1Database, r: AskRequest, phone: string | null, reason: string, now: number): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO info_asks (request_id, client_id, phone, last4, state, reason, created_at, updated_at)
       VALUES (?1, ?2, NULL, ?3, 'skipped', ?4, ?5, ?5)`,
    )
    .bind(r.id, r.client?.id ?? null, phone ? phone.slice(-4) : null, reason.slice(0, 200), now)
    .run();
}

async function sentToday(db: D1Database, now: number): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM info_asks WHERE sent_at > ?1`).bind(now - DAY).first<{ n: number }>();
  return row?.n ?? 0;
}

async function askedClientRecently(db: D1Database, clientId: string | null | undefined, now: number): Promise<boolean> {
  if (!clientId) return false;
  const row = await db
    .prepare(`SELECT 1 AS hit FROM info_asks WHERE client_id = ?1 AND sent_at IS NOT NULL AND sent_at > ?2 LIMIT 1`)
    .bind(clientId, now - ASKED_RECENTLY)
    .first<{ hit: number }>();
  return !!row;
}

async function quoTexts(quo: QuoDeps, phone: string, since: number): Promise<QuoMessage[] | null> {
  const [incoming, outgoing] = await Promise.all([listMessages(quo, phone, since, 'incoming'), listMessages(quo, phone, since, 'outgoing')]);
  if (!incoming || !outgoing) return null;
  return [...incoming, ...outgoing];
}

/** Phase 1: text new callers whose request is still missing something. */
async function askPhase(deps: InfoAskDeps, mode: InfoAskMode, summary: InfoAskSummary): Promise<void> {
  const { j, env, now } = deps;
  const db = j.db;
  const schema = await schemaFor(j);
  await ensureDeskTypes(j.deps, db, schema, NOTE_TYPES);
  const data = await run<{ requests?: { nodes?: (AskRequest | null)[] } | null }>(j, (s) => {
    const field = s.queries.requests;
    if (!field) return null;
    const args = [`first: ${SWEEP_SIZE}`];
    if (field.args.sort && s.types.RequestsSortKey?.enumValues.includes('REQUESTED_AT')) args.push('sort: [{ key: REQUESTED_AT, direction: DESCENDING }]');
    const selection = prune(s, field.type, { nodes: { sel: REQUEST_SEL } });
    return { query: `query EysInfoAskSweep { requests(${args.join(', ')}) { ${selection} } }` };
  });
  const candidates = (data?.requests?.nodes ?? []).filter((n): n is AskRequest => !!n && isAskCandidate(n, now));
  summary.checked = candidates.length;
  const skips = skipList(env);
  let budget = ASKS_PER_SWEEP;
  for (const r of candidates) {
    if (budget <= 0) break;
    const number = requestNumber(r.id);
    if (await infoAsk(db, r.id)) continue;
    if (mode === 'dry' && (await readCounter(db, `infoask-dry:${r.id}`)) > 0) continue;
    const phone = phoneOf(r);
    const skip = async (reason: string) => {
      summary.skipped.push({ requestId: r.id, number, reason });
      if (mode === 'live') await recordSkip(db, r, phone, reason, now);
      else await bumpCounter(db, `infoask-dry:${r.id}`, DAY, now);
    };
    if (!phone) {
      await skip('no_phone');
      continue;
    }
    if (!isUsNumber(phone)) {
      await skip('non_us');
      continue;
    }
    if (skips.has(phone)) {
      await skip('skip_list');
      continue;
    }
    if (await askedClientRecently(db, r.client?.id, now)) {
      await skip('asked_recently');
      continue;
    }
    const notes = noteList(await readRequest(j, r.id));
    if (isEmptyCall(notes.map((n) => ({ message: n.message, files: fileUrls(n).length })))) {
      await skip('empty_call');
      continue;
    }
    if (!deps.quo) {
      summary.waiting.push({ requestId: r.id, number, reason: 'no_quo_key' });
      continue;
    }
    const texts = await quoTexts(deps.quo, phone, now - REPLY_WINDOW);
    if (!texts) {
      summary.waiting.push({ requestId: r.id, number, reason: 'quo_unavailable' });
      continue;
    }
    if (texts.some((m) => now - Date.parse(m.createdAt ?? '') < BUSY_WINDOW)) {
      summary.waiting.push({ requestId: r.id, number, reason: 'texting_now' });
      continue;
    }
    const photosOnRequest = notes.reduce((sum, n) => sum + fileUrls(n).length, 0);
    const photosTexted = texts.some((m) => m.direction === 'incoming' && (m.media ?? []).length > 0);
    const missing: Missing[] = [];
    if (isPlaceholderName(r.client?.name)) missing.push('name');
    if (!r.property?.id) missing.push('address');
    if (photosOnRequest === 0 && !photosTexted) missing.push('photos');
    if (missing.length === 0) {
      await skip('nothing_missing');
      continue;
    }
    budget--;
    const draft = await draftAsk(deps.claude, { firstName: firstNameOf(r), missing, transcript: transcriptText(notes), texts: textsText(texts) });
    if (!draft.send) {
      await skip(`not_texting: ${draft.reason}`);
      continue;
    }
    const entry = { requestId: r.id, number, client: r.client?.name ?? null, by: draft.by, text: draft.text };
    if (mode === 'dry') {
      summary.wouldAsk.push(entry);
      await bumpCounter(db, `infoask-dry:${r.id}`, DAY, now);
      await logDeskEvent(db, { actor: ACTOR, action: 'info_ask_would_send', detail: `Request #${number} (${draft.by}): ${draft.text}`.slice(0, 600), now });
      continue;
    }
    if (!inSendingHours(now)) {
      summary.waiting.push({ requestId: r.id, number, reason: 'quiet_hours' });
      continue;
    }
    if ((await sentToday(db, now)) >= DAILY_CAP) {
      summary.waiting.push({ requestId: r.id, number, reason: 'daily_cap' });
      continue;
    }
    // Claim the request: only one sweep can text it.
    const claim = await db
      .prepare(
        `INSERT OR IGNORE INTO info_asks (request_id, client_id, phone, last4, state, body, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'sending', ?5, ?6, ?6)`,
      )
      .bind(r.id, r.client?.id ?? null, phone, phone.slice(-4), draft.text, now)
      .run();
    if ((claim.meta.changes ?? 0) === 0) continue;
    const sent = await sendText(deps.quo, phone, draft.text);
    if (sent.ok) {
      await db
        .prepare(`UPDATE info_asks SET state = 'sent', message_id = ?2, sent_at = ?3, reason = ?4, updated_at = ?3 WHERE request_id = ?1`)
        .bind(r.id, sent.id, now, draft.by)
        .run();
      summary.asked.push(entry);
      await logDeskEvent(db, { actor: ACTOR, action: 'info_ask_sent', detail: `Request #${number} (${draft.by})`, now });
      await addNote(j, r.id, `Auto follow-up text sent to the customer, ${chicago(now)}:\n${draft.text}`, []).catch(() => null);
    } else {
      // A definite no from Quo: nothing went out. Otherwise it may have: never resend.
      const state = sent.definite ? 'failed' : 'unknown';
      await db
        .prepare(`UPDATE info_asks SET state = ?2, reason = ?3, phone = NULL, updated_at = ?4 WHERE request_id = ?1`)
        .bind(r.id, state, sent.reason.slice(0, 200), now)
        .run();
      summary.failed.push({ requestId: r.id, number, reason: sent.reason });
      await logDeskEvent(db, { actor: ACTOR, action: `info_ask_${state}`, detail: `Request #${number}: ${sent.reason}`.slice(0, 300), now });
    }
  }
}

interface ReplyRequest {
  id?: string;
  property?: { id?: string } | null;
  client?: { id?: string | null; name?: string | null } | null;
}

async function readReplyRequest(j: DeskJobber, id: string): Promise<ReplyRequest | null> {
  const data = await run<{ request?: ReplyRequest | null }>(j, (s) => {
    if (!s.queries.request) return null;
    const selection = prune(s, s.queries.request.type, { id: true, property: { sel: { id: true } }, client: { sel: { id: true, name: true } } });
    return { query: `query EysInfoAskRequest($id: ${idType(s, 'request')}) { request(id: $id) { ${selection} } }`, variables: { id } };
  });
  return data?.request ?? null;
}

function mediaOf(messages: QuoMessage[]): { quo: PhotoMedia[]; other: number } {
  const quo: PhotoMedia[] = [];
  let other = 0;
  for (const m of messages) {
    const sentAt = canonicalTime(m.createdAt ?? '');
    for (const file of m.media ?? []) {
      if (file?.url && sentAt && isQuoMediaUrl(file.url)) quo.push({ url: file.url, sentAt, contentType: file.type ?? null });
      else other++;
    }
  }
  return { quo, other };
}

/** Phase 2: put the customer's replies on the request and read them. */
async function replyPhase(deps: InfoAskDeps, mode: InfoAskMode, summary: InfoAskSummary): Promise<void> {
  const { j, now } = deps;
  const db = j.db;
  const rows = (await db.prepare(`SELECT * FROM info_asks WHERE state = 'sent'`).all<InfoAskRow>()).results ?? [];
  for (const row of rows) {
    const number = requestNumber(row.request_id);
    if (!row.phone || !row.sent_at || now - row.sent_at > REPLY_WINDOW) {
      if (mode === 'live') {
        await db.prepare(`UPDATE info_asks SET state = 'expired', phone = NULL, updated_at = ?2 WHERE request_id = ?1`).bind(row.request_id, now).run();
        await logDeskEvent(db, { actor: ACTOR, action: 'info_ask_expired', detail: `Request #${number}`, now });
      }
      continue;
    }
    if (!deps.quo) continue;
    const incoming = await listMessages(deps.quo, row.phone, row.sent_at - 1000, 'incoming');
    if (!incoming) continue;
    let seen: string[] = [];
    try {
      seen = JSON.parse(row.seen) as string[];
    } catch {
      seen = [];
    }
    const fresh = incoming
      .filter((m) => m.id && !seen.includes(m.id))
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
    if (fresh.length === 0) continue;
    const media = mediaOf(fresh);
    const all = [...incoming].sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
    const read = await readReplies(deps.claude, all);
    const entry: InfoAskSummary['replies'][number] = { requestId: row.request_id, number, messages: fresh.length, photos: media.quo.length + media.other, renamed: null, address: null, answered: false };
    if (mode !== 'live') {
      summary.replies.push({ ...entry, read });
      continue;
    }

    // 1. The texts and photos go on the request.
    const lines = fresh.map((m) => {
      const files = (m.media ?? []).length;
      return `${chicago(m.createdAt)}: ${(m.text ?? '').trim() || '(no text)'}${files ? ` [${files} photo${files === 1 ? '' : 's'}]` : ''}`;
    });
    const head = `Customer texted back after the auto follow-up (Quo, (346) 820-1629):`;
    const note = [head, ...lines].join('\n').slice(0, MAX_NOTE_CHARS - 300);
    let written = false;
    let photosAdded = 0;
    if (media.quo.length) {
      const result = await addRequestPhotos(j.deps, { requestId: row.request_id, note, media: media.quo, dryRun: false }, { live: true });
      if (result.status < 300 && ['attached', 'processing', 'already_attached'].includes(String(result.body.status))) {
        written = true;
        photosAdded = media.quo.length;
      }
    }
    if (!written) {
      const extra = media.quo.length || media.other ? `\n(${media.quo.length + media.other} photo(s) are in the Quo conversation; they could not be attached here.)` : '';
      const added = await addNote(j, row.request_id, `${note}${extra}`, []).catch(() => ({ noteId: null }));
      if (!added.noteId) {
        summary.failed.push({ requestId: row.request_id, number, reason: 'note_failed' });
        continue; // try again next sweep
      }
    }
    const photos = row.photos + photosAdded;

    // 2. What the replies say: a name and an address.
    const request = await readReplyRequest(j, row.request_id);
    let propertyId = row.property_id ?? request?.property?.id ?? null;
    let clientName = request?.client?.name ?? null;
    if (read && request?.client?.id) {
      const real = realNameFrom(`${read.first_name} ${read.last_name}`);
      if (real && isPlaceholderName(clientName)) {
        const renamed = await applyName(j, { id: request.client.id, name: clientName }, real, 'text', false);
        if (renamed.status === 'renamed') {
          entry.renamed = renamed.to;
          clientName = renamed.to;
        }
      }
      if (!propertyId && /\d/.test(read.street) && read.city && /^\d{5}$/.test(read.zip)) {
        try {
          const address = { street1: read.street, city: read.city, province: read.state || 'TX', postalCode: read.zip };
          propertyId = deps.addProperty ? await deps.addProperty(request.client.id, address) : await intakeAddProperty(j, request.client.id, address);
          entry.address = `${read.street}, ${read.city}, ${read.state || 'TX'} ${read.zip}`;
          await logDeskEvent(db, { actor: ACTOR, action: 'info_ask_address_added', detail: `Request #${number}`, now });
        } catch (error) {
          await logDeskEvent(db, { actor: ACTOR, action: 'info_ask_address_failed', detail: `Request #${number}: ${(error as { errorClass?: string })?.errorClass ?? 'error'}`, now });
        }
      }
      const details = [
        read.first_name || read.last_name ? `Name: ${`${read.first_name} ${read.last_name}`.trim()}` : null,
        read.street ? `Address: ${[read.street, read.city, read.state, read.zip].filter(Boolean).join(', ')}` : null,
        read.job ? `Job: ${read.job}` : null,
        read.summary ? `Summary: ${read.summary}` : null,
      ].filter(Boolean);
      if (details.length) await addNote(j, row.request_id, `Read from the customer's texts (AI):\n${details.join('\n')}`, []).catch(() => null);
    }

    // 3. Done once the name, the address and a photo are all in.
    const answered = !isPlaceholderName(clientName) && !!propertyId && photos > 0;
    entry.answered = answered;
    await db
      .prepare(
        `UPDATE info_asks SET seen = ?2, photos = ?3, property_id = ?4, state = ?5, answered_at = ?6, phone = ?7, updated_at = ?8 WHERE request_id = ?1`,
      )
      .bind(
        row.request_id,
        JSON.stringify([...seen, ...fresh.map((m) => m.id)].slice(-200)),
        photos,
        propertyId,
        answered ? 'answered' : 'sent',
        answered ? now : null,
        answered ? null : row.phone,
        now,
      )
      .run();
    await logDeskEvent(db, { actor: ACTOR, action: answered ? 'info_ask_answered' : 'info_ask_reply', detail: `Request #${number}: ${fresh.length} text(s), ${photosAdded} photo(s) attached`, now });
    summary.replies.push(entry);
  }
}

/** Both phases. `dryRun` forces 'dry' whatever the saved mode. */
export async function sweepInfoAsks(deps: InfoAskDeps, options: { dryRun?: boolean } = {}): Promise<InfoAskSummary> {
  await ensureInfoAskSchema(deps.j.db);
  const saved = await infoAskMode(deps.j.db);
  const mode: InfoAskMode = options.dryRun && saved !== 'off' ? 'dry' : saved;
  const summary: InfoAskSummary = { mode, checked: 0, asked: [], wouldAsk: [], skipped: [], waiting: [], replies: [], failed: [] };
  if (mode === 'off') return summary;
  await askPhase(deps, mode, summary);
  await replyPhase(deps, mode, summary);
  return summary;
}

/**
 * For checking the prompts on a real request without texting anyone: what the
 * ask would say for this request (window, hours and repeat rules ignored), and
 * what Claude reads from that number's texts of the last 7 days. Writes nothing.
 */
export async function previewInfoAsk(deps: InfoAskDeps, requestId: string): Promise<Record<string, unknown>> {
  const { j, now } = deps;
  const schema = await schemaFor(j);
  await ensureDeskTypes(j.deps, j.db, schema, NOTE_TYPES);
  const data = await run<{ request?: AskRequest | null }>(j, (s) => {
    if (!s.queries.request) return null;
    const selection = prune(s, s.queries.request.type, REQUEST_SEL);
    return { query: `query EysInfoAskPreview($id: ${idType(s, 'request')}) { request(id: $id) { ${selection} } }`, variables: { id: requestId } };
  });
  const r = data?.request;
  if (!r?.id) return { error: 'request_not_found' };
  const phone = phoneOf(r);
  const notes = noteList(await readRequest(j, r.id));
  const texts = phone && deps.quo ? await quoTexts(deps.quo, phone, now - REPLY_WINDOW) : null;
  const photosOnRequest = notes.reduce((sum, n) => sum + fileUrls(n).length, 0);
  const missing: Missing[] = [];
  if (isPlaceholderName(r.client?.name)) missing.push('name');
  if (!r.property?.id) missing.push('address');
  if (photosOnRequest === 0 && !(texts ?? []).some((m) => m.direction === 'incoming' && (m.media ?? []).length > 0)) missing.push('photos');
  const draft = missing.length
    ? await draftAsk(deps.claude, { firstName: firstNameOf(r), missing, transcript: transcriptText(notes), texts: textsText(texts ?? []) })
    : null;
  const incoming = (texts ?? []).filter((m) => m.direction === 'incoming');
  return {
    request: requestNumber(r.id),
    candidate_now: isAskCandidate(r, now),
    new_caller: isNewCaller(r),
    missing,
    quo_texts: texts ? texts.length : null,
    media_hosts: [...new Set(incoming.flatMap((m) => (m.media ?? []).map((f) => { try { return new URL(String(f.url)).host; } catch { return 'bad_url'; } })))],
    draft,
    read: await readReplies(deps.claude, incoming),
    claude: deps.claude ? 'set' : 'not_set',
    eys_number: EYS_NUMBER,
  };
}
