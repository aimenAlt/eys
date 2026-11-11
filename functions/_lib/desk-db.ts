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
