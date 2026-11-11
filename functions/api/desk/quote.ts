import type { Env, PagesFunction } from '../../_lib/types.ts';
import { deskAuth, quoteSendEnabled } from '../../_lib/desk-http.ts';
import { deskQuote, findQLinkByQuote } from '../../_lib/desk-db.ts';
import { deskJobberDeps, fetchClientHistory, fetchQuote, fetchRequest, quotesAccess, statusBranch } from '../../_lib/desk-jobber.ts';
import { buildQuoteView } from '../../_lib/desk-view.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';
import { JobberError } from '../../_lib/jobber.ts';

/** GET /api/desk/quote?id=<Jobber quote id>: everything the quote screen shows, in one answer. */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);
  const auth = await deskAuth(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id || id.length > 200) return json({ error: 'bad_request' }, 400);
  const j = deskJobberDeps(env);
  const db = env.EYS_AI_DB;
  if (!j || !db) return json({ error: 'not_configured' }, 503);

  try {
    const { access, schema } = await quotesAccess(j);
    if (access !== 'ok' || !schema) return json({ access });
    const quote = await fetchQuote(j, id);
    if (!quote) return json({ error: 'not_found' }, 404);
    const requestId = (quote.request as { id?: string } | null)?.id ?? null;
    const clientId = (quote.client as { id?: string } | null)?.id ?? null;
    const [req, history] = await Promise.all([
      requestId ? fetchRequest(j, requestId).catch(() => null) : Promise.resolve(null),
      clientId ? fetchClientHistory(j, clientId).catch(() => ({})) : Promise.resolve({}),
    ]);
    const branch = await statusBranch(j, schema);
    const row = await deskQuote(db, id);
    const changes = (
      await db
        .prepare('SELECT actor, note, at, jobber_note FROM desk_changes WHERE quote_id = ?1 ORDER BY at DESC LIMIT 20')
        .bind(id)
        .all<{ actor: string; note: string; at: number; jobber_note: string | null }>()
    ).results;
    const link = await findQLinkByQuote(db, id);
    return json({
      access,
      quote: buildQuoteView(quote, req, history),
      desk: row,
      changes,
      introOpened: link?.opened_at ?? null,
      branch: { kind: branch.kind, label: branch.label },
      sendEnabled: quoteSendEnabled(env),
    });
  } catch (error) {
    if (error instanceof JobberError && error.errorClass === 'scope') return json({ access: 'needs_reconnect' });
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    return json({ error: 'jobber_unavailable', errorClass }, 502);
  }
};
