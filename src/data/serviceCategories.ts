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
      'General handyman repairs, drywall repair, interior painting, and electrical services in Katy and West Houston.',
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
        title: 'Electrical Services',
        description:
          'Light electrical work including fixtures, outlets, switches, fans, and related repairs, with licensed support when required.',
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
      'Living room drapes and chandelier installation completed by a handyman crew',
    seoTitle: 'Installation & Assembly | Katy & West Houston | EYS',
    metaDescription:
      'Door installation, furniture assembly, TV mounting, ceiling fans, curtains, and cabinet installation in Katy and West Houston.',
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
        title: 'TV Mounting & Media Walls',
        description:
          'Clean TV mounting, cable management, wall placement, and media wall installation for a polished setup.',
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
    ],
  },
  {
    slug: 'remodeling-and-upgrades',
    title: 'Remodeling & Upgrades',
    summary:
      'Home improvement and remodeling services that elevate comfort, function, appearance, and long-term value.',
    heroImage: categoryHeroImages['remodeling-and-upgrades'] ?? '/images/categories/remodeling.jpg',
    heroImageAlt:
      'Blue kitchen island and window-seat cabinetry remodel with open living space beyond',
    seoTitle: 'Remodeling & Upgrades | Katy & West Houston | EYS',
    metaDescription:
      'Bathroom remodeling, kitchen remodeling, flooring upgrades, and custom carpentry in Katy and West Houston.',
    ctaLabel: 'View Remodeling Services',
    items: [
      {
        title: 'Bathroom Remodeling',
        description:
          'Bathroom upgrades for improved function, comfort, layout, storage, and a clean finished appearance.',
        serviceSlug: 'bathroom-remodeling',
      },
      {
        title: 'Kitchen Remodeling',
        description:
          'Kitchen improvements including cabinets, counters, fixtures, backsplashes, layout upgrades, and finish work.',
        serviceSlug: 'kitchen-remodeling',
      },
      {
        title: 'Flooring & Décor',
        description:
          'Flooring, trim, wall accents, décor upgrades, and finish details that improve the look and feel of a space.',
        serviceSlug: 'flooring-and-decor',
      },
      {
        title: 'Custom Carpentry',
        description:
          'Custom woodwork, accent walls, shelving, built-ins, trim upgrades, and detail work that gives the home character.',
        serviceSlug: 'custom-carpentry',
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
  'kitchen-remodeling',
  'flooring-and-decor',
  'custom-carpentry',
] as const;

export function getServiceCategory(slug: string): ServiceCategory | undefined {
  return serviceCategories.find((c) => c.slug === slug);
}

export function getCategoryForServiceSlug(serviceSlug: string): ServiceCategory | undefined {
  return serviceCategories.find((category) =>
    category.items.some((item) => item.serviceSlug === serviceSlug),
  );
}
