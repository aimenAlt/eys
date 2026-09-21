import { absoluteUrl, jobberRequestFormUrl } from './business';
import { withJobberFormId } from '../utils/utm';

/**
 * Unlisted handoff links Essa texts to a client after a phone call.
 *
 * ONE array drives three things: the `/go/<slug>/` client pages, the private
 * `/essa/` share page, and the exact text message he sends. Adding a form later
 * is a single entry here — do not hand-write a Jobber URL, a page path or a
 * message anywhere else.
 *
 * Form ids deliberately NOT in this file:
 *   5201775 — reserved for the `/start/` print-QR landing page.
 *   4372609, 4975089, 2019189 — legacy forms being retired.
 *   4985623 — the SITEWIDE project-estimate form (`jobber.projectEstimateFormUrl`).
 *     It asks the same thing as the `home-project` phone-lead form below, so
 *     offering both here made Essa choose between duplicates on every call.
 *     The website keeps using it; a texted handoff uses `home-project`, which
 *     also keeps phone leads separable from web leads in Jobber and GA4.
 *     `/go/estimate/` 301s to `/go/home-project/` in public/_redirects.
 */

export type GoLinkGroup = 'phone-leads' | 'searchable';

export interface GoLink {
  /** URL segment: `/go/<slug>/`. */
  slug: string;
  /** Jobber public request form id. */
  formId: string;
  /** Owner-facing name on `/essa/`. Never shown to a client. */
  label: string;
  /** Extra words the `/essa/` search box matches, beyond the label. */
  keywords: string;
  /** Copy on the client page's primary button. */
  buttonLabel: string;
  group: GoLinkGroup;
  /**
   * The body of the text Essa sends, above the link — everything after the
   * opening sentence. Owner-approved copy.
   *
   * The opener is NOT here: it depends on whether he spoke to them, missed
   * their call, or has never been in touch (see `goTones`). Splitting it out
   * is what lets one body serve all three without eleven copies of each.
   *
   * Never add a turnaround promise here ("same day", "within 24 hours"):
   * say what happens next, never how fast it happens.
   */
  body: string;
  /**
   * True for the two forms that book a slot rather than ask for a quote.
   * Those get no "add as much detail as you can" nudge — there is no quote
   * coming, and the body already tells them what to bring or pick.
   */
  booking?: boolean;
  /** Client-page line that says what the button opens. */
  next: string;
  /** GA4 `booking_type` for the outbound click. */
  bookingType: string;
  /**
   * Which review the client page shows, as an id in `src/content/reviews/`.
   * Omitted means `GO_DEFAULT_REVIEW` — a customer saying Essa told him the
   * repair was under warranty rather than charging for it, which is the right
   * note under "Every quote is itemized" on a page asking for a quote.
   *
   * Only set this where a review genuinely speaks to the work. A curtain
   * customer on the curtain page is worth more than the default; a curtain
   * customer on the kitchen page is worth less than nothing.
   */
  reviewId?: string;
}

/** Used unless an entry overrides it. */
export const GO_DEFAULT_BUTTON_LABEL = 'Continue to your request →';

/** Signature appended to every texted message, on its own line. He goes by Essa. */
export const GO_SIGN_OFF = '– Essa, EYS Handyman';

export type GoToneId = 'answered' | 'missed' | 'cold' | 'link';

export interface GoTone {
  id: GoToneId;
  /** Button label on `/essa/`. Short — four of them share one row on a phone. */
  label: string;
  /** Opening sentence, ahead of the form's own body. */
  opener: string;
  /**
   * Appended after the body on quote forms only. Where there has been no
   * conversation, the form is the only thing carrying the job, so it is worth
   * asking for detail; after a call it would be redundant and faintly rude.
   */
  nudge?: string;
  /**
   * Send the bare URL and nothing else — no opener, no body, no sign-off.
   * For when he is already mid-conversation and the message around the link
   * would just be noise.
   */
  linkOnly?: boolean;
  /** What the preview line shows when there is no opener to show. */
  preview?: string;
}

/**
 * How the text opens, by what happened before it.
 *
 * "Hey! Nice talking with you." is wrong — embarrassing, even — sent to
 * someone whose call he missed or who has never heard from him. The body of
 * each message stays the same in all three; only the first sentence, and a
 * request for detail where there has been no conversation, change.
 *
 * `answered` reproduces the original message byte for byte. Leave it that way.
 */
export const goTones: GoTone[] = [
  {
    id: 'answered',
    label: 'Answered',
    opener: 'Hey! Nice talking with you.',
  },
  {
    id: 'missed',
    label: 'Missed call',
    opener: 'Hi — Essa here with EYS Handyman, sorry I missed your call.',
    nudge: 'Add as much detail as you can and I can get you an accurate quote.',
  },
  {
    id: 'cold',
    label: 'No contact',
    opener: 'Hi — Essa here with EYS Handyman in Katy.',
    nudge: 'Add as much detail as you can and I can get you an accurate quote.',
  },
  {
    id: 'link',
    label: 'Link only',
    opener: '',
    linkOnly: true,
    preview: 'Just the link — no message, no sign-off.',
  },
];

