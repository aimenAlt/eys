import { analyticsEvents, trackEvent } from '../utils/analytics';

function safeTrack(eventName: string, params?: Record<string, string | number | boolean | undefined>): void {
  try {
    trackEvent(eventName, params);
  } catch {
    // Analytics must never block navigation.
  }
}

safeTrack(analyticsEvents.vanLandingView, {
  campaign: 'promaster_rear_2026',
  source: 'vehicle_wrap',
  medium: 'qr',
});

document.addEventListener(
  'click',
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const routeEl = target.closest<HTMLElement>('[data-van-route]');
    if (routeEl) {
      const route = routeEl.getAttribute('data-van-route');
      if (route) safeTrack(analyticsEvents.vanRouteSelected, { route });
      return;
    }

    const projectEl = target.closest<HTMLElement>('[data-van-project]');
    if (projectEl) {
      const project = projectEl.getAttribute('data-van-project');
      if (project) safeTrack(analyticsEvents.vanProjectSelected, { project });
      return;
    }

    const phoneEl = target.closest<HTMLElement>('[data-van-phone]');
    if (phoneEl) {
      const placement = phoneEl.getAttribute('data-van-phone') ?? 'page';
      safeTrack(analyticsEvents.vanPhoneClicked, { placement });
      return;
    }

    const reviewsEl = target.closest<HTMLElement>('[data-van-reviews]');
    if (reviewsEl) {
      safeTrack(analyticsEvents.vanReviewsClicked);
    }
  },
  true,
);
