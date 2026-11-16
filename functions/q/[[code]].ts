import type { Env, PagesFunction } from '../_lib/types.ts';
import { KEY_LABELS, keyedHash } from '../_lib/crypto.ts';
import { HOUR, bumpCounter, ensureSchema, readCounter } from '../_lib/db.ts';
import { ensureDeskSchema, findQLink, markQLinkServed, type QLinkRow } from '../_lib/desk-db.ts';
import { deskJobberDeps, fetchCustomerQuote } from '../_lib/desk-jobber.ts';
import { adminKey } from '../_lib/env.ts';
import {
  INTRO_DEFAULT_REVIEW,
  INTRO_FALLBACK_PATH,
  INTRO_REVIEW_IDS,
  fillIntroTemplate,
  introTemplatePath,
  isClientHubUrl,
  isIntroCode,
} from '../_lib/intro.ts';
import { MAX_VIEWS_PER_HOUR, VIEW_LINK_AGE, VIEW_TEMPLATE_PATH, customerQuote, fillViewTemplate, viewPath } from '../_lib/quote-view.ts';

/** Misses allowed per IP per hour before lookups stop: codes are not guessable, and this keeps it that way. */
export const MAX_MISSES_PER_HOUR = 30;

const templates = new Map<string, string>();
let viewShell: string | null = null;

/** Private per customer, never cached, never indexed. */
function page(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function asset(env: Env, request: Request, path: string): Promise<string | null> {
  if (!env.ASSETS) return null;
  try {
    const response = await env.ASSETS.fetch(new URL(path, request.url).toString());
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

async function template(env: Env, request: Request, reviewId: string): Promise<string | null> {
  const id = INTRO_REVIEW_IDS.includes(reviewId) ? reviewId : INTRO_DEFAULT_REVIEW;
  const cached = templates.get(id);
  if (cached) return cached;
  const html = await asset(env, request, introTemplatePath(id));
  if (html) templates.set(id, html);
  return html;
}

async function fallback(env: Env, request: Request): Promise<Response> {
  const html = await asset(env, request, INTRO_FALLBACK_PATH);
  return page(
    html ??
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>EYS Handyman</title><p>This link isn&#39;t working. Call or text <a href="tel:+13468201629">(346) 820-1629</a>.</p>',
    404,
  );
}

/** `/q/<code>` (the intro) or `/q/<code>/view` (the quote itself); anything else is null. */
function routeFrom(params: Record<string, string | string[]>): { code: string; view: boolean } | null {
  const raw = params.code;
  const parts = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((part) => part !== '');
  if (parts.length === 1 && isIntroCode(parts[0])) return { code: parts[0], view: false };
  if (parts.length === 2 && parts[1] === 'view' && isIntroCode(parts[0])) return { code: parts[0], view: true };
  return null;
}

/**
 * GET /q/<code>/view: the quote, read from Jobber now, on our own page. Only
 * a tap gets here (the text carries /q/<code>, which link previews fetch, and
 * that never calls Jobber). Nothing from Jobber is stored. A link more than 30
 * days past its text, more than 20 taps in an hour, Jobber failing or
 * disconnected, an archived quote, or a quote that is not this customer's,
 * all get the phone-number page.
 */
async function quoteView(env: Env, request: Request, link: QLinkRow, now: number, waitUntil: (p: Promise<unknown>) => void): Promise<Response> {
  const jobber = deskJobberDeps(env, waitUntil);
  if (!jobber || link.created_at < now - VIEW_LINK_AGE) return fallback(env, request);
  if (request.method === 'HEAD') return page('', 200);
  if ((await bumpCounter(jobber.db, `qview:${link.code}:${Math.floor(now / HOUR)}`, HOUR, now)) > MAX_VIEWS_PER_HOUR) {
    return fallback(env, request);
  }
  let raw: Record<string, unknown> | null;
  try {
    raw = await fetchCustomerQuote(jobber, link.quote_id);
  } catch {
    return fallback(env, request);
  }
  if (!raw) return fallback(env, request);
  const quote = customerQuote(raw);
  if (quote.status === 'archived') return fallback(env, request);
  if (link.client_id && quote.clientId && link.client_id !== quote.clientId) return fallback(env, request);

  viewShell ??= await asset(env, request, VIEW_TEMPLATE_PATH);
  const filled = viewShell ? fillViewTemplate(viewShell, quote, isClientHubUrl(link.hub_url) ? link.hub_url : null) : null;
  return filled ? page(filled, 200) : fallback(env, request);
}

/**
 * GET /q/<code>: the quote intro for one customer, filled from q_links into
 * the page Astro built (src/pages/q/intro/[review].astro). Its "View your
 * quote" button and 10-second auto-open go to /q/<code>/view (quoteView
 * above). Anything else under /q/ — an unknown, expired or malformed code, or
 * the built templates themselves — gets the static phone-number page with a 404.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const route = routeFrom(params);
  const db = env.EYS_AI_DB;
  if (!route || !db) return fallback(env, request);
  const { code } = route;

  const now = Date.now();
  const key = adminKey(env);
  let missKey: string | null = null;
  if (key) {
    await ensureSchema(db);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    missKey = `qmiss:${await keyedHash(key, KEY_LABELS.ipHash, ip)}:${Math.floor(now / HOUR)}`;
    if ((await readCounter(db, missKey)) >= MAX_MISSES_PER_HOUR) return fallback(env, request);
  }

  await ensureDeskSchema(db);
  const link = await findQLink(db, code, now);
  if (!link || !isClientHubUrl(link.hub_url)) {
    if (missKey) await bumpCounter(db, missKey, HOUR, now);
    return fallback(env, request);
  }

  if (route.view) return quoteView(env, request, link, now, waitUntil);

  const html = await template(env, request, link.review_id ?? INTRO_DEFAULT_REVIEW);
  const filled = html ? fillIntroTemplate(html, { code, firstName: link.first_name, ctaHref: viewPath(code) }) : null;
  if (!filled) return fallback(env, request);
  // Link previews fetch this too, so "served" is not "opened": the page's own
  // script reports a real open (functions/api/q/event.ts).
  waitUntil(markQLinkServed(db, code).catch(() => {}));
  return page(request.method === 'HEAD' ? '' : filled, 200);
};
