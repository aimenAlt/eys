import { randomBytes } from './crypto.ts';

/**
 * The `/q/<code>` quote intro: the short Essa page a customer lands on from the
 * quote text, which then opens their Jobber Client Hub quote.
 *
 * The page is built by Astro (src/pages/q/intro/[review].astro, through the
 * same HandoffPage component as /go/) with the tokens below in place of the
 * customer's details; functions/q/[[code]].ts fills them in per request. One
 * template is built per review id, so a quote can carry a service-matched
 * review without the Worker rendering any markup itself.
 *
 * Mirrors: GO_DEFAULT_REVIEW and the review ids come from src/data/goLinks.ts,
 * which Workers cannot import. functions/_tests/drift.test.ts fails if they
 * stop matching.
 */

/** Same default review as /go/ (src/data/goLinks.ts GO_DEFAULT_REVIEW). */
export const INTRO_DEFAULT_REVIEW = 'jamal-ansari';

/**
 * Service-matched reviews, first match wins, tested against the quote title.
 * Each pairs a review with the same work goLinks.ts gives it: the curtain
 * customer on curtain quotes, the repair and to-do customer on repair quotes.
 * Anything else gets the default.
 */
export const INTRO_REVIEW_RULES: readonly { review: string; pattern: RegExp }[] = [
  { review: 'vanesa-morgia', pattern: /\b(curtains?|drapes?|drapery)\b/i },
  { review: 'yong-sun', pattern: /\b(repairs?|fix|fixes|to-?do|handyman visit|honey-?do)\b/i },
];

/** Every review a template is built for. */
export const INTRO_REVIEW_IDS: readonly string[] = [
  INTRO_DEFAULT_REVIEW,
  ...new Set(INTRO_REVIEW_RULES.map((rule) => rule.review)),
];

export function introReviewFor(title: string | null | undefined): string {
  const text = title ?? '';
  return INTRO_REVIEW_RULES.find((rule) => rule.pattern.test(text))?.review ?? INTRO_DEFAULT_REVIEW;
}

/** Built page path for one review's template. Served only to the Worker. */
export function introTemplatePath(reviewId: string): string {
  return `/q/intro/${reviewId}/`;
}

/** Static page shown for an unknown or expired code. */
export const INTRO_FALLBACK_PATH = '/q/';

/** Placeholders the Astro template carries. Plain ASCII, untouched by HTML escaping. */
export const INTRO_TOKENS = {
  first: '__EYS_Q_FIRST__',
  hubUrl: '__EYS_Q_HUB_URL__',
  code: '__EYS_Q_CODE__',
} as const;

// ---------------------------------------------------------------------------
// Codes
// ---------------------------------------------------------------------------

/** No 0/O/o, 1/l/I: a code read aloud or retyped from a screenshot survives. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export const CODE_LENGTH = 8;
const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** 8 characters from a 55-symbol alphabet (about 46 bits), rejection-sampled so no symbol is favoured. */
export function newIntroCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = '';
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(16)) {
      if (byte >= limit) continue;
      out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out;
}

export function isIntroCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Customer-facing words
// ---------------------------------------------------------------------------

/**
 * "jennifer" → "Jennifer", "mary ann" → "Mary Ann"; a name already typed with
 * capitals ("McKenzie", "DeShawn") is left exactly as entered.
 */
export function displayFirstName(raw: string | null | undefined): string {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (name === '') return '';
  if (name !== name.toLowerCase()) return name;
  return name.replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Client Hub links only: anything else falls back to the phone-number page. */
export function isClientHubUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'getjobber.com' || url.hostname.endsWith('.getjobber.com'));
  } catch {
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface IntroFill {
  code: string;
  firstName: string;
  hubUrl: string;
}

/** Fills a built template. Every value is HTML-escaped; a template missing a token is refused. */
export function fillIntroTemplate(template: string, fill: IntroFill): string | null {
  if (!template.includes(INTRO_TOKENS.first) || !template.includes(INTRO_TOKENS.hubUrl)) return null;
  const first = displayFirstName(fill.firstName);
  // No name on file: "Hi, here's your quote." rather than "Hi , here's".
  const named = first === '' ? template.split(` ${INTRO_TOKENS.first}`).join('') : template;
  return named
    .split(INTRO_TOKENS.first)
    .join(escapeHtml(first))
    .split(INTRO_TOKENS.hubUrl)
    .join(escapeHtml(fill.hubUrl))
    .split(INTRO_TOKENS.code)
    .join(escapeHtml(fill.code));
}
