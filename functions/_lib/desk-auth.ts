import type { D1Database, Env } from './types.ts';
import { KEY_LABELS, base64url, deriveSubkey, fromBase64url, hmac, keyedHash, timingSafeEqual } from './crypto.ts';
import { DAY, MINUTE, bumpCounter, ensureSchema, readCounter } from './db.ts';
import { adminKey } from './env.ts';

/**
 * Login for Essa's Quote Desk.
 *
 * DESK_PINS is a Cloudflare secret, "name:pin,name:pin" (Essa, Aimen). A PIN
 * alone identifies the person, so the PINs must differ. A good PIN gets a
 * signed session cookie for 90 days; the signature key is derived from
 * AI_ADMIN_KEY, and each session carries a fingerprint of the person's entry,
 * so changing someone's PIN (or removing them) ends their sessions.
 *
 * At most five wrong PINs per 15 minutes per IP, counted in D1 by keyed IP hash.
 */

export const DESK_COOKIE = 'eys_desk';
/** Only the desk's API needs the cookie: the page shell itself is static. */
export const DESK_COOKIE_PATH = '/api/desk/';
export const SESSION_TTL = 90 * DAY;
export const MAX_PIN_FAILURES = 5;
export const PIN_WINDOW = 15 * MINUTE;

const SESSION_LABEL = 'eys-desk/session/v1';
const ENTRY_LABEL = 'eys-desk/pin-entry/v1';

export interface DeskPerson {
  name: string;
  pin: string;
}

/** "Essa:1234, Aimen:5678" → entries. Malformed pieces are skipped; PINs are 4 to 12 digits. */
export function parsePins(raw: string | undefined): DeskPerson[] {
  const out: DeskPerson[] = [];
  for (const piece of (raw ?? '').split(',')) {
    const at = piece.lastIndexOf(':');
    if (at <= 0) continue;
    const name = piece.slice(0, at).trim();
    const pin = piece.slice(at + 1).trim();
    if (!name || !/^\d{4,12}$/.test(pin)) continue;
    out.push({ name, pin });
  }
  return out;
}

export function deskConfigured(env: Env): boolean {
  return Boolean(env.EYS_AI_DB && adminKey(env) && parsePins(env.DESK_PINS).length > 0);
}

async function entryFingerprint(key: string, person: DeskPerson): Promise<string> {
  const sub = await deriveSubkey(key, ENTRY_LABEL);
  return base64url(await hmac(sub, `${person.name}:${person.pin}`)).slice(0, 16);
}

interface SessionPayload {
  n: string;
  f: string;
  e: number;
}

export async function issueSession(env: Env, person: DeskPerson, now: number): Promise<string | null> {
  const key = adminKey(env);
  if (!key) return null;
  const payload: SessionPayload = { n: person.name, f: await entryFingerprint(key, person), e: now + SESSION_TTL };
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = base64url(await hmac(await deriveSubkey(key, SESSION_LABEL), body));
  return `${body}.${sig}`;
}

/** The signed-in person's name, or null. */
export async function verifySession(env: Env, token: string, now: number): Promise<string | null> {
  const key = adminKey(env);
  if (!key || !token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = base64url(await hmac(await deriveSubkey(key, SESSION_LABEL), body));
  if (!(await timingSafeEqual(sig, expected))) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof payload.e !== 'number' || payload.e < now) return null;
  for (const person of parsePins(env.DESK_PINS)) {
    if (person.name === payload.n && (await entryFingerprint(key, person)) === payload.f) return person.name;
  }
  return null;
}

export function readCookie(request: Request, name: string): string {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return '';
}

export function sessionCookie(token: string): string {
  return `${DESK_COOKIE}=${token}; Path=${DESK_COOKIE_PATH}; Max-Age=${Math.floor(SESSION_TTL / 1000)}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearedCookie(): string {
  return `${DESK_COOKIE}=; Path=${DESK_COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function sessionName(env: Env, request: Request, now: number): Promise<string | null> {
  return verifySession(env, readCookie(request, DESK_COOKIE), now);
}

export type LoginResult =
  | { status: 'ok'; person: DeskPerson; token: string }
  | { status: 'bad_pin'; triesLeft: number }
  | { status: 'locked' }
  | { status: 'not_configured' };

async function failureKey(key: string, request: Request, now: number): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  return `deskfail:${await keyedHash(key, KEY_LABELS.ipHash, ip)}:${Math.floor(now / PIN_WINDOW)}`;
}

/** Constant-time against every entry; a wrong PIN counts toward the lockout. */
export async function login(env: Env, request: Request, pin: string, now: number): Promise<LoginResult> {
  const key = adminKey(env);
  const db: D1Database | undefined = env.EYS_AI_DB;
  const people = parsePins(env.DESK_PINS);
  if (!key || !db || people.length === 0) return { status: 'not_configured' };
  await ensureSchema(db);
  const counter = await failureKey(key, request, now);
  const failures = await readCounter(db, counter);
  if (failures >= MAX_PIN_FAILURES) return { status: 'locked' };
  const typed = pin.trim();
  let match: DeskPerson | null = null;
  for (const person of people) {
    // Every entry is compared, match or not, so timing says nothing about which.
    const same = await timingSafeEqual(typed, person.pin);
    if (same && !match) match = person;
  }
  if (match && typed !== '') {
    const token = await issueSession(env, match, now);
    if (token) return { status: 'ok', person: match, token };
  }
  const count = await bumpCounter(db, counter, PIN_WINDOW, now);
  if (count >= MAX_PIN_FAILURES) return { status: 'locked' };
  return { status: 'bad_pin', triesLeft: MAX_PIN_FAILURES - count };
}
