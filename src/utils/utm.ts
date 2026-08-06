export type UtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

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

/** Default UTMs for outbound Jobber Client Hub links. */
export function withJobberUtm(url: string, content: string): string {
  return withUtm(url, {
    source: 'website',
    medium: 'referral',
    campaign: 'jobber',
    content,
  });
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
