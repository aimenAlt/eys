/**
 * Site presentation switches — flip deliberately in code review, not via env vars.
 * Preview routes (/home-current/, /home-small-repair/) always remain available.
 */
export type HomepageVariant = 'current' | 'small-repair';

/** Which homepage renders at `/`. Change only this value to switch. */
export const homepageVariant: HomepageVariant = 'current';

/** Static service pages that are not content-collection entries. */
export const customServicePages = {
  'small-repair-visit': {
    title: 'Small Repair Visit',
    summary:
      'Reserve a professional handyman for quick repairs, installations, adjustments, and multi-item home to-do lists.',
  },
} as const;

export type CustomServiceSlug = keyof typeof customServicePages;

export function isCustomServicePage(slug: string): slug is CustomServiceSlug {
  return slug in customServicePages;
}
