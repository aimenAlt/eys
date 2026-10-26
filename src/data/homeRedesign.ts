/**
 * Static content of the redesigned homepage (backlog 013, approved Claude Design
 * Round 3.3). Copy is the boards' copy; anything with a real source (phone,
 * rating, prices, towns, cities, communities, project alt text and towns) is
 * NOT here — the section components read it from that source.
 *
 * Review quotes: all four were checked on Google on 12 Oct 2026, verbatim and
 * 5-star. The two that are not in `src/content/reviews/` (the 18-ft curtains
 * quote and FAUZ Belle) stay here on purpose: their dates are unknown, so they
 * are not added to the collection.
 */

/** Hero review card — an elided excerpt of src/content/reviews/vanesa-morgia.md. Keep the "…". */
export const heroReview = {
  quote:
    'The curtain installation was done very well and the final result looks amazing. The price was reasonable, and he was professional throughout the process… Thanks again Eyad!',
  author: 'Vanesa Morgia',
} as const;

/** "What customers say" — three cards, in board order. `author: null` shows just "Google review". */
export const homeReviews: readonly { quote: string; author: string | null }[] = [
  {
    quote:
      'Essa did a great job installing our curtains 18 feet high up. He was professional, came on said time and left the job in a clean place. He even helped touch up some paint up there.',
    author: null,
  },
  {
    quote:
      'Essa and his staffs were very helpful. He took the time to do the cabinets/shelf for my boutique Bows in Bloom located in Cinco Ranch. He understands the design that we wanted for this project. Great quality and craftsmanship.',
    author: 'FAUZ Belle',
  },
  {
    quote:
      'Essa did great jobs today. He arrived on time, maintained clean workspace. completed all work fast and neatly.',
    author: 'Yong Sun',
  },
];

/** Owner band photo (section 6) and the two "Start with one visit" card photos the redesign adds. */
export const homeRedesignImages = {
  eyadOnSite: {
    src: '/images/home/eyad-on-site-lit-niche-media-wall.jpg',
    width: 1500,
    height: 2000,
    alt: 'Eyad Essa on site in front of a lit-niche media wall with a linear fireplace',
  },
  todoVisit: {
    src: '/images/home/todo-visit-eyad-chandelier-ladder.jpg',
    width: 1080,
    height: 1406,
    alt: 'Eyad Essa on a ladder installing a chandelier over a staircase',
  },
  /** Project photos re-used on the cards: alt text comes from each project's content entry. */
  tvCard: {
    projectSlug: 'tv-niche-wall-linear-fireplace',
    src: '/images/projects/tv-niche-wall-linear-fireplace/eys-media-wall-lit-niche-tv-linear-fireplace-after-p039-01.jpg',
    width: 1200,
    height: 1600,
  },
  curtainsCard: {
    projectSlug: 'gray-curtains-crystal-chandelier-great-room',
    src: '/images/projects/gray-curtains-crystal-chandelier-great-room/eys-curtain-installation-great-room-gray-curtains-chandelier-after-p047-01.jpg',
    width: 684,
    height: 1024,
  },
} as const;

/**
 * "Our Work" gallery — eight tiles in board order. `crop` is object-position
 * [phone, desktop]. Alt text and town come from the project's content entry
 * (`projectSlug`); tile 5 is a different house with no project entry, so it
 * carries its own alt and shows no town.
 */
export type GalleryTile = {
  caption: string;
  src: string;
  width: number;
  height: number;
  crop: readonly [string, string];
  href: string;
  projectSlug: string | null;
  alt?: string;
};

