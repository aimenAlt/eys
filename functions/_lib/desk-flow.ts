import type { D1Database, Env } from './types.ts';
import { randomToken } from './crypto.ts';
import { MINUTE, DAY } from './db.ts';
import { chicagoTimestamp } from './env.ts';
import { JobberError, graphql } from './jobber.ts';
import {
  deskQuote,
  insertQLink,
  kvGet,
  logDeskEvent,
  type DeskQuoteRow,
} from './desk-db.ts';
import {
  deskJobberDeps,
  fetchQuoteStatuses,
  pickStatusBranch,
  quotesAccess,
  type DeskJobber,
  type RawQuoteStatus,
  type StatusBranch,
} from './desk-jobber.ts';
import type { DeskSchema } from './desk-schema.ts';
import { firstNameOf, textablePhone } from './desk-view.ts';
import { introReviewFor, isClientHubUrl, newIntroCode } from './intro.ts';
import { listMessages, quoKey, sendText, type QuoDeps } from './quo.ts';
import { quoteTextMessage } from './quote-text.ts';
import { quoteSendEnabled } from './desk-http.ts';

/**
 * What happens after Essa taps "Looks good", in order:
 *
 *  a. The approval is recorded in D1 (desk_quotes.state = 'approved').
 *  b. The quote moves to Awaiting Response WITHOUT Jobber messaging the
 *     client: the schema's no-message mutation if the token can see one,
 *     else Essa does More > Mark as Awaiting Response in Jobber web.
 *  c. The flip is noticed by the Jobber webhook, by the desk polling for three
 *     minutes after the tap, and whenever the desk list loads.
 *  d. Only when Jobber says awaiting_response AND D1 holds the desk approval
 *     AND no text has gone out: the /q/ link is made and the text sent.
 *
 * One quote gets at most one text, ever. text_state moves none → sending by a
 * conditional UPDATE that only one caller can win; a send whose outcome is
 * unknown (network, 5xx) is never retried blind: the retry first looks for the
 * text in the Quo conversation.
 */

/** A claim older than this is a dead isolate's, and only "Retry text" may take it over. */
export const SEND_CLAIM_TTL = 2 * MINUTE;
const MAX_APPROVAL_AGE = 60 * DAY;
/**
 * Texts go out on their own only within a day of the tap. Past that (texting
 * was off, Essa marked it in Jobber days later) it waits for "Retry text", so
 * turning QUOTE_SEND_ENABLED on never sends a burst of old quotes.
 */
export const AUTO_SEND_WINDOW = DAY;

export interface FlowDeps {
  env: Env;
  db: D1Database;
  jobber: DeskJobber;
  /** Quo calls; global fetch in production. */
  fetch: typeof fetch;
  now: () => number;
}

export function flowDeps(env: Env): FlowDeps | null {
  const jobber = deskJobberDeps(env);
  if (!jobber) return null;
  return { env, db: jobber.db, jobber, fetch: (input, init) => fetch(input, init), now: () => Date.now() };
}

