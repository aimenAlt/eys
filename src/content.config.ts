import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const imageSchema = z.object({
  src: z
    .string()
    .refine((val) => val.startsWith('/') || /^https?:\/\//.test(val), {
      message: 'Image src must be a site path (/images/...) or absolute URL',
    }),
  alt: z.string(),
  caption: z.string().optional(),
  type: z.enum(['before', 'after', 'detail', 'process']).optional(),
  featured: z.boolean().optional(),
});

const bookingTypeSchema = z.enum([
  'direct-book',
  'quote-request',
  'assessment',
  'call-only',
]);

const publishedSchema = z.boolean().default(false);

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    seoTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    heroTitle: z.string().optional(),
    summary: z.string().optional(),
    bookingType: bookingTypeSchema.optional(),
    includedServices: z.array(z.string()).optional(),
    priceFactors: z.array(z.string()).optional(),
    process: z.array(z.string()).optional(),
    faqs: z.array(faqSchema).optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    primaryCTA: z.string().optional(),
    secondaryCTA: z.string().optional(),
    published: publishedSchema,
  }),
});

const serviceAreas = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/service-areas' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    seoTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    heroTitle: z.string().optional(),
    summary: z.string().optional(),
    localIntro: z.string().optional(),
    neighborhoods: z.array(z.string()).optional(),
    servicesAvailable: z.array(z.string()).optional(),
    faqs: z.array(faqSchema).optional(),
    relatedProjectsPlaceholder: z.string().optional(),
    relatedProjectSlugs: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    published: publishedSchema,
  }),
});

const communities = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/communities' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    citySlug: z.string(),
    seoTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    heroTitle: z.string().optional(),
    summary: z.string().optional(),
    promoCode: z.string().optional(),
    promoOffer: z.string().optional(),
    localIntro: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    servicesIntro: z.string().optional(),
    commonProjects: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
    whyChoose: z.string().optional(),
    goodFit: z.string().optional(),
    localLifestyle: z.string().optional(),
    process: z.string().optional(),
    faqs: z.array(faqSchema).optional(),
    published: publishedSchema,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    service: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
    gallery: z.array(imageSchema).optional(),
    published: publishedSchema,
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    seoTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    summary: z.string().optional(),
    publishedAt: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    published: publishedSchema,
  }),
});

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/reviews' }),
  schema: z.object({
    author: z.string(),
    rating: z.number().min(1).max(5),
    text: z.string(),
    source: z.string(),
    date: z.coerce.date(),
    location: z.string().optional(),
    featured: z.boolean().optional(),
    published: publishedSchema,
  }),
});

const cityServices = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/city-services' }),
  schema: z.object({
    legacySlug: z.string(),
    citySlug: z.string(),
    serviceSlug: z.string(),
    seoTitle: z.string(),
    metaDescription: z.string(),
    heroTitle: z.string(),
    summary: z.string(),
    localIntro: z.string(),
    neighborhoods: z.array(z.string()).optional(),
    zipCodes: z.array(z.string()).optional(),
    housingNotes: z.string().optional(),
    relatedCommunitySlugs: z.array(z.string()).optional(),
    faqs: z.array(faqSchema).optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    published: publishedSchema,
  }),
});

export const collections = {
  services,
  serviceAreas,
  communities,
  projects,
  blog,
  reviews,
  cityServices,
};
