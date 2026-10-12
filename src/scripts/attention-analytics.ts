/**
 * Attention events: which page sections people actually look at, and which
 * photos they click. Loaded site-wide via `conversion-analytics.ts` (BaseLayout).
 * Neither event is a key event, and neither is sent to Google Ads.
 *
 * `section_view` — every top-level <section> (not nested in another section,
 * not inside header/footer/nav, at least 120px tall) fires once per page view
 * after it has been in view continuously for 1 second. "In view" is 40% of the
 * section visible, or — for a section taller than the viewport, which can never
 * reach 40% on a phone — the section filling half the viewport. Params:
 * `section_id` (data-analytics-section › id › slug of its first h2/h3 ›
 * `section_<n>`), `section_index` (1-based, page order), `page_type`.
 * IntersectionObserver only: nothing runs on the main thread while scrolling.
 *
 * `image_click` — one delegated listener. Any click inside an <img>/<picture>
 * rendered at least 48px wide. Params: `image_name` (file basename, no
 * extension or size/hash suffix), `page_type`, `cta_location`, `in_link`. It is
 * sent IN ADDITION to whatever the click already tracks (jobber_booking_click,
 * gallery events) — never instead of it.
 */
import { analyticsPageType, resolveCtaLocation, trackEvent } from '../utils/analytics';

const MIN_SECTION_HEIGHT = 120;
const VISIBLE_RATIO = 0.4;
const VIEWPORT_COVER = 0.5;
const DWELL_MS = 1000;
const SECTION_ID_MAX = 40;
const MIN_IMAGE_WIDTH = 48;
const IMAGE_NAME_MAX = 100;

/** Fine-grained thresholds so a tall section is re-checked as it fills the viewport. */
const THRESHOLDS = Array.from({ length: 51 }, (_, i) => i / 50);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, SECTION_ID_MAX)
    .replace(/_+$/, '');
}

function sectionId(section: HTMLElement, index: number): string {
  const explicit = section.dataset.analyticsSection?.trim();
  if (explicit) return explicit;
  if (section.id) return section.id;
  const heading = section.querySelector('h2, h3');
  const slug = heading?.textContent ? slugify(heading.textContent) : '';
  return slug || `section_${index}`;
}

function topLevelSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('section')).filter(
    (section) =>
      !section.parentElement?.closest('section') && !section.closest('header, footer, nav'),
  );
}

function isInView(entry: IntersectionObserverEntry): boolean {
  if (!entry.isIntersecting) return false;
  if (entry.intersectionRatio >= VISIBLE_RATIO) return true;
  const viewportHeight = entry.rootBounds?.height || window.innerHeight;
  return (
    entry.boundingClientRect.height > viewportHeight &&
    entry.intersectionRect.height >= viewportHeight * VIEWPORT_COVER
  );
}

function initSectionViews(): void {
  if (!('IntersectionObserver' in window)) return;
  const sections = topLevelSections();
  if (!sections.length) return;

  const meta = new Map<Element, { id: string; index: number }>();
  const timers = new Map<Element, number>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const section = entry.target;
        const inView = isInView(entry) && entry.boundingClientRect.height >= MIN_SECTION_HEIGHT;
        const pending = timers.get(section);
        if (!inView) {
          if (pending !== undefined) {
            window.clearTimeout(pending);
            timers.delete(section);
          }
          continue;
        }
        if (pending !== undefined) continue;
        timers.set(
          section,
          window.setTimeout(() => {
            timers.delete(section);
            observer.unobserve(section);
            const info = meta.get(section);
            if (!info) return;
            trackEvent('section_view', {
              section_id: info.id,
              section_index: info.index,
              page_type: analyticsPageType(),
            });
          }, DWELL_MS),
        );
      }
    },
    { root: null, threshold: THRESHOLDS },
  );

  sections.forEach((section, i) => {
    meta.set(section, { id: sectionId(section, i + 1), index: i + 1 });
    observer.observe(section);
  });
}

/** `/images/x/marble-wood-slat-1200w.webp` → `marble-wood-slat`. */
function imageName(img: HTMLImageElement): string {
  const src = img.currentSrc || img.src || '';
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return 'inline';
  let path = src;
  try {
    path = new URL(src, window.location.origin).pathname;
  } catch {
    /* keep raw */
  }
  let name = decodeURIComponent(path.split('/').pop() ?? '');
  name = name.replace(/\.[a-z0-9]+$/i, ''); // extension
  name = name.replace(/\.[A-Za-z0-9_-]{8}$/, ''); // Astro content hash: photo.BZst8rsx
  name = name.replace(/@\dx$/i, ''); // retina suffix
  name = name.replace(/[-_](\d+w|\d+x\d+)$/i, ''); // responsive width / dimensions
  return name.slice(0, IMAGE_NAME_MAX) || 'unknown';
}

function initImageClicks(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const holder = target.closest('img, picture');
      if (!holder) return;
      const img = holder instanceof HTMLImageElement ? holder : holder.querySelector('img');
      if (!img) return;
      if (img.getBoundingClientRect().width < MIN_IMAGE_WIDTH) return;
      trackEvent('image_click', {
        image_name: imageName(img),
        page_type: analyticsPageType(),
        cta_location: resolveCtaLocation(img),
        in_link: img.closest('a[href]') ? 'true' : 'false',
      });
    },
    { capture: true, passive: true },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSectionViews, { once: true });
} else {
  initSectionViews();
}
initImageClicks();
