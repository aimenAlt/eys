/**
 * Forward inbound UTMs / paid click IDs (gclid, gbraid, wbraid, fbclid, …) onto
 * every outbound Jobber link and Jobber embed on the site.
 *
 * Loaded site-wide via `conversion-analytics.ts` (BaseLayout). It used to live in
 * `curtain-attribution.ts` and only ran on four pages against links tagged
 * `data-curtain-cta`, which silently dropped attribution on `/`, `/book/`,
 * `/contact/`, `/services/handyman-to-do-list/`, `/services/tv-mounting/`, and
 * `/services/picture-hanging-floating-shelves/`. Matching on the Jobber host
 * instead of an opt-in attribute means new CTAs are covered by default.
 */
import {
  readAttributionParams,
  withAttributionParams,
  withLandingPage,
  type AttributionParams,
} from '../utils/utm';

const SESSION_KEY = 'eys_attribution_v1';
/** Superseded key — still read so a visit already in flight keeps its attribution. */
const LEGACY_SESSION_KEY = 'eys_curtain_attribution_v1';

/**
 * Only real booking/estimate links — `/hubs/<hub-id>/public/requests/<form-id>/new`.
 * A host-only match also caught `getjobber.com/privacy-policy/` (linked from
 * `/privacy/`), which is not a booking link and got attribution params stamped
 * onto it regardless.
 */
const JOBBER_LINK_SELECTOR = 'a[href*="getjobber.com"][href*="/public/requests/"]';

interface StoredSession {
  attribution: AttributionParams;
  /** Path this browser session first landed on. Recorded once, then left alone. */
  landingPath?: string;
}

function readStoredSession(): StoredSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSession> & AttributionParams;
      if (parsed && typeof parsed === 'object') {
        // Current shape carries `attribution` + `landingPath`. A session stored
        // before that shape shipped is a flat AttributionParams object with no
        // `attribution` key — treat the whole thing as attribution rather than
        // drop it mid-visit during rollout.
        if (parsed.attribution && typeof parsed.attribution === 'object') {
          return { attribution: parsed.attribution, landingPath: parsed.landingPath };
        }
        return { attribution: parsed as AttributionParams };
      }
    }
  } catch {
    /* private mode / malformed — fall through */
  }
  try {
    const raw = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AttributionParams;
      if (parsed && typeof parsed === 'object') return { attribution: parsed };
    }
  } catch {
    /* private mode / malformed — fall through */
  }
  return { attribution: {} };
}

function writeStoredSession(session: StoredSession): void {
  if (!Object.keys(session.attribution).length && !session.landingPath) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* private mode / quota — ignore */
  }
}

/**
 * Read + merge inbound attribution and the first-landing path, filling in the
 * landing path on the first call of the session and leaving it untouched after.
 * Inbound URL params win over the stored attribution; the session fills gaps
 * once the visitor navigates on.
 */
function ensureSession(): StoredSession {
  const stored = readStoredSession();
  const attribution = { ...stored.attribution, ...readAttributionParams(window.location.search) };
  let landingPath = stored.landingPath;
  if (!landingPath) {
    try {
      landingPath = window.location.pathname;
    } catch {
      landingPath = undefined;
    }
  }
  const session: StoredSession = { attribution, landingPath };
  writeStoredSession(session);
  return session;
}

export function currentAttribution(): AttributionParams {
  return ensureSession().attribution;
}

/**
 * The path this browser session first landed on — read by `decorateJobberLinks`
 * to stamp `eys_lp` on outbound Jobber links, so a lead can be traced back to
 * the page that actually earned the click, not just wherever the request form
 * happened to sit.
 */
export function firstLandingPath(): string {
  return ensureSession().landingPath ?? '';
}

/** Copy the visit's attribution and landing page onto a Jobber URL. Safe to call with anything. */
export function withJobberAttribution(url: string): string {
  const attribution = currentAttribution();
  const decorated = Object.keys(attribution).length
    ? withAttributionParams(url, attribution)
    : url;
  const landingPath = firstLandingPath();
  return landingPath ? withLandingPage(decorated, landingPath) : decorated;
}

export function decorateJobberLinks(): void {
  const attribution = currentAttribution();
  const landingPath = firstLandingPath();
  const hasAttribution = Object.keys(attribution).length > 0;
  if (!hasAttribution && !landingPath) return;

  document.querySelectorAll<HTMLAnchorElement>(JOBBER_LINK_SELECTOR).forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    // Decorate from the clean base captured on first pass so repeat runs stay idempotent.
    const base = link.dataset.jobberBaseHref || href;
    if (!link.dataset.jobberBaseHref) {
      link.dataset.jobberBaseHref = base;
    }
    const withAttribution = hasAttribution ? withAttributionParams(base, attribution) : base;
    link.href = landingPath ? withLandingPage(withAttribution, landingPath) : withAttribution;
  });
}
