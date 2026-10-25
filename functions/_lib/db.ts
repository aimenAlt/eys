import type { D1Database } from './types.ts';

/**
 * D1 schema for AI intake. Created lazily (CREATE ... IF NOT EXISTS) the
 * first time an isolate needs it, so no migration step exists.
 *
 * What is stored, deliberately: Jobber tokens (encrypted), one-time OAuth
 * states, and per-submission metadata — a keyed hash of the phone, the ZIP,
 * source, reference, request_id, status and timestamps — plus rate-limit
 * counters. Never names, addresses or job text. Rows older than 30 days are
 * purged.
 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS jobber_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    access_expires_at INTEGER NOT NULL,
    refresh_token TEXT NOT NULL,
    account_id TEXT,
    account_name TEXT,
    token_status TEXT NOT NULL DEFAULT 'valid',
    lock_owner TEXT,
    lock_until INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_requests (
    reference TEXT PRIMARY KEY,
    request_id TEXT UNIQUE,
    phone_hash TEXT NOT NULL,
    zip TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS ai_requests_phone_zip ON ai_requests (phone_hash, zip, created_at)',
  `CREATE TABLE IF NOT EXISTS rate_counters (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
];

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
const RETENTION = 30 * DAY;

export type RequestStatus = 'pending' | 'submitted' | 'unverified' | 'failed';

const ready = new WeakSet<object>();

export async function ensureSchema(db: D1Database): Promise<void> {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
  ready.add(db);
}

/** Increments a fixed-window counter and returns the new count. */
export async function bumpCounter(db: D1Database, key: string, ttl: number, now: number): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO rate_counters (key, count, expires_at) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, now + ttl)
    .first<{ count: number }>();
  return row?.count ?? 1;
}

export async function readCounter(db: D1Database, key: string): Promise<number> {
  const row = await db
    .prepare('SELECT count FROM rate_counters WHERE key = ?1')
    .bind(key)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function purgeExpired(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM ai_requests WHERE created_at < ?1').bind(now - RETENTION),
    db.prepare('DELETE FROM rate_counters WHERE expires_at < ?1').bind(now),
    db.prepare('DELETE FROM oauth_states WHERE expires_at < ?1').bind(now),
  ]);
}

export interface RequestRow {
  reference: string;
  request_id: string | null;
  status: RequestStatus;
  created_at: number;
}

export async function findByRequestId(db: D1Database, requestId: string): Promise<RequestRow | null> {
  return db
    .prepare('SELECT reference, request_id, status, created_at FROM ai_requests WHERE request_id = ?1')
    .bind(requestId)
    .first<RequestRow>();
}

/** Lets a request_id older than its 24-hour window be used again. */
export async function releaseRequestId(db: D1Database, requestId: string): Promise<void> {
  await db.prepare('UPDATE ai_requests SET request_id = NULL WHERE request_id = ?1').bind(requestId).run();
}

export async function findRecentDuplicate(
  db: D1Database,
  phoneHash: string,
  zip: string,
  since: number,
): Promise<RequestRow | null> {
  return db
    .prepare(
      `SELECT reference, request_id, status, created_at FROM ai_requests
       WHERE phone_hash = ?1 AND zip = ?2 AND created_at >= ?3
         AND status IN ('pending', 'submitted', 'unverified')
       ORDER BY created_at ASC LIMIT 1`,
    )
    .bind(phoneHash, zip, since)
    .first<RequestRow>();
}

export interface NewRequestRow {
  reference: string;
  requestId: string | null;
  phoneHash: string;
  zip: string;
  source: string;
  now: number;
}

/**
 * Reserves the reference as 'pending' before anything is written to Jobber.
 * Returns 'conflict' when the request_id is already taken (a concurrent retry)
 * and 'collision' when the random reference already exists.
 */
export async function insertPending(db: D1Database, row: NewRequestRow): Promise<'ok' | 'conflict' | 'collision'> {
  try {
    await db
      .prepare(
        `INSERT INTO ai_requests (reference, request_id, phone_hash, zip, source, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6, ?6)`,
      )
      .bind(row.reference, row.requestId, row.phoneHash, row.zip, row.source, row.now)
      .run();
    return 'ok';
  } catch (error) {
    const message = String(error);
    if (/request_id/i.test(message)) return 'conflict';
    if (/reference|PRIMARY|UNIQUE/i.test(message)) return 'collision';
    throw error;
  }
}

export async function setRequestStatus(
  db: D1Database,
  reference: string,
  status: RequestStatus,
  now: number,
): Promise<void> {
  await db
    .prepare('UPDATE ai_requests SET status = ?2, updated_at = ?3 WHERE reference = ?1')
    .bind(reference, status, now)
    .run();
}

export async function saveOAuthState(db: D1Database, state: string, verifier: string, expiresAt: number): Promise<void> {
  await db
    .prepare('INSERT INTO oauth_states (state, code_verifier, expires_at) VALUES (?1, ?2, ?3)')
    .bind(state, verifier, expiresAt)
    .run();
}

/** One-time: the state row is deleted as it is read. Null if unknown or expired. */
export async function takeOAuthState(db: D1Database, state: string, now: number): Promise<string | null> {
  const row = await db
    .prepare('DELETE FROM oauth_states WHERE state = ?1 RETURNING code_verifier, expires_at')
    .bind(state)
    .first<{ code_verifier: string; expires_at: number }>();
  if (!row || row.expires_at < now) return null;
  return row.code_verifier;
}
