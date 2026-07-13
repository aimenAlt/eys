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
 * Public profiles for entity SEO (JSON-LD sameAs) and footer links.
 * Keep NAP consistent with Google / Yelp listings.
 */
export const socialProfiles = {
  facebook: 'https://www.facebook.com/profile.php?id=61558074716141',
  instagram: 'https://www.instagram.com/eys_handyman/',
  yelp: 'https://www.yelp.com/biz/elevate-your-space-handyman-katy',
} as const;

/**
 * Jobber embed URLs — paste from Jobber Client Hub when ready.
 * requestFormUrl: quote / work request form embed
 * onlineBookingUrl: direct online booking (e.g. TV mounting)
 * smallRepairVisitUrl: Small Repair Visit request or booking embed
 */
export const jobber = {
  requestFormUrl: '' as string,
  onlineBookingUrl: '' as string,
  smallRepairVisitUrl: '' as string,
};

function buildSameAs(): string[] {
  const links: string[] = [
    socialProfiles.facebook,
    socialProfiles.instagram,
    socialProfiles.yelp,
  ];
  const gbp = googleReviews.profileUrl?.trim();
  if (gbp) links.unshift(gbp);
  return links;
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

export function jobberSmallRepairVisitUrl(): string | undefined {
  const url = business.jobber.smallRepairVisitUrl?.trim();
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
