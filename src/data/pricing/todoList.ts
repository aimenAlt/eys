/**
 * Handyman To-Do List Visit labor pricing — single source of truth for UI, calculator, and schema.
 * Lives in `src/data/pricing/` with every other price on the site; service copy
 * and FAQs stay in the matching `src/data/*.ts` content file.
 * Do not invent a 90-minute (1.5h) price; approved options start at 1h, then 2h+.
 *
 * The three-hour tier is a deliberate flat round-number rate ($399), not
 * twoHours + two 30-minute blocks. Time beyond a booked tier is billed at
 * additionalThirtyMinutes stepping from whichever tier the customer landed on:
 * 2.5h = twoHours + 1 block, 3.5h = threeHours + 1 block, 4h = threeHours + 2 blocks.
 * Do not "correct" the 3h price to be additive.
 */
export const smallRepairPricing = {
  oneHour: 175,
  twoHours: 299,
  threeHours: 399,
  additionalThirtyMinutes: 60,
  currency: 'USD',
} as const;

/** Approved selectable visit lengths in hours. */
export const visitDurationHours = [1, 2, 2.5, 3, 3.5, 4] as const;

export type VisitDurationHours = (typeof visitDurationHours)[number];

export function formatUsd(amount: number): string {
  const hasCents = !Number.isInteger(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: smallRepairPricing.currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * How a duration decomposes into a booked tier plus extra 30-minute blocks.
 *
 * Exported because anything that prices a duration *differently* from list
 * price — a percentage promotion, for example — has to know which part of the
 * total is the booked tier and which part is additional time. Offers discount
 * the tier only; additional blocks bill at the standard rate. Re-deriving that
 * split at the call site is how an offer ends up advertising a number the
 * fine print contradicts.
 */
export type VisitPriceBreakdown = {
  /** The tier the customer actually books: 1, 2, or 3 hours. */
  tierHours: 1 | 2 | 3;
  /** Flat price of that tier. */
  tierPrice: number;
  /** Extra 30-minute blocks stacked on top of the tier. */
  additionalBlocks: number;
  /** tierPrice + additionalBlocks * additionalThirtyMinutes. */
  total: number;
};

export function visitPriceBreakdown(hours: number): VisitPriceBreakdown {
  if (hours === 1) {
    return {
      tierHours: 1,
      tierPrice: smallRepairPricing.oneHour,
      additionalBlocks: 0,
      total: smallRepairPricing.oneHour,
    };
  }
  if (hours < 2) {
    throw new Error(
      `Unsupported Handyman To-Do List Visit duration: ${hours}h. Use 1 hour, or 2 hours and above.`,
    );
  }

  const tierHours: 2 | 3 = hours >= 3 ? 3 : 2;
  const tierPrice =
    tierHours === 3 ? smallRepairPricing.threeHours : smallRepairPricing.twoHours;
  const additionalBlocks = Math.round((hours - tierHours) / 0.5);

  return {
    tierHours,
    tierPrice,
    additionalBlocks,
    total: tierPrice + additionalBlocks * smallRepairPricing.additionalThirtyMinutes,
  };
}

/**
 * Labor price for an approved duration.
 * Tiers: 1h, 2h, and a flat 3h rate. Time past a tier adds 30-minute blocks
 * from that tier's price.
 */
export function priceForHours(hours: number): number {
  return visitPriceBreakdown(hours).total;
}

export function formatDurationLabel(hours: number): string {
  if (hours === 1) return '1 Hour';
  if (Number.isInteger(hours)) return `${hours} Hours`;
  return `${hours} Hours`;
}

export type VisitDurationOption = {
  hours: VisitDurationHours;
  label: string;
  price: number;
  priceFormatted: string;
};

export const visitDurationOptions: VisitDurationOption[] = visitDurationHours.map(
  (hours) => {
    const price = priceForHours(hours);
    return {
      hours,
      label: formatDurationLabel(hours),
      price,
      priceFormatted: formatUsd(price),
    };
  },
);

export const additionalTimeLabel = `${formatUsd(smallRepairPricing.additionalThirtyMinutes)} per additional 30 minutes`;
