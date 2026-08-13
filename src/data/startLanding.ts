/**
 * Print-QR / general conversion landing (`/start/`).
 *
 * Jobber URLs are the raw Client Hub links from `business.jobber`.
 * Do NOT bake campaign UTMs here. Inbound print UTMs / click IDs on this
 * page are forwarded onto Jobber links at runtime (`curtain-attribution.ts`
 * via `data-curtain-cta`). Outbound links stay plain anchors so GA4’s
 * cross-domain linker can add `_gl`.
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
      'Veteran-owned handyman service in Katy, Cypress, and West Houston. Book a To-Do List Visit, or send photos for remodeling and general contracting estimates.',
  },

  images: {
    hero: {
      src: mediaWallsLanding.images.hero.src,
      alt: mediaWallsLanding.images.hero.alt,
      width: mediaWallsLanding.images.hero.width,
      height: mediaWallsLanding.images.hero.height,
      label: mediaWallsLanding.images.hero.label,
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
  { label: 'High-Ceiling Curtains', href: '/curtain-installation/' },
  { label: 'Media Walls', href: '/services/media-walls/' },
  { label: 'Lighting & Chandeliers', href: '/services/electrical-services/' },
  { label: 'Custom Carpentry', href: '/services/custom-carpentry/' },
  { label: 'Repairs & Installations', href: '/services/repairs-and-maintenance/' },
];

export const startRemodelingHref = '/services/remodeling-and-upgrades/';

export const startAllServicesHref = '/services/';
export const startCurtainsHref = curtainLanding.path;
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
      question: 'Should I book a To-Do List Visit or send photos for an estimate?',
      answer: `Book a Handyman To-Do List Visit (from ${todoFrom}) when you have several smaller repairs, installs, or maintenance tasks for one reserved visit. Send photos for an estimate when the work is larger, unclear from a list, or likely to need materials and a written price first.`,
    },
    {
      question: 'Can I just call instead of booking online?',
      answer:
        'Yes. Call (346) 820-1629 and we will help you choose the right next step. Online booking is available if you prefer to pick a time or send photos without waiting on the phone.',
    },
    {
      question: 'Do you handle remodeling and general contracting?',
      answer:
        'Yes. Larger projects — kitchens, baths, room upgrades, and coordinated work with one point of accountability — start with a photo estimate. That is not a To-Do List Visit. Send photos or use Remodeling & General Contracting on this page.',
    },
    {
      question: 'Do you install high-ceiling curtains?',
      answer: `Yes. High-ceiling curtain rods start at ${rodFrom} and ceiling tracks start at ${trackFrom} (up to three windows). Open High-Ceiling Curtains from the services list on this page to book the dedicated installation.`,
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