async function touch(db: D1Database, quoteId: string, fields: Record<string, unknown>, now: number): Promise<void> {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = ?${i + 2}`).join(', ');
  await db
    .prepare(`UPDATE desk_quotes SET ${sets}, updated_at = ?${keys.length + 2} WHERE quote_id = ?1`)
    .bind(quoteId, ...keys.map((k) => fields[k]), now)
    .run();
}

/** The desk_quotes row, created 'open' the first time a quote is looked at closely. */
export async function ensureDeskRow(
  db: D1Database,
  quoteId: string,
  facts: { clientId?: string | null; number?: string | null; first?: string | null; title?: string | null; status?: string | null },
  now: number,
): Promise<DeskQuoteRow> {
  await db
    .prepare(
      `INSERT INTO desk_quotes (quote_id, client_id, quote_number, first_name, title, jobber_status, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT(quote_id) DO UPDATE SET
         client_id = COALESCE(excluded.client_id, client_id),
         quote_number = COALESCE(excluded.quote_number, quote_number),
         first_name = COALESCE(excluded.first_name, first_name),
         title = COALESCE(excluded.title, title),
         jobber_status = COALESCE(excluded.jobber_status, jobber_status)`,
    )
    .bind(quoteId, facts.clientId ?? null, facts.number ?? null, facts.first ?? null, facts.title ?? null, facts.status ? facts.status.toLowerCase() : null, now)
    .run();
  return (await deskQuote(db, quoteId)) as DeskQuoteRow;
}

/**
 * The intro code a quote's text will carry, reserved before the text exists
 * so the confirm sheet can show the exact message. The /q/ page only works
 * once the text has been sent (that is when q_links gets its row).
 */
export async function reserveCode(db: D1Database, quoteId: string, now: number): Promise<string> {
  const row = await deskQuote(db, quoteId);
  if (row?.q_code) return row.q_code;
  await db
    .prepare('UPDATE desk_quotes SET q_code = ?2, updated_at = ?3 WHERE quote_id = ?1 AND q_code IS NULL')
    .bind(quoteId, newIntroCode(), now)
    .run();
  return (await deskQuote(db, quoteId))?.q_code as string;
}

// ---------------------------------------------------------------------------
// Jobber writes: the status move and a note. Nothing else is ever written.
// ---------------------------------------------------------------------------

export async function moveToAwaiting(j: DeskJobber, branch: StatusBranch, quoteId: string): Promise<void> {
  if (branch.kind !== 'mutation') return;
  const list = branch.argType.startsWith('[');
  const data = await graphql<Record<string, { userErrors?: { message?: string }[] | null } | null>>(
    j.deps,
    `mutation EysDeskMarkAwaiting($ids: ${branch.argType}) { ${branch.mutation}(${branch.arg}: $ids) { ${branch.userErrors ? 'userErrors { message }' : '__typename'} } }`,
    { ids: list ? [quoteId] : quoteId },
  );
  const payload = data[branch.mutation];
  if (!payload) throw new JobberError('graphql');
  if (payload.userErrors && payload.userErrors.length > 0) throw new JobberError('user_errors');
}

export type NoteOutcome = 'added' | 'failed' | 'unsupported';

/** quoteCreateNote(quoteId, input: {message}) when the schema has it. */
export async function addQuoteNote(
  j: DeskJobber,
  schema: DeskSchema,
  quoteId: string,
  message: string,
  pinned = false,
): Promise<NoteOutcome> {
  const field = schema.mutations.quoteCreateNote;
  const inputType = field?.args.input;
  const idType = field?.args.quoteId;
  const input = schema.types[(inputType ?? '').replace(/[!\[\]]/g, '')];
  if (!field || !inputType || !idType || !input?.fields.message) return 'unsupported';
  try {
    const payload = schema.types[field.type];
    const value: Record<string, unknown> = { message };
    if (pinned && input.fields.pinned) value.pinned = true;
    const data = await graphql<{ quoteCreateNote?: { userErrors?: { message?: string }[] | null } | null }>(
      j.deps,
      `mutation EysDeskAddNote($id: ${idType}, $input: ${inputType}) { quoteCreateNote(quoteId: $id, input: $input) { ${payload?.fields.userErrors ? 'userErrors { message }' : '__typename'} } }`,
      { id: quoteId, input: value },
    );
    if (!data.quoteCreateNote || (data.quoteCreateNote.userErrors?.length ?? 0) > 0) return 'failed';
    return 'added';
  } catch {
    return 'failed';
  }
}

// ---------------------------------------------------------------------------
// Approve
// ---------------------------------------------------------------------------

export interface ActionResult {
  ok: boolean;
  message?: string;
  row: DeskQuoteRow | null;
}

/** a + b, then c/d once: a desk approval, the status move, and a send if Jobber already says awaiting. */
export async function approveQuote(deps: FlowDeps, actor: string, quoteId: string): Promise<ActionResult> {
  const now = deps.now();
  const { access, schema } = await quotesAccess(deps.jobber);
  if (access !== 'ok' || !schema) return { ok: false, message: 'Jobber needs reconnecting for quotes', row: await deskQuote(deps.db, quoteId) };
  const status = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (!status) return { ok: false, message: 'Jobber has no such quote', row: null };
  const jobberStatus = (status.quoteStatus ?? '').toLowerCase();
  if (jobberStatus !== 'draft' && jobberStatus !== 'awaiting_response') {
    return { ok: false, message: `This quote is ${jobberStatus.replace(/_/g, ' ')} in Jobber`, row: await deskQuote(deps.db, quoteId) };
  }
  await ensureDeskRow(deps.db, quoteId, { clientId: status.client?.id, first: firstNameOf(status.client), title: status.title ?? null, status: jobberStatus }, now);

  // a. Record the approval: the first tap wins; a second tap changes nothing.
  const claimed = await deps.db
    .prepare(
      `UPDATE desk_quotes SET state = 'approved', approved_by = ?2, approved_at = ?3, hidden_by = NULL, hidden_at = NULL, updated_at = ?3
       WHERE quote_id = ?1 AND state != 'approved'`,
    )
    .bind(quoteId, actor, now)
    .run();
  if ((claimed.meta.changes ?? 0) === 0) return { ok: true, row: await advance(deps, quoteId, 'approve', actor) };
  await reserveCode(deps.db, quoteId, now);
  await logDeskEvent(deps.db, { actor, action: 'approve', quoteId, now });

  // b. Move the status without Jobber messaging the client.
  await moveStatus(deps, schema, quoteId, jobberStatus, now);

  // c/d. If Jobber already says awaiting_response, the text goes now.
  return { ok: true, row: await advance(deps, quoteId, 'approve', actor) };
}

/** Step b, shared by "Looks good" and "Mark Awaiting Response, don't text". */
async function moveStatus(deps: FlowDeps, schema: DeskSchema, quoteId: string, jobberStatus: string, now: number): Promise<void> {
  const branch = pickStatusBranch(schema);
  if (jobberStatus === 'awaiting_response') {
    await touch(deps.db, quoteId, { move_branch: 'already', move_state: 'done', move_at: now }, now);
  } else if (branch.kind === 'mutation') {
    try {
      await moveToAwaiting(deps.jobber, branch, quoteId);
      await touch(deps.db, quoteId, { move_branch: branch.mutation, move_state: 'done', move_at: now, move_error: null }, now);
      await logDeskEvent(deps.db, { actor: 'system', action: 'status_move', quoteId, detail: branch.mutation, now });
    } catch (error) {
      const errorClass = error instanceof JobberError ? error.errorClass : 'internal';
      await touch(deps.db, quoteId, { move_branch: branch.mutation, move_state: 'failed', move_at: now, move_error: `Jobber did not move it (${errorClass}). Do it in Jobber: More, then Mark as Awaiting Response.` }, now);
      await logDeskEvent(deps.db, { actor: 'system', action: 'status_move_failed', quoteId, detail: errorClass, now });
    }
  } else {
    await touch(deps.db, quoteId, { move_branch: 'manual', move_state: 'manual', move_at: now }, now);
  }
}

// ---------------------------------------------------------------------------
// "Quote not sent yet" in Jobber
//
// Whenever the desk leaves a quote in Awaiting Response without the customer
// having been texted (Mark only, texting off, no phone, a refused text), a
// pinned note on the quote says so, once. If the text goes out later, a
// second note says that.
// ---------------------------------------------------------------------------

async function hasEvent(db: D1Database, quoteId: string, action: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok FROM desk_events WHERE quote_id = ?1 AND action = ?2 LIMIT 1').bind(quoteId, action).first();
  return Boolean(row);
}

export async function noteNotSent(deps: FlowDeps, quoteId: string, actor: string, reason: string | null): Promise<void> {
  if (await hasEvent(deps.db, quoteId, 'not_sent_note')) return;
  const now = deps.now();
  let outcome: NoteOutcome = 'unsupported';
  try {
    const { access, schema } = await quotesAccess(deps.jobber);
    if (access === 'ok' && schema) {
      const why = reason ? ` (${reason})` : '';
      outcome = await addQuoteNote(
        deps.jobber,
        schema,
        quoteId,
        `Quote not sent yet. Set to Awaiting Response from the Quote Desk (${actor}, ${chicagoTimestamp(now)}). The customer has not been texted or emailed${why}.`,
        true,
      );
    }
  } catch {
    outcome = 'failed';
  }
  await logDeskEvent(deps.db, { actor, action: 'not_sent_note', quoteId, detail: `jobber_note=${outcome}`, now });
}

async function noteSentLater(deps: FlowDeps, quoteId: string): Promise<void> {
  if (!(await hasEvent(deps.db, quoteId, 'not_sent_note')) || (await hasEvent(deps.db, quoteId, 'sent_note'))) return;
  const now = deps.now();
  let outcome: NoteOutcome = 'unsupported';
  try {
    const { access, schema } = await quotesAccess(deps.jobber);
    if (access === 'ok' && schema) {
      outcome = await addQuoteNote(deps.jobber, schema, quoteId, `Quote texted to the customer from the Quote Desk (${chicagoTimestamp(now)}).`);
    }
  } catch {
    outcome = 'failed';
  }
  await logDeskEvent(deps.db, { actor: 'system', action: 'sent_note', quoteId, detail: `jobber_note=${outcome}`, now });
}

/**
 * "Mark Awaiting Response, don't text": the status move without the text.
 * No desk approval is recorded, so nothing ever texts this customer unless
 * Essa later taps "Send to {first} now" (which is a normal approval).
 */
export async function markOnly(deps: FlowDeps, actor: string, quoteId: string): Promise<ActionResult> {
  const now = deps.now();
  const { access, schema } = await quotesAccess(deps.jobber);
  if (access !== 'ok' || !schema) return { ok: false, message: 'Jobber needs reconnecting for quotes', row: await deskQuote(deps.db, quoteId) };
  const status = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (!status) return { ok: false, message: 'Jobber has no such quote', row: null };
  const jobberStatus = (status.quoteStatus ?? '').toLowerCase();
  if (jobberStatus !== 'draft') {
    return { ok: false, message: `This quote is ${jobberStatus.replace(/_/g, ' ')} in Jobber`, row: await deskQuote(deps.db, quoteId) };
  }
  await ensureDeskRow(deps.db, quoteId, { clientId: status.client?.id, first: firstNameOf(status.client), title: status.title ?? null, status: jobberStatus }, now);
  const claimed = await deps.db
    .prepare(
      `UPDATE desk_quotes SET state = 'marked', hidden_by = NULL, hidden_at = NULL, updated_at = ?2
       WHERE quote_id = ?1 AND state IN ('open', 'hidden')`,
    )
    .bind(quoteId, now)
    .run();
  if ((claimed.meta.changes ?? 0) === 0) return { ok: false, message: 'This quote is already approved or marked', row: await deskQuote(deps.db, quoteId) };
  await logDeskEvent(deps.db, { actor, action: 'mark_only', quoteId, now });
  await moveStatus(deps, schema, quoteId, jobberStatus, now);
  const row = await deskQuote(deps.db, quoteId);
  if (row?.move_state === 'done') await noteNotSent(deps, quoteId, actor, null);
  const fresh = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (fresh && row) await recordStatus(deps.db, row, fresh, now);
  return { ok: true, row: await deskQuote(deps.db, quoteId) };
}

// ---------------------------------------------------------------------------
// Advance: notice the status flip and send the one text
// ---------------------------------------------------------------------------

export type AdvanceSource = 'approve' | 'poll' | 'webhook' | 'retry' | 'list';

function lastFour(e164: string): string {
  return e164.slice(-4);
}

/** Facts from Jobber's latest answer, kept for the "Sent, waiting" list. */
async function recordStatus(db: D1Database, row: DeskQuoteRow, status: RawQuoteStatus, now: number): Promise<void> {
  const viewed = status.clientHubViewedAt ? Date.parse(status.clientHubViewedAt) : NaN;
  const approved = status.lastTransitioned?.approvedAt ? Date.parse(status.lastTransitioned.approvedAt) : NaN;
  const jobberStatus = (status.quoteStatus ?? '').toLowerCase() || null;
  const awaitingSeen =
    row.awaiting_seen_at ?? (jobberStatus === 'awaiting_response' || jobberStatus === 'approved' || jobberStatus === 'converted' ? now : null);
  await touch(
    db,
    row.quote_id,
    {
      jobber_status: jobberStatus,
      awaiting_seen_at: awaitingSeen,
      hub_viewed_at: Number.isFinite(viewed) ? viewed : row.hub_viewed_at,
      quote_approved_at: Number.isFinite(approved) ? approved : jobberStatus === 'approved' || jobberStatus === 'converted' ? (row.quote_approved_at ?? now) : row.quote_approved_at,
    },
    now,
  );
}

/**
 * Checks Jobber and, when every condition holds, sends the text. Safe to call
 * any number of times from anywhere: the claim makes it send at most once.
 */
export async function advance(deps: FlowDeps, quoteId: string, source: AdvanceSource, actor = 'system'): Promise<DeskQuoteRow | null> {
  const now = deps.now();
  const row = await deskQuote(deps.db, quoteId);
  // No desk approval, no text: a quote moved to Awaiting Response any other way is left alone.
  if (!row || row.state !== 'approved') return row;
  if (row.text_state === 'sent') return row;
  if (row.approved_at !== null && now - row.approved_at > MAX_APPROVAL_AGE) return row;

  const status = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (!status) return row;
  await recordStatus(deps.db, row, status, now);
  if ((status.quoteStatus ?? '').toLowerCase() !== 'awaiting_response') return deskQuote(deps.db, quoteId);

  const retrying = source === 'retry';
  if (row.text_state !== 'none' && !retrying) return deskQuote(deps.db, quoteId);
  if (!retrying && row.approved_at !== null && now - row.approved_at > AUTO_SEND_WINDOW) {
    if (row.text_error !== 'Tap Retry text to send it now') await touch(deps.db, quoteId, { text_error: 'Tap Retry text to send it now' }, now);
    return deskQuote(deps.db, quoteId);
  }
  if (row.text_state === 'sending' && row.text_claimed_at !== null && now - row.text_claimed_at < SEND_CLAIM_TTL) {
    return deskQuote(deps.db, quoteId);
  }

  // Pre-flight: everything that would stop the text, before anything is claimed.
  const problem = await sendProblem(deps, status);
  if (problem) {
    await touch(deps.db, quoteId, { text_error: problem }, now);
    if (problem !== row.text_error) await logDeskEvent(deps.db, { actor: 'system', action: 'text_blocked', quoteId, detail: problem, now });
    await noteNotSent(deps, quoteId, row.approved_by ?? actor, problem);
    return deskQuote(deps.db, quoteId);
  }
  const phone = textablePhone(status.client?.phones) as { e164: string };
  const key = quoKey(deps.env) as string;

  // The claim: only one caller ever moves this row out of 'none' (or, for a
  // retry, out of failed / unknown / a dead claim).
  const owner = randomToken(9);
  const claim = await deps.db
    .prepare(
      `UPDATE desk_quotes SET text_state = 'sending', text_owner = ?2, text_claimed_at = ?3, text_error = NULL, updated_at = ?3
       WHERE quote_id = ?1 AND state = 'approved' AND (
         text_state = 'none'
         OR (?4 = 1 AND text_state IN ('failed', 'unknown'))
         OR (?4 = 1 AND text_state = 'sending' AND text_claimed_at < ?5)
       )`,
    )
    .bind(quoteId, owner, now, retrying ? 1 : 0, now - SEND_CLAIM_TTL)
    .run();
  if ((claim.meta.changes ?? 0) !== 1) return deskQuote(deps.db, quoteId);
  const previous = row.text_state;

  const code = row.q_code ?? (await reserveCode(deps.db, quoteId, now));
  let link = await insertQLink(deps.db, {
    code,
    quoteId,
    clientId: status.client?.id ?? row.client_id,
    firstName: firstNameOf(status.client) || (row.first_name ?? ''),
    title: status.title ?? row.title,
    hubUrl: status.clientHubUri as string,
    reviewId: introReviewFor(status.title ?? row.title),
    now,
  });
  if (link === 'collision') {
    // Another quote holds this code: give this one a fresh code.
    const fresh = newIntroCode();
    await touch(deps.db, quoteId, { q_code: fresh }, now);
    link = await insertQLink(deps.db, {
      code: fresh,
      quoteId,
      clientId: status.client?.id ?? row.client_id,
      firstName: firstNameOf(status.client) || (row.first_name ?? ''),
      title: status.title ?? row.title,
      hubUrl: status.clientHubUri as string,
      reviewId: introReviewFor(status.title ?? row.title),
      now,
    });
    if (link === 'collision') {
      await touch(deps.db, quoteId, { text_state: previous, text_error: 'Could not make the link, try again' }, now);
      return deskQuote(deps.db, quoteId);
    }
  }
  const body = quoteTextMessage(link.first_name, link.title, link.code);
  const quo: QuoDeps = { key, fetch: deps.fetch };

  // A retry after an unknown outcome first looks for the text in Quo.
  if (previous !== 'none') {
    const since = (row.text_claimed_at ?? row.approved_at ?? now) - MINUTE;
    const messages = await listMessages(quo, phone.e164, since, 'outgoing');
    if (messages === null) {
      await touch(deps.db, quoteId, { text_state: previous, text_error: 'Could not check Quo for an earlier text, try again' }, now);
      return deskQuote(deps.db, quoteId);
    }
    const already = messages.find((m) => (m.text ?? '').includes(`/q/${link.code}`));
    if (already) {
      await touch(deps.db, quoteId, { text_state: 'sent', text_message_id: already.id, text_status: already.status ?? 'sent', text_sent_at: Date.parse(already.createdAt ?? '') || now, text_to: phone.e164, text_body: body, q_code: link.code, text_error: null }, now);
      await logDeskEvent(deps.db, { actor, action: 'text_found_sent', quoteId, detail: `···${lastFour(phone.e164)}`, now });
      return deskQuote(deps.db, quoteId);
    }
  }

  const result = await sendText(quo, phone.e164, body);
  if (result.ok) {
    await touch(deps.db, quoteId, { text_state: 'sent', text_message_id: result.id, text_status: result.status, text_sent_at: now, text_to: phone.e164, text_body: body, q_code: link.code, text_error: null }, now);
    await logDeskEvent(deps.db, { actor, action: 'text_sent', quoteId, detail: `${source} ···${lastFour(phone.e164)} ${result.id}`, now });
    await noteSentLater(deps, quoteId);
  } else {
    const state = result.definite ? 'failed' : 'unknown';
    const message = result.definite ? result.reason : `${result.reason}. Not sure the text went out; Retry checks Quo first.`;
    await touch(deps.db, quoteId, { text_state: state, text_error: message, text_to: phone.e164, text_body: body, q_code: link.code }, now);
    await logDeskEvent(deps.db, { actor, action: `text_${state}`, quoteId, detail: result.reason, now });
    if (result.definite) await noteNotSent(deps, quoteId, row.approved_by ?? actor, result.reason);
  }
  return deskQuote(deps.db, quoteId);
}

/** Why the text cannot go out right now, or null. */
export async function sendProblem(deps: FlowDeps, status: RawQuoteStatus): Promise<string | null> {
  if (!quoteSendEnabled(deps.env)) return 'Texting is off';
  if (!quoKey(deps.env)) return 'QUO_API_KEY is not set';
  const phone = textablePhone(status.client?.phones);
  if (!phone) return 'No US phone number on file';
  if (phone.smsStopped) return 'This customer stopped texts in Jobber';
  if (!isClientHubUrl(status.clientHubUri)) return 'Jobber has no Client Hub link for this quote yet';
  return null;
}

// ---------------------------------------------------------------------------
// The other actions
// ---------------------------------------------------------------------------

export async function hideQuote(deps: FlowDeps, actor: string, quoteId: string, hidden: boolean): Promise<ActionResult> {
  const now = deps.now();
  await ensureDeskRow(deps.db, quoteId, {}, now);
  const result = hidden
    ? await deps.db
        .prepare("UPDATE desk_quotes SET state = 'hidden', hidden_by = ?2, hidden_at = ?3, updated_at = ?3 WHERE quote_id = ?1 AND state = 'open'")
        .bind(quoteId, actor, now)
        .run()
    : await deps.db
        .prepare("UPDATE desk_quotes SET state = 'open', hidden_by = NULL, hidden_at = NULL, updated_at = ?2 WHERE quote_id = ?1 AND state = 'hidden'")
        .bind(quoteId, now)
        .run();
  if ((result.meta.changes ?? 0) === 0) return { ok: false, message: hidden ? 'This quote is already approved or hidden' : 'This quote is not hidden', row: await deskQuote(deps.db, quoteId) };
  await logDeskEvent(deps.db, { actor, action: hidden ? 'hide' : 'unhide', quoteId, now });
  return { ok: true, row: await deskQuote(deps.db, quoteId) };
}

/** Saved to D1 always; added to Jobber's internal notes when the API allows. Status untouched. */
export async function requestChange(deps: FlowDeps, actor: string, quoteId: string, note: string): Promise<ActionResult> {
  const now = deps.now();
  const text = note.replace(/\s+\n/g, '\n').trim().slice(0, 1000);
  if (!text) return { ok: false, message: 'Write what needs to change', row: await deskQuote(deps.db, quoteId) };
  await ensureDeskRow(deps.db, quoteId, {}, now);
  const inserted = await deps.db
    .prepare('INSERT INTO desk_changes (quote_id, actor, note, at) VALUES (?1, ?2, ?3, ?4) RETURNING id')
    .bind(quoteId, actor, text, now)
    .first<{ id: number }>();
  let outcome: NoteOutcome = 'unsupported';
  const { access, schema } = await quotesAccess(deps.jobber);
  if (access === 'ok' && schema) {
    outcome = await addQuoteNote(deps.jobber, schema, quoteId, `Needs a change (${actor}, ${chicagoTimestamp(now)}, Quote Desk): ${text}`);
  }
  await deps.db.prepare('UPDATE desk_changes SET jobber_note = ?2 WHERE id = ?1').bind(inserted?.id ?? 0, outcome).run();
  await logDeskEvent(deps.db, { actor, action: 'change', quoteId, detail: `jobber_note=${outcome}`, now });
  return { ok: true, row: await deskQuote(deps.db, quoteId) };
}

// ---------------------------------------------------------------------------
// What the quote screen may offer
// ---------------------------------------------------------------------------

export interface DeskActions {
  approve: boolean;
  /** "Mark Awaiting Response, don't text". */
  mark: boolean;
  change: boolean;
  hide: boolean;
  unhide: boolean;
  retry: boolean;
  manualStep: boolean;
}

export function availableActions(row: DeskQuoteRow | null, jobberStatus: string | null, _branch: StatusBranch | null, now: number): DeskActions {
  const status = (jobberStatus ?? '').toLowerCase();
  const state = row?.state ?? 'open';
  const approved = state === 'approved';
  const staleClaim = row?.text_state === 'sending' && row.text_claimed_at !== null && now - row.text_claimed_at >= SEND_CLAIM_TTL;
  return {
    approve: !approved && state !== 'hidden' && (status === 'draft' || status === 'awaiting_response'),
    mark: state === 'open' && status === 'draft',
    change: !approved && status === 'draft',
    hide: state === 'open' && status === 'draft',
    unhide: state === 'hidden',
    retry: approved && (row?.text_state === 'failed' || row?.text_state === 'unknown' || staleClaim || (row?.text_state === 'none' && Boolean(row?.text_error))),
    manualStep: (approved || state === 'marked') && (row?.move_state === 'manual' || row?.move_state === 'failed') && status !== 'awaiting_response',
  };
}

/** Last known branch, for screens that do not need a fresh schema. */
export async function cachedBranch(db: D1Database): Promise<StatusBranch | null> {
  return kvGet<StatusBranch>(db, 'status_branch');
}

/**
 * The "Sent, waiting" refresh: Jobber's status, Client Hub view and approval
 * for every quote approved on the desk, plus one more advance() for any whose
 * text has not gone yet (a backup to the webhook and the 3-minute poll).
 */
export async function refreshSent(deps: FlowDeps, rows: DeskQuoteRow[]): Promise<void> {
  const now = deps.now();
  const live = rows.filter((r) => r.state === 'approved' && !r.quote_approved_at && (r.approved_at ?? 0) > now - MAX_APPROVAL_AGE);
  if (live.length === 0) return;
  const statuses = await fetchQuoteStatuses(deps.jobber, live.map((r) => r.quote_id));
  for (const row of live) {
    const status = statuses.get(row.quote_id);
    if (!status) continue;
    await recordStatus(deps.db, row, status, now);
    if (row.text_state === 'none' && (status.quoteStatus ?? '').toLowerCase() === 'awaiting_response') {
      await advance(deps, row.quote_id, 'list');
    }
  }
}

export { deskJobberDeps };
