import { chicagoTimestamp } from './env.ts';
import { deskQuote, logDeskEvent } from './desk-db.ts';
import { FORBIDDEN_ON_QUOTES, addQuoteNote, ensureDeskRow, touch, type ActionResult, type FlowDeps } from './desk-flow.ts';
import { editQuoteDeposit, fetchQuote, quotesAccess } from './desk-jobber.ts';
import { displayPhone, firstNameOf, fullClientName, textablePhone } from './desk-view.ts';
import { createTask, findConversationId, quoKey } from './quo.ts';
import { OFF_DESK_MESSAGE, transitionState } from './desk-state.ts';

/**
 * "Ready for Mark": Essa marks a draft ready, so Mark or Hamid call the
 * customer, say the quote is ready and ask for the deposit.
 *
 * Jobber gives this app no quote status change, so "ready" lives on the desk
 * (desk_quotes.state = 'ready'), in a pinned note on the quote, in the quote's
 * deposit, and in one Quo task the callers see in their app.
 */

export const MAX_READY_NOTE = 1000;

/** Quotes above this get a percentage deposit; at or under it, a flat one. */
export const DEPOSIT_THRESHOLD = 1000;
export const DEPOSIT_PERCENT = 50;
export const DEPOSIT_FLAT = 150;

export interface DepositRule {
  /** Jobber's CostModifierTypeEnum: Percent (rate is a percent) or Unit (rate is dollars). */
  type: 'Percent' | 'Unit';
  rate: number;
  /** What the deposit comes to in dollars. */
  dollars: number;
  /** "50% ($1,200)" or "$150". */
  label: string;
}

function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** $1,200 for a whole amount, $500.01 otherwise. */
export function dollarText(n: number): string {
  const whole = Number.isInteger(n);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** The owner's rule (2026-11-22): over $1,000, 50%; $1,000 or less, $150 flat. */
export function depositRule(total: number): DepositRule {
  if (total > DEPOSIT_THRESHOLD) {
    // Half of the total in whole cents, rounded half up.
    const dollars = Math.round(Math.round(total * 100) / 2) / 100;
    return { type: 'Percent', rate: DEPOSIT_PERCENT, dollars, label: `${DEPOSIT_PERCENT}% (${dollarText(dollars)})` };
  }
  return { type: 'Unit', rate: DEPOSIT_FLAT, dollars: DEPOSIT_FLAT, label: dollarText(DEPOSIT_FLAT) };
}

/** The default deposit for the quote screen, with the hint under the input. */
export function depositDefault(total: number | null | undefined): (DepositRule & { hint: string }) | null {
  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) return null;
  const rule = depositRule(total);
  const hint = rule.type === 'Percent' ? `${DEPOSIT_PERCENT}% of ${dollarText(total)}` : `${dollarText(DEPOSIT_FLAT)} for quotes up to ${dollarText(DEPOSIT_THRESHOLD)}`;
  return { ...rule, hint };
}

type Obj = Record<string, unknown>;

function obj(value: unknown): Obj {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : {};
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The deposit Essa typed (dollars), or a reason it is not usable. undefined = use the rule. */
function parseDeposit(raw: unknown, total: number): number | undefined | string {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(value) || value <= 0) return 'Enter a deposit above $0.';
  if (value > total) return `The deposit can’t be more than the quote total (${dollarText(total)}).`;
  return cents(value);
}

export interface ReadyInput {
  deposit?: unknown;
  note?: unknown;
}

/**
 * Mark a draft ready. The state claim comes first (open -> ready), so a second
 * tap, or two at once, makes one note and one task. After it: the deposit on
 * the Jobber quote, a pinned note, and the Quo task. Each of those can fail
 * without undoing the others; the message says what to do by hand.
 */
