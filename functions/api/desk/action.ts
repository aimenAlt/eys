import type { Env, PagesFunction } from '../../_lib/types.ts';
import { deskAuth } from '../../_lib/desk-http.ts';
import { deskQuote } from '../../_lib/desk-db.ts';
import { advance, approveQuote, availableActions, cachedBranch, flowDeps, hideQuote, markOnly, requestChange } from '../../_lib/desk-flow.ts';
import { json, methodNotAllowed, readJsonBody } from '../../_lib/http.ts';
import { JobberError } from '../../_lib/jobber.ts';

const ACTIONS = new Set(['approve', 'mark', 'change', 'hide', 'unhide', 'retry', 'poll']);

/**
 * POST /api/desk/action {id, action, note?}. approve = "Looks good" (approval,
 * status move, text); mark = "Mark Awaiting Response, don't text" (status move
 * and a pinned "not sent yet" note, no text); change = "Needs a change"; hide / unhide = "Not
 * sending" and back; retry = "Retry text"; poll = the 3-minute check after a
 * tap. Every action is logged with who did it.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'POST') return methodNotAllowed(['POST']);
  const auth = await deskAuth(context, true);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(context.request, 4096);
  if (!body.ok) return json({ error: 'bad_request' }, body.status);
  const value = body.value as { id?: unknown; action?: unknown; note?: unknown };
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const action = typeof value.action === 'string' ? value.action : '';
  if (!id || id.length > 200 || !ACTIONS.has(action)) return json({ error: 'bad_request' }, 400);
  const deps = flowDeps(context.env);
  if (!deps) return json({ error: 'not_configured' }, 503);

  try {
    let result: { ok: boolean; message?: string } = { ok: true };
    if (action === 'approve') result = await approveQuote(deps, auth.name, id);
    else if (action === 'mark') result = await markOnly(deps, auth.name, id);
    else if (action === 'change') result = await requestChange(deps, auth.name, id, typeof value.note === 'string' ? value.note : '');
    else if (action === 'hide' || action === 'unhide') result = await hideQuote(deps, auth.name, id, action === 'hide');
    else await advance(deps, id, action === 'retry' ? 'retry' : 'poll', auth.name);
    const row = await deskQuote(deps.db, id);
    const branch = await cachedBranch(deps.db);
    const actions = availableActions(row, row?.jobber_status ?? (row ? null : 'draft'), branch, Date.now());
    if (!result.ok) return json({ error: 'refused', message: result.message, desk: row, actions }, 409);
    return json({ ok: true, desk: row, actions });
  } catch (error) {
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    if (errorClass === 'scope') return json({ error: 'refused', message: 'Jobber needs reconnecting for quotes' }, 409);
    return json({ error: 'jobber_unavailable', message: `Jobber did not answer (${errorClass}). Nothing was sent.` }, 502);
  }
};
