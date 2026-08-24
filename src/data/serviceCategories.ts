import { categoryHeroImages } from './images';

export type ServiceCategoryItem = {
  title: string;
  description: string;
  /** Links to /services/{slug}/ when the service page is published */
  serviceSlug?: string;
};

export type ServiceCategory = {
  slug: string;
  title: string;
  summary: string;
  heroImage: string;
  heroImageAlt: string;
  seoTitle: string;
  metaDescription: string;
  ctaLabel: string;
  items: ServiceCategoryItem[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: 'repairs-and-maintenance',
    title: 'Repairs & Maintenance',
    summary:
      'Reliable repairs for the everyday problems that keep your home from feeling finished, safe, and fully functional.',
    heroImage: categoryHeroImages['repairs-and-maintenance'] ?? '/images/categories/repairs-installs.jpg',
    heroImageAlt:
      'Finished living room with custom drapes and chandelier after handyman installation work',
    seoTitle: 'Repairs & Maintenance | Katy & West Houston | Elevate Your Space',
    metaDescription:
      'General handyman repairs, drywall repair, interior painting, and fixture installation in Katy and West Houston.',
    ctaLabel: 'View Repair Services',
    items: [
      {
        title: 'Handyman To-Do List Visit',
        description:
          'Reserve a professional handyman to work through multiple small repairs, installations, and maintenance tasks in one convenient visit.',
        serviceSlug: 'handyman-to-do-list',
      },
      {
        title: 'General Handyman Repairs',
        description:
          'Everyday home fixes for damaged trim, loose hardware, doors, fixtures, and small issues that keep your home from feeling finished.',
        serviceSlug: 'general-handyman-services',
      },
      {
        title: 'Drywall Repair',
        description:
          'Repairs holes, cracks, dents, water damage, and texture issues for a smooth, clean wall finish.',
        serviceSlug: 'drywall-repair',
      },
      {
        title: 'Interior Painting',
        description:
          'Professional painting and touch-ups for walls, trim, doors, and small interior areas that need a refreshed look.',
        serviceSlug: 'painting',
      },
      {
        title: 'Fixture & Fan Installation',
        description:
          'Ceiling-fan and light-fixture installation on confirmed existing boxes, with referral when regulated electrical work is required.',
        serviceSlug: 'electrical-services',
      },
    ],
  },
  {
    slug: 'installation-and-assembly',
    title: 'Installation & Assembly',
    summary:
      'Precise installation work for doors, fixtures, furniture, cabinetry, and the details that make a home more usable.',
    heroImage: categoryHeroImages['installation-and-assembly'] ?? '/images/categories/repairs-installs.jpg',
    heroImageAlt:
      'Living room drapes and chandelier installation completed by Elevate Your Space Handyman',
    seoTitle: 'Installation & Assembly | Katy & West Houston | EYS',
    metaDescription:
      'Door installation, furniture assembly, TV mounting, smart home installation, ceiling fans, curtains, and cabinet installation in Katy and West Houston.',
    ctaLabel: 'View Installation Services',
    items: [
      {
        title: 'Door Installation',
        description:
          'Accurate installation of interior and exterior doors, including alignment, hardware, fitment, and secure closing.',
        serviceSlug: 'door-repair-installation',
      },
      {
        title: 'Furniture Assembly',
        description:
          'Careful assembly of furniture, shelving, desks, beds, cabinets, and other store-bought pieces.',
        serviceSlug: 'furniture-assembly',
      },
      {
        title: 'TV Mounting',
        description:
          'Clean TV mounting, cable management, and careful wall placement for a polished living-room setup.',
        serviceSlug: 'tv-mounting',
      },
      {
        title: 'Cabinet Installation',
        description:
          'Installation of cabinets, vanities, shelving, and built-ins with precise fit, level placement, and durable finishing.',
        serviceSlug: 'cabinet-installation',
      },
      {
        title: 'Ceiling Fan Installation',
        description:
          'Safe installation of ceiling fans on pre-wired boxes, patios, and bedrooms with balance checks and clean finishing.',
        serviceSlug: 'ceiling-fan-installation',
      },
      {
        title: 'Curtain & Drapery Installation',
        description:
          'Precise curtain rod, drapery hardware, and window treatment mounting with level placement and secure anchoring.',
        serviceSlug: 'curtain-installation',
      },
      {
        title: 'Smart Home Installation',
        description:
          'Video doorbells, smart locks, smart thermostats, and smart switches installed on existing wiring, with licensed-trade referral for anything requiring new circuits.',
        serviceSlug: 'smart-home-installation',
      },
      {
        title: 'Picture Hanging & Floating Shelves',
        description:
          'Level, securely anchored picture, mirror, and floating shelf installation for a single room or a full gallery wall.',
        serviceSlug: 'picture-hanging-floating-shelves',
      },
    ],
  },
  {
    slug: 'remodeling-and-upgrades',
    title: 'Home Upgrades & Custom Projects',
    summary:
      'Finish carpentry, room upgrades, and custom home-improvement projects that elevate comfort, function, and appearance.',
    heroImage: categoryHeroImages['remodeling-and-upgrades'] ?? '/images/categories/remodeling.jpg',
    heroImageAlt:
      'Blue kitchen island and window-seat cabinetry remodel with open living space beyond',
    seoTitle: 'Home Upgrades & Custom Projects | Katy & West Houston | EYS',
    metaDescription:
      'Bathroom upgrades, kitchen upgrades, interior finish work, custom carpentry, and wallpaper installation in Katy and West Houston.',
    ctaLabel: 'View Upgrade Services',
    items: [
      {
        title: 'Bathroom Upgrades',
        description:
          'Vanity installs, fixture swaps, hardware updates, and finish improvements with clear scope limits.',
        serviceSlug: 'bathroom-remodeling',
      },
      {
        title: 'Grab Bar Installation',
        description:
          'Stud-anchored grab bars for showers, tubs, and toilets in finishes that blend with your bathroom, not a hospital look.',
        serviceSlug: 'grab-bar-installation',
      },
      {
        title: 'Kitchen Upgrades',
        description:
          'Cabinet hardware, finish carpentry, fixture coordination, and punch-list improvements within handyman scope.',
        serviceSlug: 'kitchen-remodeling',
      },
      {
        title: 'Interior Finish Work & Décor',
        description:
          'Trim, transitions, accent walls, décor mounting, and clearly scoped interior finish work.',
        serviceSlug: 'flooring-and-decor',
      },
      {
        title: 'Custom Carpentry',
        description:
          'Custom woodwork, accent walls, shelving, built-ins, trim upgrades, and detail work that gives the home character.',
        serviceSlug: 'custom-carpentry',
      },
      {
        title: 'Media Walls',
        description:
          'Custom entertainment walls — built-in niches, fireplace media walls, wood-slat features, and finished TV centers.',
        serviceSlug: 'media-walls',
      },
      {
        title: 'Closet Shelving & Home Organization',
        description:
          'Wire and wood closet shelving, reach-in system upgrades, and pantry or mudroom organization built to fit the space.',
        serviceSlug: 'closet-shelving-organization',
      },
      {
        title: 'Wallpaper & Accent Wall Installation',
        description:
          'Traditional, peel-and-stick, and grasscloth wallpaper installed with Gulf Coast humidity-aware wall prep.',
        serviceSlug: 'wallpaper-accent-wall-installation',
      },
      {
        title: 'Babyproofing & Child Safety',
        description:
          'Furniture and TV anti-tip anchoring, cabinet locks, and gate installation — securely mounted safety upgrades, not adhesive shortcuts.',
        serviceSlug: 'babyproofing-child-safety',
      },
      {
        title: 'Garage Storage Solutions',
        description:
          'Overhead racks and wall-mounted shelving that get bikes, seasonal decor, and gear off the garage floor.',
        serviceSlug: 'garage-storage-solutions',
      },
    ],
  },
];

export const allServiceSlugs = [
  'handyman-to-do-list',
  'tv-mounting',
  'ceiling-fan-installation',
  'curtain-installation',
  'general-handyman-services',
  'furniture-assembly',
  'drywall-repair',
  'painting',
  'door-repair-installation',
  'electrical-services',
  'cabinet-installation',
  'bathroom-remodeling',
  'grab-bar-installation',
  'kitchen-remodeling',
  'flooring-and-decor',
  'custom-carpentry',
  'media-walls',
  'closet-shelving-organization',
  'smart-home-installation',
  'wallpaper-accent-wall-installation',
  'picture-hanging-floating-shelves',
  'babyproofing-child-safety',
  'garage-storage-solutions',
] as const;

export function getServiceCategory(slug: string): ServiceCategory | undefined {
  return serviceCategories.find((c) => c.slug === slug);
}

export function getCategoryForServiceSlug(serviceSlug: string): ServiceCategory | undefined {
  return serviceCategories.find((category) =>
    category.items.some((item) => item.serviceSlug === serviceSlug),
  );
}
