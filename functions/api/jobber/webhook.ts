import type { Env, PagesFunction } from '../../_lib/types.ts';
import { sha256, base64url } from '../../_lib/crypto.ts';
import { ensureDeskSchema, deskQuote, logDeskEvent } from '../../_lib/desk-db.ts';
import { advance, flowDeps } from '../../_lib/desk-flow.ts';
import { jobberClientSecret } from '../../_lib/env.ts';
import { ensureSchema } from '../../_lib/db.ts';
import { empty, json, methodNotAllowed } from '../../_lib/http.ts';
import { verifyJobberWebhook } from '../../_lib/jobber-webhook.ts';

const QUOTE_TOPICS = new Set(['QUOTE_UPDATE', 'QUOTE_SENT', 'QUOTE_APPROVED', 'QUOTE_CREATE']);
const MAX_BODY = 16 * 1024;

/**
 * POST /api/jobber/webhook — Jobber webhooks for the EYS Request Intake app.
 * Topics: QUOTE_UPDATE, QUOTE_SENT, QUOTE_APPROVED (see docs/quote-desk.md).
 *
 * Verified with X-Jobber-Hmac-SHA256 (base64 HMAC-SHA256 of the raw body,
 * keyed with JOBBER_CLIENT_SECRET), deduplicated by a hash of the body
 * (Jobber delivers at least once and can fire a topic twice), answered at
 * once (Jobber wants a reply within a second), and acted on in the
 * background: for a quote approved on the desk, check its status and send
 * the text if it is now Awaiting Response. Any other quote is ignored.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY) return json({ error: 'too_large' }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413);
  if (!(await verifyJobberWebhook(jobberClientSecret(env), request.headers.get('X-Jobber-Hmac-SHA256'), raw))) {
    return json({ error: 'bad_signature' }, 401);
  }
  let event: { topic?: string; itemId?: string; occurredAt?: string; occuredAt?: string };
  try {
    event = ((JSON.parse(raw) as { data?: { webHookEvent?: typeof event } }).data?.webHookEvent ?? {}) as typeof event;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const db = env.EYS_AI_DB;
  if (!db) return empty(204);
  await ensureSchema(db);
  await ensureDeskSchema(db);

  const deliveryId = `jobber:${base64url(await sha256(raw))}`;
  const fresh = await db
    .prepare('INSERT OR IGNORE INTO webhook_deliveries (id, source, topic, item_id, received_at) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(deliveryId, 'jobber', event.topic ?? null, event.itemId ?? null, Date.now())
    .run();
  if ((fresh.meta.changes ?? 0) === 0) return json({ ok: true, duplicate: true });

  const topic = event.topic ?? '';
  const itemId = event.itemId ?? '';
  if (QUOTE_TOPICS.has(topic) && itemId) {
    const deps = flowDeps(env);
    if (deps) {
      waitUntil(
        (async () => {
          const row = await deskQuote(db, itemId);
          if (!row || row.state !== 'approved') return;
          await logDeskEvent(db, { actor: 'jobber-webhook', action: 'webhook', quoteId: itemId, detail: topic, now: Date.now() });
          await advance(deps, itemId, 'webhook', 'jobber-webhook');
        })().catch((error) => {
          console.log(JSON.stringify({ evt: 'desk_webhook_failed', error_class: error?.errorClass ?? 'internal' }));
        }),
      );
    }
  } else if (topic === 'APP_DISCONNECT') {
    await logDeskEvent(db, { actor: 'jobber-webhook', action: 'app_disconnect', now: Date.now() });
  }
  return json({ ok: true });
};
