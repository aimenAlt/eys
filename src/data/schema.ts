import { business, site } from './business';

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

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
    '@type': 'HomeAndConstructionBusiness',
    name: site.name,
    url: pageUrl,
    telephone: site.phone,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.zip,
      addressCountry: business.address.country,
    },
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
      '@type': 'HomeAndConstructionBusiness',
      name: site.name,
      url: site.url,
      telephone: site.phone,
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
    answer: 'We proudly serve in Katy, Texas and surrounding regions.',
  },
  {
    question: 'Do you offer free estimates?',
    answer:
      'Yes. Contact us with your project details and we will provide the next steps for an estimate.',
  },
  {
    question: 'What types of materials do you use?',
    answer:
      'We use materials appropriate to the project, budget, and desired finish. During consultation, we can discuss available options and recommendations.',
  },
  {
    question: 'How long does a typical project take?',
    answer:
      'Project timelines vary depending on the scope of work, materials, and scheduling. Small repairs may be completed quickly, while remodeling and installation projects may require additional planning.',
  },
  {
    question: 'Are your services insured and guaranteed?',
    answer:
      'Contact Elevate Your Space Handyman directly for current insurance, warranty, and service guarantee details before beginning your project.',
  },
];

export function homePageSchema(faqs: FaqItem[] = homeFaqs) {
  const graph = [
    {
      '@type': 'HomeAndConstructionBusiness',
      name: site.name,
      image: site.defaultOgImage,
      '@id': site.url,
      url: site.url,
      telephone: site.phone,
      email: site.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.address.street,
        addressLocality: business.address.city,
        addressRegion: business.address.state,
        postalCode: business.address.zip,
        addressCountry: business.address.country,
      },
      areaServed: business.areaServed.map((city) => ({
        '@type': 'City',
        name: city,
      })),
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '152',
      },
    },
    faqPage(faqs),
  ].filter(Boolean);

  return graph;
}

export function wrapSchemaGraph(graph: unknown[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': graph.filter(Boolean),
  };
}
