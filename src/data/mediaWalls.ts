/**
 * Custom Media Walls landing page (`/services/media-walls/`).
 *
 * Jobber estimate URL lives here; components read via getters.
 * Inbound UTMs / click IDs are forwarded at runtime (curtain-attribution.ts
 * via data-curtain-cta="media_wall").
 */

export const mediaWallsLanding = {
  path: '/services/media-walls/',

  /** Media Wall Design Consultation questionnaire (not a scheduled appointment). */
  estimateJobberUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/5067435/new' as string,

  seo: {
    title: 'Custom Media Walls in Katy & West Houston | EYS Handyman',
    description:
      'Custom media walls, fireplace TV walls, wood-slat feature walls, and finished entertainment centers in Katy and West Houston. Request a project estimate.',
  },

  images: {
    /** Strongest finished-room lifestyle shot leads the page. */
    hero: {
      src: '/images/services/media-walls/lit-shelves-living-room.jpg',
      alt: 'High-ceiling living room with marble media wall, lit floating shelves, and mounted TV',
      width: 684,
      height: 1024,
      label: 'Marble Wall with Lit Shelves',
    },
    /** Distinct from hero — strongest build detail first; empty feature wall secondary. */
    proof: [
      {
        src: '/images/services/media-walls/fireplace-niches.jpg',
        alt: 'Custom floor-to-ceiling media wall with recessed TV, linear fireplace, and lit niches',
        width: 1200,
        height: 1600,
        label: 'TV, Fireplace & Lit Niches',
      },
      {
        src: '/images/services/media-walls/marble-wood-slat.jpg',
        alt: 'Floor-to-ceiling marble-look tile feature wall flanked by dark vertical wood slats',
        width: 1200,
        height: 1600,
        label: 'Marble & Wood-Slat Feature Wall',
      },
    ],
    videos: {
      builtIn: {
        src: '/images/services/media-walls/vertical.mp4',
        poster: '/images/services/media-walls/vertical-poster.jpg',
        width: 480,
        height: 848,
        label: 'Custom media wall with fireplace and lit niches',
      },
      slat: {
        src: '/images/services/media-walls/slat-console.mp4',
        poster: '/images/services/media-walls/slat-console-poster.jpg',
        width: 640,
        height: 360,
        label: 'Slat wall media setup with floating console',
      },
    },
  },

  included: {
    eysProvides: [
      'Custom built-in media walls and niche systems',
      'Wood-slat and mixed-material feature walls',
      'TV placement planning with clean cable paths',
      'Fireplace media-wall integration when scoped',
      'Floating consoles, shelving, and finish details',
      'Floor protection, detailing, and clean completion',
    ],
    youProvide: [
      'Wall photos and rough room dimensions',
      'TV size / fireplace model if already purchased',
      'Inspiration images for the look you want',
      'Access to the room on build days',
    ],
  },

  process: [
    {
      number: '1',
      title: 'Send Project Photos',
      body: 'Share wall photos, approximate dimensions, and any inspiration images.',
    },
    {
      number: '2',
      title: 'Get a Clear Estimate',
      body: 'We review scope, materials, and sequencing — then send next steps.',
    },
    {
      number: '3',
      title: 'Build & Finish',
      body: 'We protect floors, build the wall, detail the finish, and walk through the result.',
    },
  ],

  why: [
    'Real custom media-wall builds — not just a TV bracket on drywall',
    'Carpentry, drywall, and licensed electrical coordinated under one estimate',
    'Clean TV integration, cable paths, and finish details planned together',
    'Fireplace, niche, and slat-wall experience in Bridgeland, Towne Lake, Cross Creek Ranch, and Cane Island homes',
    'Veteran-owned, owner-led craftsmanship based in Katy',
    'Respect for your home — careful protection and clean completion',
    'Clear project estimates before work begins',
  ],
} as const;

export type MediaWallCtaPlacement =
  | 'header'
  | 'hero'
  | 'sticky_mobile'
  | 'proof'
  | 'process'
  | 'video_builtin'
  | 'video_slat'
  | 'final_cta'
  | 'faq';

function rawUrl(value: string | undefined): string | undefined {
  const url = value?.trim();
  return url || undefined;
}

export function mediaWallEstimateJobberUrl(): string | undefined {
  return rawUrl(mediaWallsLanding.estimateJobberUrl);
}

export function mediaWallFaqs() {
  return [
    {
      question: 'Is a media wall the same as TV mounting?',
      answer:
        'No. TV mounting is a focused install of a bracket and display. A media wall is a custom feature build — carpentry, finishes, niches, lighting, and often fireplace or console integration around the TV.',
    },
    {
      question: 'Do I need to purchase the TV and fireplace first?',
      answer:
        'It helps. Knowing TV size and fireplace model early lets us lock niche openings, clearances, and cable paths so the finished wall fits the equipment you already own or plan to buy.',
    },
    {
      question: 'Can you match our existing trim and paint?',
      answer:
        'Yes. We plan reveals, base, and paint or stain finishes to sit cleanly with your room rather than looking like an add-on panel.',
    },
    {
      question: 'How do estimates work?',
      answer:
        'Media walls are custom projects. Send photos and a short description of what you want; we review the scope and return next steps with a project estimate — not a one-size booking price.',
    },
    {
      question: 'Do you serve Katy and West Houston?',
      answer:
        'Yes. Elevate Your Space serves Katy, Cypress, Fulshear, Richmond, and nearby West Houston communities.',
    },
  ] as const;
}
