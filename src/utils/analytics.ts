/**
 * Lightweight GA4 event helper. Safe no-op when gtag is unavailable (dev / preview).
 * Do not send personally identifiable information.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params ?? {});
}

/** Event names used by Handyman To-Do List Visit / pathways surfaces. */
export const analyticsEvents = {
  pathwayCtaClick: 'pathway_cta_click',
  durationSelected: 'small_repair_duration_selected',
  jobberSectionReached: 'jobber_form_section_reached',
  jobberFallbackClick: 'jobber_form_fallback_click',
  smallRepairRequestStarted: 'small_repair_request_started',
  galleryFilterSelected: 'gallery_filter_selected',
  projectCardOpened: 'project_card_opened',
  projectPhotoNavigated: 'project_photo_navigated',
  projectServiceLinkClicked: 'project_service_link_clicked',
  galleryEstimateClicked: 'gallery_estimate_clicked',
  galleryPhoneClicked: 'gallery_phone_clicked',
} as const;
