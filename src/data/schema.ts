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

export type OfferCatalogItem = {
  name: string;
  price: number;
  priceCurrency?: string;
  description?: string;
};

/** OfferCatalog for productized service durations (prices must match visible UI). */
export function offerCatalog(name: string, items: OfferCatalogItem[]) {
  return {
    '@type': 'OfferCatalog',
    name,
    itemListElement: items.map((item) => ({
      '@type': 'Offer',
      name: item.name,
      price: item.price,
      priceCurrency: item.priceCurrency ?? 'USD',
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

export const homeFaqs: FaqItem[] = [
  {
    question: 'What areas do you serve?',
    answer:
      'We serve Katy, Cypress, Fulshear, Richmond, West Houston, and 12 master-planned communities including Cinco Ranch, Bridgeland, Sunterra, and Cross Creek Ranch. Looking for a handyman near you in West Houston? Start with your city page or send us your address for confirmation.',
  },
  {
    question: 'Do you offer free estimates?',
    answer:
      'Yes. Contact us with your project details and photos for a clear, itemized free estimate before work begins.',
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
    question: 'Who founded Elevate Your Space Handyman?',
    answer:
      'EYS was founded by Eyad Essa (many neighbors know him as Essa), a veteran whose construction experience began during U.S. military service. The company is built on preparation, accountability, and finishing the job correctly.',
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

export function blogPostingSchema(
  title: string,
  url: string,
  description: string,
  publishedAt: Date,
  image?: string,
) {
  return {
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    datePublished: publishedAt.toISOString(),
    author: {
      '@type': 'Organization',
      name: site.name,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logos/logo-lockup.webp'),
      },
    },
    ...(image ? { image } : {}),
    isPartOf: { '@id': BUSINESS_ID },
  };
}

export function reviewSchema(review: {
  author: string;
  rating: number;
  text: string;
  date: Date;
}) {
  return {
    '@type': 'Review',
    author: { '@type': 'Person', name: review.author },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: String(review.rating),
      bestRating: '5',
    },
    reviewBody: review.text,
    datePublished: review.date.toISOString(),
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

export function reviewsPageSchema(
  pageUrl: string,
  description: string,
  reviews: { author: string; rating: number; text: string; date: Date }[] = [],
) {
  const businessNode: Record<string, unknown> = { ...canonicalBusinessNode() };
  businessNode.aggregateRating = aggregateRatingFromGoogle();

  return [
    webPage('Customer Reviews', pageUrl, description),
    breadcrumbList([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Reviews', url: pageUrl },
    ]),
    businessNode,
    ...reviews.map((review) => reviewSchema(review)),
  ];
}

function absoluteUrl(path: string): string {
  const origin = String(import.meta.env.SITE || site.url).replace(/\/$/, '');
  const base = import.meta.env.BASE_URL || '/';
  const clean = path.replace(/^\//, '');
  return `${origin}${base}${clean}`;
}

export function wrapSchemaGraph(graph: unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  };
}
