/**
 * The Quote Desk's text, in one place.
 *
 * desk_quotes.text_state is 'none' | 'sending' | 'sent' | 'failed' | 'unknown'.
 * Every write to it (and to the claim columns text_owner / text_claimed_at)
 * goes through claimText() and settleText() below; sendDecision() is the one
 * pure answer to "may this text go out now?" that advance() and the Retry
 * button (availableActions) both use. A drift test (desk-text.test.ts) fails
 * on any other write.
 *
 *   none                      -> claim  -> sending   (any source)
 *   failed | unknown | stale  -> claim  -> sending   (a Retry tap only)
 *   sending                   -> settle -> sent | failed | unknown | <the state it was claimed from>
 *
 * 'unknown' means Quo may have sent it: a retry looks in Quo before sending.
 * A claim older than SEND_CLAIM_TTL is a dead isolate's ("stale").
 */
import type { D1Database } from './types.ts';
import { DAY, MINUTE } from './db.ts';
import type { DeskQuoteRow } from './desk-db.ts';

export type TextState = 'none' | 'sending' | 'sent' | 'failed' | 'unknown';
export type TextAction = 'claim' | 'retryClaim' | 'settle';
export type AdvanceSource = 'approve' | 'poll' | 'webhook' | 'retry' | 'list';

export const ALL_TEXT_STATES: readonly TextState[] = ['none', 'sending', 'sent', 'failed', 'unknown'];

/** A claim older than this is a dead isolate's, and only "Retry text" may take it over. */
export const SEND_CLAIM_TTL = 2 * MINUTE;
export const MAX_APPROVAL_AGE = 60 * DAY;
/**
 * Texts go out on their own only within a day of the tap. Past that (texting
 * was off, Essa marked it in Jobber days later) it waits for "Retry text", so
 * turning QUOTE_SEND_ENABLED on never sends a burst of old quotes.
 */
export const AUTO_SEND_WINDOW = DAY;

export const TEXT_TRANSITIONS: Readonly<Record<TextAction, { from: readonly TextState[]; to: readonly TextState[] }>> = {
  claim: { from: ['none'], to: ['sending'] },
  // 'sending' here means a stale claim only (see claimText's age guard).
  retryClaim: { from: ['none', 'failed', 'unknown', 'sending'], to: ['sending'] },
  settle: { from: ['sending'], to: ['sent', 'failed', 'unknown', 'none', 'sending'] },
};

/** Desk events that are state: checked to keep a note or a count to once. */
export const NOT_SENT_NOTE = 'not_sent_note';
export const SENT_NOTE = 'sent_note';
export const TEXT_RESENT = 'text_resent';
export const TEXT_RESEND_UNKNOWN = 'text_resend_unknown';
/** Events that count as a resend that went out (an unknown outcome counts: it may have). */
export const RESENT_EVENTS: readonly string[] = [TEXT_RESENT, TEXT_RESEND_UNKNOWN];

/** The error line shown when an approval is past the auto-send window. */
export const RETRY_TAP_ERROR = 'Tap Retry text to send it now';
export const TOO_OLD_REASON = "Approved over 60 days ago, so the desk won't text it. Check the quote, then send it from Jobber.";

type TextRow = Pick<DeskQuoteRow, 'state' | 'text_state' | 'text_claimed_at' | 'approved_at' | 'text_error'>;

export type SendDecision =
  | { kind: 'skip'; reason: 'not_approved' | 'already_sent' | 'too_old' | 'not_awaiting' | 'already_started' | 'claim_live' }
  | { kind: 'check_jobber' }
  | { kind: 'needs_retry_tap' }
  | { kind: 'claim' };

/**
 * advance()'s gates, in order. Call it with jobberStatus undefined before
 * asking Jobber (the first gates need no Jobber call): 'check_jobber' means
 * "ask Jobber, then call again with its status".
 */
export function sendDecision(row: TextRow | null, jobberStatus: string | null | undefined, source: AdvanceSource, now: number): SendDecision {
  if (!row || row.state !== 'approved') return { kind: 'skip', reason: 'not_approved' };
  if (row.text_state === 'sent') return { kind: 'skip', reason: 'already_sent' };
  if (row.approved_at !== null && now - row.approved_at > MAX_APPROVAL_AGE) return { kind: 'skip', reason: 'too_old' };
  if (jobberStatus === undefined) return { kind: 'check_jobber' };
  if ((jobberStatus ?? '').toLowerCase() !== 'awaiting_response') return { kind: 'skip', reason: 'not_awaiting' };
  const retrying = source === 'retry';
  if (row.text_state !== 'none' && !retrying) return { kind: 'skip', reason: 'already_started' };
  if (!retrying && row.approved_at !== null && now - row.approved_at > AUTO_SEND_WINDOW) return { kind: 'needs_retry_tap' };
  if (row.text_state === 'sending' && row.text_claimed_at !== null && now - row.text_claimed_at < SEND_CLAIM_TTL) return { kind: 'skip', reason: 'claim_live' };
  return { kind: 'claim' };
}

