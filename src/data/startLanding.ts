/**
 * Print-QR / general conversion landing (`/start/`).
 *
 * Jobber URLs are the raw Client Hub links from `business.jobber`.
 * Do NOT bake campaign UTMs here. Inbound print UTMs / click IDs on this
 * page are forwarded onto Jobber links at runtime (`curtain-attribution.ts`
 * via `data-curtain-cta`). Outbound links stay plain anchors so GA4’s
 * cross-domain linker can add `_gl`.
 *
 * Media Wall and High-Ceiling Curtain paths reuse the standalone landing
 * pages’ own CTA components (`MediaWallEstimateLink`, `CurtainBookLink`) so
 * their Jobber URLs, booking types, and attribution forwarding stay in one
 * place. Do not add a third way to link to those forms.
 */

import {
  areaServedDisplay,
  googleReviewCountDisplay,
  googleReviews,
  jobberHandymanToDoListFormUrl,
  jobberOnlineBookingUrl,
  jobberStartProjectEstimateFormUrl,
  site,
} from './business';
import { curtainLanding, formatUsd as formatUsdWhole } from './curtainLanding';
import { homeImageAlts, homeImages } from './images';
import { mediaWallsLanding } from './mediaWalls';
import { activeOffers, offers } from './offers';
import { formatUsd as formatUsdExact, smallRepairPricing } from './pricing/todoList';

export const startLanding = {
  path: '/start/',

  seo: {
    title: 'Handyman in Katy & West Houston | Elevate Your Space Handyman',
    // Review rating, count and price all render from their single sources in
    // business.ts / smallRepairPricing.ts. Never hardcode a figure here.
    // Cinco Ranch is deliberate community-tier targeting, not drift — keep it.
    // Trimmed to ~145 chars for link previews; /start/ is noindexed, so this was
    // never a search-result truncation issue.
    description:
      `Veteran-owned, insured handyman in Katy, Cinco Ranch and Cypress. ` +
      `To-Do List visits from ${formatUsdWhole(smallRepairPricing.oneHour)} the first hour. ` +
      `Rated ${googleReviews.rating.toFixed(1)} from ${googleReviewCountDisplay()} Google reviews.`,
  },

  images: {
    /**
     * The page's OG / link-preview image. It no longer leads the hero — that
     * now opens with `videos.builtIn`, the same media wall footage that leads
     * `/services/media-walls/` — so this frame renders further down in
     * StartVideoBuiltIn instead. The two traded places.
     */
    hero: {
      src: mediaWallsLanding.images.hero.src,
      alt: mediaWallsLanding.images.hero.alt,
      width: mediaWallsLanding.images.hero.width,
      height: mediaWallsLanding.images.hero.height,
      label: mediaWallsLanding.images.hero.label,
    },
    /**
     * Photo for the High-Ceiling Curtain card in the chooser. Deliberately a
     * different frame from `proof` below so the chooser and the gallery directly
     * beneath it do not show the same photo twice. The Media Wall card uses the
     * slat-console video instead of a still.
     */
    pathCards: {
      /**
       * All four chooser cards carry a media band so the row stays even —
       * without one the two text-only cards started their headings 160px above
       * the others. Each frame is deliberately absent from the rest of `/start/`
       * (the proof gallery, the video sections, the general-contracting block)
       * so the page never shows the same room twice.
       */
      generalQuote: {
        src: '/images/projects/curved-stair-paneling/eys-trim-carpentry-curved-stair-fluted-wall-paneling-after-p011-07.jpg',
        alt: 'Curved staircase with light-gray fluted wall paneling and dark wood handrail.',
        width: 3000,
        height: 4000,
      },
      curtain: {
        src: curtainLanding.images.proof[1].src,
        alt: curtainLanding.images.proof[1].alt,
        width: curtainLanding.images.proof[1].width,
        height: curtainLanding.images.proof[1].height,
      },
      todoList: {
        src: '/images/projects/navy-office-builtins/eys-door-repair-installation-french-doors-sidelights-transom-after-p006-02.jpg',
        alt: 'White French doors with sidelights, transom, and fluted casing opening to a navy office.',
        width: 3000,
        height: 4000,
      },
    },
    proof: [
      {
        src: '/images/services/media-walls/fireplace-niches.jpg',
        alt: 'Custom floor-to-ceiling media wall with recessed TV, linear fireplace, and lit niches',
        width: 1200,
        height: 1600,
        label: 'Media Wall & Fireplace',
      },
      {
        src: homeImages.hero,
        alt: homeImageAlts.hero,
        width: 1600,
        height: 1200,
        label: 'Kitchen Remodel · General Contracting',
      },
      {
        src: curtainLanding.images.proof[0].src,
        alt: curtainLanding.images.proof[0].alt,
        width: curtainLanding.images.proof[0].width,
        height: curtainLanding.images.proof[0].height,
        label: 'High-Ceiling Curtains',
      },
    ],
    videos: {
      /** Leads the hero. Do not also render it lower on the page. */
      builtIn: mediaWallsLanding.images.videos.builtIn,
      slat: mediaWallsLanding.images.videos.slat,
      builtInStill: {
        src: '/images/services/media-walls/marble-wood-slat.jpg',
        alt: 'Floor-to-ceiling marble-look tile feature wall flanked by dark vertical wood slats',
        width: 1200,
        height: 1600,
        label: 'Marble & Wood-Slat Feature Wall',
      },
    },
    generalContracting: {
      src: '/images/categories/remodeling.jpg',
      alt: 'Blue kitchen island and window-seat cabinetry remodel with open living space beyond',
      width: 1600,
      height: 1200,
      label: 'Kitchen Remodel · General Contracting',
    },
  },
} as const;