export const GO_DEFAULT_TONE: GoToneId = 'answered';

export function goTone(id: GoToneId = GO_DEFAULT_TONE): GoTone {
  return goTones.find((tone) => tone.id === id) ?? goTones[0];
}

/**
 * Review shown when a form has no closely matching one — see `GoLink.reviewId`.
 *
 * Only five reviews are published in `src/content/reviews/`, against 162 on the
 * Google profile, so most forms fall back to this. Import more and the matching
 * below gets better for free.
 */
export const GO_DEFAULT_REVIEW = 'jamal-ansari';

/**
 * Longest review excerpt a `/go/` page shows, in characters.
 *
 * The page has one job and the button has to clear the fold on a 390x844
 * phone. Full-length reviews run to five or six lines and pushed it as far as
 * 712px. Around three lines keeps every page at the same height whichever
 * review it draws.
 */
const GO_REVIEW_MAX_CHARS = 120;

/**
 * Trim a review to an excerpt, preferring a sentence boundary.
 *
 * Only ever shortens from the END, so the words shown are the customer's own,
 * in their order — no re-ordering, no paraphrase, nothing that could flip the
 * sense. A cut that lands on a full stop keeps its punctuation and reads as a
 * complete thought; anything else falls back to a word boundary and an
 * ellipsis. Either way the card links to the Google profile, so the whole
 * review is one tap away.
 */
export function goReviewExcerpt(text: string, maxChars = GO_REVIEW_MAX_CHARS): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;

  const cut = clean.slice(0, maxChars);

  // A sentence ending late enough in the window reads better than an ellipsis.
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd > maxChars * 0.55) return cut.slice(0, sentenceEnd + 1);

  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s,;:.!?—-]+$/,
    '',
  );
  return `${trimmed}…`;
}

/** True when the excerpt dropped something, so the page can invite the full read. */
export function goReviewIsTrimmed(text: string, maxChars = GO_REVIEW_MAX_CHARS): boolean {
  return text.trim().length > maxChars;
}

const BOOKING_BUTTON_LABEL = 'Continue to booking →';

export const goLinks: GoLink[] = [
  {
    slug: 'home-project',
    formId: '5194396',
    label: 'Phone lead · Home project',
    keywords: 'home project general new lead call anything else',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'phone-leads',
    body:
      "Here's the link to send me your project details and a few photos — once it's in, I'll get your estimate started.",
    next: 'Next: a short form about your home project.',
    bookingType: 'phone_lead_home_project',
  },
  {
    slug: 'repair',
    formId: '5194417',
    label: 'Phone lead · Repair & installation',
    keywords: 'repair fix broken install installation replace',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'phone-leads',
    body:
      "Here's the link to send me what needs fixing or installing, plus a few photos — once it's in, I'll get your price together.",
    next: 'Next: a short form about the repair or installation you need.',
    bookingType: 'phone_lead_repair',
    /** On time, clean workspace, fast and neat — a repair customer describing exactly this visit. */
    reviewId: 'yong-sun',
  },
  {
    slug: 'commercial',
    formId: '5194418',
    label: 'Phone lead · Commercial & large-scale',
    keywords: 'commercial business property office rental large scale multi unit',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'phone-leads',
    body:
      "Here's the link to send me the property details and the scope you have in mind — once it's in, I'll start on your proposal.",
    next: 'Next: a short form about your commercial project.',
    bookingType: 'phone_lead_commercial',
    // Jay Liang's review was tried here for the crew he turned up with, but the
    // excerpt that fits cuts before that detail and what is left is about
    // unloading U-Boxes — not a commercial property. Default until there is a
    // real commercial review to import.
  },
  {
    slug: 'todo',
    formId: '4983259',
    label: 'Handyman To-Do List visit',
    keywords: 'honey do handyman list small jobs punch list odd jobs hourly',
    booking: true,
    buttonLabel: BOOKING_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link to book your Handyman To-Do List visit — add your list so I know exactly what to bring.",
    next: 'Next: a short booking form for your Handyman To-Do List visit.',
    bookingType: 'handyman_to_do_list',
    /** A list of small jobs done fast and neatly, which is what a To-Do List visit is. */
    reviewId: 'yong-sun',
  },
  {
    slug: 'on-site',
    formId: '5025076',
    label: 'Free on-site estimate',
    keywords: 'walkthrough visit assessment on site in person come out free',
    booking: true,
    buttonLabel: BOOKING_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link to book your free 30-minute on-site estimate — pick a time that works for you.",
    next: 'Next: a short booking form for your free on-site estimate.',
    bookingType: 'on_site_estimate',
    /** "He arrived on time" is the promise a booked on-site slot makes. */
    reviewId: 'yong-sun',
  },
  {
    slug: 'tv',
    formId: '4977896',
    label: 'TV mounting',
    keywords: 'tv television mount bracket wall',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link for your TV mounting — once it's in, I'll get your quote started.",
    next: 'Next: a short form about your TV mounting project.',
    bookingType: 'tv_mounting',
  },
  {
    slug: 'high-ceiling-curtains',
    formId: '5061244',
    label: 'High-ceiling curtains',
    keywords: 'curtains drapes high ceiling tall two story vaulted rod track',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link for your high-ceiling curtains — once it's in, I'll get your quote started.",
    next: 'Next: a short form about your high-ceiling curtains.',
    bookingType: 'high_ceiling_curtain',
    /** A curtain-installation customer, on the curtain page. */
    reviewId: 'vanesa-morgia',
  },
  {
    slug: 'curtains',
    formId: '5061268',
    label: 'Standard-height curtains',
    keywords: 'drapes rod track blinds standard height curtains',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link for your curtain installation — once it's in, I'll get your quote started.",
    next: 'Next: a short form about your curtain installation.',
    bookingType: 'regular_ceiling_curtain',
    /** A curtain-installation customer, on the curtain page. */
    reviewId: 'vanesa-morgia',
  },
  {
    slug: 'media-wall',
    formId: '5067435',
    label: 'Media wall',
    keywords: 'media wall fireplace feature accent slat entertainment center',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link for your media wall — share your ideas for the wall and I'll start on your design and quote.",
    next: 'Next: a short form about your media wall.',
    bookingType: 'media_wall_estimate',
  },
  {
    slug: 'kitchen',
    formId: '5130707',
    label: 'Kitchen remodel',
    keywords: 'kitchen remodel cabinets countertops backsplash island',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link for your kitchen project — once it's in, I'll start putting your estimate together.",
    next: 'Next: a short form about your kitchen remodel.',
    bookingType: 'kitchen_remodel',
  },
  {
    slug: 'bathroom',
    formId: '5130734',
    label: 'Bathroom remodel',
    keywords: 'bath shower vanity bathroom remodel tile tub',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    body:
      "Here's the link for your bathroom project — once it's in, I'll start putting your estimate together.",
    next: 'Next: a short form about your bathroom remodel.',
    bookingType: 'bathroom_remodel',
  },
];

