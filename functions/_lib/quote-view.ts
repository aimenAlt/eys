import { DAY } from './db.ts';
import { clientNoteOf } from './desk-view.ts';
import { escapeHtml } from './intro.ts';
import { titlePhrase } from './quote-text.ts';

/**
 * `/q/<code>/view`: the customer's quote on our own page, read from Jobber on
 * every tap (functions/q/[[code]].ts). It exists because Client Hub's bare
 * link lands on an email login that a customer with no email on file can
 * never get past, and Jobber hides the logged-in link fields
 * (Client.clientHubDelegateLoginUrl, Quote.previewUrl) from this app's token.
 *
 * Shows only what the customer would see on the quote itself: title, number,
 * each line's name, description, quantity (when more than 1) and total, the
 * amounts, and the quote's client note. Never internal notes, costs, hours,
 * margin, the estimate disclaimer or the contract.
 *
 * Copy rules (Aimen's, for anything a customer sees): short and plain, like
 * Essa texting from the truck. No dashes, no emoji, never "licensed", never HOA.
 */

/** The built shell the Function fills (src/pages/q/view-template.astro). */
export const VIEW_TEMPLATE_PATH = '/q/view-template/';

/** A view link works this long after the text that carried it (a resend renews it). */
export const VIEW_LINK_AGE = 30 * DAY;

/** Taps of one code's view per hour before it falls back to the phone-number page. */
export const MAX_VIEWS_PER_HOUR = 20;

/** Placeholders the Astro template carries. Plain ASCII, untouched by HTML escaping. */
export const VIEW_TOKENS = {
  kicker: '__EYS_QV_KICKER__',
  title: '__EYS_QV_TITLE__',
  body: '__EYS_QV_BODY__',
  smsBody: '__EYS_QV_SMS_BODY__',
  hubUrl: '__EYS_QV_HUB_URL__',
  actionsStart: '__EYS_QV_ACTIONS_START__',
  actionsEnd: '__EYS_QV_ACTIONS_END__',
  onlineStart: '__EYS_QV_ONLINE_START__',
  onlineEnd: '__EYS_QV_ONLINE_END__',
} as const;

export function viewPath(code: string): string {
  return `/q/${code}/view`;
}

export interface CustomerLine {
  name: string;
  description: string | null;
  quantity: number | null;
  total: number | null;
  textOnly: boolean;
  optional: boolean;
}

export interface CustomerQuote {
  number: string | null;
  title: string | null;
  status: string | null;
  clientId: string | null;
  hasEmail: boolean;
  lines: CustomerLine[];
  amounts: { subtotal: number | null; discount: number | null; fee: number | null; total: number | null; deposit: number | null };
  clientNote: string | null;
}

type Obj = Record<string, unknown>;

const obj = (value: unknown): Obj | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : null);
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Jobber's quote, reduced to what the customer may see. */
export function customerQuote(raw: Obj): CustomerQuote {
  const client = obj(raw.client) ?? {};
  const emails = Array.isArray(client.emails) ? client.emails : [];
  const lineNodes = obj(raw.lineItems)?.nodes;
  const lines = (Array.isArray(lineNodes) ? lineNodes : [])
    .map(obj)
    .filter((l): l is Obj => l !== null)
    .sort((a, b) => (num(a.sortOrder) ?? 0) - (num(b.sortOrder) ?? 0))
    .map((l) => ({
      name: str(l.name) ?? '',
      description: str(l.description),
      quantity: num(l.quantity),
      total: num(l.totalPrice),
      textOnly: l.textOnly === true,
      optional: l.optional === true,
    }))
    .filter((l) => l.name !== '' || l.description !== null);
  const amounts = obj(raw.amounts) ?? {};
  return {
    number: str(raw.quoteNumber) ?? (num(raw.quoteNumber) !== null ? String(raw.quoteNumber) : null),
    title: str(raw.title),
    status: str(raw.quoteStatus)?.toLowerCase() ?? null,
    clientId: str(client.id),
    hasEmail: emails.some((e) => str(obj(e)?.address) !== null),
    lines,
    amounts: {
      subtotal: num(amounts.subtotal),
      discount: num(amounts.discountAmount),
      fee: num(amounts.taxAmount),
      total: num(amounts.total),
      deposit: num(amounts.depositAmount),
    },
    clientNote: clientNoteOf(raw.message),
  };
}

