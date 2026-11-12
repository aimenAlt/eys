import type { DeskQuoteRow, QLinkRow } from './desk-db.ts';
import { OLDER_DRAFT_AGE, type RawClientName, type RawPhone, type RawQuoteListItem } from './desk-jobber.ts';
import { displayFirstName } from './intro.ts';

/**
 * Turns Jobber's answers into exactly what the desk page draws. Plain data,
 * no markup: the page escapes everything it renders.
 */

type Obj = Record<string, unknown>;

function obj(value: unknown): Obj | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : null;
}
function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function nodes(value: unknown): Obj[] {
  const o = obj(value);
  const list = Array.isArray(value) ? value : Array.isArray(o?.nodes) ? (o?.nodes as unknown[]) : [];
  return list.map(obj).filter((v): v is Obj => v !== null);
}
function time(value: unknown): number | null {
  const s = str(value);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** quote #200 is the template example, on a client named "XXX". */
export function isExcludedClient(client: RawClientName | null | undefined): boolean {
  const names = [client?.name, client?.firstName, client?.lastName, client?.companyName].map((n) => (n ?? '').trim());
  return names.some((n) => /^x{3}$/i.test(n)) || /^x{3}\s+x{3}$/i.test(`${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim());
}

export function firstNameOf(client: RawClientName | null | undefined): string {
  const first = displayFirstName(client?.firstName);
  if (first) return first;
  // A company with no contact first name has no first name to greet.
  if ((client?.companyName ?? '').trim()) return '';
  const name = (client?.name ?? '').trim();
  return displayFirstName(name.split(/\s+/)[0] ?? '');
}

/** "Jennifer S." (first name and last initial), or the company name. */
export function shortClientName(client: RawClientName | null | undefined): string {
  const first = firstNameOf(client);
  const last = (client?.lastName ?? '').trim();
  if (first && last) return `${first} ${last[0].toUpperCase()}.`;
  return first || (client?.companyName ?? client?.name ?? 'Unknown client');
}

export function fullClientName(client: RawClientName | null | undefined): string {
  const full = [client?.firstName, client?.lastName].map((n) => displayFirstName(n)).filter(Boolean).join(' ');
  return full || (client?.name ?? client?.companyName ?? 'Unknown client');
}

/** +1XXXXXXXXXX for a US number, else null. */
export function usE164(raw: string | null | undefined): string | null {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[2-9]/.test(digits)) return null;
  return `+1${digits}`;
}

export function displayPhone(e164: string): string {
  const d = e164.replace(/^\+1/, '');
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** The number a quote text goes to: the primary phone, else the first US one. */
export function textablePhone(phones: RawPhone[] | null | undefined): { e164: string; smsStopped: boolean } | null {
  const list = (phones ?? []).filter((p) => usE164(p.number));
  const pick = list.find((p) => p.primary) ?? list[0];
  if (!pick) return null;
  return { e164: usE164(pick.number) as string, smsStopped: pick.smsStopped === true };
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export interface ListItem {
  id: string;
  number: string | null;
  client: string;
  title: string;
  total: number | null;
  createdAt: number | null;
  ageDays: number | null;
}

export interface DeskList {
  drafts: ListItem[];
  older: ListItem[];
  hidden: (ListItem & { hiddenBy: string | null; hiddenAt: number | null })[];
  /** Moved to Awaiting Response on purpose without a text; from D1, since Jobber no longer lists them as drafts. */
  marked: ListItem[];
}

function listItem(q: RawQuoteListItem, now: number): ListItem {
  const created = time(q.createdAt);
  return {
    id: q.id,
    number: q.quoteNumber ?? null,
    client: shortClientName(q.client),
    title: (q.title ?? '').trim() || 'Untitled quote',
    total: num(q.amounts?.total),
    createdAt: created,
    ageDays: created === null ? null : Math.max(0, Math.floor((now - created) / 86_400_000)),
  };
}

/**
 * Drafts newest first; older than 30 days in their own fold; anything Essa
 * marked "Not sending" in Hidden; anything already approved on the desk is
 * left out (it is on its way to Awaiting Response).
 */
export function buildList(drafts: RawQuoteListItem[], rows: DeskQuoteRow[], now: number): DeskList {
  const byId = new Map(rows.map((r) => [r.quote_id, r]));
  const out: DeskList = { drafts: [], older: [], hidden: [], marked: [] };
  for (const row of rows.filter((r) => r.state === 'marked').sort((a, b) => b.updated_at - a.updated_at)) {
    out.marked.push({
      id: row.quote_id,
      number: row.quote_number,
      client: row.first_name ?? 'Client',
      title: row.title ?? 'Quote',
      total: null,
      createdAt: null,
      ageDays: null,
    });
  }
  for (const q of drafts) {
    if (isExcludedClient(q.client)) continue;
    const row = byId.get(q.id);
    const item = listItem(q, now);
    if (row?.state === 'hidden') {
      out.hidden.push({ ...item, hiddenBy: row.hidden_by, hiddenAt: row.hidden_at });
      continue;
    }
    if (row?.state === 'approved' || row?.state === 'marked') continue;
    if (item.createdAt !== null && now - item.createdAt > OLDER_DRAFT_AGE) out.older.push(item);
    else out.drafts.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// One quote
// ---------------------------------------------------------------------------

export interface FileView {
  url: string;
  thumbnailUrl: string | null;
  fileName: string | null;
  image: boolean;
}

function files(...sources: unknown[]): FileView[] {
  const seen = new Set<string>();
  const out: FileView[] = [];
  for (const source of sources) {
    for (const f of nodes(source)) {
      const url = str(f.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const type = str(f.contentType) ?? '';
      const fileName = str(f.fileName);
      out.push({
        url,
        thumbnailUrl: str(f.thumbnailUrl),
        fileName,
        image: /^image\//i.test(type) || /\.(jpe?g|png|gif|webp|heic)$/i.test(fileName ?? ''),
      });
    }
  }
  return out;
}

export interface QuoteView {
  id: string;
  number: string | null;
  title: string;
  status: string | null;
  createdAt: number | null;
  jobberWebUri: string | null;
  clientHubUri: string | null;
  client: {
    id: string | null;
    first: string;
    name: string;
    city: string | null;
    phone: string | null;
    phoneDisplay: string | null;
    smsStopped: boolean;
  };
  request: {
    id: string | null;
    title: string | null;
    jobberWebUri: string | null;
    answers: { section: string | null; label: string; answer: string }[];
    notes: string[];
    instructions: string | null;
    photos: FileView[];
    available: boolean;
    /** False when the quote has no request in Jobber and this is the client's latest one. */
    linked: boolean;
    createdAt: number | null;
  };
  lines: {
    name: string;
    description: string | null;
    quantity: number | null;
    unitPrice: number | null;
    total: number | null;
    textOnly: boolean;
    optional: boolean;
  }[];
  amounts: {
    subtotal: number | null;
    discount: number | null;
    tax: number | null;
    total: number | null;
    deposit: number | null;
  };
  /** The quote-specific note to the client, without the boilerplate disclaimer or the contract. */
  clientNote: string | null;
  attachments: FileView[];
  privateNote: string[];
  history: { kind: 'quote' | 'request' | 'job'; id: string; title: string; total: number | null; status: string | null; createdAt: number | null }[];
}

function answerText(item: Obj): string | null {
  const text = str(item.textAnswer);
  if (text) return text;
  const n = num(item.numberAnswer);
  if (n !== null) return String(n);
  const date = str(item.dateAnswer);
  if (date) return date.slice(0, 10);
  const services = Array.isArray(item.serviceAnswer) ? item.serviceAnswer : item.serviceAnswer ? [item.serviceAnswer] : [];
  const names = services
    .map(obj)
    .filter((s): s is Obj => s !== null)
    .map((s) => `${str(s.name) ?? ''}${num(s.quantity) && (s.quantity as number) > 1 ? ` x${s.quantity}` : ''}`)
    .filter(Boolean);
  return names.length ? names.join(', ') : null;
}

/** Quote attachments minus the ones already shown with the request (Jobber copies them over). */
function withoutDuplicates(list: FileView[], shown: FileView[]): FileView[] {
  const seen = new Set(shown.map((f) => f.fileName).filter(Boolean));
  return list.filter((f) => !f.fileName || !seen.has(f.fileName));
}

/**
 * The part of a quote's client message worth reading on the desk. EYS quotes
 * carry the same "Estimate Disclaimer" paragraph between underscore rules, then
 * a "Client Notes:" heading; only what follows (if anything) is specific to
 * this quote. The contract text is never shown on the desk.
 */
export function clientNoteOf(message: unknown): string | null {
  const text = str(message);
  if (!text) return null;
  const kept: string[] = [];
  let skipping = false;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (/^[_\-=\s]{5,}$/.test(line)) {
      skipping = false;
      continue;
    }
    if (/^estimate disclaimer\b/i.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (line === '') skipping = false;
      continue;
    }
    if (/^client notes?\s*:?$/i.test(line)) continue;
    const heading = /^client notes?\s*:\s*(.+)$/i.exec(line);
    kept.push(heading ? heading[1] : raw.trimEnd());
  }
  const out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return out === '' ? null : out;
}

export function buildQuoteView(
  quote: Obj,
  request: Obj | null,
  history: Obj,
  options: { requestLinked?: boolean } = {},
): QuoteView {
  const client = obj(quote.client) ?? {};
  const phone = textablePhone(Array.isArray(client.phones) ? (client.phones as RawPhone[]) : []);
  const city = str(obj(obj(quote.property)?.address)?.city) ?? str(obj(client.billingAddress)?.city);

  const answers: QuoteView['request']['answers'] = [];
  for (const section of nodes(obj(obj(request?.requestDetails)?.form)?.sections)) {
    for (const item of nodes(section.items)) {
      const label = str(item.label);
      const answer = answerText(item);
      if (label && answer) answers.push({ section: str(section.label), label, answer });
    }
  }
  const requestNotes = nodes(request?.notes);
  const quoteNotes = nodes(quote.notes).filter((n) => !n.__typename || n.__typename === 'QuoteNote');

  const lines = nodes(obj(quote.lineItems)?.nodes ?? quote.lineItems)
    .sort((a, b) => (num(a.sortOrder) ?? 0) - (num(b.sortOrder) ?? 0))
    .map((l) => ({
      name: str(l.name) ?? '',
      description: str(l.description),
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      total: num(l.totalPrice),
      textOnly: l.textOnly === true,
      optional: l.optional === true,
    }));
  const amounts = obj(quote.amounts) ?? {};

  const historyRows: QuoteView['history'] = [];
  for (const q of nodes(history.quotes)) {
    if (str(q.id) === quote.id) continue;
    historyRows.push({
      kind: 'quote',
      id: String(q.id),
      title: str(q.title) ?? `Quote #${str(q.quoteNumber) ?? ''}`,
      total: num(obj(q.amounts)?.total),
      status: str(q.quoteStatus),
      createdAt: time(q.createdAt),
    });
  }
  for (const r of nodes(history.requests)) {
    if (str(r.id) === str(request?.id)) continue;
    historyRows.push({ kind: 'request', id: String(r.id), title: str(r.title) ?? 'Request', total: null, status: str(r.requestStatus), createdAt: time(r.createdAt) });
  }
  for (const job of nodes(history.jobs)) {
    historyRows.push({
      kind: 'job',
      id: String(job.id),
      title: str(job.title) ?? `Job #${String(job.jobNumber ?? '')}`,
      total: num(job.total),
      status: str(job.jobStatus),
      createdAt: time(job.createdAt),
    });
  }
  historyRows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return {
    id: String(quote.id),
    number: str(quote.quoteNumber),
    title: str(quote.title) ?? 'Untitled quote',
    status: str(quote.quoteStatus),
    createdAt: time(quote.createdAt),
    jobberWebUri: str(quote.jobberWebUri),
    clientHubUri: str(quote.clientHubUri),
    client: {
      id: str(client.id),
      first: firstNameOf(client as RawClientName),
      name: fullClientName(client as RawClientName),
      city,
      phone: phone?.e164 ?? null,
      phoneDisplay: phone ? displayPhone(phone.e164) : null,
      smsStopped: phone?.smsStopped ?? false,
    },
    request: {
      id: str(request?.id) ?? str(obj(quote.request)?.id),
      title: str(request?.title),
      jobberWebUri: str(request?.jobberWebUri),
      answers,
      notes: requestNotes.map((n) => str(n.message)).filter((m): m is string => m !== null),
      instructions: str(obj(request?.assessment)?.instructions),
      photos: files(request?.noteAttachments, ...requestNotes.map((n) => n.fileAttachments)),
      available: request !== null,
      linked: options.requestLinked ?? obj(quote.request) !== null,
      createdAt: time(request?.createdAt),
    },
    lines,
    amounts: {
      subtotal: num(amounts.subtotal),
      discount: num(amounts.discountAmount),
      tax: num(amounts.taxAmount),
      total: num(amounts.total),
      deposit: num(amounts.depositAmount),
    },
    clientNote: clientNoteOf(quote.message),
    attachments: withoutDuplicates(
      files(quote.noteAttachments, ...quoteNotes.map((n) => n.fileAttachments)),
      files(request?.noteAttachments, ...requestNotes.map((n) => n.fileAttachments)),
    ),
    privateNote: quoteNotes.map((n) => str(n.message)).filter((m): m is string => m !== null),
    history: historyRows,
  };
}

// ---------------------------------------------------------------------------
// Sent, waiting
// ---------------------------------------------------------------------------

export interface SentItem {
  id: string;
  client: string;
  title: string;
  sentAt: number | null;
  approvedBy: string | null;
  textState: DeskQuoteRow['text_state'];
  textError: string | null;
  openedIntro: number | null;
  clickedIntro: number | null;
  openedQuote: number | null;
  approved: number | null;
  status: string | null;
  moveState: string;
}

export function sentItem(row: DeskQuoteRow, link: QLinkRow | null): SentItem {
  return {
    id: row.quote_id,
    client: row.first_name ?? 'Client',
    title: row.title ?? 'Quote',
    sentAt: row.text_sent_at,
    approvedBy: row.approved_by,
    textState: row.text_state,
    textError: row.text_error,
    openedIntro: link?.opened_at ?? null,
    clickedIntro: link?.clicked_at ?? null,
    openedQuote: row.hub_viewed_at,
    approved: row.quote_approved_at,
    status: row.jobber_status,
    moveState: row.move_state,
  };
}
