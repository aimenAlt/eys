/**
 * Curtain installation pricing — the single source for every curtain figure on
 * the site. `curtainLanding.pricing` reads from here; nothing else should
 * hardcode a curtain price.
 *
 * INSTALLATION LABOR ONLY. The customer supplies the rod, track, and curtains —
 * never word a price so it implies EYS sells the hardware.
 */
export const curtainPricing = {
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
} as const;
