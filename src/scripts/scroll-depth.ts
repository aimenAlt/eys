/**
 * Scroll-depth milestones for long, single-column, conversion-driven landing
 * pages: `/`, `/start/`, `/van/`, `/curtain-installation/` and
 * `/services/media-walls/`. Imported per page, explicitly — this is
 * deliberately not wired site-wide from BaseLayout.
 *
 * GA4's built-in `scroll` event fires once, at 90%, which says whether someone
 * reached the bottom and nothing about where the rest of them stopped. These
 * pages are long, single-column and entirely conversion-driven, so knowing that
 * readers drop out between 25% and 50% is the difference between reordering a
 * section and rewriting it.
 *
 * 25 / 50 / 75 only. A fourth milestone at 90% would double-count against GA4's
 * own scroll event.
 *
 * Sentinels rather than a scroll listener: three 1px markers are positioned
 * down the page and watched with IntersectionObserver, so nothing runs on the
 * main thread while the visitor scrolls. They live inside an absolutely
 * positioned track whose height is the full document, re-measured when the
 * document grows (a video swapping in its poster, images landing late).
 */
import { trackEvent, analyticsPageType } from '../utils/analytics';

const MILESTONES = [25, 50, 75] as const;
const EVENT_NAME = 'scroll_depth';

const fired = new Set<number>();

function documentHeight(): number {
  return Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
    window.innerHeight,
  );
}

function init(): void {
  if (!('IntersectionObserver' in window)) return;

  // No positioned ancestor, so the containing block is the initial containing
  // block: `top: 0` is the top of the DOCUMENT, not of the viewport, and the
  // markers scroll with the page.
  const track = document.createElement('div');
  track.setAttribute('aria-hidden', 'true');
  track.style.cssText =
    'position:absolute;top:0;left:0;width:1px;pointer-events:none;visibility:hidden;';
  track.style.height = `${documentHeight()}px`;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const percent = Number((entry.target as HTMLElement).dataset.depth);
        if (!percent || fired.has(percent)) continue;
        fired.add(percent);
        observer.unobserve(entry.target);
        trackEvent(EVENT_NAME, { percent, page_type: analyticsPageType() });
      }
      if (fired.size === MILESTONES.length) observer.disconnect();
    },
    { root: null, threshold: 0 },
  );

  for (const percent of MILESTONES) {
    const marker = document.createElement('div');
    marker.dataset.depth = String(percent);
    marker.style.cssText = `position:absolute;left:0;width:1px;height:1px;top:${percent}%;`;
    track.appendChild(marker);
    observer.observe(marker);
  }

  document.body.appendChild(track);

  // The page gets taller as media loads; percentage markers are only honest if
  // the track keeps matching the document.
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(() => {
      track.style.height = `${documentHeight()}px`;
    });
    resize.observe(document.documentElement);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
