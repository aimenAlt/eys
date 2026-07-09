export const site = {
  name: 'Elevate Your Space Handyman',
  shortName: 'EYS',
  url: 'https://www.elevateyourspacehandyman.com',
  phone: '(718) 986-1177',
  phoneTel: '7189861177',
  email: 'eyad3396@gmail.com',
  defaultOgImage:
    'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&q=80&w=1200',
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
  areaServed: ['Katy', 'Cinco Ranch', 'Fulshear'],
};

export function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
