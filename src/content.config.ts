import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const imagePathSchema = z
  .string()
  .refine((val) => val.startsWith('/') || /^https?:\/\//.test(val), {
    message: 'Image src must be a site path (/images/...) or absolute URL',
  });

const imageSchema = z.object({
  src: imagePathSchema,
  alt: z.string(),
  caption: z.string().optional(),
  type: z.enum(['before', 'after', 'detail', 'process', 'during', 'team']).optional(),
  featured: z.boolean().optional(),
});

const projectImageStageSchema = z.enum(['before', 'during', 'after', 'detail', 'team']);

const projectImageSchema = imageSchema
  .omit({ type: true, featured: true })
  .extend({
    alt: z.string().min(1),
    stage: projectImageStageSchema,
  });

const projectCategorySchema = z.enum([
  'tv-media-walls',
  'kitchens-cabinetry',
  'carpentry-built-ins',
  'fixtures-installations',
  'repairs-improvements',
  'outdoor-projects',
]);

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

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z
    .object({
      title: z.string().min(1),
      slug: z.string().min(1),
      category: projectCategorySchema,
      tags: z.array(z.string()).default([]),
      city: z.string().optional(),
      neighborhood: z.string().optional(),
      date: z.coerce.date().optional(),
      dateVerified: z.boolean().default(false),
      featured: z.boolean().default(false),
      featuredRank: z.number().int().positive().optional(),
      summary: z.string().min(1),
      scope: z.array(z.string()).optional(),
      serviceUrl: z
        .string()
        .refine((val) => val.startsWith('/'), {
          message: 'serviceUrl must be a site path starting with /',
        })
        .optional(),
      leadImage: imagePathSchema,
      leadAlt: z.string().min(1),
      images: z.array(projectImageSchema).min(1),
      beforeAfter: z
        .object({
          beforeImage: imagePathSchema,
          beforeAlt: z.string().min(1),
          afterImage: imagePathSchema,
          afterAlt: z.string().min(1),
          angleMatch: z.enum(['exact', 'similar', 'different']),
        })
        .optional(),
      publishable: z.boolean().default(false),
      privacyReviewed: z.boolean().default(false),
      published: publishedSchema,
      seoTitle: z.string().optional(),
      metaDescription: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.featured && data.featuredRank == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'featuredRank is required when featured is true',
          path: ['featuredRank'],
        });
      }
      if (data.published && data.publishable && !data.privacyReviewed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'privacyReviewed must be true for published publishable projects',
          path: ['privacyReviewed'],
        });
      }
    }),
});

export const collections = {
  services,
  serviceAreas,
  communities,
  blog,
  reviews,
  cityServices,
  projects,
};
