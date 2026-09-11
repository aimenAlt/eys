export type UtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * Inbound attribution params worth forwarding onto outbound Jobber booking links.
 * Covers standard UTMs plus common paid click IDs (Google Ads/LSA, Meta, Microsoft, etc.).
 */
export const ATTRIBUTION_QUERY_KEYS = [
  ...UTM_KEYS,
  'utm_id',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'ttclid',
  'li_fat_id',
  'twclid',
] as const;

export type AttributionParams = Partial<Record<(typeof ATTRIBUTION_QUERY_KEYS)[number], string>>;

/** Read attribution params from a query string or URLSearchParams. */
export function readAttributionParams(
  search: string | URLSearchParams,
): AttributionParams {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const out: AttributionParams = {};
  for (const key of ATTRIBUTION_QUERY_KEYS) {
    const value = params.get(key)?.trim();
    if (value) out[key] = value;
  }
  return out;
}

/**
 * Copy attribution params onto a destination URL.
 * Existing destination query params are preserved; attribution keys overwrite when present.
 * Does not invent UTMs — only forwards what is supplied.
 */
export function withAttributionParams(
  url: string,
  attribution: AttributionParams,
): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const entries = Object.entries(attribution).filter(
    (entry): entry is [string, string] => Boolean(entry[1]?.trim()),
  );
  if (!entries.length) return trimmed;

  const isAbsolute = /^https?:\/\//i.test(trimmed);
  const base = isAbsolute ? undefined : 'https://eys.local';
  let parsed: URL;
  try {
    parsed = new URL(trimmed, base);
  } catch {
    return trimmed;
  }

  for (const [key, value] of entries) {
    parsed.searchParams.set(key, value);
  }

  if (isAbsolute) return parsed.toString();

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return trimmed.startsWith('/') ? path : path.replace(/^\//, '');
}

/**
 * Append or overwrite UTM query params on an absolute or site-relative URL.
 * Existing non-UTM query params are preserved.
 */
export function withUtm(url: string, params: UtmParams): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const isAbsolute = /^https?:\/\//i.test(trimmed);
  const base = isAbsolute ? undefined : 'https://eys.local';
  let parsed: URL;
  try {
    parsed = new URL(trimmed, base);
  } catch {
    return trimmed;
  }

  if (params.source) parsed.searchParams.set('utm_source', params.source);
  if (params.medium) parsed.searchParams.set('utm_medium', params.medium);
  if (params.campaign) parsed.searchParams.set('utm_campaign', params.campaign);
  if (params.content) parsed.searchParams.set('utm_content', params.content);
  if (params.term) parsed.searchParams.set('utm_term', params.term);

  if (isAbsolute) return parsed.toString();

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return trimmed.startsWith('/') ? path : path.replace(/^\//, '');
}

/**
 * Tag an outbound Jobber Client Hub link with which form it came from.
 *
 * Deliberately NOT a UTM. Stamping `utm_source=website&utm_medium=referral`
 * on every Jobber link made GA4 record the Jobber-side `generate_lead` as
 * "website / referral / jobber" for organic, Google Business Profile and
 * direct visitors alike, burying their real origin. Real attribution arrives
 * from the inbound URL instead, forwarded by `withAttributionParams` /
 * `src/scripts/jobber-attribution.ts`. `eys_form` is an internal label only —
 * GA4 ignores it, so a lead with no inbound UTMs keeps its true source.
 */
export function withJobberFormId(url: string, formId: string): string {
  const trimmed = url.trim();
  if (!trimmed || !formId.trim()) return trimmed;

  const isAbsolute = /^https?:\/\//i.test(trimmed);
  const base = isAbsolute ? undefined : 'https://eys.local';
  let parsed: URL;
  try {
    parsed = new URL(trimmed, base);
  } catch {
    return trimmed;
  }

  parsed.searchParams.set('eys_form', formId.trim());

  if (isAbsolute) return parsed.toString();

  const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return trimmed.startsWith('/') ? path : path.replace(/^\//, '');
}

/** UTMs for outbound Jobber links from the van QR landing page (`/van/`). */
export function withVehicleWrapUtm(url: string, content?: string): string {
  return withUtm(url, {
    source: 'vehicle_wrap',
    medium: 'qr',
    campaign: 'promaster_rear_2026',
    content,
  });
}

export function hasUtmParams(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://eys.local');
    return UTM_KEYS.some((key) => parsed.searchParams.has(key));
  } catch {
    return false;
  }
}
