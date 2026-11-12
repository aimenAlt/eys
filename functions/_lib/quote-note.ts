import { ensureDeskTypes, type DeskSchema } from './desk-schema.ts';
import { fetchQuote, quotesAccess, type DeskJobber } from './desk-jobber.ts';
import { graphql } from './jobber.ts';

/**
 * Eyad's internal note on the quoting routine's draft, saved through the site
 * (POST /api/admin/jobber/quote-note).
 *
 * The Jobber connector's create_quote has no notes field, so the routine wrote
 * the note in Jobber's web page, which needs Chrome signed in to Jobber. This
 * is Jobber's own quoteCreateNote (QuoteCreateNoteInput.message), the same
 * mutation the Quote Desk uses. Drafts only; a note already on the quote
 * (compared ignoring spacing) is not written twice; read back afterwards.
 * Quote notes are staff-only in Jobber, never shown to the client.
 */

export const MAX_INTERNAL_NOTE = 20_000;
const QUOTE_ID = /^[A-Za-z0-9+/=_-]{8,200}$/;

export interface QuoteNoteInput {
  quoteId: string;
  message: string;
  dryRun: boolean;
}

export interface QuoteNoteResult {
  status: number;
  body: Record<string, unknown>;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseQuoteNoteBody(value: unknown): { ok: true; input: QuoteNoteInput } | { ok: false; errors: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['body: must be a JSON object'] };
  const raw = value as Record<string, unknown>;
  const errors: string[] = [];
  const quoteId = (str(raw.quoteId) ?? '').trim();
  if (!QUOTE_ID.test(quoteId)) errors.push("quoteId: the quote's encoded Jobber id (create_quote or get_quote → id)");
  const message = (str(raw.message) ?? '').replace(/\r\n?/g, '\n').trim();
  if (message === '') errors.push("message: required (Eyad's internal note, guide §12.1)");
  else if (message.length > MAX_INTERNAL_NOTE) errors.push(`message: at most ${MAX_INTERNAL_NOTE} characters`);
  let dryRun = false;
  if (raw.dryRun !== undefined) {
    if (typeof raw.dryRun === 'boolean') dryRun = raw.dryRun;
    else errors.push('dryRun: true or false');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, input: { quoteId, message, dryRun } };
}

/** Same note, whatever the line endings or spacing (a retry, or Jobber trimming). */
export function sameNote(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
}

function noteMessages(quote: Record<string, unknown>): string[] {
  const list = (quote.notes as { nodes?: unknown[] } | null | undefined)?.nodes;
  if (!Array.isArray(list)) return [];
  return list
    .filter((n): n is Record<string, unknown> => !!n && typeof n === 'object')
    .filter((n) => !n.__typename || n.__typename === 'QuoteNote')
    .map((n) => str(n.message))
    .filter((m): m is string => m !== null);
}

type CreateOutcome = { ok: true } | { ok: false; reason: 'unsupported' | 'failed' } | { ok: false; reason: 'rejected'; errors: string[] };

async function createNote(j: DeskJobber, schema: DeskSchema, quoteId: string, message: string): Promise<CreateOutcome> {
  const field = schema.mutations.quoteCreateNote;
  const idArg = field && Object.keys(field.args).find((a) => /^quoteId$|^id$/i.test(a));
  const inputType = field?.args.input;
  if (!field || !idArg || !inputType) return { ok: false, reason: 'unsupported' };
  const inputName = inputType.replace(/[!\[\]]/g, '');
  await ensureDeskTypes(j.deps, j.db, schema, [field.type, inputName]);
  if (!schema.types[inputName]?.fields.message) return { ok: false, reason: 'unsupported' };
  const payload = schema.types[field.type];
  const data = await graphql<{ quoteCreateNote?: { userErrors?: ({ message?: string | null } | null)[] | null } | null }>(
    j.deps,
    `mutation EysRoutineQuoteNote($id: ${field.args[idArg]}, $input: ${inputType}) { quoteCreateNote(${idArg}: $id, input: $input) { ${payload?.fields.userErrors ? 'userErrors { message }' : '__typename'} } }`,
    { id: quoteId, input: { message } },
  );
  const result = data.quoteCreateNote;
  if (!result) return { ok: false, reason: 'failed' };
  const errors = (result.userErrors ?? []).map((e) => String(e?.message ?? '').slice(0, 300)).filter(Boolean);
  if (errors.length) return { ok: false, reason: 'rejected', errors };
  return { ok: true };
}

/**
 * Check access and the quote, skip a note already there, write it (only on the
 * live host and without dryRun), then read the quote back for it.
 */
export async function addInternalNote(j: DeskJobber, input: QuoteNoteInput, options: { live: boolean }): Promise<QuoteNoteResult> {
  const { access, schema } = await quotesAccess(j);
  if (access === 'not_connected') return { status: 503, body: { error: 'jobber_not_connected', written: false } };
  if (access !== 'ok' || !schema) return { status: 503, body: { error: 'jobber_needs_reconnect', written: false } };

  const quote = await fetchQuote(j, input.quoteId);
  if (!quote) return { status: 404, body: { error: 'quote_not_found', written: false } };
  const quoteStatus = str(quote.quoteStatus)?.toLowerCase() ?? null;
  if (quoteStatus !== 'draft') return { status: 409, body: { error: 'not_draft', quote_status: quoteStatus, written: false } };
  const quoteNumber = str(quote.quoteNumber);

  if (noteMessages(quote).some((m) => sameNote(m, input.message))) {
    return { status: 200, body: { status: 'already_added', quote_id: input.quoteId, quote_number: quoteNumber } };
  }
  if (input.dryRun || !options.live) {
    return {
      status: 200,
      body: { status: 'dry_run', live: options.live, quote_id: input.quoteId, quote_number: quoteNumber, chars: input.message.length },
    };
  }

  const outcome = await createNote(j, schema, input.quoteId, input.message);
  if (!outcome.ok) {
    if (outcome.reason === 'rejected') return { status: 422, body: { error: 'jobber_rejected', written: false, user_errors: outcome.errors } };
    if (outcome.reason === 'unsupported') return { status: 502, body: { error: 'jobber_unavailable', error_class: 'unsupported', written: false } };
    // Jobber answered without a payload: whether it saved is unknown. A retry is
    // safe, since a note already on the quote is never written twice.
    return { status: 502, body: { error: 'jobber_unavailable', error_class: 'graphql', written: 'unknown' } };
  }

  let verified = false;
  try {
    const after = await fetchQuote(j, input.quoteId);
    verified = after ? noteMessages(after).some((m) => sameNote(m, input.message)) : false;
  } catch {
    verified = false;
  }
  return { status: 200, body: { status: 'added', quote_id: input.quoteId, quote_number: quoteNumber, verified } };
}
