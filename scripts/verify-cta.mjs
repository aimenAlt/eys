/**
 * Conversion-path gate. Crawls every URL in dist/sitemap-0.xml against a running
 * preview server and fails loudly on any violation.
 *
 * Written after a 13 Sep 2026 audit found ~60 of 74 built pages with no
 * clickable Jobber form link in the body at all, and a ~14-screen stretch of the
 * homepage with no conversion element of any kind.
 *
 * Usage:
 *   npm run build && npm run preview &
 *   node scripts/verify-cta.mjs
 *   BASE_URL=http://localhost:4321 PAGES=/,/book/ node scripts/verify-cta.mjs
 */
import { chromium } from 'playwright';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const SITEMAP = join(import.meta.dirname, '../dist/sitemap-0.xml');

const DESKTOP = { label: 'desktop', width: 1440, height: 900 };
const MOBILE = { label: 'mobile', width: 390, height: 844 };

/** Longest tolerated run of page with no conversion element, at 390x844. */
const MAX_CTA_GAP_PX = 2500;
/** Review proof must land inside this share of the document's text. */
const PROOF_TEXT_SHARE = 0.3;
/** Scroll step for the mobile dead-zone scan — comfortably inside one 844px screen. */
const SCAN_STEP_PX = 800;
/** Time for an IntersectionObserver-driven sticky bar to settle after a jump scroll. */
const STICKY_SETTLE_MS = 250;
/**
 * The homepage hero's primary CTA must finish above this line at 390x844 — the
 * usable fold on a real iPhone after Safari's chrome. The audit measured it at
 * 567px, with the 2nd and 3rd buying paths below that again.
 */
const HERO_PRIMARY_MAX_BOTTOM_PX = 560;
/** Minimum tap target for a CTA that renders as a button. */
const MIN_TAP_PX = 44;
/**
 * WCAG 2.2 target size exempts links inside a sentence, and the homepage hero
 * deliberately keeps its third buying path as an inline text link. Inline CTAs
 * are held to the 24px minimum instead of the 44px button target.
 */
const MIN_INLINE_TAP_PX = 24;

async function loadSitemapPaths() {
  await access(SITEMAP);
  const xml = await readFile(SITEMAP, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1].trim()).pathname)
    .map((p) => (p.endsWith('/') || p.includes('.') ? p : `${p}/`));
}

function applyFilter(paths) {
  const raw = process.env.PAGES?.trim();
  if (!raw) return paths;
  const wanted = raw.split(',').map((p) => {
    let s = p.trim();
    if (!s.startsWith('/')) s = `/${s}`;
    if (!s.endsWith('/') && !s.includes('.')) s = `${s}/`;
    return s === '//' ? '/' : s;
  });
  return paths.filter((p) => wanted.includes(p));
}

/**
 * Everything in COLLECT runs inside the page. Declared as a real function (not a
 * string) so Playwright serializes it; it must not close over Node scope.
 */
