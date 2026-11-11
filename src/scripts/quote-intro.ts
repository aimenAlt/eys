import { analyticsEvents, analyticsPageType, resolveCtaLocation, trackEvent } from '../utils/analytics';

/**
 * `/q/<code>` quote intro: tells the desk the page was really opened and
 * whether "View your quote" was pressed, and sends the matching GA4 events.
 *
 * The open is reported from here, not from the server, because the texting
 * apps that draw a link preview fetch the page too and never run scripts.
 * The code itself never goes to GA4 as a parameter; it is a key to the
 * customer's quote link.
 */

function introCode(): string | null {
  const match = /^\/q\/([A-Za-z0-9]{8})\/?$/.exec(window.location.pathname);
  return match ? match[1] : null;
}

function report(code: string, event: 'open' | 'click'): void {
  const body = JSON.stringify({ code, event });
  try {
    if (navigator.sendBeacon?.('/api/q/event', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* fall through */
  }
  void fetch('/api/q/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

const code = introCode();
if (code) {
  report(code, 'open');
  trackEvent(analyticsEvents.quoteIntroView, { page_type: analyticsPageType() });

  const cta = document.querySelector<HTMLAnchorElement>('[data-go-cta]');
  cta?.addEventListener('click', () => {
    report(code, 'click');
    trackEvent(analyticsEvents.quoteIntroClick, {
      page_type: analyticsPageType(),
      cta_location: resolveCtaLocation(cta),
      // Set by HandoffPage's countdown right before its own click.
      auto_redirect: cta.getAttribute('data-auto-redirect') === 'true' || undefined,
    });
  });
}
