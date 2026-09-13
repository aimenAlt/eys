/**
 * Live promotional offers — the SINGLE SOURCE for every discount figure on the
 * site, in Google Business Profile Offer posts, and in any ad creative.
 *
 * Rules this file exists to enforce:
 *  - No discounted price is ever hand-typed. Every figure below is DERIVED from
 *    `src/data/pricing/*` so a list-price change can never leave a stale "was"
 *    number stranded in copy (rule #43 — do not assume older prices remain valid).
 *  - Offers live as ANCHORED SECTIONS on the page that already sells the
 *    service. They do not get their own URLs (the new-URL freeze targets page
 *    volume), and the anchor is what a GBP "Link to redeem offer" points at.
 *  - An offer NEVER touches Jobber forms, ids, embeds or attribution plumbing.
 *    Redemption differs per offer and the fine print must match the flow the
 *    CTA actually lands on: TODO10 is named by the customer, because that
 *    request is reviewed before the appointment is confirmed. HIGH200 is a
 *    SELECTABLE discounted line item on the curtain request form, so its copy
 *    tells the customer to pick the option rather than to type a code. Check
 *    the destination flow before writing redemption copy — advertising a price
 *    the booking flow then contradicts is the failure mode here.
 *  - Curtain figures are INSTALLATION LABOR ONLY. Never word an offer so it
 *    implies EYS supplies rods, tracks or curtains.
 *
 * To end an offer: set `active: false`. To extend it: change `endDate`.
 * Nothing else in the codebase needs editing.
 */
import {
  smallRepairPricing,
  visitDurationOptions,
  visitPriceBreakdown,
  formatUsd,
} from './pricing/todoList';
import { curtainPricing } from './pricing/curtains';
import { withUtm } from '../utils/utm';
import { absoluteUrl } from './business';

/** ISO dates. GBP Offer posts require both a start and an end date. */
const OFFER_WINDOW = {
  startDate: '2026-09-13',
  endDate: '2026-10-31',
} as const;

/** Long-form date for on-page copy, e.g. "October 31, 2026". */
export function formatOfferDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export type OfferPriceRow = {
  label: string;
  /** Undiscounted list price. */
  was: number;
  wasFormatted: string;
  /** Price with the offer applied. */
  now: number;
  nowFormatted: string;
};

const TODO_DISCOUNT_RATE = 0.1;
const CURTAIN_DISCOUNT_AMOUNT = 200;

/**
 * Display forms of the two discount terms. The terms appear in headlines,
 * summaries and fine print, so they are derived here for the same reason the
 * prices are: change the constant above and every mention follows. A hand-typed
 * "$200 Off" headline is exactly the stale figure this file exists to prevent.
 */
const TODO_DISCOUNT_DISPLAY = `${Math.round(TODO_DISCOUNT_RATE * 100)}%`;
const CURTAIN_DISCOUNT_DISPLAY = formatUsd(CURTAIN_DISCOUNT_AMOUNT);

/** Redemption codes. Declared up here so copy can interpolate them without a
 *  getter referencing the object it is being defined on. */
const TODO_CODE = 'TODO10';
const CURTAIN_CODE = 'HIGH200';

/** Round to cents so 299 * 0.9 never renders as 269.10000000000002. */
function toCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function percentOff(list: number, rate: number): number {
  return toCents(list * (1 - rate));
}

function amountOff(list: number, amount: number): number {
  return Math.max(0, toCents(list - amount));
}

/**
 * Discounted price for a booked visit duration.
 *
 * The percentage applies to the BOOKED TIER only — additional 30-minute blocks
 * bill at the standard rate, exactly as the fine print states. Discounting the
 * whole total instead would advertise a price below the offer's own terms
 * (3.5h would read $413.10 when the customer actually pays $419.10), and the
 * structured-data copy of that number is the one that can surface in a rich
 * result with no fine print attached.
 */
function discountedVisitPrice(hours: number, rate: number): number {
  const { tierPrice, additionalBlocks } = visitPriceBreakdown(hours);
  return toCents(
    percentOff(tierPrice, rate) +
      additionalBlocks * smallRepairPricing.additionalThirtyMinutes,
  );
}

function priceRow(label: string, was: number, now: number): OfferPriceRow {
  return {
    label,
    was,
    wasFormatted: formatUsd(was),
    now,
    nowFormatted: formatUsd(now),
  };
}

/**
 * OFFER 1 — 10% off booked time on a Handyman To-Do List Visit.
 * Applies to the booked labor tier only. Additional 30-minute blocks and
 * materials are not discounted, and that is stated in the fine print.
 */
