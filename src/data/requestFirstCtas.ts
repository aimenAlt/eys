import { business } from './business';
import { withJobberFormId } from '../utils/utm';

/**
 * Request-first hero CTAs (backlog 008). GA4 Aug 29 – Oct 10: the slot-booking
 * Jobber forms leaked — to-do list booking 4983259 had 18 opens and 0
 * submissions, high-ceiling curtains 5061244 had 13 and 0 — while the simple
 * project-estimate request form 4985623 converts ~25%. On the to-do list and
 * curtain pages the primary hero CTA is that request form (+ Call); calendar
 * booking stays as a secondary link.
 *
 * The request form is the shared project-estimate form; `eys_form` tells the
 * entry points apart in Jobber and GA4.
 */
export function projectEstimateRequestUrl(eysForm: 'todo-list-request' | 'curtains-request'): string | undefined {
  const url = business.jobber.projectEstimateFormUrl?.trim();
  return url ? withJobberFormId(url, eysForm) : undefined;
}

/** Service-template pages (ServiceHero) that open request-first, keyed by service slug. */
export const requestFirstServiceHero: Partial<
  Record<string, { label: string; eysForm: 'curtains-request'; ctaLocation: string; secondaryLabel: string }>
> = {
  'curtain-installation': {
    label: 'Send photos of your windows',
    eysForm: 'curtains-request',
    ctaLocation: 'curtain_hero_request',
    secondaryLabel: 'Prefer to pick a time? See high-ceiling installation times & book',
  },
};
