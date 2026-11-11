import type { Env, PagesFunction } from '../_lib/types.ts';
import { KEY_LABELS, keyedHash } from '../_lib/crypto.ts';
import { HOUR, bumpCounter, ensureSchema, readCounter } from '../_lib/db.ts';
import { ensureDeskSchema, findQLink, markQLinkServed } from '../_lib/desk-db.ts';
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

/** Misses allowed per IP per hour before lookups stop: codes are not guessable, and this keeps it that way. */
export const MAX_MISSES_PER_HOUR = 30;

const templates = new Map<string, string>();

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

function codeFrom(params: Record<string, string | string[]>): string | null {
  const raw = params.code;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (parts.length !== 1) return null;
  return isIntroCode(parts[0]) ? parts[0] : null;
}

/**
 * GET /q/<code>: the quote intro for one customer, filled from q_links into
 * the page Astro built (src/pages/q/intro/[review].astro). Anything else under
 * /q/ — an unknown, expired or malformed code, or the built templates
 * themselves — gets the static phone-number page with a 404.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const code = codeFrom(params);
  const db = env.EYS_AI_DB;
  if (!code || !db) return fallback(env, request);

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

  const html = await template(env, request, link.review_id ?? INTRO_DEFAULT_REVIEW);
  const filled = html ? fillIntroTemplate(html, { code, firstName: link.first_name, hubUrl: link.hub_url }) : null;
  if (!filled) return fallback(env, request);
  // Link previews fetch this too, so "served" is not "opened": the page's own
  // script reports a real open (functions/api/q/event.ts).
  waitUntil(markQLinkServed(db, code).catch(() => {}));
  return page(request.method === 'HEAD' ? '' : filled, 200);
};
