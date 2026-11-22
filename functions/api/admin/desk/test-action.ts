import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { bearerToken, checkAdminKey } from '../../../_lib/admin.ts';
import { deskQuote, ensureDeskSchema } from '../../../_lib/desk-db.ts';
import { ensureSchema } from '../../../_lib/db.ts';
import { archiveQuote, editLines, flowDeps } from '../../../_lib/desk-flow.ts';
import { readyForMark } from '../../../_lib/desk-ready.ts';
import { fetchQuoteStatuses } from '../../../_lib/desk-jobber.ts';
import { json, methodNotAllowed, readJsonBody } from '../../../_lib/http.ts';
import { JobberError } from '../../../_lib/jobber.ts';
import { photosKey } from '../../../_lib/request-photos.ts';

/** Only quotes whose Jobber title carries this marker can be touched here. */
export const TEST_MARKER = '(TEST)';
const ACTIONS = new Set(['edit', 'archive', 'ready']);

/**
 * POST /api/admin/desk/test-action {quoteId, action: 'edit'|'archive'|'ready', lines?, deposit?, note?}
 * with `Authorization: Bearer <AI_ADMIN_KEY or the routine key>`. Runs the
 * Quote Desk's own edit and archive flows, exactly as a phone tap does, so an
 * agent can prove a desk change against live Jobber without a desk PIN. It
 * refuses any quote whose title lacks "(TEST)", so no customer quote can be
 * changed through it. Logged as "Agent test".
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const check = await checkAdminKey(env, request, bearerToken(request), Date.now(), async (key) => [await photosKey(key)]);
  if (check === 'not_configured') return json({ error: 'not_configured' }, 503);
  if (check === 'locked') return json({ error: 'too_many_attempts' }, 429);
  if (check === 'bad_key') return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': 'Bearer' });

  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return json({ error: 'invalid_body', errors: [body.error] }, body.status);
  const value = body.value as { quoteId?: unknown; action?: unknown; lines?: unknown; deposit?: unknown; note?: unknown };
  const quoteId = typeof value.quoteId === 'string' ? value.quoteId.trim() : '';
  const action = typeof value.action === 'string' ? value.action : '';
  if (!quoteId || quoteId.length > 200 || !ACTIONS.has(action)) {
    return json({ error: 'invalid_body', errors: ["quoteId: a quote's encoded Jobber id; action: 'edit' or 'archive'"] }, 400);
  }
  const deps = flowDeps(env);
  if (!deps) return json({ error: 'not_configured' }, 503);
  // The same setup a desk tap gets from deskAuth (new desk_quotes columns are added here).
  await ensureSchema(deps.db);
  await ensureDeskSchema(deps.db);

  try {
    const quote = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
    if (!quote) return json({ error: 'quote_not_found' }, 404);
    if (!(quote.title ?? '').includes(TEST_MARKER)) return json({ error: 'not_a_test_quote', message: `Only quotes titled with ${TEST_MARKER}.` }, 403);
    const result =
      action === 'edit'
        ? await editLines(deps, 'Agent test', quoteId, value.lines)
        : action === 'ready'
          ? await readyForMark(deps, 'Agent test', quoteId, { deposit: value.deposit, note: value.note })
          : await archiveQuote(deps, 'Agent test', quoteId);
    const after = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
    return json(
      {
        ok: result.ok,
        message: result.message ?? null,
        notice: result.notice ?? null,
        desk: action === 'ready' ? await deskQuote(deps.db, quoteId) : undefined,
        jobber_status: after?.quoteStatus ?? null,
        desk_state: (await deskQuote(deps.db, quoteId))?.state ?? null,
      },
      result.ok ? 200 : 409,
    );
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    return json({ error: 'jobber_unavailable', error_class: errorClass }, 502);
  }
};