const todoListOffer = {
  id: 'todo-list-10-off',
  code: TODO_CODE,
  active: true,
  ...OFFER_WINDOW,
  /** Anchor on the page that already sells this service. */
  path: '/services/handyman-to-do-list/',
  anchor: 'offer',
  /** utm_content value — distinguishes this offer inside the existing gbp-post campaign. */
  utmContent: 'todo-list-10off-202609',
  eyebrow: 'Limited-time offer',
  headline: `${TODO_DISCOUNT_DISPLAY} Off Your Booked Time`,
  subhead: 'Handyman To-Do List Visit',
  summary:
    // Deliberately does NOT promise the list gets finished. The service terms
    // on this same page state three times that a visit reserves labor time and
    // does not guarantee completion of every submitted task; promotional copy
    // does not get to contradict them.
    `Stack your smaller jobs into one visit and take ${TODO_DISCOUNT_DISPLAY} off the booked time. ` +
    'One trip, one booked rate, worked in your priority order.',
  get rows(): OfferPriceRow[] {
    // Flat tiers only (1h, 2h, 3h). Every other duration is a tier plus
    // undiscounted 30-minute blocks, so its headline saving is smaller;
    // showing one here would invite the reader to apply the percentage to the
    // whole number. The full set, priced correctly, goes to schema via allRows.
    return visitDurationOptions
      .filter((opt) => visitPriceBreakdown(opt.hours).additionalBlocks === 0)
      .map((opt) =>
        priceRow(
          opt.label.toLowerCase(),
          opt.price,
          discountedVisitPrice(opt.hours, TODO_DISCOUNT_RATE),
        ),
      );
  },
  /** Every bookable duration with the discount applied — used by schema. */
  get allRows(): OfferPriceRow[] {
    return visitDurationOptions.map((opt) =>
      priceRow(opt.label, opt.price, discountedVisitPrice(opt.hours, TODO_DISCOUNT_RATE)),
    );
  },
  get finePrint(): string[] {
    return [
      `${TODO_DISCOUNT_DISPLAY} applies to the booked labor tier on Handyman To-Do List Visits booked by ${formatOfferDate(OFFER_WINDOW.endDate)}.`,
      `Additional time past your booked tier bills at the standard ${formatUsd(smallRepairPricing.additionalThirtyMinutes)} per 30 minutes and is not discounted.`,
      'Labor only. Parts and materials are additional.',
      `One offer per visit. Mention code ${TODO_CODE} when you book.`,
    ];
  },
} as const;

/**
 * OFFER 2 — $200 off high-ceiling curtain installation, rods or tracks.
 * A flat dollar amount was chosen deliberately: it lands both high-ceiling
 * tiers on clean round numbers ($799 -> $599, $1,199 -> $999).
 */
const highCeilingCurtainOffer = {
  id: 'high-ceiling-curtains-200-off',
  code: CURTAIN_CODE,
  active: true,
  ...OFFER_WINDOW,
  path: '/curtain-installation/',
  anchor: 'offer',
  utmContent: 'high-ceiling-200off-202609',
  eyebrow: 'Limited-time offer',
  headline: `${CURTAIN_DISCOUNT_DISPLAY} Off High-Ceiling Curtain Installation`,
  subhead: 'Rods or tracks — your choice',
  summary:
    `Tall windows, vaulted rooms, two-story walls. Take ${CURTAIN_DISCOUNT_DISPLAY} off high-ceiling ` +
    'installation on either curtain rods or ceiling tracks.',
  get rows(): OfferPriceRow[] {
    const hc = curtainPricing.highCeiling;
    return [
      priceRow(hc.rod.label, hc.rod.startingAt, amountOff(hc.rod.startingAt, CURTAIN_DISCOUNT_AMOUNT)),
      priceRow(hc.track.label, hc.track.startingAt, amountOff(hc.track.startingAt, CURTAIN_DISCOUNT_AMOUNT)),
    ];
  },
  get finePrint(): string[] {
    const hc = curtainPricing.highCeiling;
    return [
      `${CURTAIN_DISCOUNT_DISPLAY} off the starting price of high-ceiling curtain rod or ceiling-track installation booked by ${formatOfferDate(OFFER_WINDOW.endDate)}.`,
      `Starting prices cover up to ${hc.rod.includedWindows} windows; additional windows bill at the standard rate and are not discounted.`,
      'Installation labor only. You supply the rods, tracks, and curtains.',
      // Redemption is a SELECTABLE LINE ITEM, not a code the customer types.
      // Jobber request form 5061244 carries the discounted rod and track
      // services alongside the list-price ones, so the $599 this page promises
      // is a $599 option in the booking flow. CURTAIN_CODE stays because it is
      // still the Google Business Profile coupon-code field and the phone
      // reference — it is not something to type into the online form.
      `High-ceiling installations only. One offer per job. Choose the ${CURTAIN_DISCOUNT_DISPLAY} OFF option when you book online, or mention ${CURTAIN_CODE} if you book by phone.`,
    ];
  },
} as const;

export const offers = {
  todoList: todoListOffer,
  highCeilingCurtains: highCeilingCurtainOffer,
} as const;

export type Offer = (typeof offers)[keyof typeof offers];

/** Site-relative anchored link to an offer, e.g. "/curtain-installation/#offer". */
export function offerAnchorPath(offer: Offer): string {
  return `${offer.path}#${offer.anchor}`;
}

/**
 * Absolute "Link to redeem offer" URL for a Google Business Profile Offer post.
 *
 * Reuses the EXISTING GBP UTM convention (source=google, medium=organic,
 * campaign=gbp-post) rather than minting a new campaign name per promotion —
 * rule #25. The offer is identified by utm_content.
 */
export function offerRedeemUrl(offer: Offer): string {
  const withParams = withUtm(absoluteUrl(offer.path), {
    source: 'google',
    medium: 'organic',
    campaign: 'gbp-post',
    content: offer.utmContent,
  });
  return `${withParams}#${offer.anchor}`;
}

/** Active offers only — components should read through this. */
export function activeOffers(): Offer[] {
  return Object.values(offers).filter((offer) => offer.active);
}
