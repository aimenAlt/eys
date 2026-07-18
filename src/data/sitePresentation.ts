/**
 * Site presentation switches — flip deliberately in code review, not via env vars.
 * Preview routes (/home-current/, /home-small-repair/) always remain available.
 */
export type HomepageVariant = 'current' | 'small-repair';

/** Which homepage renders at `/`. Change only this value to switch. */
export const homepageVariant: HomepageVariant = 'current';

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
