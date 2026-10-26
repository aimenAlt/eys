/**
 * Site presentation switches — flip deliberately in code review, not via env vars.
 * Preview route `/home2/` always shows the alternate (non-live) homepage variant.
 */
export type HomepageVariant = 'current' | 'small-repair';

/** Which homepage renders at `/`. Change only this value to switch. */
export const homepageVariant: HomepageVariant = 'small-repair';

/**
 * Theme of the redesign system (backlog 012, docs/03-design-system.md). 'blue'
 * is the approved default; 'black' swaps the dark grounds and the reds only.
 * Read by pages that render through `BaseLayout theme={siteTheme}`; legacy
 * pages pass no theme and keep the old black/red look until migrated.
 */
export type SiteTheme = 'blue' | 'black';
export const siteTheme: SiteTheme = 'blue';

/** Static service pages that are not content-collection entries (or supersede unpublished ones). */
export const customServicePages = {
  'handyman-to-do-list': {
    title: 'Handyman To-Do List Visit',
    summary:
      'Reserve a professional handyman to work through multiple small repairs, installations, and maintenance tasks in one convenient visit.',
  },
  'media-walls': {
    title: 'Media Walls',
    summary:
      'Custom entertainment walls — built-in niches, fireplace media walls, wood-slat features, and finished TV centers.',
  },
} as const;

export type CustomServiceSlug = keyof typeof customServicePages;

export function isCustomServicePage(slug: string): slug is CustomServiceSlug {
  return slug in customServicePages;
}