/** Approved, or already a job: nothing left to approve. */
export function isApproved(status: string | null): boolean {
  return status === 'approved' || status === 'converted';
}

/** "Hi Essa, I approve quote #272 for the TV mounting." The title reads the way the quote text writes it. */
export function approveSmsBody(number: string | null, title: string | null): string {
  const phrase = titlePhrase(title);
  const which = number ? `quote #${number}` : 'my quote';
  return phrase ? `Hi Essa, I approve ${which} for the ${phrase}.` : `Hi Essa, I approve ${which}.`;
}

function usd(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function quantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function multiline(value: string): string {
  return escapeHtml(value.replace(/\r\n?/g, '\n').trim()).replace(/\n/g, '<br>');
}

function lineHtml(line: CustomerLine): string {
  const name = `${escapeHtml(line.name)}${line.optional ? ' <span class="qv-opt">(optional)</span>' : ''}`;
  const price = line.textOnly || line.total === null ? '' : `<p class="qv-price">${line.total === 0 ? 'Included' : usd(line.total)}</p>`;
  return (
    '<li class="qv-line">' +
    `<div class="qv-row"><p class="qv-name">${name}</p>${price}</div>` +
    (line.description ? `<p class="qv-desc">${multiline(line.description)}</p>` : '') +
    (!line.textOnly && line.quantity !== null && line.quantity > 1 ? `<p class="qv-qty">Qty ${quantity(line.quantity)}</p>` : '') +
    '</li>'
  );
}

function amountHtml(label: string, value: number | null, strong = false): string {
  if (value === null || (value === 0 && !strong)) return '';
  return `<div class="qv-amt${strong ? ' qv-total' : ''}"><span>${escapeHtml(label)}</span><span>${usd(value)}</span></div>`;
}

/** The quote card's contents: lines, amounts and the client note. Every value escaped. */
export function quoteBodyHtml(q: CustomerQuote): string {
  const a = q.amounts;
  return (
    `<ul class="qv-lines">${q.lines.map(lineHtml).join('')}</ul>` +
    '<div class="qv-amts">' +
    amountHtml('Subtotal', a.subtotal) +
    (a.discount !== null && a.discount > 0 ? amountHtml('Discount', -a.discount) : '') +
    // EYS quotes carry a 3% card fee as Jobber's tax rate. Customers are never told it is tax.
    amountHtml('Card processing fee', a.fee) +
    amountHtml('Total', a.total, true) +
    amountHtml('Deposit required', a.deposit) +
    '</div>' +
    (q.clientNote ? `<div class="qv-note"><p class="qv-note-label">Note from Essa</p><p>${multiline(q.clientNote)}</p></div>` : '') +
    (isApproved(q.status) ? '<p class="qv-approved">You approved this quote. Thank you.</p>' : '')
  );
}

function cut(html: string, start: string, end: string, keep: boolean): string {
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1 || to < from) return html;
  return keep ? html.split(start).join('').split(end).join('') : html.slice(0, from) + html.slice(to + end.length);
}

/**
 * Fills the built shell. The online button (the bare Client Hub link, which
 * asks for an email sign-in) is kept only for a customer with an email on
 * file; both approve buttons go once the quote is approved. A shell missing
 * a token is refused.
 */
export function fillViewTemplate(template: string, q: CustomerQuote, hubUrl: string | null): string | null {
  if (Object.values(VIEW_TOKENS).some((token) => !template.includes(token))) return null;
  const approved = isApproved(q.status);
  let html = cut(template, VIEW_TOKENS.actionsStart, VIEW_TOKENS.actionsEnd, !approved);
  html = cut(html, VIEW_TOKENS.onlineStart, VIEW_TOKENS.onlineEnd, q.hasEmail && hubUrl !== null);
  const values: Record<string, string> = {
    [VIEW_TOKENS.kicker]: q.number ? `Quote #${escapeHtml(q.number)}` : 'Your quote',
    [VIEW_TOKENS.title]: escapeHtml(q.title ?? 'Your quote from EYS'),
    [VIEW_TOKENS.smsBody]: encodeURIComponent(approveSmsBody(q.number, q.title)),
    [VIEW_TOKENS.hubUrl]: escapeHtml(hubUrl ?? ''),
    [VIEW_TOKENS.body]: quoteBodyHtml(q),
  };
  // One pass, so a customer's own text can never be read as a token.
  return html.replace(/__EYS_QV_[A-Z_]+?__/g, (token) => values[token] ?? token);
}
