import {
  analyticsEvents,
  analyticsPagePath,
  analyticsPageType,
  resolveCtaLocation,
  telDigitsFromHref,
  trackEvent,
} from '../utils/analytics';

const JOBBER_HOST = 'getjobber.com';

function isJobberOutbound(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    return url.hostname.includes(JOBBER_HOST);
  } catch {
    return href.includes(JOBBER_HOST);
  }
}

function isGoogleReviewLink(link: HTMLAnchorElement): boolean {
  if (link.hasAttribute('data-track-review')) return true;
  try {
    const url = new URL(link.href, window.location.origin);
    const host = url.hostname;
    return host === 'maps.app.goo.gl' || host.endsWith('g.page');
  } catch {
    return false;
  }
}

function inferBookingType(href: string): string {
  if (href.includes('4983259')) return 'handyman_to_do_list';
  if (href.includes('4985623')) return 'project_estimate';
  if (href.includes('4977896')) return 'tv_mounting';
  if (href.includes('embedded_work_request')) return 'embedded_estimate';
  return 'jobber_form';
}

function wireConversionClicks(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a[href]');
      if (link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href') ?? '';

        if (href.startsWith('tel:')) {
          trackEvent(analyticsEvents.phoneClick, {
            page_path: analyticsPagePath(),
            page_type: analyticsPageType(),
            cta_location: resolveCtaLocation(link),
            displayed_number: telDigitsFromHref(href),
          });
          return;
        }

        if (href.startsWith('mailto:')) {
          trackEvent(analyticsEvents.emailClick, {
            page_path: analyticsPagePath(),
            cta_location: resolveCtaLocation(link),
          });
          return;
        }

        if (isGoogleReviewLink(link)) {
          trackEvent(analyticsEvents.reviewLinkClick, {
            page_path: analyticsPagePath(),
            cta_location: resolveCtaLocation(link),
          });
          return;
        }

        if (isJobberOutbound(href)) {
          let destinationHost = JOBBER_HOST;
          try {
            destinationHost = new URL(href, window.location.origin).hostname;
          } catch {
            /* keep default */
          }
          trackEvent(analyticsEvents.jobberBookingClick, {
            page_path: analyticsPagePath(),
            booking_type: link.getAttribute('data-booking-type') ?? inferBookingType(href),
            cta_location: resolveCtaLocation(link),
            destination_host: destinationHost,
          });
        }
        return;
      }

      const estimateButton = target.closest('[data-jobber-load]');
      if (estimateButton instanceof HTMLButtonElement) {
        trackEvent(analyticsEvents.estimateFormOpen, {
          page_path: analyticsPagePath(),
          service: estimateButton.closest('[data-jobber-embed]')?.getAttribute('data-form-url')
            ? 'embedded_estimate'
            : 'estimate',
          cta_location: resolveCtaLocation(estimateButton),
        });
      }
    },
    { capture: true },
  );
}

wireConversionClicks();
