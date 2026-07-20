/**
 * Site presentation switches — flip deliberately in code review, not via env vars.
 * Preview route `/home2/` always shows the alternate (non-live) homepage variant.
 */
export type HomepageVariant = 'current' | 'small-repair';

/** Which homepage renders at `/`. Change only this value to switch. */
export const homepageVariant: HomepageVariant = 'small-repair';

/** Static service pages that are not content-collection entries. */
export const customServicePages = {
  'handyman-to-do-list': {
    title: 'Handyman To-Do List Visit',
    summary:
      'Reserve a professional handyman to work through multiple small repairs, installations, and maintenance tasks in one convenient visit.',
  },
} as const;

export type CustomServiceSlug = keyof typeof customServicePages;

export function isCustomServicePage(slug: string): slug is CustomServiceSlug {
  return slug in customServicePages;
}