function COLLECT() {
  const CTA_SELECTOR = [
    'a[href*="clienthub.getjobber.com"]',
    'a[href^="tel:"]',
    'a[data-booking-type]',
    'button[data-booking-type]',
    'a[data-cta-location]',
    'button[data-cta-location]',
  ].join(',');

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    return !el.closest('[hidden]');
  };

  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;

  const jobberAnchors = [...document.body.querySelectorAll('a[href*="clienthub.getjobber.com"]')];
  const visibleJobber = jobberAnchors.filter(visible);

  // Conversion elements: a Jobber link, a phone link, or a real form.
  const conversion = [
    ...document.body.querySelectorAll('a[href*="clienthub.getjobber.com"], a[href^="tel:"], form'),
  ]
    .filter(visible)
    .map((el) => ({
      top: docTop(el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 40),
    }))
    .sort((a, b) => a.top - b.top);

  const text = document.body.innerText || '';
  const proofRe =
    /\b\d\.\d\s*(★|stars?\b)|\b\d{2,}\+?\s*(Google\s+)?reviews?\b|\b\d\.\d\s*-?\s*rated\b/i;
  const proofMatch = text.match(proofRe);
  const proof = proofMatch
    ? {
        index: proofMatch.index,
        total: text.length,
        share: proofMatch.index / Math.max(text.length, 1),
        snippet: proofMatch[0],
      }
    : null;

  /**
   * A CTA rendered with button chrome (a background or a border) is held to the
   * 44px target. A bare text link is held to the WCAG 2.2 24px minimum, and a
   * link sitting inside a sentence of other text is exempt entirely — that is
   * the 2.5.8 "inline" exception, and the homepage hero's third buying path is
   * deliberately a text link.
   */
  const transparent = (c) => !c || c === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c);
  const ctas = [...document.querySelectorAll(CTA_SELECTOR)].filter(visible).map((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const hasChrome =
      !transparent(cs.backgroundColor) ||
      parseFloat(cs.borderTopWidth) > 0 ||
      parseFloat(cs.borderBottomWidth) > 0 ||
      el.tagName === 'BUTTON';
    const own = (el.textContent || '').trim();
    const parentText = (el.parentElement?.textContent || '').trim();
    return {
      kind: hasChrome ? 'button' : 'link',
      inSentence: !hasChrome && parentText.length > own.length + 3,
      width: r.width,
      height: r.height,
      text: own.slice(0, 40),
      href: el.getAttribute('href') || '',
    };
  });

  const imagesMissingDims = [...document.querySelectorAll('img')]
    .filter((img) => !img.getAttribute('width') || !img.getAttribute('height'))
    .map((img) => img.getAttribute('src') || '(no src)');

  // LCP hero candidate: the eager / high-priority image inside the page content.
  // Site chrome (the header logo is eager too) is not the LCP element.
  const inChrome = (el) => Boolean(el.closest('header, nav, footer'));
  const contentImages = [...document.querySelectorAll('img')].filter((img) => !inChrome(img));
  const heroImg =
    contentImages.find((img) => img.getAttribute('fetchpriority') === 'high') ||
    contentImages.find((img) => img.getAttribute('loading') === 'eager') ||
    null;
  const hero = heroImg
    ? {
        src: heroImg.getAttribute('src') || '',
        srcset: heroImg.getAttribute('srcset') || '',
        sourceSrcset:
          heroImg.parentElement && heroImg.parentElement.tagName === 'PICTURE'
            ? [...heroImg.parentElement.querySelectorAll('source')]
                .map((s) => s.getAttribute('srcset') || '')
                .join(' ')
            : '',
      }
    : null;

  // Clipped text on conversion + heading elements.
  const clipped = [...document.querySelectorAll(`${CTA_SELECTOR},h1,h2,h3`)]
    .filter(visible)
    .filter((el) => {
      const cs = getComputedStyle(el);
      // Visually-hidden text (`sr-only`) clips on purpose; it is not a layout bug.
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return false;
      const clips =
        ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY);
      if (!clips) return false;
      if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return false;
      return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    })
    .map((el) => `${el.tagName.toLowerCase()}: ${(el.textContent || '').trim().slice(0, 40)}`);

  const heroPrimary = document.querySelector('[data-sticky-hero-cta] a');
  const heroPrimaryBottom = heroPrimary
    ? heroPrimary.getBoundingClientRect().bottom + window.scrollY
    : null;

  return {
    heroPrimaryBottom,
    jobberInBody: jobberAnchors.length,
    jobberVisible: visibleJobber.length,
    conversion,
    proof,
    ctas,
    imagesMissingDims,
    hero,
    clipped,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    docHeight: document.documentElement.scrollHeight,
  };
}

/**
 * Per-scroll-offset probe, run once per sample so a scan costs one round trip.
 *
 * `ctaOnScreen` answers the dead-zone rule: can the visitor act without
 * scrolling further, counting the sticky bar exactly where it is actually
 * revealed? `overlaps` and `heroOnScreen` answer the sticky-bar rules.
 *
 * A bottom-pinned bar necessarily passes over content while the page scrolls,
 * so "never overlaps a CTA at any offset" is unachievable for any sticky bar
 * and would only be satisfiable by deleting it. What must hold instead is that
 * the bar covers nothing at the end of the document — where nothing can be
 * scrolled further, which is what the reserved bottom padding buys — and that
 * it is never on screen at the same time as a hero CTA, which is the failure
 * the 13 Sep audit found.
 */