export async function readyForMark(deps: FlowDeps, actor: string, quoteId: string, input: ReadyInput): Promise<ActionResult> {
  const now = deps.now();
  const refuse = async (message: string): Promise<ActionResult> => ({ ok: false, message, row: await deskQuote(deps.db, quoteId) });

  let note = '';
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== 'string') return refuse('The note must be text.');
    note = input.note.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  }
  if (note.length > MAX_READY_NOTE) return refuse(`Keep the note under ${MAX_READY_NOTE} characters.`);
  for (const [pattern, message] of FORBIDDEN_ON_QUOTES) if (pattern.test(note)) return refuse(message);

  const { access, schema } = await quotesAccess(deps.jobber);
  if (access !== 'ok' || !schema) return refuse('Jobber needs reconnecting for quotes');
  const quote = await fetchQuote(deps.jobber, quoteId);
  if (!quote) return { ok: false, message: 'Jobber has no such quote', row: null };
  const jobberStatus = String(quote.quoteStatus ?? '').toLowerCase();
  if (jobberStatus !== 'draft') return refuse(`This quote is ${jobberStatus.replace(/_/g, ' ') || 'not a draft'} in Jobber`);

  const amounts = obj(quote.amounts);
  const total = typeof amounts.total === 'number' ? amounts.total : NaN;
  if (!Number.isFinite(total) || total <= 0) return refuse('This quote has no total yet.');
  const rule = depositRule(total);
  const typed = parseDeposit(input.deposit, total);
  if (typeof typed === 'string') return refuse(typed);
  // Typing the default's dollars keeps the default rule; any other amount is flat dollars.
  const target: DepositRule =
    typed === undefined || typed === rule.dollars ? rule : { type: 'Unit', rate: typed, dollars: typed, label: dollarText(typed) };

  const client = obj(quote.client);
  const number = typeof quote.quoteNumber === 'string' || typeof quote.quoteNumber === 'number' ? String(quote.quoteNumber) : null;
  await ensureDeskRow(
    deps.db,
    quoteId,
    { clientId: typeof client.id === 'string' ? client.id : null, number, first: firstNameOf(client), title: typeof quote.title === 'string' ? quote.title : null, status: jobberStatus },
    now,
  );

  // The claim: the first tap wins; nothing below runs twice.
  const claimed = await transitionState(
    deps.db,
    quoteId,
    'ready',
    { ready_by: actor, ready_at: now, ready_deposit: target.dollars, ready_note: note || null, ready_task_id: null, hidden_by: null, hidden_at: null },
    now,
  );
  if (!claimed) {
    const current = await deskQuote(deps.db, quoteId);
    if (current?.state === 'hidden') return refuse(OFF_DESK_MESSAGE);
    if (current?.state === 'ready') return { ok: true, row: current };
    return refuse('This quote is already approved or marked');
  }
  await logDeskEvent(deps.db, { actor, action: 'ready', quoteId, detail: `deposit=${target.dollars}${note ? ' note' : ''}`, now });

  const problems: string[] = [];

  // 1. The deposit on the Jobber quote, unless it already says so.
  const current = typeof amounts.depositAmount === 'number' ? amounts.depositAmount : null;
  if (current === null || cents(current) !== target.dollars) {
    let outcome: Awaited<ReturnType<typeof editQuoteDeposit>>;
    try {
      outcome = await editQuoteDeposit(deps.jobber, schema, quoteId, { rate: target.rate, type: target.type });
    } catch {
      outcome = { ok: false, reason: 'failed' };
    }
    if (!outcome.ok) {
      await logDeskEvent(deps.db, { actor: 'system', action: 'ready_deposit_failed', quoteId, detail: outcome.reason === 'failed' ? (outcome.message ?? 'failed') : outcome.reason, now });
      problems.push(`Jobber wouldn’t set the deposit, so set it to ${target.label} in Jobber.`);
    }
  }

  // 2. The pinned note on the quote.
  const noteText = `Ready for Mark (${actor}, ${chicagoTimestamp(now)}): ask for ${target.label} deposit.${note ? ` Note: ${note}` : ''}`;
  const noteOutcome = await addQuoteNote(deps.jobber, schema, quoteId, noteText, true);
  if (noteOutcome !== 'added') {
    await logDeskEvent(deps.db, { actor: 'system', action: 'ready_note_failed', quoteId, detail: noteOutcome, now });
    problems.push('The note on the Jobber quote wasn’t added.');
  }

  // 3. The Quo task for Mark and Hamid.
  const name = fullClientName(client);
  const phone = textablePhone(client.phones as never);
  const lines = [
    phone ? `${name}, ${displayPhone(phone.e164)}` : `${name}, no US phone number on file`,
    `Quote total: ${money(total)}`,
    `Deposit to ask for: ${target.label}`,
    ...(note ? [`Note from ${actor}: ${note}`] : []),
    ...(typeof quote.jobberWebUri === 'string' ? [`Jobber quote: ${quote.jobberWebUri}`] : []),
  ];
  const title = `Call ${name}: quote ready, ask for ${target.label} deposit${number ? ` (Quote #${number})` : ''}`;
  const key = quoKey(deps.env);
  let taskFailure: string | null = null;
  if (!key) taskFailure = 'Quo is not set up';
  else {
    const quo = { key, fetch: deps.fetch };
    const conversationId = phone ? await findConversationId(quo, phone.e164) : null;
    const task = await createTask(quo, { title, description: lines.join('\n'), conversationId });
    if (task.ok) await touch(deps.db, quoteId, { ready_task_id: task.id }, now);
    else taskFailure = task.reason;
  }
  if (taskFailure) {
    await logDeskEvent(deps.db, { actor: 'system', action: 'ready_task_failed', quoteId, detail: taskFailure, now });
    problems.push(`The Quo task wasn’t created (${taskFailure}), so tell Mark or Hamid yourself.`);
  }

  const row = await deskQuote(deps.db, quoteId);
  return problems.length ? { ok: true, row, message: problems.join(' '), notice: problems.join(' ') } : { ok: true, row };
}

/** "Back to drafts": ready -> open. Nothing in Jobber or Quo is changed or removed. */
export async function unreadyQuote(deps: FlowDeps, actor: string, quoteId: string): Promise<ActionResult> {
  const now = deps.now();
  const changed = await transitionState(deps.db, quoteId, 'unready', { ready_by: null, ready_at: null }, now);
  if (!changed) return { ok: false, message: 'This quote is not marked ready', row: await deskQuote(deps.db, quoteId) };
  await logDeskEvent(deps.db, { actor, action: 'unready', quoteId, now });
  return { ok: true, row: await deskQuote(deps.db, quoteId) };
}