/** Would a Retry tap actually send (Jobber's status as known now)? The one predicate behind the Retry button. */
export function retryCanSend(row: TextRow | null, jobberStatus: string | null, now: number): boolean {
  if (!row) return false;
  const stale = row.text_state === 'sending' && row.text_claimed_at !== null && now - row.text_claimed_at >= SEND_CLAIM_TTL;
  const offered = row.text_state === 'failed' || row.text_state === 'unknown' || stale || (row.text_state === 'none' && Boolean(row.text_error));
  return offered && sendDecision(row, jobberStatus, 'retry', now).kind === 'claim';
}

/** Past MAX_APPROVAL_AGE the desk never texts: the screen says so instead of offering Retry. */
export function textBlockReason(row: Pick<DeskQuoteRow, 'state' | 'text_state' | 'approved_at'> | null, now: number): string | null {
  if (!row || row.state !== 'approved' || row.text_state === 'sent') return null;
  return row.approved_at !== null && now - row.approved_at > MAX_APPROVAL_AGE ? TOO_OLD_REASON : null;
}

/** The human label for the desk's status block. */
export function textLabel(row: Pick<DeskQuoteRow, 'text_state'> | null): string {
  switch (row?.text_state) {
    case 'sent':
      return 'Text sent';
    case 'sending':
      return 'Sending text';
    case 'failed':
      return 'Text failed';
    case 'unknown':
      return 'Text may have gone out, check Quo';
    default:
      return 'Text not sent';
  }
}

/**
 * The claim: only one caller ever moves this row out of 'none' (or, for a
 * retry, out of failed / unknown / a dead claim). Returns whether this caller won.
 */
export async function claimText(db: D1Database, quoteId: string, owner: string, now: number, retrying: boolean): Promise<boolean> {
  const claim = await db
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
  return (claim.meta.changes ?? 0) === 1;
}

const COLUMN = /^[a-z_]+$/;

/**
 * Settle a claimed send: the new text_state ('sent', 'failed', 'unknown', or
 * the state it was claimed from) plus the columns that go with it.
 */
export async function settleText(db: D1Database, quoteId: string, to: TextState, extra: Record<string, string | number | null>, now: number): Promise<void> {
  if (!TEXT_TRANSITIONS.settle.to.includes(to)) throw new Error(`bad text state ${to}`);
  const keys = Object.keys(extra);
  for (const key of keys) if (!COLUMN.test(key) || key === 'text_state' || key === 'updated_at') throw new Error(`bad desk column ${key}`);
  const sets = keys.map((key, i) => `${key} = ?${i + 3}`).join(', ');
  await db
    .prepare(`UPDATE desk_quotes SET text_state = ?2${sets ? `, ${sets}` : ''}, updated_at = ?${keys.length + 3} WHERE quote_id = ?1`)
    .bind(quoteId, to, ...keys.map((key) => extra[key]), now)
    .run();
}

/** Resend's claim: one caller per gap moves text_sent_at to now. Returns whether this caller won. */
export async function claimResend(db: D1Database, quoteId: string, now: number, gap: number): Promise<boolean> {
  const claim = await db
    .prepare(
      `UPDATE desk_quotes SET text_sent_at = ?2, updated_at = ?2
       WHERE quote_id = ?1 AND state = 'approved' AND text_state = 'sent' AND COALESCE(text_sent_at, 0) <= ?3`,
    )
    .bind(quoteId, now, now - gap)
    .run();
  return (claim.meta.changes ?? 0) === 1;
}

/** A refused resend gives the gap back (only while it is still this caller's claim). */
export async function releaseResend(db: D1Database, quoteId: string, previousSentAt: number | null, claimedAt: number): Promise<void> {
  await db
    .prepare('UPDATE desk_quotes SET text_sent_at = ?2, updated_at = ?3 WHERE quote_id = ?1 AND text_sent_at = ?3')
    .bind(quoteId, previousSentAt, claimedAt)
    .run();
}
