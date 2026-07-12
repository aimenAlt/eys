import { defaultOgImage } from './images';

export const site = {
  name: 'Elevate Your Space Handyman',
  shortName: 'EYS',
  url: 'https://www.eyshandyman.com',
  phone: '(713) 986-1177',
  phoneTel: '7139861177',
  email: 'contact@eyshandyman.com',
  defaultOgImage,
};

/**
 * Google Business Profile aggregate stats.
 * Paste your GBP URL into profileUrl (e.g. https://g.page/...) — sameAs syncs automatically.
 */
export const googleReviews = {
  count: 150,
  rating: 4.9,
  profileUrl: '' as string,
};

/**
 * Jobber embed URLs — paste from Jobber Client Hub when ready.
 * requestFormUrl: quote / work request form embed
 * onlineBookingUrl: direct online booking (e.g. TV mounting)
 */
export const jobber = {
  requestFormUrl: '' as string,
  onlineBookingUrl: '' as string,
};

function buildSameAs(): string[] {
  const gbp = googleReviews.profileUrl?.trim();
  return gbp ? [gbp] : [];
}

export const business = {
  ...site,
  address: {
    street: '1308 Ventura Crk Dr',
    city: 'Katy',
    state: 'TX',
    zip: '77493',
    country: 'US',
    formatted: '1308 Ventura Crk Dr, Katy, TX 77493, United States',
  },
  areaServed: ['Katy', 'Cinco Ranch', 'Fulshear', 'Cypress', 'Richmond', 'West Houston'],
  geo: {
    latitude: 29.7858,
    longitude: -95.8245,
  },
  googleReviews,
  jobber,
  get sameAs() {
    return buildSameAs();
  },
};

export function absoluteUrl(path: string): string {
  const origin = String(import.meta.env.SITE || site.url).replace(/\/$/, '');
  const base = import.meta.env.BASE_URL || '/';
  const clean = path.replace(/^\//, '');
  return `${origin}${base}${clean}`;
}

export function googleReviewProfileUrl(): string | undefined {
  const url = business.googleReviews.profileUrl?.trim();
  return url || undefined;
}

export function jobberRequestFormUrl(): string | undefined {
  const url = business.jobber.requestFormUrl?.trim();
  return url || undefined;
}

export function jobberOnlineBookingUrl(): string | undefined {
  const url = business.jobber.onlineBookingUrl?.trim();
  return url || undefined;
}

/** Pick OG/hero image: absolute URL from CMS path or full URL, else site default. */
export function resolveOgImage(heroImage?: string): string {
  const raw = heroImage?.trim();
  if (!raw) return site.defaultOgImage;
  if (raw.startsWith('http')) return raw;
  return absoluteUrl(raw);
}

export function resolveHeroImage(heroImage?: string): string {
  const raw = heroImage?.trim();
  if (!raw) return site.defaultOgImage;
  if (raw.startsWith('http')) return raw;
  return absoluteUrl(raw);
}