export const homeGallery: readonly GalleryTile[] = [
  {
    caption: 'Navy office built-ins',
    src: '/images/projects/navy-office-builtins/eys-custom-project-navy-builtin-office-shelving-after-p006-03.jpg',
    width: 3000,
    height: 4000,
    crop: ['50% 38%', '50% 45%'],
    href: '/our-work/navy-office-builtins/',
    projectSlug: 'navy-office-builtins',
  },
  {
    caption: 'Drapes on a curved two-story window',
    src: '/images/projects/bowed-window-curtain-panels/eys-curtain-installation-bowed-window-tobacco-panels-after-p048-01.jpg',
    width: 1400,
    height: 1866,
    crop: ['50% 30%', '50% 22%'],
    href: '/our-work/bowed-window-curtain-panels/',
    projectSlug: 'bowed-window-curtain-panels',
  },
  {
    caption: 'Crystal chandelier, vaulted ceiling',
    src: '/images/projects/vaulted-crystal-chandelier/eys-fixture-installation-ornate-crystal-chandelier-after-p008-03.jpg',
    width: 3000,
    height: 4000,
    crop: ['50% 50%', '50% 50%'],
    href: '/our-work/vaulted-crystal-chandelier/',
    projectSlug: 'vaulted-crystal-chandelier',
  },
  {
    caption: 'Two-story sheer curtains',
    src: '/images/projects/double-height-curtains/eys-general-handyman-double-height-sheer-curtains-after-p023-04.jpg',
    width: 1200,
    height: 1600,
    crop: ['50% 50%', '50% 50%'],
    href: '/our-work/double-height-curtains/',
    projectSlug: 'double-height-curtains',
  },
  {
    caption: 'Curved staircase wall paneling',
    src: '/images/home/curved-staircase-wall-paneling.jpg',
    width: 1820,
    height: 1100,
    crop: ['50% 50%', '50% 50%'],
    href: '/our-work/',
    projectSlug: null,
    alt: 'Curved staircase wall with picture-frame wall paneling',
  },
  {
    caption: 'Blue island and window-seat built-ins',
    src: '/images/projects/window-seat-built-in-hutch/eys-kitchen-repair-upgrades-blue-island-window-seat-cabinetry-after-p035-01.jpg',
    width: 1200,
    height: 1600,
    crop: ['50% 55%', '50% 55%'],
    href: '/our-work/window-seat-built-in-hutch/',
    projectSlug: 'window-seat-built-in-hutch',
  },
  {
    caption: 'Black picture-frame accent wall',
    src: '/images/projects/black-accent-wall-molding/eys-trim-carpentry-hallway-black-molding-accent-wall-after-p001-02.jpg',
    width: 3000,
    height: 4000,
    crop: ['50% 50%', '50% 50%'],
    href: '/our-work/black-accent-wall-molding/',
    projectSlug: 'black-accent-wall-molding',
  },
  {
    caption: 'Backyard pergola and privacy wall',
    src: '/images/projects/pergola-privacy-wall/eys-exterior-repair-wood-pergola-privacy-wall-during-p019-01.jpg',
    width: 3840,
    height: 5120,
    crop: ['50% 40%', '50% 45%'],
    href: '/our-work/pergola-privacy-wall/',
    projectSlug: 'pergola-privacy-wall',
  },
];

/** "How it works" — three steps as drawn. Step 1 appends the phone number (from `site`) in the component. */
export const howItWorksSteps = [
  { title: 'Send photos or call', text: 'Send photos and your list, or call' },
  { title: 'Itemized estimate', text: 'We scope the work and return an itemized estimate.' },
  { title: 'Scheduled work', text: 'One point of contact from start to finish.' },
] as const;

/** Closing CTA paragraph (boards). */
export const closingCopy =
  'Everyday repairs, precise installations, finish carpentry, room upgrades and larger custom projects. One point of contact from start to finish.';

/** "Popular services" chips under the About copy — the same seven links as the live homepage. */
export const popularServices = [
  { label: 'Handyman To-Do List Visit', href: '/services/handyman-to-do-list/' },
  { label: 'General handyman services', href: '/services/general-handyman-services/' },
  { label: 'Media walls', href: '/services/media-walls/' },
  { label: 'TV mounting', href: '/services/tv-mounting/' },
  { label: 'Drywall repair', href: '/services/drywall-repair/' },
  { label: 'Door installation', href: '/services/door-repair-installation/' },
  { label: 'Bathroom remodeling', href: '/services/bathroom-remodeling/' },
] as const;
