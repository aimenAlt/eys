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

function inferBookingType(href: string, link: HTMLAnchorElement): string {
  const explicit = link.getAttribute('data-booking-type');
  if (explicit) return explicit;
  if (href.includes('4983259')) return 'handyman_to_do_list';
  if (href.includes('4985623')) return 'project_estimate';
  if (href.includes('4977896')) return 'tv_mounting';
  if (href.includes('embedded_work_request')) return 'embedded_estimate';
  return 'jobber_form';
}

function resolvePlacement(link: HTMLAnchorElement): string {
  return (
    link.getAttribute('data-cta-location') ??
    link.closest('[data-cta-location]')?.getAttribute('data-cta-location') ??
    resolveCtaLocation(link)
  );
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
          const bookingType = inferBookingType(href, link);
          const placement = resolvePlacement(link);
          const serviceType =
            link.getAttribute('data-service-type') ??
            (bookingType.includes('curtain') ? bookingType : undefined);

          trackEvent(analyticsEvents.jobberBookingClick, {
            page_path: analyticsPagePath(),
            booking_type: bookingType,
            service_type: serviceType,
            placement,
            cta_location: placement,
            destination_host: destinationHost,
          });

          // Distinct secondary funnel event for regular-ceiling curtain CTAs.
          if (
            link.getAttribute('data-curtain-cta') === 'regular_ceiling' ||
            serviceType === 'regular_ceiling_curtain'
          ) {
            trackEvent(analyticsEvents.regularCeilingBookingClick, {
              page_path: analyticsPagePath(),
              service_type: 'regular_ceiling_curtain',
              placement,
            });
          }
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
