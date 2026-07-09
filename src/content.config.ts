import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const imageSchema = z.object({
  src: z.string().url(),
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
    heroImage: z.string().url().optional(),
    heroImageAlt: z.string().optional(),
    primaryCTA: z.string().optional(),
    secondaryCTA: z.string().optional(),
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
    neighborhoods: z.array(z.string()).optional(),
    servicesAvailable: z.array(z.string()).optional(),
    faqs: z.array(faqSchema).optional(),
    relatedProjectsPlaceholder: z.string().optional(),
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
  }),
});

export const collections = {
  services,
  serviceAreas,
  projects,
  blog,
  reviews,
};
