import type { Env, PagesFunction } from '../../_lib/types.ts';
import { ensureDeskSchema, recordQLinkEvent, type QLinkEvent } from '../../_lib/desk-db.ts';
import { empty, methodNotAllowed, readJsonBody } from '../../_lib/http.ts';
import { isIntroCode } from '../../_lib/intro.ts';

const EVENTS = new Set<QLinkEvent>(['open', 'click']);

/**
 * POST /api/q/event {code, event: "open" | "click"}: the /q/ page reports a
 * real open (its script ran, so not a link preview) and a press of "View your
 * quote", for the desk's "Sent, waiting" list. Always 204: a caller learns
 * nothing about whether a code exists.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const body = await readJsonBody(request, 512);
  const db = env.EYS_AI_DB;
  if (!body.ok || !db) return empty(204);
  const value = body.value as { code?: unknown; event?: unknown };
  const code = typeof value.code === 'string' ? value.code : '';
  const event = typeof value.event === 'string' ? (value.event as QLinkEvent) : null;
  if (!isIntroCode(code) || !event || !EVENTS.has(event)) return empty(204);
  await ensureDeskSchema(db);
  await recordQLinkEvent(db, code, event, Date.now());
  return empty(204);
};
