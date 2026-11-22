import type { D1Database, Env } from './types.ts';
import { randomToken } from './crypto.ts';
import { MINUTE, DAY } from './db.ts';
import { chicagoTimestamp } from './env.ts';
import { JobberError, graphql } from './jobber.ts';
import {
  Q_LINK_RETENTION,
  deskQuote,
  findQLinkByQuote,
  insertQLink,
  kvGet,
  logDeskEvent,
  type DeskQuoteRow,
} from './desk-db.ts';
import {
  archiveJobberQuote,
  deskJobberDeps,
  editQuoteLineItems,
  fetchLineItems,
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
import { canTransition, OFF_DESK_MESSAGE, restoreState, transitionState } from './desk-state.ts';
import {
  NOT_SENT_NOTE,
  RESENT_EVENTS,
  RETRY_TAP_ERROR,
  SENT_NOTE,
  TEXT_RESENT,
  TEXT_RESEND_UNKNOWN,
  claimResend,
  claimText,
  releaseResend,
  retryCanSend,
  sendDecision,
  settleText,
  MAX_APPROVAL_AGE,
  AUTO_SEND_WINDOW,
  SEND_CLAIM_TTL,
  type AdvanceSource,
} from './desk-text.ts';

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
 * One quote gets at most one text on its own, plus the resends Essa taps.
 * text_state moves none → sending by a conditional UPDATE that only one caller
 * can win; a send whose outcome is unknown (network, 5xx) is never retried
 * blind: the retry first looks for the text in the Quo conversation. A resend
 * (resendLink) only ever runs from the "Resend link" tap, never from a poll or
 * a webhook.
 */

export { AUTO_SEND_WINDOW, SEND_CLAIM_TTL };
export type { AdvanceSource };

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

export async function touch(db: D1Database, quoteId: string, fields: Record<string, unknown>, now: number): Promise<void> {
  const keys = Object.keys(fields);
  // text_state and its claim columns have one writer: desk-text.ts.
  for (const key of keys) if (key === 'text_state' || key === 'text_owner' || key === 'text_claimed_at') throw new Error(`touch cannot write ${key}`);
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
  /** Shown after a success that still leaves a step for Essa (a desk-only archive). */
  notice?: string;
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
  const claimed = await transitionState(deps.db, quoteId, 'approve', { approved_by: actor, approved_at: now, hidden_by: null, hidden_at: null }, now);
  if (!claimed) {
    if ((await deskQuote(deps.db, quoteId))?.state === 'hidden') return { ok: false, message: OFF_DESK_MESSAGE, row: await deskQuote(deps.db, quoteId) };
    return { ok: true, row: await advance(deps, quoteId, 'approve', actor) };
  }
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

/**
 * Claim a once-per-quote event with one atomic statement: the row is inserted
 * only while no event of that action exists (and, for `requires`, while that
 * other one does). Whoever inserts it owns writing the Jobber note; the
 * outcome is recorded after, on the same row.
 */
async function claimEvent(
  db: D1Database,
  quoteId: string,
  action: string,
  actor: string,
  now: number,
  requires: string | null = null,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO desk_events (at, actor, action, quote_id, detail)
       SELECT ?1, ?2, ?3, ?4, 'jobber_note=pending'
       WHERE NOT EXISTS (SELECT 1 FROM desk_events WHERE quote_id = ?4 AND action = ?3)
         AND (?5 IS NULL OR EXISTS (SELECT 1 FROM desk_events WHERE quote_id = ?4 AND action = ?5))`,
    )
    .bind(now, actor, action, quoteId, requires)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

async function recordNoteOutcome(db: D1Database, quoteId: string, action: string, outcome: NoteOutcome): Promise<void> {
  await db.prepare('UPDATE desk_events SET detail = ?3 WHERE quote_id = ?1 AND action = ?2').bind(quoteId, action, `jobber_note=${outcome}`).run();
}

/**
 * The pinned "Quote not sent yet" note, once per quote. `moved` is false only
 * for Mark on the manual branch, where the quote is still a draft until Essa
 * sets it to Awaiting Response in Jobber, so the note must not claim it was.
 */
export async function noteNotSent(deps: FlowDeps, quoteId: string, actor: string, reason: string | null, moved = true): Promise<void> {
  const now = deps.now();
  if (!(await claimEvent(deps.db, quoteId, NOT_SENT_NOTE, actor, now))) return;
  let outcome: NoteOutcome = 'unsupported';
  try {
    const { access, schema } = await quotesAccess(deps.jobber);
    if (access === 'ok' && schema) {
      const why = reason ? ` (${reason})` : '';
      const done = moved
        ? `Set to Awaiting Response from the Quote Desk (${actor}, ${chicagoTimestamp(now)})`
        : `Marked on the Quote Desk (${actor}, ${chicagoTimestamp(now)}); still a draft until it is set to Awaiting Response in Jobber`;
      outcome = await addQuoteNote(deps.jobber, schema, quoteId, `Quote not sent yet. ${done}. The customer has not been texted or emailed${why}.`, true);
    }
  } catch {
    outcome = 'failed';
  }
  await recordNoteOutcome(deps.db, quoteId, NOT_SENT_NOTE, outcome);
}

export async function noteSentLater(deps: FlowDeps, quoteId: string): Promise<void> {
  const now = deps.now();
  if (!(await claimEvent(deps.db, quoteId, SENT_NOTE, 'system', now, NOT_SENT_NOTE))) return;
  let outcome: NoteOutcome = 'unsupported';
  try {
    const { access, schema } = await quotesAccess(deps.jobber);
    if (access === 'ok' && schema) {
      outcome = await addQuoteNote(deps.jobber, schema, quoteId, `Quote texted to the customer from the Quote Desk (${chicagoTimestamp(now)}).`);
    }
  } catch {
    outcome = 'failed';
  }
  await recordNoteOutcome(deps.db, quoteId, SENT_NOTE, outcome);
}

/**
 * "Mark Awaiting Response, don't text": the status move without the text.
 * No desk approval is recorded, so nothing ever texts this customer unless
 * Essa later taps "Send to {first} now" (which is a normal approval).
 */
export const MARK_IN_JOBBER = 'Jobber won\u2019t let the desk mark Awaiting Response. Tap Edit in Jobber, then More, Mark as Awaiting Response.';

export async function markOnly(deps: FlowDeps, actor: string, quoteId: string): Promise<ActionResult> {
  const now = deps.now();
  const { access, schema } = await quotesAccess(deps.jobber);
  if (access !== 'ok' || !schema) return { ok: false, message: 'Jobber needs reconnecting for quotes', row: await deskQuote(deps.db, quoteId) };
  // Never record "marked" on the desk unless Jobber itself can be moved.
  if (pickStatusBranch(schema).kind !== 'mutation') return { ok: false, message: MARK_IN_JOBBER, row: await deskQuote(deps.db, quoteId) };
  const status = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (!status) return { ok: false, message: 'Jobber has no such quote', row: null };
  const jobberStatus = (status.quoteStatus ?? '').toLowerCase();
  if (jobberStatus !== 'draft') {
    return { ok: false, message: `This quote is ${jobberStatus.replace(/_/g, ' ')} in Jobber`, row: await deskQuote(deps.db, quoteId) };
  }
  await ensureDeskRow(deps.db, quoteId, { clientId: status.client?.id, first: firstNameOf(status.client), title: status.title ?? null, status: jobberStatus }, now);
  const claimed = await transitionState(deps.db, quoteId, 'mark', { hidden_by: null, hidden_at: null }, now);
  if (!claimed) {
    const current = await deskQuote(deps.db, quoteId);
    if (current?.state === 'hidden') return { ok: false, message: OFF_DESK_MESSAGE, row: current };
    return { ok: false, message: 'This quote is already approved or marked', row: current };
  }
  await logDeskEvent(deps.db, { actor, action: 'mark_only', quoteId, now });
  await moveStatus(deps, schema, quoteId, jobberStatus, now);
  const row = await deskQuote(deps.db, quoteId);
  if (row?.move_state === 'done' || row?.move_state === 'manual') await noteNotSent(deps, quoteId, actor, null, row.move_state === 'done');
  const fresh = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (fresh && row) await recordStatus(deps.db, row, fresh, now);
  return { ok: true, row: await deskQuote(deps.db, quoteId) };
}

// ---------------------------------------------------------------------------
// Advance: notice the status flip and send the one text
// ---------------------------------------------------------------------------

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
  if (!row || sendDecision(row, undefined, source, now).kind !== 'check_jobber') return row;

  const status = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (!status) return row;
  await recordStatus(deps.db, row, status, now);
  const decision = sendDecision(row, status.quoteStatus ?? '', source, now);
  if (decision.kind === 'needs_retry_tap') {
    if (row.text_error !== RETRY_TAP_ERROR) await touch(deps.db, quoteId, { text_error: RETRY_TAP_ERROR }, now);
    return deskQuote(deps.db, quoteId);
  }
  if (decision.kind !== 'claim') return deskQuote(deps.db, quoteId);
  const retrying = source === 'retry';

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
  // retry, out of failed / unknown / a dead claim). See desk-text.ts.
  const owner = randomToken(9);
  if (!(await claimText(deps.db, quoteId, owner, now, retrying))) return deskQuote(deps.db, quoteId);
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
      await settleText(deps.db, quoteId, previous, { text_error: 'Could not make the link, try again' }, now);
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
      await settleText(deps.db, quoteId, previous, { text_error: 'Could not check Quo for an earlier text, try again' }, now);
      return deskQuote(deps.db, quoteId);
    }
    const already = messages.find((m) => (m.text ?? '').includes(`/q/${link.code}`));
    if (already) {
      await settleText(deps.db, quoteId, 'sent', { text_message_id: already.id, text_status: already.status ?? 'sent', text_sent_at: Date.parse(already.createdAt ?? '') || now, text_to: phone.e164, text_body: body, q_code: link.code, text_error: null }, now);
      await logDeskEvent(deps.db, { actor, action: 'text_found_sent', quoteId, detail: `···${lastFour(phone.e164)}`, now });
      return deskQuote(deps.db, quoteId);
    }
  }

  const result = await sendText(quo, phone.e164, body);
  if (result.ok) {
    await settleText(deps.db, quoteId, 'sent', { text_message_id: result.id, text_status: result.status, text_sent_at: now, text_to: phone.e164, text_body: body, q_code: link.code, text_error: null }, now);
    await logDeskEvent(deps.db, { actor, action: 'text_sent', quoteId, detail: `${source} ···${lastFour(phone.e164)} ${result.id}`, now });
    await noteSentLater(deps, quoteId);
  } else {
    const state = result.definite ? 'failed' : 'unknown';
    const message = result.definite ? result.reason : `${result.reason}. Not sure the text went out; Retry checks Quo first.`;
    await settleText(deps.db, quoteId, state, { text_error: message, text_to: phone.e164, text_body: body, q_code: link.code }, now);
    await logDeskEvent(deps.db, { actor, action: `text_${state}`, quoteId, detail: result.reason, now });
    if (result.definite) await noteNotSent(deps, quoteId, row.approved_by ?? actor, result.reason);
  }
  return deskQuote(deps.db, quoteId);
}

// ---------------------------------------------------------------------------
// "Resend link": the same text and the same /q/ link again, on Essa's tap only
// ---------------------------------------------------------------------------

/** No resend within this long of the last text that went out (the first one or a resend). */
export const RESEND_GAP = 10 * MINUTE;
/** Resends a quote may ever get. */
export const MAX_RESENDS = 5;
/** A link that has expired, or would within this long, gets a fresh year when it is re-sent. */
export const RESEND_LINK_REFRESH = 30 * DAY;


export async function resendCount(db: D1Database, quoteId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM desk_events WHERE quote_id = ?1 AND action IN (${RESENT_EVENTS.map((_, i) => `?${i + 2}`).join(', ')})`)
    .bind(quoteId, ...RESENT_EVENTS)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

/** Why a resend cannot go out right now, from D1 alone (no Jobber call), or null. */
export function resendBlock(env: Env, row: DeskQuoteRow | null, count: number, now: number): string | null {
  if (!quoteSendEnabled(env)) return 'Texting is off';
  if (!quoKey(env)) return 'QUO_API_KEY is not set';
  if (!row || row.state !== 'approved' || row.text_state !== 'sent' || !row.q_code) return 'Only a quote whose text already went out can be re-sent';
  if (count >= MAX_RESENDS) return `The link was already re-sent ${MAX_RESENDS} times`;
  if (row.text_sent_at !== null && now - row.text_sent_at < RESEND_GAP) return 'The link went out less than 10 minutes ago. Try again later';
  return null;
}

/**
 * "Resend link". Runs only from Essa's tap (POST /api/desk/action resend),
 * never from a poll, the list or a webhook. Sends the very same text with the
 * same /q/ code from the EYS inbox, then adds a note on the quote in Jobber.
 * At most one Quo call per tap: the claim moves text_sent_at to now with a
 * conditional UPDATE, so a second tap (or two at once) finds the 10-minute
 * gap closed.
 */
export async function resendLink(deps: FlowDeps, actor: string, quoteId: string): Promise<ActionResult> {
  const now = deps.now();
  const refuse = async (message: string): Promise<ActionResult> => ({ ok: false, message, row: await deskQuote(deps.db, quoteId) });
  const row = await deskQuote(deps.db, quoteId);
  const blocked = resendBlock(deps.env, row, await resendCount(deps.db, quoteId), now);
  if (blocked || !row) return refuse(blocked ?? 'Only a quote whose text already went out can be re-sent');
  const link = await findQLinkByQuote(deps.db, quoteId);
  if (!link) return refuse('This quote has no link to re-send');

  const status = (await fetchQuoteStatuses(deps.jobber, [quoteId])).get(quoteId);
  if (!status) return refuse('Jobber has no such quote');
  await recordStatus(deps.db, row, status, now);
  const jobberStatus = (status.quoteStatus ?? '').toLowerCase();
  if (jobberStatus !== 'awaiting_response') {
    return refuse(`This quote is ${jobberStatus ? jobberStatus.replace(/_/g, ' ') : 'not awaiting a response'} in Jobber, so the link was not re-sent`);
  }
  const phone = textablePhone(status.client?.phones);
  if (!phone) return refuse('No US phone number on file');
  if (phone.smsStopped) return refuse('This customer stopped texts in Jobber');

  // The claim: one caller per 10 minutes moves text_sent_at to now.
  if (!(await claimResend(deps.db, quoteId, now, RESEND_GAP))) return refuse('The link went out less than 10 minutes ago. Try again later');
  // An expired (or nearly expired) link works again for another year.
  if (link.created_at < now - Q_LINK_RETENTION + RESEND_LINK_REFRESH) {
    await deps.db.prepare('UPDATE q_links SET created_at = ?2 WHERE code = ?1').bind(link.code, now).run();
  }

  const body = quoteTextMessage(link.first_name, link.title, link.code);
  const result = await sendText({ key: quoKey(deps.env) as string, fetch: deps.fetch }, phone.e164, body);
  if (!result.ok && result.definite) {
    // Nothing went out: give back the 10-minute gap and do not count it.
    await releaseResend(deps.db, quoteId, row.text_sent_at, now);
    await logDeskEvent(deps.db, { actor, action: 'text_resend_failed', quoteId, detail: `···${lastFour(phone.e164)} ${result.reason}`, now });
    return refuse(`${result.reason}. The link was not re-sent`);
  }
  if (!result.ok) {
    await logDeskEvent(deps.db, { actor, action: TEXT_RESEND_UNKNOWN, quoteId, detail: `···${lastFour(phone.e164)} ${result.reason}`, now });
    return refuse(`${result.reason}. Not sure the text went out, so check Quo before trying again`);
  }

  await touch(deps.db, quoteId, { text_message_id: result.id, text_status: result.status, text_to: phone.e164, text_body: body, text_error: null }, now);
  let outcome: NoteOutcome = 'unsupported';
  try {
    const { access, schema } = await quotesAccess(deps.jobber);
    if (access === 'ok' && schema) {
      outcome = await addQuoteNote(deps.jobber, schema, quoteId, `Quote link re-sent to the customer from the Quote Desk (${actor}, ${chicagoTimestamp(now)}).`);
    }
  } catch {
    outcome = 'failed';
  }
  await logDeskEvent(deps.db, { actor, action: TEXT_RESENT, quoteId, detail: `···${lastFour(phone.e164)} ${result.id} jobber_note=${outcome}`, now });
  return { ok: true, row: await deskQuote(deps.db, quoteId) };
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
  const changed = hidden
    ? await transitionState(deps.db, quoteId, 'hide', { hidden_by: actor, hidden_at: now }, now)
    : await transitionState(deps.db, quoteId, 'unhide', { hidden_by: null, hidden_at: null }, now);
  if (!changed) return { ok: false, message: hidden ? 'This quote is already approved or hidden' : 'This quote is not hidden', row: await deskQuote(deps.db, quoteId) };
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

// ---------------------------------------------------------------------------
// Edit a line's description and price
// ---------------------------------------------------------------------------

export interface LineEdit {
  id: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export const MAX_LINE_DESCRIPTION = 2000;
export const MAX_LINE_PRICE = 250_000;
export const MAX_LINE_QUANTITY = 100_000;

function amount(value: unknown): number {
  return typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
}

/** Words a customer must never see on an EYS quote. */
export const FORBIDDEN_ON_QUOTES: [RegExp, string][] = [
  [/\blicen[cs]ed?\b/i, 'EYS can\u2019t say \u201clicensed\u201d on a quote.'],
  [/\bHOA\b|home ?owners'? association/i, 'No HOA mention on a quote.'],
];

/** The edits from the desk, checked; a string is the reason they were refused. */
export function parseLineEdits(raw: unknown): LineEdit[] | string {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 60) return 'Nothing to save.';
  const out: LineEdit[] = [];
  for (const item of raw) {
    const v = (item ?? {}) as { id?: unknown; description?: unknown; quantity?: unknown; unitPrice?: unknown };
    if (typeof v.id !== 'string' || v.id.trim() === '' || v.id.length > 200) return 'Nothing to save.';
    const edit: LineEdit = { id: v.id.trim() };
    if (v.description !== undefined) {
      if (typeof v.description !== 'string') return 'The description must be text.';
      const text = v.description.replace(/\r\n?/g, '\n').trim();
      if (text === '') return 'The description can\u2019t be empty.';
      if (text.length > MAX_LINE_DESCRIPTION) return `Keep the description under ${MAX_LINE_DESCRIPTION} characters.`;
      for (const [pattern, message] of FORBIDDEN_ON_QUOTES) if (pattern.test(text)) return message;
      edit.description = text;
    }
    if (v.quantity !== undefined) {
      const quantity = amount(v.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_LINE_QUANTITY) return 'Enter a quantity above 0 (use 1 for one flat price).';
      edit.quantity = Math.round(quantity * 100) / 100;
    }
    if (v.unitPrice !== undefined) {
      const price = amount(v.unitPrice);
      if (!Number.isFinite(price) || price < 0 || price > MAX_LINE_PRICE) return 'Enter a price between $0 and $250,000.';
      edit.unitPrice = Math.round(price * 100) / 100;
    }
    out.push(edit);
  }
  return out;
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function countText(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * "Edit" on a line: new description and/or unit price, on a draft that hasn't
 * been approved on the desk. Only what changed is sent to Jobber
 * (quoteEditLineItems), then a note on the quote says who changed what.
 */
export async function editLines(deps: FlowDeps, actor: string, quoteId: string, raw: unknown): Promise<ActionResult> {
  const now = deps.now();
  const parsed = parseLineEdits(raw);
  let row = await deskQuote(deps.db, quoteId);
  if (typeof parsed === 'string') return { ok: false, message: parsed, row };
  if (row?.state === 'approved') return { ok: false, message: 'Already approved here. Change it in Jobber if it must change.', row };
  const { access, schema } = await quotesAccess(deps.jobber);
  if (access !== 'ok' || !schema) return { ok: false, message: 'Jobber needs reconnecting for quotes', row };
  const current = await fetchLineItems(deps.jobber, quoteId);
  if (!current) return { ok: false, message: 'Quote not found in Jobber.', row };
  if ((current.status ?? '').toLowerCase() !== 'draft') return { ok: false, message: 'Only a draft can be edited here. Use Edit in Jobber.', row };

  const changes: LineEdit[] = [];
  const summary: string[] = [];
  for (const edit of parsed) {
    const line = current.lines.find((l) => l.id === edit.id);
    if (!line) return { ok: false, message: 'That line is no longer on the quote. Reload and try again.', row };
    const change: LineEdit = { id: edit.id };
    const said: string[] = [];
    const oldQty = line.quantity ?? 1;
    const oldUnit = line.unitPrice ?? 0;
    const qtyChanged = !line.textOnly && edit.quantity !== undefined && edit.quantity !== oldQty;
    const priceChanged = !line.textOnly && edit.unitPrice !== undefined && edit.unitPrice !== (line.unitPrice ?? null);
    if (qtyChanged || priceChanged) {
      const newQty = qtyChanged ? (edit.quantity as number) : oldQty;
      const newUnit = priceChanged ? (edit.unitPrice as number) : oldUnit;
      if (qtyChanged) change.quantity = newQty;
      if (priceChanged) change.unitPrice = newUnit;
      change.totalPrice = Math.round(newQty * newUnit * 100) / 100;
      said.push(
        qtyChanged
          ? `${countText(oldQty)} × ${money(oldUnit)} to ${countText(newQty)} × ${money(newUnit)}`
          : `${money(oldUnit)} to ${money(newUnit)}${oldQty !== 1 ? ' each' : ''}`,
      );
    }
    if (edit.description !== undefined && edit.description !== (line.description ?? '').trim()) {
      change.description = edit.description;
      said.push('description changed');
    }
    if (said.length) {
      changes.push(change);
      summary.push(`${line.name ?? 'Line'}: ${said.join(', ')}`);
    }
  }
  if (changes.length === 0) return { ok: true, row };

  const outcome = await editQuoteLineItems(deps.jobber, schema, quoteId, changes);
  if (!outcome.ok) {
    await logDeskEvent(deps.db, { actor, action: 'edit_failed', quoteId, detail: outcome.message ?? outcome.reason, now });
    return {
      ok: false,
      message:
        outcome.reason === 'unsupported'
          ? 'Jobber doesn\u2019t allow editing lines from here. Use Edit in Jobber.'
          : `Jobber refused the change${outcome.message ? `: ${outcome.message}` : ''}. Nothing changed.`,
      row,
    };
  }
  const text = summary.join('; ');
  await addQuoteNote(deps.jobber, schema, quoteId, `Edited on the Quote Desk (${actor}, ${chicagoTimestamp(now)}): ${text}.`);
  await logDeskEvent(deps.db, { actor, action: 'edit', quoteId, detail: text.slice(0, 500), now });
  row = await deskQuote(deps.db, quoteId);
  return { ok: true, row };
}

/** Jobber statuses Archive works from: a draft (moved to Awaiting Response first) or one waiting on the customer. */
const ARCHIVABLE = new Set(['draft', 'awaiting_response', 'changes_requested']);

/** What's left for Essa when Jobber won't let the desk archive a draft. */
export const ARCHIVE_IN_JOBBER = 'Off the desk. To archive it in Jobber too, open it there and tap More, Mark as Awaiting Response, then Archive.';

const ARCHIVE_BY_HAND =
  'Jobber only archives a quote once it\u2019s out of draft, and it wouldn\u2019t move this one. In Jobber tap More, Mark as Awaiting Response, then tap Archive here again.';

/**
 * Take a draft to Awaiting Response with Jobber's no-message mark mutation,
 * confirmed by reading the status back. Only called when the token sees that
 * mutation; the live token doesn't (2026-11-20), and nothing else the token
 * can call takes a quote out of draft.
 */
async function leaveDraft(
  j: DeskJobber,
  branch: Extract<StatusBranch, { kind: 'mutation' }>,
  quoteId: string,
): Promise<{ ok: true; via: string } | { ok: false; message: string; detail: string }> {
  try {
    await moveToAwaiting(j, branch, quoteId);
  } catch (error) {
    return { ok: false, message: 'Jobber wouldn\u2019t mark it Awaiting Response. Nothing changed.', detail: error instanceof JobberError ? error.errorClass : 'error' };
  }
  const after = (await fetchQuoteStatuses(j, [quoteId])).get(quoteId);
  if ((after?.quoteStatus ?? 'draft').toLowerCase() === 'draft') return { ok: false, message: ARCHIVE_BY_HAND, detail: `${branch.mutation} left it a draft` };
  return { ok: true, via: branch.mutation };
}

/**
 * "Archive", from a draft or a quote waiting on the customer, including one
 * Eyad already approved here. The quote always comes off the desk's send list
 * first, so no status change in Jobber can text the customer afterwards.
 * - Out of draft: Jobber's own Archive.
 * - A draft, when the token can mark Awaiting Response: mark it, then Archive
 *   (Jobber refuses to archive drafts).
 * - A draft otherwise (the live token, 2026-11-20): nothing in Jobber can be
 *   done from here, so it only leaves the desk, and `notice` says the Jobber step.
 * Undo is Unarchive in Jobber web, or "Bring back" for a desk-only archive.
 */
export async function archiveQuote(deps: FlowDeps, actor: string, quoteId: string): Promise<ActionResult> {
  const now = deps.now();
  let row = await deskQuote(deps.db, quoteId);
  const { access, schema } = await quotesAccess(deps.jobber);
  if (access !== 'ok' || !schema) return { ok: false, message: 'Jobber needs reconnecting for quotes', row };
  const current = await fetchLineItems(deps.jobber, quoteId);
  if (!current) return { ok: false, message: 'Quote not found in Jobber.', row };
  const status = (current.status ?? '').toLowerCase();
  if (status === 'archived') return { ok: false, message: 'Already archived in Jobber.', row };
  if (!ARCHIVABLE.has(status)) return { ok: false, message: 'Jobber can\u2019t archive a quote the customer approved. Use Edit in Jobber.', row };

  // Off the send list first: advance() texts only 'approved' rows.
  const before = await ensureDeskRow(deps.db, quoteId, { status }, now);
  await transitionState(deps.db, quoteId, 'archive', { hidden_by: actor, hidden_at: now }, now);
  const putBack = () => restoreState(deps.db, quoteId, before, now);

  let via = 'already out of draft';
  if (status === 'draft') {
    const branch = pickStatusBranch(schema);
    if (branch.kind !== 'mutation') {
      await logDeskEvent(deps.db, { actor, action: 'archive', quoteId, detail: 'desk only: Jobber keeps drafts and the token cannot mark Awaiting Response', now });
      return { ok: true, row: await deskQuote(deps.db, quoteId), notice: ARCHIVE_IN_JOBBER };
    }
    const moved = await leaveDraft(deps.jobber, branch, quoteId);
    if (!moved.ok) {
      await putBack();
      await logDeskEvent(deps.db, { actor, action: 'archive_failed', quoteId, detail: moved.detail, now });
      return { ok: false, message: moved.message, row: await deskQuote(deps.db, quoteId) };
    }
    via = moved.via;
  }

  const outcome = await archiveJobberQuote(deps.jobber, schema, quoteId);
  if (!outcome.ok) {
    await logDeskEvent(deps.db, { actor, action: 'archive_failed', quoteId, detail: `${via}; ${outcome.message ?? outcome.reason}`, now });
    if (status !== 'draft') await putBack();
    // A draft that was moved stays off the desk: putting an approved one back
    // would let the next status check text the customer.
    const refused = outcome.message ? `: ${outcome.message}` : '';
    return {
      ok: false,
      message:
        status === 'draft'
          ? `It\u2019s now Awaiting Response in Jobber (nobody was texted), but Jobber wouldn\u2019t archive it${refused}. In Jobber tap More, Archive.`
          : `Jobber wouldn\u2019t archive it${refused}. Nothing changed.`,
      row: await deskQuote(deps.db, quoteId),
    };
  }
  await deps.db.prepare("UPDATE desk_quotes SET jobber_status = 'archived', updated_at = ?2 WHERE quote_id = ?1").bind(quoteId, now).run();
  await logDeskEvent(deps.db, { actor, action: 'archive', quoteId, detail: via, now });
  row = await deskQuote(deps.db, quoteId);
  return { ok: true, row };
}

export interface DeskActions {
  approve: boolean;
  /** "Mark Awaiting Response, don't text". */
  mark: boolean;
  change: boolean;
  hide: boolean;
  unhide: boolean;
  retry: boolean;
  manualStep: boolean;
  /** Edit a line's description and price (drafts not yet approved). */
  edit: boolean;
  /** Archive the quote in Jobber (replaces "Not sending"). */
  archive: boolean;
  /** "Resend link": the same text and /q/ link again, on Essa's tap only. */
  resend: boolean;
  /** "Ready for Mark": a draft the callers should ask the deposit for. */
  ready: boolean;
  /** "Back to drafts" from Ready for Mark. */
  unready: boolean;
}

export function availableActions(row: DeskQuoteRow | null, jobberStatus: string | null, branch: StatusBranch | null, now: number): DeskActions {
  const status = (jobberStatus ?? '').toLowerCase();
  const state = row?.state ?? 'open';
  const approved = state === 'approved';
  // Mark is offered only when the token can really move the status: Jobber
  // gives this app no quote status mutation (2026-11-22), and a desk-only
  // "marked" showed Essa a status Jobber never had.
  const canMove = branch?.kind === 'mutation';
  return {
    approve: canTransition(state, 'approve') && (status === 'draft' || status === 'awaiting_response'),
    mark: canMove && canTransition(state, 'mark') && status === 'draft',
    change: !approved && status === 'draft',
    hide: canTransition(state, 'hide') && status === 'draft',
    unhide: canTransition(state, 'unhide'),
    retry: retryCanSend(row, status || null, now),
    manualStep: (approved || state === 'marked') && (row?.move_state === 'manual' || row?.move_state === 'failed') && status !== 'awaiting_response',
    edit: !approved && status === 'draft',
    archive: ARCHIVABLE.has(status),
    resend: approved && row?.text_state === 'sent' && status === 'awaiting_response',
    ready: canTransition(state, 'ready') && status === 'draft',
    unready: canTransition(state, 'unready'),
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
