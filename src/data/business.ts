export const site = {
  name: 'Elevate Your Space Handyman',
  shortName: 'EYS',
  url: 'https://www.eyshandyman.com',
  phone: '(713) 986-1177',
  phoneTel: '7139861177',
  email: 'contact@eyshandyman.com',
  defaultOgImage:
    'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&q=80&w=1200',
};

/** Google Business Profile aggregate stats (update profileUrl when GBP link is confirmed). */
export const googleReviews = {
  count: 150,
  rating: 4.9,
  profileUrl: '' as string,
};

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
  sameAs: [] as string[],
};

export function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function googleReviewProfileUrl(): string | undefined {
  const url = business.googleReviews.profileUrl?.trim();
  return url || undefined;
}
