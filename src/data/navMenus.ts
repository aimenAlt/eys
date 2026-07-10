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
  const publishedAreas = areas.filter((a) => a.data.published);
  const publishedCommunities = communities.filter((c) => c.data.published);

  const servicesChildren: NavMenuItem[] = services
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .map((entry) => ({
      label: entry.data.title,
      href: entry.data.published
        ? `/services/${entry.data.slug}/`
        : `/contact/?service=${entry.data.slug}`,
    }));

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
