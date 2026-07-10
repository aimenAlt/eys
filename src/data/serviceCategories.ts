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
    heroImage:
      'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?auto=format&fit=crop&q=80&w=1200',
    heroImageAlt: 'Handyman repairs and maintenance in Katy TX',
    seoTitle: 'Repairs & Maintenance Services in Katy, TX | Elevate Your Space',
    metaDescription:
      'General handyman repairs, drywall repair, interior painting, and electrical services in Katy and West Houston.',
    ctaLabel: 'View Repair Services',
    items: [
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
    heroImage:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1200',
    heroImageAlt: 'Home installation and assembly services in Katy TX',
    seoTitle: 'Installation & Assembly Services in Katy, TX | Elevate Your Space',
    metaDescription:
      'Door installation, furniture assembly, TV mounting, ceiling fans, and cabinet installation in Katy and West Houston.',
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
    ],
  },
  {
    slug: 'remodeling-and-upgrades',
    title: 'Remodeling & Upgrades',
    summary:
      'Home improvement and remodeling services that elevate comfort, function, appearance, and long-term value.',
    heroImage:
      'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&q=80&w=1200',
    heroImageAlt: 'Home remodeling and upgrades in Katy TX',
    seoTitle: 'Remodeling & Home Upgrades in Katy, TX | Elevate Your Space',
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
  'tv-mounting',
  'ceiling-fan-installation',
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