export type StartCtaPlacement =
  | 'header'
  | 'hero'
  /**
   * The two dark offer tiles inside the hero — clickable straight to a form.
   * `hero_offer` is the retired shared tag, kept so historical GA4 data still
   * resolves; the two tiles now report separately.
   */
  | 'hero_offer'
  | 'hero_offer_quote'
  | 'hero_offer_todo'
  | 'sticky_mobile'
  /** Section-level fallback for the chooser's detail links. */
  | 'paths'
  /** One placement per chooser card so the four booking paths report apart. */
  | 'paths_general'
  | 'paths_todo'
  | 'process'
  | 'gallery'
  | 'final_cta'
  | 'faq'
  | 'footer'
  | 'video_builtin'
  | 'video_slat'
  /* Caption CTAs sit inside the video sections above; separate placements keep
     them distinguishable from the section's main button in GA4. */
  | 'video_builtin_caption'
  | 'video_slat_caption'
  | 'general_contracting';

export type StartJobberService = 'todo_list' | 'project_estimate' | 'custom_project' | 'tv_mounting';

export type StartServicePill = {
  label: string;
  href: string;
  emphasize?: boolean;
};

export const startServicePills: readonly StartServicePill[] = [
  { label: 'Remodeling & General Contracting', href: '/services/remodeling-and-upgrades/', emphasize: true },
  { label: 'TV Mounting', href: '/services/tv-mounting/' },
  { label: 'High-Ceiling Curtains', href: '/curtain-installation/', emphasize: true },
  { label: 'Media Walls', href: '/services/media-walls/', emphasize: true },
  { label: 'Lighting & Chandeliers', href: '/services/electrical-services/' },
  { label: 'Custom Carpentry', href: '/services/custom-carpentry/' },
  { label: 'Repairs & Installations', href: '/services/repairs-and-maintenance/' },
];

export const startRemodelingHref = '/services/remodeling-and-upgrades/';

export const startAllServicesHref = '/services/';
export const startCurtainsHref = curtainLanding.path;
export const startMediaWallsHref = mediaWallsLanding.path;
export const startTodoListHref = '/services/handyman-to-do-list/';
export const startPathsHash = '#start-paths';

/** Handyman To-Do List Jobber URL, labelled `eys_form=todo-list`. */
export function startTodoListJobberUrl(): string | undefined {
  return jobberHandymanToDoListFormUrl();
}

/**
 * Project-estimate Jobber URL for `/start/`, labelled
 * `eys_form=project-estimate-start`.
 *
 * Deliberately a DIFFERENT Jobber form from the sitewide one. `/start/` is the
 * flyer / magazine-ad QR landing page, and its leads were indistinguishable
 * from sitewide estimate requests in GA4 because both forms and both
 * confirmation pages were shared. This accessor and the `start-landing/*`
 * components that call it are used by `/start/` and nothing else, so the
 * override stays page-local: the homepage and the service pages keep
 * `jobberProjectEstimateFormUrl()`.
 */
export function startProjectEstimateJobberUrl(): string | undefined {
  return jobberStartProjectEstimateFormUrl();
}

