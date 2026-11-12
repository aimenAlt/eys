import type { Env, PagesFunction } from '../../_lib/types.ts';
import { deskAuth, quoteSendEnabled } from '../../_lib/desk-http.ts';
import { findQLinkByQuote } from '../../_lib/desk-db.ts';
import { availableActions, ensureDeskRow, reserveCode } from '../../_lib/desk-flow.ts';
import { quoteTextMessage } from '../../_lib/quote-text.ts';
import { deskJobberDeps, fetchQuoteBundle, quotesAccess, statusBranch } from '../../_lib/desk-jobber.ts';
import { buildQuoteView } from '../../_lib/desk-view.ts';
import { json, methodNotAllowed, serverTiming } from '../../_lib/http.ts';
import { JobberError } from '../../_lib/jobber.ts';

/** GET /api/desk/quote?id=<Jobber quote id>: everything the quote screen shows, in one answer. */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);
  const auth = await deskAuth(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id || id.length > 200) return json({ error: 'bad_request' }, 400);
  const j = deskJobberDeps(env, (promise) => context.waitUntil(promise));
  const db = env.EYS_AI_DB;
  if (!j || !db) return json({ error: 'not_configured' }, 503);
  const timing = serverTiming();

  try {
    const { access, schema } = await quotesAccess(j);
    timing.mark('access');
    if (access !== 'ok' || !schema) return json({ access });
    const bundle = await fetchQuoteBundle(j, id);
    timing.mark('jobber');
    if (!bundle) return json({ error: 'not_found' }, 404);
    const { quote, request: req, history } = bundle;
    const clientId = (quote.client as { id?: string } | null)?.id ?? null;
    const branch = await statusBranch(j, schema);
    const view = buildQuoteView(quote, req, history, { requestLinked: bundle.requestLinked });
    let row = await ensureDeskRow(db, id, { clientId, number: view.number, first: view.client.first, title: view.title, status: view.status }, auth.now);
    const actions = availableActions(row, view.status, branch, auth.now);
    // The exact text for the confirm sheet, with the link it will carry.
    let preview: { text: string; last4: string | null; problem: string | null } | null = null;
    if (actions.approve) {
      const code = await reserveCode(db, id, auth.now);
      row = (await ensureDeskRow(db, id, {}, auth.now));
      preview = {
        text: quoteTextMessage(view.client.first, view.title, code),
        last4: view.client.phone ? view.client.phone.slice(-4) : null,
        problem: !view.client.phone
          ? 'No US phone number on file'
          : view.client.smsStopped
            ? 'This customer stopped texts in Jobber'
            : null,
      };
    }
    const changes = (
      await db
        .prepare('SELECT actor, note, at, jobber_note FROM desk_changes WHERE quote_id = ?1 ORDER BY at DESC LIMIT 20')
        .bind(id)
        .all<{ actor: string; note: string; at: number; jobber_note: string | null }>()
    ).results;
    const link = await findQLinkByQuote(db, id);
    timing.mark('db');
    return timing.apply(json({
      access,
      quote: view,
      desk: row,
      actions,
      preview,
      changes,
      introOpened: link?.opened_at ?? null,
      branch: { kind: branch.kind, label: branch.label },
      sendEnabled: quoteSendEnabled(env),
    }));
  } catch (error) {
    if (error instanceof JobberError && error.errorClass === 'scope') return json({ access: 'needs_reconnect' });
    const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
    return json({ error: 'jobber_unavailable', errorClass }, 502);
  }
};
