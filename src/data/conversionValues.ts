/**
 * Revenue weightings attached to our own GA4 conversion events.
 *
 * These are BIDDING WEIGHTS, not a valuation of the business and not a promise
 * of revenue. Google Ads' "All conv. value" column is empty unless an event
 * carries a value, which left value-based bidding with nothing to optimise
 * against. The numbers exist so Ads can tell a phone call apart from a
 * submitted estimate request — their ratio matters far more than their
 * absolute size.
 *
 * Derivation, from the Jobber export covering March–September 2026:
 *
 *   157 quotes issued, $54.2k won  ->  $345 average value of a won quote
 *   63% of requests reach the quote stage  ->  $345 x 0.63 = ~$217
 *   rounded down to $200 for a completed request or booking
 *   23% of the people who click through to a form submit it
 *     ->  $200 x 0.23 = $46, rounded to $45 for a click on a CTA or phone number
 *
 * `generate_lead` is deliberately absent. Jobber's hosted form fires it, we do
 * not control its payload, and it stays the unvalued Primary count.
 *
 * Re-derive these when the Jobber numbers move materially; do not nudge them to
 * make a report look better.
 */

/** A request or booking that actually completed on a confirmation page. */
const COMPLETED_REQUEST_USD = 200;

/** An intent click — a phone tap, or a click through to a Jobber form. */
const INTENT_CLICK_USD = 45;

export const CONVERSION_CURRENCY = 'USD';

/**
 * Keyed by GA4 event name, so a call site names the event it is already
 * sending rather than repeating a figure.
 */
export const CONVERSION_VALUES_USD = {
  lead_submit: COMPLETED_REQUEST_USD,
  booking_complete: COMPLETED_REQUEST_USD,
  phone_click: INTENT_CLICK_USD,
  jobber_booking_click: INTENT_CLICK_USD,
} as const;

export type ValuedConversionEvent = keyof typeof CONVERSION_VALUES_USD;

/** Undefined for events we deliberately leave unvalued (e.g. `generate_lead`). */
export function conversionValueUsd(eventName: string): number | undefined {
  return CONVERSION_VALUES_USD[eventName as ValuedConversionEvent];
}
