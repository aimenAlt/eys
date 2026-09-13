import { formatUsd } from './todoList';

/**
 * Observed build range for a custom media wall, in USD.
 *
 * Ships as `null` on purpose: nothing on the page may quote a range until Eyad
 * confirms real numbers. While it is null the price block and the cost FAQ are
 * omitted entirely — no placeholder, no "starting at", no invented figure.
 * Set both ends to switch them on; nothing else needs to change.
 */
export const mediaWallPriceRange: { low: number; high: number } | null = null;

/** Visible price copy, or `undefined` while the range is unconfirmed. */
export function mediaWallPriceCopy(): string | undefined {
  if (!mediaWallPriceRange) return undefined;
  const { low, high } = mediaWallPriceRange;
  return `Most media walls we build run ${formatUsd(low)}–${formatUsd(high)} depending on size, fireplace and lighting. Send photos of your wall and we'll give you a written estimate.`;
}
