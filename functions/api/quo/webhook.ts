import type { Env, PagesFunction } from '../../_lib/types.ts';
import { ensureSchema } from '../../_lib/db.ts';
import { ensureDeskSchema } from '../../_lib/desk-db.ts';
import { ensureHangupSchema, flushQueue, handleCall, parseCallCompleted, purgeHangup, quoWebhookSecret, type HangupDeps } from '../../_lib/hangup.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';
import { verifyQuoSignature } from '../../_lib/quo.ts';

const MAX_BODY = 64 * 1024;

/**
 * POST /api/quo/webhook — Quo call.completed for the EYS inbox (PNeiWaFK2n).
 * Verified (Standard Webhooks signature, 5-minute tolerance), deduplicated on
 * `webhook-id`, answered at once, and decided in the background
 * (functions/_lib/hangup.ts). Each delivery also flushes any overnight queue
 * that is now due. See docs/quo-hangup-text.md.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (Number(request.headers.get('Content-Length') ?? '0') > MAX_BODY) return json({ error: 'too_large' }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_large' }, 413);
  const db = env.EYS_AI_DB;
  if (!db) return json({ error: 'not_configured' }, 503);
  await ensureSchema(db);
  await ensureDeskSchema(db);
  await ensureHangupSchema(db);

  const now = Date.now();
  const verified = await verifyQuoSignature(await quoWebhookSecret(env, db), request, raw, now);
  if (!verified.ok) return json({ error: verified.reason }, verified.reason === 'no_secret' ? 503 : 401);

  const fresh = await db
    .prepare('INSERT OR IGNORE INTO webhook_deliveries (id, source, topic, item_id, received_at) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(`quo:${verified.deliveryId}`, 'quo', null, null, now)
    .run();
  if ((fresh.meta.changes ?? 0) === 0) return json({ ok: true, duplicate: true });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const deps: HangupDeps = { env, db, fetch: (input, init) => fetch(input, init), now: () => Date.now() };
  const event = parseCallCompleted(body);
  waitUntil(
    (async () => {
      await flushQueue(deps);
      if (event) await handleCall(deps, event);
      await purgeHangup(db, Date.now());
    })().catch(() => console.log(JSON.stringify({ evt: 'hangup_webhook_failed' }))),
  );
  return json({ ok: true });
};
