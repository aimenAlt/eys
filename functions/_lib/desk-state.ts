/**
 * The Quote Desk's review state, in one place.
 *
 * desk_quotes.state is 'open' | 'approved' | 'marked' | 'hidden'. Every write
 * to it goes through transitionState() or restoreState() below, so the server's
 * guards and the phone's buttons (availableActions) read the same table.
 * A drift test fails on any other `UPDATE desk_quotes SET state`.
 *
 *   open     -> approve -> approved      (Looks good: status move, one text)
 *   open     -> mark    -> marked        (Awaiting Response, no text)
 *   marked   -> approve -> approved      (Send to {first} now)
 *   open     -> hide    -> hidden
 *   hidden   -> unhide  -> open
 *   any      -> archive -> hidden        (archive takes it off the send list first)
 *
 * A hidden quote cannot be approved or marked: Bring back first. Otherwise a
 * stale phone could re-approve an archived draft and the webhook would text
 * the customer when it is later marked Awaiting Response in Jobber.
 */
import type { D1Database } from './types.ts';

export type DeskState = 'open' | 'approved' | 'marked' | 'hidden';
export type StateAction = 'approve' | 'mark' | 'hide' | 'unhide' | 'archive';

export const ALL_STATES: readonly DeskState[] = ['open', 'approved', 'marked', 'hidden'];

export const TRANSITIONS: Readonly<Record<StateAction, { from: readonly DeskState[]; to: DeskState }>> = {
  approve: { from: ['open', 'marked'], to: 'approved' },
  mark: { from: ['open'], to: 'marked' },
  hide: { from: ['open'], to: 'hidden' },
  unhide: { from: ['hidden'], to: 'open' },
  archive: { from: ALL_STATES, to: 'hidden' },
};

export const APPROVE_FROM = TRANSITIONS.approve.from;
export const MARK_FROM = TRANSITIONS.mark.from;
export const HIDE_FROM = TRANSITIONS.hide.from;
export const UNHIDE_FROM = TRANSITIONS.unhide.from;
export const ARCHIVE_FROM = TRANSITIONS.archive.from;

export const OFF_DESK_MESSAGE = 'It’s off the desk. Tap Bring back first.';

/** A missing desk row counts as 'open'. */
export function canTransition(state: DeskState | null | undefined, action: StateAction): boolean {
  return TRANSITIONS[action].from.includes(state ?? 'open');
}

/** Columns the caller may set alongside the state (never 'state' or 'updated_at'). */
type Extra = Record<string, string | number | null>;

const COLUMN = /^[a-z_]+$/;

/**
 * The one writer: UPDATE ... WHERE quote_id = ? AND state IN (from). Returns
 * whether a row changed, so a second tap or a lost race changes nothing.
 */
export async function transitionState(db: D1Database, quoteId: string, action: StateAction, extra: Extra, now: number): Promise<boolean> {
  const { from, to } = TRANSITIONS[action];
  const keys = Object.keys(extra);
  for (const key of keys) if (!COLUMN.test(key) || key === 'state' || key === 'updated_at') throw new Error(`bad desk column ${key}`);
  const sets = keys.map((key, i) => `${key} = ?${i + 3}`).join(', ');
  const guard = from.map((s) => `'${s}'`).join(', ');
  const result = await db
    .prepare(`UPDATE desk_quotes SET state = '${to}'${sets ? `, ${sets}` : ''}, updated_at = ?2 WHERE quote_id = ?1 AND state IN (${guard})`)
    .bind(quoteId, now, ...keys.map((key) => extra[key]))
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/**
 * Archive's put-back: restore the state and hidden_* the row had before, but
 * only while it is still 'hidden', so a concurrent change is never overwritten.
 */
export async function restoreState(
  db: D1Database,
  quoteId: string,
  before: { state: DeskState; hidden_by: string | null; hidden_at: number | null },
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE desk_quotes SET state = ?2, hidden_by = ?3, hidden_at = ?4, updated_at = ?5 WHERE quote_id = ?1 AND state = 'hidden'")
    .bind(quoteId, before.state, before.hidden_by, before.hidden_at, now)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
