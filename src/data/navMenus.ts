import { serviceCategories } from './serviceCategories';
import { customServicePages, isCustomServicePage } from './sitePresentation';

export type NavMenuItem = {
  label: string;
  href: string;
  children?: NavMenuItem[];
};

export type NavMenuGroup = {
  label: string;
  href: string;
  children: NavMenuItem[];
};

export type NavMenus = {
  services: NavMenuGroup;
  serviceAreas: NavMenuGroup;
};

type ServiceEntry = {
  data: {
    title: string;
    slug: string;
    published: boolean;
  };
};

type AreaEntry = {
  data: {
    title: string;
    slug: string;
    published: boolean;
  };
};

type CommunityEntry = {
  data: {
    title: string;
    slug: string;
    citySlug: string;
    published: boolean;
  };
};

export function buildNavMenus(
  services: ServiceEntry[],
  areas: AreaEntry[],
  communities: CommunityEntry[],
): NavMenus {
  const bySlug = new Map(services.map((s) => [s.data.slug, s]));
  const usedSlugs = new Set<string>();

  const servicesChildren: NavMenuItem[] = serviceCategories.map((category) => {
    const children = category.items
      .map((item) => {
        if (!item.serviceSlug) return null;
        const entry = bySlug.get(item.serviceSlug);
        if (entry) {
          usedSlugs.add(item.serviceSlug);
          return {
            label: entry.data.title,
            href: entry.data.published
              ? `/services/${entry.data.slug}/`
              : `/contact/?service=${entry.data.slug}`,
          };
        }
        // Custom static service pages (not content-collection entries)
        if (isCustomServicePage(item.serviceSlug)) {
          usedSlugs.add(item.serviceSlug);
          return {
            label: customServicePages[item.serviceSlug].title,
            href: `/services/${item.serviceSlug}/`,
          };
        }
        return null;
      })
      .filter((child): child is NavMenuItem => child !== null);

    return {
      label: category.title,
      href: `/services/${category.slug}/`,
      children: children.length > 0 ? children : undefined,
    };
  });

  // Any published service missing from categories still appears under an "Other" group
  const orphanServices = services
    .filter((s) => s.data.published && !usedSlugs.has(s.data.slug))
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((entry) => ({
      label: entry.data.title,
      href: `/services/${entry.data.slug}/`,
    }));

  if (orphanServices.length > 0) {
    servicesChildren.push({
      label: 'More services',
      href: '/services/',
      children: orphanServices,
    });
  }

  const publishedAreas = areas.filter((a) => a.data.published);
  const publishedCommunities = communities.filter((c) => c.data.published);

  const serviceAreasChildren: NavMenuItem[] = publishedAreas
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((area) => {
      const cityCommunities = publishedCommunities
        .filter((c) => c.data.citySlug === area.data.slug)
        .sort((a, b) => a.data.title.localeCompare(b.data.title))
        .map((c) => ({
          label: c.data.title,
          href: `/service-areas/${area.data.slug}/${c.data.slug}/`,
        }));

      return {
        label: area.data.title,
        href: `/service-areas/${area.data.slug}/`,
        children: cityCommunities.length > 0 ? cityCommunities : undefined,
      };
    });

  return {
    services: {
      label: 'Services',
      href: '/services/',
      children: servicesChildren,
    },
    serviceAreas: {
      label: 'Service Areas',
      href: '/service-areas/',
      children: serviceAreasChildren,
    },
  };
}