/** TV-mounting Jobber URL, labelled `eys_form=tv-mounting-booking`. */
export function startTvMountingJobberUrl(): string | undefined {
  return jobberOnlineBookingUrl();
}

export function startJobberUrl(service: StartJobberService): string | undefined {
  if (service === 'tv_mounting') return startTvMountingJobberUrl();
  if (service === 'todo_list') return startTodoListJobberUrl();
  return startProjectEstimateJobberUrl();
}

export function todoListFromPrice(): string {
  return formatUsdExact(smallRepairPricing.oneHour);
}

/**
 * True while `offers.highCeilingCurtains` is one of the live offers — read
 * through `activeOffers()` rather than the constant's own `.active` flag so
 * this stays in step with whatever that function treats as active.
 */
function highCeilingCurtainOfferIsActive(): boolean {
  return activeOffers().some((offer) => offer.id === offers.highCeilingCurtains.id);
}

/**
 * Rods-installed starting price for the chooser card and FAQ copy. Shows the
 * live `$200 off` offer price while it is active (see `offers.ts`), and falls
 * back to the static list price automatically once the offer expires —
 * neither figure is ever hand-typed here.
 */
export function curtainRodFromPrice(): string {
  if (highCeilingCurtainOfferIsActive()) {
    const rodRow = offers.highCeilingCurtains.rows.find(
      (row) => row.label === curtainLanding.pricing.highCeiling.rod.label,
    );
    if (rodRow) return rodRow.nowFormatted;
  }
  return formatUsdWhole(curtainLanding.pricing.highCeiling.rod.startingAt);
}

/** Tracks-installed starting price — same live-offer/fallback rule as above. */
export function curtainTrackFromPrice(): string {
  if (highCeilingCurtainOfferIsActive()) {
    const trackRow = offers.highCeilingCurtains.rows.find(
      (row) => row.label === curtainLanding.pricing.highCeiling.track.label,
    );
    if (trackRow) return trackRow.nowFormatted;
  }
  return formatUsdWhole(curtainLanding.pricing.highCeiling.track.startingAt);
}

export function startFaqs() {
  const todoFrom = todoListFromPrice();
  const rodFrom = curtainRodFromPrice();
  const trackFrom = curtainTrackFromPrice();
  return [
    {
      question: 'Which starting option should I choose?',
      answer: `Choose a General Quote for any project you want priced — repairs, upgrades, remodeling, or something that does not fit a category. Choose Media Walls for a custom TV, fireplace, or feature wall. Choose High-Ceiling Curtains to pick an installation time yourself. Choose a Handyman To-Do List Visit (from ${todoFrom}) when you have several smaller repairs, installs, or maintenance tasks for one reserved visit.`,
    },
    {
      question: 'What if my project does not fit one of these?',
      answer:
        'Use General Quote. We take on all types of jobs, big or small. Send photos and a short description, and we will confirm the right next step.',
    },
    {
      question: 'Can I just call instead of booking online?',
      answer:
        `Yes. Call ${site.phone} and we will help you choose the right next step. Online booking is available if you prefer to pick a time or send photos without waiting on the phone.`,
    },
    {
      question: 'Do you handle remodeling and general contracting?',
      answer:
        'Yes. Kitchens, baths, room upgrades, and coordinated work with one point of accountability. That is not a To-Do List Visit — start with a General Quote, or use the Remodeling & General Contracting section on this page.',
    },
    {
      question: 'Do you build custom media walls?',
      answer:
        'Yes. Custom media walls, fireplace TV walls, wood-slat feature walls, and finished entertainment centers. Choose Media Walls above to send photos of the room and start a design consultation.',
    },
    {
      question: 'Do you install high-ceiling curtains?',
      answer: `Yes, and you can book it yourself. We install high-ceiling rods from ${rodFrom} and ceiling tracks from ${trackFrom} (up to three windows). You provide the rod, track, and curtains; we bring the access equipment and do the work. Choose High-Ceiling Curtains above to see available times and book.`,
    },
    {
      question: 'What areas do you serve?',
      answer:
        `Elevate Your Space is veteran-owned and locally operated, serving ${areaServedDisplay()}.`,
    },
    {
      question: 'I scanned the QR on your letter. What happens next?',
      answer:
        'This page is the start of the project. Call, choose a booking path, or send photos for an estimate. If you came from a printed ad, your selection still reaches us with that context attached.',
    },
  ];
}
