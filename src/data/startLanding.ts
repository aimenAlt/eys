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

import { business } from './business';
import { curtainLanding, formatUsd as formatUsdWhole } from './curtainLanding';
import { homeImageAlts, homeImages } from './images';
import { mediaWallsLanding } from './mediaWalls';
import { formatUsd as formatUsdExact, smallRepairPricing } from './smallRepairPricing';

export const startLanding = {
  path: '/start/',

  seo: {
    title: 'Start Your Project | EYS Handyman in Katy & West Houston',
    description:
      'Veteran-owned handyman service in Katy, Cypress, and West Houston. Get a quote on any project, request a custom media wall, book high-ceiling curtain installation, or reserve a To-Do List Visit.',
  },

  images: {
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
      curtain: {
        src: curtainLanding.images.proof[1].src,
        alt: curtainLanding.images.proof[1].alt,
        width: curtainLanding.images.proof[1].width,
        height: curtainLanding.images.proof[1].height,
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
  | 'sticky_mobile'
  | 'paths'
  | 'process'
  | 'gallery'
  | 'final_cta'
  | 'faq'
  | 'footer'
  | 'video_builtin'
  | 'video_slat'
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

function rawUrl(value: string | undefined): string | undefined {
  const url = value?.trim();
  return url || undefined;
}

/** Direct Handyman To-Do List Jobber URL (no website UTM rewrite). */
export function startTodoListJobberUrl(): string | undefined {
  return rawUrl(business.jobber.handymanToDoListFormUrl);
}

/** Direct project-estimate Jobber URL (no website UTM rewrite). */
export function startProjectEstimateJobberUrl(): string | undefined {
  return rawUrl(business.jobber.projectEstimateFormUrl);
}

/** Direct TV-mounting Jobber URL (no website UTM rewrite). */
export function startTvMountingJobberUrl(): string | undefined {
  return rawUrl(business.jobber.onlineBookingUrl);
}

export function startJobberUrl(service: StartJobberService): string | undefined {
  if (service === 'tv_mounting') return startTvMountingJobberUrl();
  if (service === 'todo_list') return startTodoListJobberUrl();
  return startProjectEstimateJobberUrl();
}

export function todoListFromPrice(): string {
  return formatUsdExact(smallRepairPricing.oneHour);
}

export function curtainRodFromPrice(): string {
  return formatUsdWhole(curtainLanding.pricing.highCeiling.rod.startingAt);
}

export function curtainTrackFromPrice(): string {
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
        'Yes. Call (346) 820-1629 and we will help you choose the right next step. Online booking is available if you prefer to pick a time or send photos without waiting on the phone.',
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
        'Elevate Your Space is veteran-owned and locally operated, serving Katy, Cypress, Fulshear, Richmond, and West Houston.',
    },
    {
      question: 'I scanned the QR on your letter. What happens next?',
      answer:
        'This page is the start of the project. Call, choose a booking path, or send photos for an estimate. If you came from a printed ad, your selection still reaches us with that context attached.',
    },
  ];
}
