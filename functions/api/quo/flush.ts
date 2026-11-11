import type { Env, PagesFunction } from '../../_lib/types.ts';
import { ensureSchema, bumpCounter, MINUTE } from '../../_lib/db.ts';
import { ensureDeskSchema } from '../../_lib/desk-db.ts';
import { ensureHangupSchema, flushQueue } from '../../_lib/hangup.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';

/**
 * POST /api/quo/flush — sends overnight hang-up texts that are due. Pinged
 * every 15 minutes by the scheduled Worker in workers/hangup-flush, because
 * Pages has no cron and the next call may be hours after 8:00.
 *
 * No key needed: it only ever sends what the queue already holds, only when
 * it is due, only between 8:00 and 20:00, after re-checking every rule. At
 * most 6 runs a minute.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const db = env.EYS_AI_DB;
  if (!db) return json({ error: 'not_configured' }, 503);
  await ensureSchema(db);
  await ensureDeskSchema(db);
  await ensureHangupSchema(db);
  const now = Date.now();
  if ((await bumpCounter(db, `hangupflush:${Math.floor(now / MINUTE)}`, MINUTE, now)) > 6) return json({ ok: true, skipped: 'busy' }, 429);
  const results = await flushQueue({ env, db, fetch: (input, init) => fetch(input, init), now: () => Date.now() });
  return json({ ok: true, processed: results.length });
};
