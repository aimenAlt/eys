import { defaultOgImage, hasImage, imagePlaceholder } from './images';
import { withJobberUtm } from '../utils/utm';

export const site = {
  name: 'Elevate Your Space Handyman',
  shortName: 'EYS',
  url: 'https://www.eyshandyman.com',
  phone: '(346) 820-1629',
  phoneTel: '3468201629',
  email: 'contact@eyshandyman.com',
  defaultOgImage,
};

/**
 * Google Business Profile aggregate stats.
 * Confirmed from live GBP screenshot 2026-08-04: 5.0 stars, 158 reviews.
 * Paste your GBP URL into profileUrl (e.g. https://g.page/...) — sameAs syncs automatically.
 */
export const googleReviews = {
  /**
   * Confirmed 160 from live GBP, 26 Aug 2026. The count climbs continuously, so
   * display copy uses `countDisplay` ("160+") rather than this exact figure —
   * a hardcoded exact number goes stale within days and reads as inaccurate.
   * Update both together if you refresh this.
   */
  count: 160,
  countDisplay: '160+',
  rating: 5.0,
  profileUrl: 'https://maps.app.goo.gl/GizAsdkXmcphcMAj6' as string,
};

/**
 * Public profiles for entity SEO (JSON-LD sameAs) and footer links.
 * Keep NAP consistent with Google / Yelp listings.
 */
export const socialProfiles = {
  facebook: 'https://www.facebook.com/profile.php?id=61558074716141',
  instagram: 'https://www.instagram.com/eys_handyman/',
  yelp: 'https://www.yelp.com/biz/elevate-your-space-handyman-katy',
  nextdoor: 'https://nextdoor.com/pages/eys-handyman-katy-tx/',
  // TODO: add the TikTok profile URL. It belongs in sameAs as an independent
  // corroborating signal, but the URL has not been supplied — do not guess it.
} as const;

/** Jobber Client Hub work-request embed (div + CSS + JS snippet from Share Options). */
export type JobberRequestFormEmbed = {
  containerId: string;
  formUrl: string;
  cssUrl: string;
  scriptUrl: string;
};

/**
 * Jobber embed URLs — paste from Jobber Client Hub when ready.
 * requestFormEmbed: quote / estimate work-request form (preferred Jobber snippet)
 * requestFormUrl: optional iframe URL override (rarely needed)
 * onlineBookingUrl: hosted Client Hub link for TV mounting (use link not embed — card fields require hosted form)
 * handymanToDoListFormUrl: hosted Client Hub link for Handyman To-Do List Visit
 * projectEstimateFormUrl: hosted Client Hub link for Project Estimate Request
 * kitchenRemodelFormUrl: hosted Client Hub link for Kitchen Remodel Estimate Request
 * bathroomRemodelFormUrl: hosted Client Hub link for Bathroom Remodel Estimate Request
 * smallRepairVisitUrl: optional iframe/embed URL for Handyman To-Do List Visit page
 */
export const jobber = {
  requestFormEmbed: {
    containerId: 'd0bd2223-f10c-4cda-a73e-02a65e730a50-4985623',
    formUrl:
      'https://clienthub.getjobber.com/client_hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/work_request/embedded_work_request_form?form_id=4985623',
    cssUrl: 'https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css',
    scriptUrl: 'https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js',
  } satisfies JobberRequestFormEmbed,
  requestFormUrl: '' as string,
  handymanToDoListFormUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/4983259/new' as string,
  projectEstimateFormUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/4985623/new' as string,
  kitchenRemodelFormUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/5130707/new' as string,
  bathroomRemodelFormUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/5130734/new' as string,
  onlineBookingUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/4977896/new' as string,
  smallRepairVisitUrl: '' as string,
};

function buildSameAs(): string[] {
  const links: string[] = [
    socialProfiles.facebook,
    socialProfiles.instagram,
    socialProfiles.yelp,
    socialProfiles.nextdoor,
  ];
  const gbp = googleReviews.profileUrl?.trim();
  if (gbp) links.unshift(gbp);
  return links;
}

/**
 * Service-area business: street address is NOT published on the website or in schema
 * (matches GBP service-area profile with hidden street address). Keep private fields
 * for internal ops only — never render when publishAddress is false.
 */
export const business = {
  ...site,
  /** When false, do not show street address, maps pin, or schema PostalAddress/geo. */
  publishAddress: false as boolean,
  address: {
    street: '1308 Ventura Crk Dr',
    city: 'Katy',
    state: 'TX',
    zip: '77493',
    country: 'US',
    formatted: '1308 Ventura Crk Dr, Katy, TX 77493, United States',
    /** Public-facing locality line (no street). */
    publicLocality: 'Katy & West Houston, TX',
  },
  areaServed: ['Katy', 'Cypress', 'Fulshear', 'Richmond', 'West Houston'],
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
  return url ? withJobberUtm(url, 'request-form') : undefined;
}

export function jobberRequestFormEmbed(): JobberRequestFormEmbed | undefined {
  const embed = business.jobber.requestFormEmbed;
  if (!embed?.containerId?.trim() || !embed?.formUrl?.trim()) return undefined;
  return {
    ...embed,
    formUrl: withJobberUtm(embed.formUrl, 'request-form-embed'),
  };
}

/** True when a quote/estimate form can be rendered (snippet or iframe). */
export function hasJobberRequestForm(): boolean {
  return Boolean(jobberRequestFormUrl() || jobberRequestFormEmbed());
}

export function jobberOnlineBookingUrl(): string | undefined {
  const url = business.jobber.onlineBookingUrl?.trim();
  return url ? withJobberUtm(url, 'tv-mounting-booking') : undefined;
}

export function jobberHandymanToDoListFormUrl(): string | undefined {
  const url = business.jobber.handymanToDoListFormUrl?.trim();
  return url ? withJobberUtm(url, 'todo-list') : undefined;
}

export function jobberProjectEstimateFormUrl(): string | undefined {
  const url = business.jobber.projectEstimateFormUrl?.trim();
  return url ? withJobberUtm(url, 'project-estimate') : undefined;
}

export function jobberKitchenRemodelFormUrl(): string | undefined {
  const url = business.jobber.kitchenRemodelFormUrl?.trim();
  return url ? withJobberUtm(url, 'kitchen-remodel') : undefined;
}

export function jobberBathroomRemodelFormUrl(): string | undefined {
  const url = business.jobber.bathroomRemodelFormUrl?.trim();
  return url ? withJobberUtm(url, 'bathroom-remodel') : undefined;
}

export function jobberSmallRepairVisitUrl(): string | undefined {
  const url = business.jobber.smallRepairVisitUrl?.trim();
  return url ? withJobberUtm(url, 'small-repair-visit') : undefined;
}

/**
 * Pick a shareable OG image. Only emit paths that exist (or remote URLs);
 * missing local heroes fall back to the site default so crawlers never get a 404.
 */
export function resolveOgImage(heroImage?: string): string {
  const raw = heroImage?.trim();
  if (!raw || raw === imagePlaceholder || raw.endsWith('/placeholder.svg')) {
    return site.defaultOgImage;
  }
  if (raw.startsWith('http')) return raw;
  if (!hasImage(raw)) return site.defaultOgImage;
  return absoluteUrl(raw);
}

export function resolveHeroImage(heroImage?: string): string {
  return resolveOgImage(heroImage);
}
