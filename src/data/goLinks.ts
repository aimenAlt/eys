import { absoluteUrl, jobberRequestFormUrl } from './business';
import { withJobberFormId } from '../utils/utm';

/**
 * Unlisted handoff links Essa texts to a client after a phone call.
 *
 * ONE array drives three things: the `/go/<slug>/` client pages, the private
 * `/eyad/` share page, and the exact text message he sends. Adding a form later
 * is a single entry here — do not hand-write a Jobber URL, a page path or a
 * message anywhere else.
 *
 * Form ids deliberately NOT in this file:
 *   5201775 — reserved for the `/start/` print-QR landing page.
 *   4372609, 4975089, 2019189 — legacy forms being retired.
 */

export type GoLinkGroup = 'phone-leads' | 'searchable';

export interface GoLink {
  /** URL segment: `/go/<slug>/`. */
  slug: string;
  /** Jobber public request form id. */
  formId: string;
  /** Owner-facing name on `/eyad/`. Never shown to a client. */
  label: string;
  /** Extra words the `/eyad/` search box matches, beyond the label. */
  keywords: string;
  /** Copy on the client page's primary button. */
  buttonLabel: string;
  group: GoLinkGroup;
  /**
   * The message Essa sends, above the link. Owner-approved copy.
   * Never add a turnaround promise here ("same day", "within 24 hours"):
   * say what happens next, never how fast it happens.
   */
  message: string;
  /** Client-page line that says what the button opens. */
  next: string;
  /** GA4 `booking_type` for the outbound click. */
  bookingType: string;
}

/** Used unless an entry overrides it. */
export const GO_DEFAULT_BUTTON_LABEL = 'Continue to your request →';

/** Signature appended to every texted message, on its own line. He goes by Essa. */
export const GO_SIGN_OFF = '– Essa, EYS Handyman';

const BOOKING_BUTTON_LABEL = 'Continue to booking →';

export const goLinks: GoLink[] = [
  {
    slug: 'home-project',
    formId: '5194396',
    label: 'Phone lead · Home project',
    keywords: 'home project general new lead call anything else',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'phone-leads',
    message:
      "Hey! Nice talking with you. Here's the link to send me your project details and a few photos — once it's in, I'll get your estimate started.",
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
    message:
      "Hey! Nice talking with you. Here's the link to send me what needs fixing or installing, plus a few photos — once it's in, I'll get your price together.",
    next: 'Next: a short form about the repair or installation you need.',
    bookingType: 'phone_lead_repair',
  },
  {
    slug: 'commercial',
    formId: '5194418',
    label: 'Phone lead · Commercial & large-scale',
    keywords: 'commercial business property office rental large scale multi unit',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'phone-leads',
    message:
      "Hey! Nice talking with you. Here's the link to send me the property details and the scope you have in mind — once it's in, I'll start on your proposal.",
    next: 'Next: a short form about your commercial project.',
    bookingType: 'phone_lead_commercial',
  },
  {
    slug: 'estimate',
    formId: '4985623',
    label: 'Project estimate (photos)',
    keywords: 'estimate quote photos pictures project request',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    message:
      "Hey! Nice talking with you. Here's the link for your estimate — add a few photos, and once it's in, I'll get your quote started.",
    next: 'Next: a short form about your project, with room for photos.',
    bookingType: 'project_estimate',
  },
  {
    slug: 'todo',
    formId: '4983259',
    label: 'Handyman To-Do List visit',
    keywords: 'honey do handyman list small jobs punch list odd jobs hourly',
    buttonLabel: BOOKING_BUTTON_LABEL,
    group: 'searchable',
    message:
      "Hey! Nice talking with you. Here's the link to book your Handyman To-Do List visit — add your list so I know exactly what to bring.",
    next: 'Next: a short booking form for your Handyman To-Do List visit.',
    bookingType: 'handyman_to_do_list',
  },
  {
    slug: 'on-site',
    formId: '5025076',
    label: 'Free on-site estimate',
    keywords: 'walkthrough visit assessment on site in person come out free',
    buttonLabel: BOOKING_BUTTON_LABEL,
    group: 'searchable',
    message:
      "Hey! Nice talking with you. Here's the link to book your free 30-minute on-site estimate — pick a time that works for you.",
    next: 'Next: a short booking form for your free on-site estimate.',
    bookingType: 'on_site_estimate',
  },
  {
    slug: 'tv',
    formId: '4977896',
    label: 'TV mounting',
    keywords: 'tv television mount bracket wall',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    message:
      "Hey! Nice talking with you. Here's the link for your TV mounting — once it's in, I'll get your quote started.",
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
    message:
      "Hey! Nice talking with you. Here's the link for your high-ceiling curtains — once it's in, I'll get your quote started.",
    next: 'Next: a short form about your high-ceiling curtains.',
    bookingType: 'high_ceiling_curtain',
  },
  {
    slug: 'curtains',
    formId: '5061268',
    label: 'Standard-height curtains',
    keywords: 'drapes rod track blinds standard height curtains',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    message:
      "Hey! Nice talking with you. Here's the link for your curtain installation — once it's in, I'll get your quote started.",
    next: 'Next: a short form about your curtain installation.',
    bookingType: 'regular_ceiling_curtain',
  },
  {
    slug: 'media-wall',
    formId: '5067435',
    label: 'Media wall',
    keywords: 'media wall fireplace feature accent slat entertainment center',
    buttonLabel: GO_DEFAULT_BUTTON_LABEL,
    group: 'searchable',
    message:
      "Hey! Nice talking with you. Here's the link for your media wall — share your ideas for the wall and I'll start on your design and quote.",
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
    message:
      "Hey! Nice talking with you. Here's the link for your kitchen project — once it's in, I'll start putting your estimate together.",
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
    message:
      "Hey! Nice talking with you. Here's the link for your bathroom project — once it's in, I'll start putting your estimate together.",
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
 * Row label on `/eyad/`. The section heading already says "Phone leads", so the
 * prefix is stripped: a row has one line of width and the distinguishing words
 * are at the end ("Commercial & large-scale"), not the start.
 */
export function goRowLabel(entry: GoLink): string {
  return entry.label.replace(/^Phone lead\s·\s/, '');
}

/** Exactly what the Share/Copy buttons put on the clipboard. */
export function goMessageText(entry: GoLink): string {
  return `${entry.message}\n\n${goShareUrl(entry.slug)}\n\n${GO_SIGN_OFF}`;
}
