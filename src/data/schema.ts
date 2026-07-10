import { business, googleReviews, site } from './business';

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

const BUSINESS_ID = `${site.url}/#business`;

export function canonicalBusinessNode() {
  return {
    '@type': 'HomeAndConstructionBusiness',
    '@id': BUSINESS_ID,
    name: site.name,
    image: site.defaultOgImage,
    url: site.url,
    telephone: site.phone,
    email: site.email,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.zip,
      addressCountry: business.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    },
    areaServed: business.areaServed.map((city) => ({
      '@type': 'City',
      name: city,
    })),
    ...(business.sameAs.length > 0 ? { sameAs: business.sameAs } : {}),
  };
}

export function breadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webPage(name: string, url: string, description?: string) {
  return {
    '@type': 'WebPage',
    name,
    url,
    ...(description ? { description } : {}),
    isPartOf: { '@id': BUSINESS_ID },
  };
}

export function faqPage(faqs: FaqItem[]) {
  if (!faqs.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function localBusinessForArea(cityName: string, pageUrl: string) {
  return {
    ...canonicalBusinessNode(),
    url: pageUrl,
    areaServed: {
      '@type': 'City',
      name: cityName,
    },
  };
}

export function serviceSchema(
  name: string,
  description: string,
  url: string,
) {
  return {
    '@type': 'Service',
    name,
    description,
    url,
    provider: {
      '@id': BUSINESS_ID,
    },
    areaServed: business.areaServed.map((city) => ({
      '@type': 'City',
      name: city,
    })),
  };
}

export const homeFaqs: FaqItem[] = [
  {
    question: 'What areas do you serve?',
    answer:
      'We serve Katy, Cypress, Fulshear, Richmond, West Houston, and 12 master-planned communities including Cinco Ranch, Bridgeland, Sunterra, and Cross Creek Ranch.',
  },
  {
    question: 'Do you offer free estimates?',
    answer:
      'Yes. Contact us with your project details and photos for a clear, itemized estimate.',
  },
  {
    question: 'What types of materials do you use?',
    answer:
      'We use materials appropriate to the project, budget, and desired finish. During consultation, we can discuss available options and recommendations.',
  },
  {
    question: 'How long does a typical project take?',
    answer:
      'Project timelines vary depending on scope. Small repairs may be completed in one visit; larger punch lists are scheduled accordingly.',
  },
  {
    question: 'Are your services insured and guaranteed?',
    answer:
      'Contact Elevate Your Space Handyman directly for current insurance, warranty, and service guarantee details before beginning your project.',
  },
];

export function aggregateRatingFromGoogle(): {
  '@type': 'AggregateRating';
  ratingValue: string;
  reviewCount: string;
} {
  return {
    '@type': 'AggregateRating',
    ratingValue: String(googleReviews.rating),
    reviewCount: String(googleReviews.count),
  };
}

export function aggregateRatingFromReviews(
  reviews: { rating: number }[],
): { '@type': 'AggregateRating'; ratingValue: string; reviewCount: string } | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = (total / reviews.length).toFixed(1);
  return {
    '@type': 'AggregateRating',
    ratingValue: avg,
    reviewCount: String(reviews.length),
  };
}

export function itemListSchema(
  name: string,
  items: { name: string; url: string }[],
) {
  return {
    '@type': 'ItemList',
    name,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function homePageSchema(
  faqs: FaqItem[] = homeFaqs,
  _reviews: { rating: number }[] = [],
) {
  const businessNode: Record<string, unknown> = { ...canonicalBusinessNode() };
  businessNode.aggregateRating = aggregateRatingFromGoogle();

  const graph = [businessNode, faqPage(faqs)].filter(Boolean);

  return graph;
}

export function reviewsPageSchema(pageUrl: string, description: string) {
  const businessNode: Record<string, unknown> = { ...canonicalBusinessNode() };
  businessNode.aggregateRating = aggregateRatingFromGoogle();

  return [
    webPage('Customer Reviews', pageUrl, description),
    breadcrumbList([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Reviews', url: pageUrl },
    ]),
    businessNode,
  ];
}

function absoluteUrl(path: string): string {
  const base = site.url.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function wrapSchemaGraph(graph: unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  };
}
