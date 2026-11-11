import type { D1Database } from './types.ts';
import { DAY } from './db.ts';

/**
 * D1 tables for Essa's Quote Desk and the /q/ quote intro, in the same
 * eys-ai-intake database (binding EYS_AI_DB). Created lazily, like
 * functions/_lib/db.ts: CREATE ... IF NOT EXISTS the first time an isolate
 * needs them. New tables are added to the end; an existing table's columns are
 * never changed here (that would need an ALTER, which this pattern does not do).
 *
 * q_links holds what the intro page shows (first name, quote title, the Client
 * Hub link) because the page must render without calling Jobber.
 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS q_links (
    code TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL UNIQUE,
    client_id TEXT,
    first_name TEXT NOT NULL,
    title TEXT,
    hub_url TEXT NOT NULL,
    review_id TEXT,
    created_at INTEGER NOT NULL,
    served_count INTEGER NOT NULL DEFAULT 0,
    opened_at INTEGER,
    open_count INTEGER NOT NULL DEFAULT 0,
    clicked_at INTEGER,
    click_count INTEGER NOT NULL DEFAULT 0
  )`,
  // Every desk action and system decision: who, what, when.
  `CREATE TABLE IF NOT EXISTS desk_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    quote_id TEXT,
    detail TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS desk_events_quote ON desk_events (quote_id, at)',
  // Small cached values: the Jobber schema snapshot, the status branch.
  `CREATE TABLE IF NOT EXISTS desk_kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // One row per quote the desk has acted on. text_state is the one-text-ever
  // guard: none -> sending (claimed) -> sent | failed | unknown.
  `CREATE TABLE IF NOT EXISTS desk_quotes (
    quote_id TEXT PRIMARY KEY,
    client_id TEXT,
    quote_number TEXT,
    first_name TEXT,
    title TEXT,
    state TEXT NOT NULL DEFAULT 'open',
    approved_by TEXT,
    approved_at INTEGER,
    hidden_by TEXT,
    hidden_at INTEGER,
    move_branch TEXT,
    move_state TEXT NOT NULL DEFAULT 'none',
    move_at INTEGER,
    move_error TEXT,
    jobber_status TEXT,
    awaiting_seen_at INTEGER,
    text_state TEXT NOT NULL DEFAULT 'none',
    text_owner TEXT,
    text_claimed_at INTEGER,
    text_to TEXT,
    text_body TEXT,
    text_message_id TEXT,
    text_status TEXT,
    text_error TEXT,
    text_sent_at INTEGER,
    q_code TEXT,
    hub_viewed_at INTEGER,
    quote_approved_at INTEGER,
    updated_at INTEGER NOT NULL
  )`,
  // "Needs a change" notes, kept whether or not Jobber took the note.
  `CREATE TABLE IF NOT EXISTS desk_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    note TEXT NOT NULL,
    at INTEGER NOT NULL,
    jobber_note TEXT
  )`,
  // Webhook delivery ids already handled (Jobber and Quo both retry).
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    topic TEXT,
    item_id TEXT,
    received_at INTEGER NOT NULL
  )`,
];

/** An intro link outlives the quote's usual life; after a year it shows the phone-number page. */
export const Q_LINK_RETENTION = 365 * DAY;

const ready = new WeakSet<object>();

