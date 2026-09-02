/**
 * Curtain landing conversion helper:
 * - Fire Meta Pixel `InitiateCheckout` on high-ceiling booking *start* clicks
 *   (Schedule fires only on /booking-confirmed/ after Jobber success)
 *
 * UTM / click-ID forwarding used to live here but ran on four pages only. It now
 * runs site-wide from `jobber-attribution.ts` via `conversion-analytics.ts`.
 */
import { trackMetaEvent } from '../utils/analytics';

function wireHighCeilingMetaInitiateCheckout(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>('a[data-curtain-cta="high_ceiling"][href]');
      if (!link) return;
      if (!link.href.includes('getjobber.com')) return;

      // Booking *start* only — Schedule fires on the post-Jobber confirmation page.
      // Do not preventDefault — Jobber must open normally after this fires.
      trackMetaEvent('InitiateCheckout', {
        content_name: 'High-Ceiling Curtain Installation',
        content_category: 'Curtain Installation',
        service: 'high_ceiling_curtains',
      });
    },
    { capture: true },
  );
}

wireHighCeilingMetaInitiateCheckout();
