import { absoluteUrl, business, site } from './business';

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
  const node: Record<string, unknown> = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': BUSINESS_ID,
    name: site.name,
    image: absoluteUrl(site.defaultOgImage),
    url: site.url,
    telephone: site.phone,
    email: site.email,
    priceRange: '$$',
    // Must match the Google Business Profile hours exactly.
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '05:00',
        closes: '23:30',
      },
    ],
    areaServed: business.areaServed.map((city) => ({
      '@type': 'City',
      name: city,
    })),
    ...(business.sameAs.length > 0 ? { sameAs: business.sameAs } : {}),
  };

  // Service-area business: omit street address + geo unless explicitly published.
  if (business.publishAddress) {
    node.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.zip,
      addressCountry: business.address.country,
    };
    node.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    };
  } else {
    node.address = {
      '@type': 'PostalAddress',
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      addressCountry: business.address.country,
    };
  }

  return node;
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

export function webPage(
  name: string,
  url: string,
  description?: string,
  image?: string,
) {
  const imageUrl = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : undefined;
  return {
    '@type': 'WebPage',
    name,
    url,
    ...(description ? { description } : {}),
    ...(imageUrl ? { primaryImageOfPage: { '@type': 'ImageObject', url: imageUrl } } : {}),
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
  image?: string,
) {
  const imageUrl = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : undefined;
  return {
    '@type': 'Service',
    name,
    description,
    url,
    ...(imageUrl ? { image: imageUrl } : {}),
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
      'We serve Katy, Cypress, Fulshear, Richmond, and West Houston. Send your address for confirmation before scheduling — coverage depends on location and project scope.',
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

export function homePageSchema(faqs: FaqItem[] = homeFaqs) {
  return [canonicalBusinessNode(), faqPage(faqs)].filter(Boolean);
}

export function reviewsPageSchema(pageUrl: string, description: string) {
  return [
    webPage('Customer Reviews', pageUrl, description),
    breadcrumbList([
      { name: 'Home', url: absoluteUrl('/') },
      { name: 'Reviews', url: pageUrl },
    ]),
  ];
}

export function wrapSchemaGraph(graph: unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  };
}