export async function ensureDeskSchema(db: D1Database): Promise<void> {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

export interface QLinkRow {
  code: string;
  quote_id: string;
  client_id: string | null;
  first_name: string;
  title: string | null;
  hub_url: string;
  review_id: string | null;
  created_at: number;
  served_count: number;
  opened_at: number | null;
  open_count: number;
  clicked_at: number | null;
  click_count: number;
}

export async function findQLink(db: D1Database, code: string, now: number): Promise<QLinkRow | null> {
  return db
    .prepare('SELECT * FROM q_links WHERE code = ?1 AND created_at >= ?2')
    .bind(code, now - Q_LINK_RETENTION)
    .first<QLinkRow>();
}

export async function findQLinkByQuote(db: D1Database, quoteId: string): Promise<QLinkRow | null> {
  return db.prepare('SELECT * FROM q_links WHERE quote_id = ?1').bind(quoteId).first<QLinkRow>();
}

export interface NewQLink {
  code: string;
  quoteId: string;
  clientId: string | null;
  firstName: string;
  title: string | null;
  hubUrl: string;
  reviewId: string;
  now: number;
}

/**
 * One link per quote: a second call for the same quote returns the row that
 * already exists instead of minting a new code. 'collision' means the random
 * code was taken (try again with a new one).
 */
export async function insertQLink(db: D1Database, link: NewQLink): Promise<QLinkRow | 'collision'> {
  const existing = await findQLinkByQuote(db, link.quoteId);
  if (existing) return existing;
  try {
    await db
      .prepare(
        `INSERT INTO q_links (code, quote_id, client_id, first_name, title, hub_url, review_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(link.code, link.quoteId, link.clientId, link.firstName, link.title, link.hubUrl, link.reviewId, link.now)
      .run();
  } catch (error) {
    const message = String(error);
    if (/quote_id/i.test(message)) {
      const raced = await findQLinkByQuote(db, link.quoteId);
      if (raced) return raced;
    }
    if (/code|PRIMARY|UNIQUE/i.test(message)) return 'collision';
    throw error;
  }
  const row = await findQLinkByQuote(db, link.quoteId);
  if (!row) throw new Error('q_links insert not readable');
  return row;
}

export async function markQLinkServed(db: D1Database, code: string): Promise<void> {
  await db.prepare('UPDATE q_links SET served_count = served_count + 1 WHERE code = ?1').bind(code).run();
}

export type QLinkEvent = 'open' | 'click';

/** First time wins for the timestamp; every event counts. False when the code is unknown. */
export async function recordQLinkEvent(db: D1Database, code: string, event: QLinkEvent, now: number): Promise<boolean> {
  const sql =
    event === 'open'
      ? 'UPDATE q_links SET opened_at = COALESCE(opened_at, ?2), open_count = open_count + 1 WHERE code = ?1'
      : 'UPDATE q_links SET clicked_at = COALESCE(clicked_at, ?2), click_count = click_count + 1 WHERE code = ?1';
  const result = await db.prepare(sql).bind(code, now).run();
  return (result.meta.changes ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// desk_kv and desk_events
// ---------------------------------------------------------------------------

export async function kvGet<T>(db: D1Database, key: string): Promise<T | null> {
  const row = await db.prepare('SELECT value FROM desk_kv WHERE key = ?1').bind(key).first<{ value: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function kvSet(db: D1Database, key: string, value: unknown, now: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO desk_kv (key, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, JSON.stringify(value), now)
    .run();
}

/** Who did what, when. `detail` is short and never carries a token or a full phone number. */
export async function logDeskEvent(
  db: D1Database,
  event: { actor: string; action: string; quoteId?: string | null; detail?: string | null; now: number },
): Promise<void> {
  await db
    .prepare('INSERT INTO desk_events (at, actor, action, quote_id, detail) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(event.now, event.actor, event.action, event.quoteId ?? null, event.detail ? event.detail.slice(0, 500) : null)
    .run();
}

export interface DeskQuoteRow {
  quote_id: string;
  client_id: string | null;
  quote_number: string | null;
  first_name: string | null;
  title: string | null;
  /** marked = moved to Awaiting Response on purpose without a text. */
  state: 'open' | 'approved' | 'hidden' | 'marked';
  approved_by: string | null;
  approved_at: number | null;
  hidden_by: string | null;
  hidden_at: number | null;
  move_branch: string | null;
  move_state: string;
  move_at: number | null;
  move_error: string | null;
  jobber_status: string | null;
  awaiting_seen_at: number | null;
  text_state: 'none' | 'sending' | 'sent' | 'failed' | 'unknown';
  text_owner: string | null;
  text_claimed_at: number | null;
  text_to: string | null;
  text_body: string | null;
  text_message_id: string | null;
  text_status: string | null;
  text_error: string | null;
  text_sent_at: number | null;
  q_code: string | null;
  hub_viewed_at: number | null;
  quote_approved_at: number | null;
  updated_at: number;
}

export async function deskQuote(db: D1Database, quoteId: string): Promise<DeskQuoteRow | null> {
  return db.prepare('SELECT * FROM desk_quotes WHERE quote_id = ?1').bind(quoteId).first<DeskQuoteRow>();
}

export async function deskQuotes(db: D1Database): Promise<DeskQuoteRow[]> {
  return (await db.prepare('SELECT * FROM desk_quotes').all<DeskQuoteRow>()).results;
}
