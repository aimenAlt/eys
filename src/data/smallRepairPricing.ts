/**
 * Handyman To-Do List Visit labor pricing — single source of truth for UI, calculator, and schema.
 * Do not invent a 90-minute (1.5h) price; approved options start at 1h, then 2h+.
 */
export const smallRepairPricing = {
  oneHour: 224.99,
  twoHours: 349.99,
  additionalThirtyMinutes: 65,
  currency: 'USD',
} as const;

/** Approved selectable visit lengths in hours. */
export const visitDurationHours = [1, 2, 2.5, 3, 3.5, 4] as const;

export type VisitDurationHours = (typeof visitDurationHours)[number];

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: smallRepairPricing.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Labor price for an approved duration.
 * After two hours: twoHourPrice + (additional 30-minute blocks × additionalThirtyMinutes).
 */
export function priceForHours(hours: number): number {
  if (hours === 1) return smallRepairPricing.oneHour;
  if (hours < 2) {
    throw new Error(
      `Unsupported Handyman To-Do List Visit duration: ${hours}h. Use 1 hour, or 2 hours and above.`,
    );
  }
  if (hours === 2) return smallRepairPricing.twoHours;
  const additionalBlocks = Math.round((hours - 2) / 0.5);
  return (
    smallRepairPricing.twoHours +
    additionalBlocks * smallRepairPricing.additionalThirtyMinutes
  );
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