export function goLinksByGroup(group: GoLinkGroup): GoLink[] {
  return goLinks.filter((entry) => entry.group === group);
}

/** Site path for a client handoff page. */
export function goPagePath(slug: string): string {
  return `/go/${slug}/`;
}

/** The link that goes in the text message — absolute, no query parameters. */
export function goShareUrl(slug: string): string {
  return absoluteUrl(goPagePath(slug));
}

/**
 * Outbound Jobber href for a client page, stamped with `eys_form` exactly the
 * way every other CTA on the site is, so inbound UTM/gclid forwarding and GA4
 * cross-domain linking behave identically here.
 */
export function goJobberUrl(entry: GoLink): string {
  return withJobberFormId(jobberRequestFormUrl(entry.formId), `go-${entry.slug}`);
}

/** GA4 `cta_location` — underscores, so `high-ceiling-curtains` reads `go_high_ceiling_curtains`. */
export function goCtaLocation(slug: string, suffix?: string): string {
  const base = `go_${slug.replace(/-/g, '_')}`;
  return suffix ? `${base}_${suffix}` : base;
}

/**
 * Row label on `/essa/`. The section heading already says "Phone leads", so the
 * prefix is stripped: a row has one line of width and the distinguishing words
 * are at the end ("Commercial & large-scale"), not the start.
 */
export function goRowLabel(entry: GoLink): string {
  return entry.label.replace(/^Phone lead\s·\s/, '');
}

/**
 * Exactly what the Share/Copy buttons put on the clipboard, for one tone.
 *
 * Shape is fixed and owner-approved: message, blank line, bare link, blank
 * line, sign-off. No query parameters on the link.
 */
export function goMessageText(entry: GoLink, toneId: GoToneId = GO_DEFAULT_TONE): string {
  const tone = goTone(toneId);
  // Bare URL: he is already in the conversation and is just handing over the
  // link, so there is nothing to wrap it in.
  if (tone.linkOnly) return goShareUrl(entry.slug);
  const nudge = tone.nudge && !entry.booking ? ` ${tone.nudge}` : '';
  const message = `${tone.opener} ${entry.body}${nudge}`;
  return `${message}\n\n${goShareUrl(entry.slug)}\n\n${GO_SIGN_OFF}`;
}

/** Every tone's text for one link, keyed by tone id — what `/essa/` renders. */
export function goMessagesByTone(entry: GoLink): Record<GoToneId, string> {
  return Object.fromEntries(
    goTones.map((tone) => [tone.id, goMessageText(entry, tone.id)]),
  ) as Record<GoToneId, string>;
}
