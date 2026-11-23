import type { Env } from './types.ts';
import { fromBase64url, timingSafeEqual } from './crypto.ts';

/**
 * Quo (formerly OpenPhone) public REST API, dated version 2026-03-30.
 * https://www.quo.com/docs/2026-03-30/requests.md
 *
 * Host https://api.quo.com, `Authorization: <key>` (no Bearer), and the
 * `Quo-Api-Version` header on every call. EYS texts only from its own inbox,
 * (346) 820-1629, phone number ID PNeiWaFK2n.
 */
export const QUO_API = 'https://api.quo.com';
export const QUO_API_VERSION = '2026-03-30';
export const EYS_PHONE_NUMBER_ID = 'PNeiWaFK2n';
export const EYS_NUMBER = '+13468201629';

export function quoKey(env: Env): string | null {
  const key = (env.QUO_API_KEY ?? '').trim();
  return key === '' ? null : key;
}

export interface QuoDeps {
  key: string;
  fetch: typeof fetch;
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: key,
    'Quo-Api-Version': QUO_API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export type SendResult =
  | { ok: true; id: string; status: string }
  /**
   * `definite`: Quo said no (4xx), so nothing went out and a retry is safe.
   * Otherwise (network, timeout, 5xx) the text may have gone out; check the
   * conversation before trying again.
   */
  | { ok: false; definite: boolean; reason: string };

/** POST /messages from the EYS inbox. Never logs the key or the message body. */
export async function sendText(deps: QuoDeps, to: string, content: string): Promise<SendResult> {
  let response: Response;
  try {
    response = await deps.fetch(`${QUO_API}/messages`, {
      method: 'POST',
      headers: headers(deps.key),
      body: JSON.stringify({ from: EYS_PHONE_NUMBER_ID, to: [to], content }),
    });
  } catch {
    return { ok: false, definite: false, reason: 'No answer from Quo' };
  }
  let body: { data?: { id?: string; status?: string }; title?: string; message?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Not JSON.
  }
  if (response.ok && body.data?.id) return { ok: true, id: body.data.id, status: body.data.status ?? 'queued' };
  if (response.status >= 400 && response.status < 500) {
    const title = (body.title ?? '').trim();
    const reason = /opted out/i.test(title)
      ? 'Customer has opted out of texts'
      : response.status === 401
        ? 'Quo rejected the API key'
        : response.status === 429
          ? 'Quo rate limit, try again in a minute'
          : title || `Quo said ${response.status}`;
    return { ok: false, definite: true, reason: reason.slice(0, 160) };
  }
  return { ok: false, definite: false, reason: `Quo said ${response.status}` };
}

export interface QuoMessage {
  id: string;
  direction?: string;
  from?: string;
  to?: string[];
  text?: string;
  userId?: string | null;
  createdAt?: string;
  status?: string;
}

/**
 * Messages between the EYS inbox and one number since `since`, newest first
 * (GET /messages with phoneNumberId, participant and createdAt filters).
 * `direction` narrows to incoming or outgoing.
 */
export async function listMessages(
  deps: QuoDeps,
  participant: string,
  since: number,
  direction?: 'incoming' | 'outgoing',
  limit = 50,
): Promise<QuoMessage[] | null> {
  const query = new URLSearchParams({ phoneNumberId: EYS_PHONE_NUMBER_ID, limit: String(limit) });
  query.set('createdAt[gt]', new Date(since).toISOString());
  if (direction) query.set('direction', direction);
  query.set(direction === 'incoming' ? 'from' : 'to', participant);
  let response: Response;
  try {
    response = await deps.fetch(`${QUO_API}/messages?${query.toString()}`, { headers: headers(deps.key) });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  try {
    const body = (await response.json()) as { data?: QuoMessage[] };
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tasks and conversations
// ---------------------------------------------------------------------------

export type TaskResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * POST /tasks (https://www.quo.com/docs/2026-03-30/tasks/create-task.md):
 * `{title, description}` plus exactly one link, a conversationId (CN...) or
 * the EYS inbox's phoneNumberId (PN...). Unassigned, so every member of the
 * workspace sees it. Never logs the key.
 */
export async function createTask(
  deps: QuoDeps,
  task: { title: string; description: string; conversationId?: string | null },
): Promise<TaskResult> {
  const link = task.conversationId ? { conversationId: task.conversationId } : { phoneNumberId: EYS_PHONE_NUMBER_ID };
  let response: Response;
  try {
    response = await deps.fetch(`${QUO_API}/tasks`, {
      method: 'POST',
      headers: headers(deps.key),
      body: JSON.stringify({ title: task.title, description: task.description, ...link }),
    });
  } catch {
    return { ok: false, reason: 'No answer from Quo' };
  }
  let body: { data?: { taskId?: string }; title?: string; message?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Not JSON.
  }
  if (response.ok && body.data?.taskId) return { ok: true, id: body.data.taskId };
  const reason = response.status === 401 ? 'Quo rejected the API key' : response.status === 429 ? 'Quo rate limit' : `Quo said ${response.status}`;
  return { ok: false, reason };
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export interface QuoContactName {
  firstName: string;
  lastName: string;
}

/**
 * The names Quo has saved for these numbers (E.164), from
 * GET /contacts/search?phoneNumber[in]=... (https://www.quo.com/docs/2026-03-30/contacts/search-contacts.md),
 * up to 50 numbers per call. A number with no contact, or a contact with no
 * name, is left out. Null when Quo could not be asked. Never logs the key.
 */
export async function searchContactNames(deps: QuoDeps, phones: string[]): Promise<Map<string, QuoContactName> | null> {
  const names = new Map<string, QuoContactName>();
  const wanted = [...new Set(phones.filter((p) => /^\+[1-9]\d{1,14}$/.test(p)))];
  for (let i = 0; i < wanted.length; i += 50) {
    const batch = wanted.slice(i, i + 50);
    const query = new URLSearchParams({ 'phoneNumber[in]': batch.join(','), include: 'properties', limit: '50' });
    let response: Response;
    try {
      response = await deps.fetch(`${QUO_API}/contacts/search?${query.toString()}`, { headers: headers(deps.key) });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    let body: { data?: { firstName?: string | null; lastName?: string | null; properties?: { type?: string; value?: string }[] | null }[] };
    try {
      body = (await response.json()) as typeof body;
    } catch {
      return null;
    }
    for (const contact of body.data ?? []) {
      const firstName = (contact.firstName ?? '').trim();
      const lastName = (contact.lastName ?? '').trim();
      if (!firstName && !lastName) continue;
      const numbers = (contact.properties ?? []).filter((p) => p?.type === 'phone-number' && typeof p.value === 'string').map((p) => p.value as string);
      // With one number asked, a hit is that number even if Quo left properties out.
      const matches = numbers.length ? numbers.filter((n) => batch.includes(n)) : batch.length === 1 ? batch : [];
      for (const phone of matches) if (!names.has(phone)) names.set(phone, { firstName, lastName });
    }
  }
  return names;
}

/** Pages of the inbox's conversations looked through for a customer (50 each, newest activity first). */
const CONVERSATION_PAGES = 3;

/**
 * The customer's conversation on the EYS inbox, or null. Quo's list endpoint
 * cannot filter by participant, so this scans the most recently active
 * conversations; a miss just means the task links to the inbox instead.
 */
export async function findConversationId(deps: QuoDeps, participant: string): Promise<string | null> {
  let after: string | null = null;
  for (let page = 0; page < CONVERSATION_PAGES; page++) {
    const query = new URLSearchParams({ phoneNumberId: EYS_PHONE_NUMBER_ID, limit: '50', sort: 'updatedAt:desc' });
    if (after) query.set('after', after);
    let response: Response;
    try {
      response = await deps.fetch(`${QUO_API}/conversations?${query.toString()}`, { headers: headers(deps.key) });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    let body: { data?: { id?: string; participants?: string[] }[]; nextCursor?: string | null };
    try {
      body = (await response.json()) as typeof body;
    } catch {
      return null;
    }
    const hit = (body.data ?? []).find((c) => c.id && (c.participants ?? []).includes(participant));
    if (hit?.id) return hit.id;
    after = body.nextCursor ?? null;
    if (!after) return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Webhook signatures
// ---------------------------------------------------------------------------

async function hmacBase64(keyBytes: Uint8Array, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', keyBytes as Uint8Array<ArrayBuffer>, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  let binary = '';
  for (const byte of sig) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Bytes(value: string): Uint8Array {
  return fromBase64url(value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
}

export const QUO_SIGNATURE_TOLERANCE_MS = 5 * 60_000;

/**
 * Quo's current webhooks (Standard Webhooks): headers `webhook-id`,
 * `webhook-timestamp` (seconds) and `webhook-signature: v1,<base64> ...`; the
 * signed string is `${id}.${timestamp}.${rawBody}`, keyed with the base64
 * secret after its `whsec_` prefix. Also accepts the legacy
 * `openphone-signature: hmac;1;<ms>;<base64>` over `${ms}.${rawBody}`.
 * https://www.quo.com/docs/2026-03-30/webhooks-signature-validation.md
 */
export async function verifyQuoSignature(
  secret: string | null | undefined,
  request: Request,
  rawBody: string,
  now: number,
): Promise<{ ok: true; deliveryId: string } | { ok: false; reason: string }> {
  const raw = (secret ?? '').trim();
  if (!raw) return { ok: false, reason: 'no_secret' };
  let keyBytes: Uint8Array;
  try {
    keyBytes = base64Bytes(raw.replace(/^whsec_/, ''));
  } catch {
    return { ok: false, reason: 'bad_secret' };
  }

  const id = request.headers.get('webhook-id');
  const timestamp = request.headers.get('webhook-timestamp');
  const signatures = request.headers.get('webhook-signature');
  if (id && timestamp && signatures) {
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(now - seconds * 1000) > QUO_SIGNATURE_TOLERANCE_MS) {
      return { ok: false, reason: 'stale' };
    }
    const expected = await hmacBase64(keyBytes, `${id}.${timestamp}.${rawBody}`);
    for (const entry of signatures.split(' ')) {
      const [version, value] = entry.split(',');
      if (version === 'v1' && value && (await timingSafeEqual(value, expected))) return { ok: true, deliveryId: id };
    }
    return { ok: false, reason: 'bad_signature' };
  }

  const legacy = request.headers.get('openphone-signature');
  if (legacy) {
    const [scheme, version, ms, value] = legacy.split(';');
    if (scheme !== 'hmac' || version !== '1' || !ms || !value) return { ok: false, reason: 'bad_signature' };
    if (!Number.isFinite(Number(ms)) || Math.abs(now - Number(ms)) > QUO_SIGNATURE_TOLERANCE_MS) return { ok: false, reason: 'stale' };
    const expected = await hmacBase64(keyBytes, `${ms}.${rawBody}`);
    if (await timingSafeEqual(value, expected)) return { ok: true, deliveryId: `legacy:${ms}:${value.slice(0, 16)}` };
    return { ok: false, reason: 'bad_signature' };
  }
  return { ok: false, reason: 'unsigned' };
}

/** Signs a body the way Quo does; for tests and the docs' curl example only. */
export async function signQuoWebhook(secret: string, id: string, timestampSeconds: number, rawBody: string): Promise<string> {
  const keyBytes = base64Bytes(secret.replace(/^whsec_/, ''));
  return `v1,${await hmacBase64(keyBytes, `${id}.${timestampSeconds}.${rawBody}`)}`;
}
