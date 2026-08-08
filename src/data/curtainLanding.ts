/**
 * High-ceiling curtain installation Google Ads landing page (`/curtain-installation/`).
 *
 * Jobber booking URLs — paste the live Client Hub online-booking form links below.
 * Keep them here only; components read via the getters so URLs are not scattered.
 *
 * Do NOT hard-code campaign UTMs into components. Inbound UTMs / click IDs on this
 * page are forwarded onto Jobber links at runtime (`curtain-attribution.ts`).
 * Outbound links stay plain anchors so GA4’s cross-domain linker can add `_gl`.
 */

export const curtainLanding = {
  path: '/curtain-installation/',

  /**
   * High-ceiling Jobber online booking form.
   * One form covers both curtain rods and curtain tracks (customer chooses inside Jobber).
   */
  highCeilingJobberUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/5061244/new' as string,

  /**
   * Standard / regular-ceiling (≤11 ft) Jobber online booking form.
   * Separate form from high-ceiling — not a rod-vs-track split.
   */
  regularCeilingJobberUrl:
    'https://clienthub.getjobber.com/hubs/d0bd2223-f10c-4cda-a73e-02a65e730a50/public/requests/5061268/new' as string,

  pricing: {
    highCeiling: {
      rod: {
        label: 'Curtain rods',
        startingAt: 799,
        includedWindows: 3,
        additionalWindow: 250,
      },
      track: {
        label: 'Curtain tracks',
        startingAt: 1199,
        includedWindows: 3,
        additionalWindow: 349,
      },
    },
    /** Regular-height = half the high-ceiling tier (recorded pricing). */
    regularCeiling: {
      rod: {
        label: 'Curtain rods',
        startingAt: 399,
        includedWindows: 3,
        additionalWindow: 125,
      },
      track: {
        label: 'Curtain tracks',
        startingAt: 599,
        includedWindows: 3,
        additionalWindow: 175,
      },
    },
  },

  highCeilingThresholdFt: 11,

  images: {
    hero: {
      src: '/images/curtain-installation/hero-double-height-sheers.jpg',
      alt: 'Two-story living room with floor-to-ceiling sheer curtains installed on tall windows',
      width: 1200,
      height: 1600,
      label: 'Two-Story Curtain Installation',
    },
    proof: [
      {
        src: '/images/curtain-installation/hero-double-height-sheers.jpg',
        alt: 'Floor-to-ceiling sheer white curtains spanning a double-height living-room wall',
        width: 1200,
        height: 1600,
        label: 'Two-Story Curtain Installation',
      },
      {
        src: '/images/curtain-installation/proof-floor-to-ceiling-drapes.jpg',
        alt: 'Floor-to-ceiling color-block drapes on tall living-room windows',
        width: 1400,
        height: 1866,
        label: 'Tall Living Room Installation',
      },
      {
        src: '/images/curtain-installation/proof-curved-window-panels.jpg',
        alt: 'Long curtain panels on decorative rods above a curved two-tier window wall',
        width: 1400,
        height: 1866,
        label: 'High-Ceiling Curtain Rod Installation',
      },
    ],
  },
} as const;

export type CurtainCtaPlacement =
  | 'header'
  | 'hero'
  | 'sticky_mobile'
  | 'pricing'
  | 'process'
  | 'gallery'
  | 'final_cta'
  | 'regular_escape'
  | 'faq';

function rawUrl(value: string | undefined): string | undefined {
  const url = value?.trim();
  return url || undefined;
}

/** Direct high-ceiling Jobber booking URL (no website UTM rewrite). */
export function highCeilingJobberUrl(): string | undefined {
  return rawUrl(curtainLanding.highCeilingJobberUrl);
}

/** Direct regular-ceiling Jobber booking URL (no website UTM rewrite). */
export function regularCeilingJobberUrl(): string | undefined {
  return rawUrl(curtainLanding.regularCeilingJobberUrl);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Conversion-focused FAQs (also used for FAQPage schema). Card-on-file policy omitted — no approved explanation in repo. */
export function curtainFaqs() {
  const { pricing, highCeilingThresholdFt } = curtainLanding;
  const hc = pricing.highCeiling;
  const rc = pricing.regularCeiling;
  return [
    {
      question: 'What counts as a high-ceiling installation?',
      answer: `Any curtain rod or track installation above ${highCeilingThresholdFt} ft should use the High-Ceiling Installation booking option.`,
    },
    {
      question: 'Do I need to purchase my curtains before booking?',
      answer:
        'Yes. Customers should have their curtains/drapery and installation system ready before the appointment.',
    },
    {
      question: 'Do I need to purchase the rod or track?',
      answer:
        'Yes. Have the rod, track, and associated installation hardware available before the appointment.',
    },
    {
      question: 'Can you install ceiling-mounted curtain tracks?',
      answer:
        'Yes. We install curtain rods, drapery hardware, and related systems including traverse and ceiling-mounted track setups when the hardware is provided.',
    },
    {
      question: 'How many windows does the starting price include?',
      answer: `High-ceiling curtain rods: up to ${hc.rod.includedWindows} windows starting at ${formatUsd(hc.rod.startingAt)} (+${formatUsd(hc.rod.additionalWindow)} each additional). High-ceiling curtain tracks: up to ${hc.track.includedWindows} windows starting at ${formatUsd(hc.track.startingAt)} (+${formatUsd(hc.track.additionalWindow)} each additional). Both options book through the same high-ceiling form.`,
    },
    {
      question: 'Can I choose my installation time online?',
      answer:
        'Yes. Clicking the booking button opens the EYS Jobber booking experience, where available appointment times can be selected. Rod vs track is chosen inside that booking form.',
    },
    {
      question: `What if my ceilings are ${highCeilingThresholdFt} ft or lower?`,
      answer: `Use the Standard Ceiling booking form instead. Regular-height rods start at ${formatUsd(rc.rod.startingAt)} (up to ${rc.rod.includedWindows} windows; +${formatUsd(rc.rod.additionalWindow)} each additional). Regular-height tracks start at ${formatUsd(rc.track.startingAt)} (up to ${rc.track.includedWindows} windows; +${formatUsd(rc.track.additionalWindow)} each additional).`,
    },
  ];
}