function SAMPLE() {
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return (
      cs.visibility !== 'hidden' &&
      cs.display !== 'none' &&
      Number(cs.opacity) !== 0 &&
      !el.closest('[hidden]')
    );
  };
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  let ctaOnScreen = false;
  for (const el of document.querySelectorAll(
    'a[href*="clienthub.getjobber.com"],a[href^="tel:"],form',
  )) {
    if (visible(el) && onScreen(el)) {
      ctaOnScreen = true;
      break;
    }
  }

  const bar = document.querySelector('[data-mobile-sticky]');
  const barVisible = Boolean(bar) && visible(bar);

  const overlaps = [];
  if (barVisible) {
    const b = bar.getBoundingClientRect();
    for (const el of document.querySelectorAll(
      'a[href*="clienthub.getjobber.com"],a[href^="tel:"],a[data-booking-type],a[data-cta-location],button[data-cta-location]',
    )) {
      if (bar.contains(el) || !visible(el)) continue;
      const r = el.getBoundingClientRect();
      const overlapX = Math.min(b.right, r.right) - Math.max(b.left, r.left);
      const overlapY = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
      if (overlapX > 1 && overlapY > 1) {
        overlaps.push(
          `${(el.textContent || '').trim().slice(0, 40)} @y=${Math.round(r.top + window.scrollY)}`,
        );
      }
    }
  }

  const heroGroup = document.querySelector('[data-sticky-hero-cta]');
  const heroOnScreen =
    barVisible && heroGroup && visible(heroGroup) && onScreen(heroGroup)
      ? [(heroGroup.textContent || '').trim().slice(0, 40)]
      : [];

  return { ctaOnScreen, barVisible, overlaps, heroOnScreen };
}

const paths = applyFilter(await loadSitemapPaths());
if (!paths.length) {
  console.error('verify-cta: no pages to check (is dist/sitemap-0.xml built?)');
  process.exit(1);
}

console.log(`verify-cta: ${paths.length} pages x 2 viewports against ${BASE}`);

const browser = await chromium.launch();
/** @type {{path: string, viewport: string, rule: string, detail: string}[]} */
const failures = [];
const fail = (path, viewport, rule, detail) => failures.push({ path, viewport, rule, detail });

