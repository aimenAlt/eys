/**
 * Lightweight GA4 event helper. Safe no-op when gtag is unavailable (dev / preview).
 * Do not send personally identifiable information.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

/** Meta Pixel helper — safe no-op when pixel is unavailable (dev / preview). */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params ?? {});
}

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(eventName: string, params?: AnalyticsParams): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params ?? {});
}

/** GA4 event names — Plan 10 conversion scaffold + existing gallery/pathway events. */
export const analyticsEvents = {
  phoneClick: 'phone_click',
  emailClick: 'email_click',
  estimateFormOpen: 'estimate_form_open',
  estimateSubmit: 'estimate_submit',
  jobberBookingClick: 'jobber_booking_click',
  jobberBookingComplete: 'jobber_booking_complete',
  /** Successful scheduled appointment after Jobber redirect to /booking-confirmed/. */
  bookingComplete: 'booking_complete',
  /** Successful inquiry/request after Jobber redirect to /request-confirmed/. */
  leadSubmit: 'lead_submit',
  customProjectInquiry: 'custom_project_inquiry',
  directionsClick: 'directions_click',
  reviewLinkClick: 'review_link_click',
  projectGalleryEngagement: 'project_gallery_engagement',
  formError: 'form_error',
  thankYouView: 'thank_you_view',
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
  vanLandingView: 'van_landing_view',
  vanRouteSelected: 'van_route_selected',
  vanProjectSelected: 'van_project_selected',
  vanPhoneClicked: 'van_phone_clicked',
  vanReviewsClicked: 'van_reviews_clicked',
  /** Outbound Jobber click for regular-ceiling curtain booking (secondary funnel event). */
  regularCeilingBookingClick: 'regular_ceiling_booking_click',
  /** Media Wall cross-sell section entered viewport on curtain landing. */
  mediaWallCrossSellView: 'media_wall_cross_sell_view',
  /** Outbound Jobber request click from Media Wall cross-sell CTA. */
  mediaWallRequestClick: 'media_wall_request_click',
} as const;

export function analyticsPagePath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

export function analyticsPageType(path = analyticsPagePath()): string {
  if (path === '/' || path.endsWith('/index.html')) return 'home';
  if (path.startsWith('/curtain-installation')) return 'curtain_landing';
  if (path.startsWith('/start')) return 'start_landing';
  if (path.startsWith('/services/')) return 'service';
  if (path.startsWith('/service-areas/')) return 'service_area';
  if (path.startsWith('/blog/')) return 'blog';
  if (path.startsWith('/our-work/')) return 'gallery';
  if (path.startsWith('/van')) return 'van_landing';
  if (path.startsWith('/booking-confirmed')) return 'booking_confirmation';
  if (path.startsWith('/request-confirmed')) return 'request_confirmation';
  return 'content';
}

export function resolveCtaLocation(element: Element): string {
  const explicit =
    element.getAttribute('data-cta-location') ??
    element.closest('[data-cta-location]')?.getAttribute('data-cta-location');
  if (explicit) return explicit;
  if (element.closest('footer')) return 'footer';
  if (element.closest('#mobile-menu')) return 'header_mobile';
  if (element.closest('header')) return 'header';
  if (element.closest('[aria-label="Quick actions"]')) return 'mobile_sticky';
  return 'page';
}

export function telDigitsFromHref(href: string): string {
  return href.replace(/^tel:/i, '').replace(/\D/g, '');
}
