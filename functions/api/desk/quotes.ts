import type { Env, PagesFunction } from '../../_lib/types.ts';
import { deskAuth, quoteSendEnabled } from '../../_lib/desk-http.ts';
import { deskQuotes, findQLinkByQuote } from '../../_lib/desk-db.ts';
import { flowDeps, refreshSent } from '../../_lib/desk-flow.ts';
import { deskJobberDeps, listDraftQuotes, quotesAccess, statusBranch } from '../../_lib/desk-jobber.ts';
import { buildList, sentItem, type DeskList, type SentItem } from '../../_lib/desk-view.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';
import { JobberError } from '../../_lib/jobber.ts';

/**
 * GET /api/desk/quotes: the desk's home screen. Drafts (newest first, older
 * than 30 days folded, hidden ones apart), quotes already sent through the
 * desk, the Jobber connection state and which status branch the schema allows.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'GET') return methodNotAllowed(['GET']);
  const auth = await deskAuth(context);
  if (!auth.ok) return auth.response;
  const { env } = context;
  const j = deskJobberDeps(env);
  const db = env.EYS_AI_DB;
  if (!j || !db) return json({ error: 'not_configured' }, 503);

  let rows = await deskQuotes(db);
  // Statuses for "Sent, waiting", and one more chance for any text still due.
  const deps = flowDeps(env);
  if (deps && rows.some((r) => r.state === 'approved')) {
    try {
      await refreshSent(deps, rows);
      rows = await deskQuotes(db);
    } catch {
      // Jobber unavailable: show what D1 knows.
    }
  }
  const sent: SentItem[] = [];
  for (const row of rows.filter((r) => r.state === 'approved').sort((a, b) => (a.approved_at ?? 0) - (b.approved_at ?? 0))) {
    sent.push(sentItem(row, await findQLinkByQuote(db, row.quote_id)));
  }

  let list: DeskList | null = null;
  let access: string;
  let branch: { kind: string; label: string } | null = null;
  let error: string | null = null;
  try {
    const result = await quotesAccess(j);
    access = result.access;
    if (result.access === 'ok' && result.schema) {
      const picked = await statusBranch(j, result.schema);
      branch = { kind: picked.kind, label: picked.label };
      list = buildList(await listDraftQuotes(j), rows, auth.now);
    }
  } catch (caught) {
    if (caught instanceof JobberError && caught.errorClass === 'scope') access = 'needs_reconnect';
    else {
      access = 'error';
      error = caught instanceof JobberError ? caught.errorClass : 'internal';
    }
  }

  return json({
    name: auth.name,
    access,
    error,
    list,
    sent,
    branch,
    sendEnabled: quoteSendEnabled(env),
    quoConfigured: Boolean(env.QUO_API_KEY?.trim()),
  });
};