for (const vp of [DESKTOP, MOBILE]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();

  for (const pathname of paths) {
    /** @type {string[]} */
    const consoleErrors = [];
    const onConsole = (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
    };
    const onPageError = (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 200)}`);
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    try {
      const res = await page.goto(`${BASE}${pathname}`, { waitUntil: 'networkidle', timeout: 45000 });
      if (!res || res.status() >= 400) {
        fail(pathname, vp.label, 'http', `HTTP ${res?.status()}`);
        continue;
      }

      const data = await page.evaluate(COLLECT);

      // 1. A clickable Jobber form link in the body.
      if (data.jobberVisible === 0) {
        fail(
          pathname,
          vp.label,
          'no-jobber-link',
          data.jobberInBody
            ? `${data.jobberInBody} Jobber anchor(s) in body but none visible`
            : 'zero Jobber anchors in body',
        );
      }

      // 3. Review proof high in the document text.
      if (!data.proof) {
        fail(pathname, vp.label, 'no-review-proof', 'no rating or review count found in page text');
      } else if (data.proof.share > PROOF_TEXT_SHARE) {
        fail(
          pathname,
          vp.label,
          'review-proof-too-low',
          `"${data.proof.snippet}" at ${(data.proof.share * 100).toFixed(1)}% of text`,
        );
      }

      // 6. Tap targets.
      if (vp.label === 'mobile') {
        for (const cta of data.ctas) {
          if (cta.inSentence) continue;
          const min = cta.kind === 'button' ? MIN_TAP_PX : MIN_INLINE_TAP_PX;
          if (cta.height + 0.5 < min || cta.width + 0.5 < min) {
            fail(
              pathname,
              vp.label,
              'tap-target',
              `"${cta.text}" ${Math.round(cta.width)}x${Math.round(cta.height)} < ${min} (${cta.kind})`,
            );
          }
        }
      }

      // 7. Explicit image dimensions.
      for (const src of data.imagesMissingDims) {
        fail(pathname, vp.label, 'img-missing-dimensions', src);
      }

      // 8. Responsive candidates on the LCP hero image.
      if (
        data.hero &&
        !/\.svg(\?|$)/i.test(data.hero.src) &&
        !data.hero.srcset &&
        !data.hero.sourceSrcset
      ) {
        fail(pathname, vp.label, 'hero-no-srcset', data.hero.src);
      }

      // 9. Clipped CTA / heading text.
      for (const entry of data.clipped) {
        fail(pathname, vp.label, 'clipped-text', entry);
      }

      if (vp.label === 'mobile') {
        if (data.conversion.length === 0) {
          fail(pathname, vp.label, 'cta-gap', 'no conversion elements on the page');
        }

        // The homepage hero's primary CTA must land above the usable fold.
        if (pathname === '/' && data.heroPrimaryBottom !== null) {
          if (data.heroPrimaryBottom > HERO_PRIMARY_MAX_BOTTOM_PX) {
            fail(
              pathname,
              vp.label,
              'hero-primary-below-fold',
              `primary CTA bottom edge at ${Math.round(data.heroPrimaryBottom)}px > ${HERO_PRIMARY_MAX_BOTTOM_PX}px`,
            );
          }
        }

        // 5. No horizontal scroll.
        if (data.scrollWidth > data.clientWidth) {
          fail(pathname, vp.label, 'horizontal-scroll', `${data.scrollWidth} > ${data.clientWidth}`);
        }

        // One scan of the page answers both the dead-zone rule and the
        // sticky-over-hero rule.
        const samples = [];
        for (let y = 0; y <= data.docHeight; y += SCAN_STEP_PX) {
          await page.evaluate(
            ([top, settle]) =>
              new Promise((resolve) => {
                window.scrollTo(0, top);
                // Two frames plus a short settle: the sticky bar is revealed by
                // an IntersectionObserver, whose callback does not land in the
                // same frame as a jump scroll, and it transitions in.
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => setTimeout(resolve, settle)),
                );
              }),
            [y, STICKY_SETTLE_MS],
          );
          samples.push({ y, ...(await page.evaluate(SAMPLE)) });
        }

        // 2. No stretch longer than MAX_CTA_GAP_PX leaves the visitor with no
        //    conversion control on screen.
        let runStart = null;
        const closeRun = (endY) => {
          if (runStart === null) return;
          const length = endY - runStart;
          if (length > MAX_CTA_GAP_PX) {
            fail(
              pathname,
              vp.label,
              'cta-gap',
              `${Math.round(length)}px with no CTA on screen, from y=${Math.round(runStart)} to y=${Math.round(endY)}`,
            );
          }
          runStart = null;
        };
        for (const sample of samples) {
          if (sample.ctaOnScreen) closeRun(sample.y);
          else if (runStart === null) runStart = sample.y;
        }
        closeRun(data.docHeight);

        // 4a. The bar must never share the screen with a hero CTA.
        const seenHero = new Set();
        for (const sample of samples) {
          for (const hero of sample.heroOnScreen) {
            if (seenHero.has(hero)) continue;
            seenHero.add(hero);
            fail(
              pathname,
              vp.label,
              'sticky-over-hero',
              `bar visible at y=${sample.y} while hero CTA on screen: ${hero}`,
            );
          }
        }

        // 4b. At the end of the document the bar must cover nothing.
        await page.evaluate(
          (settle) =>
            new Promise((resolve) => {
              window.scrollTo(0, document.documentElement.scrollHeight);
              requestAnimationFrame(() =>
                requestAnimationFrame(() => setTimeout(resolve, settle)),
              );
            }),
          STICKY_SETTLE_MS,
        );
        const atBottom = await page.evaluate(SAMPLE);
        for (const hit of atBottom.overlaps) {
          fail(pathname, vp.label, 'sticky-overlap', `covers ${hit} at document bottom`);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }

      // 10. Console errors.
      for (const err of consoleErrors) {
        fail(pathname, vp.label, 'console-error', err);
      }
    } catch (err) {
      fail(pathname, vp.label, 'exception', err.message.slice(0, 200));
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    }
  }

  await context.close();
}

await browser.close();

if (!failures.length) {
  console.log(`verify-cta: PASS — ${paths.length} pages x 2 viewports, 0 violations.`);
  process.exit(0);
}

const byRule = new Map();
for (const f of failures) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

console.error(`\nverify-cta: FAIL — ${failures.length} violation(s)\n`);
for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) {
  console.error(`  ${rule}: ${count}`);
}
console.error('');
for (const f of failures) {
  console.error(`FAIL [${f.rule}] ${f.path} (${f.viewport}): ${f.detail}`);
}
process.exit(1);
