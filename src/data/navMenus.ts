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
        // Custom static landings win (e.g. media-walls) even if an unpublished MD entry exists
        if (isCustomServicePage(item.serviceSlug)) {
          usedSlugs.add(item.serviceSlug);
          return {
            label: customServicePages[item.serviceSlug].title,
            href: `/services/${item.serviceSlug}/`,
          };
        }
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
        return null;
      })
      .filter((child): child is NavMenuItem => child !== null);

    // NAV CUT 2026-09-13: the dropdown used to enumerate all 26 service pages and
    // every city and community, putting 57 destinations on all 82 pages. That is
    // what made internal PageRank uniform - every URL carried 79-83 inbound links
    // and nothing signalled what mattered. The category hub is the only child
    // now; `children` is still computed above so the hub pages, which do list
    // every service in crawlable body content, stay the discovery path.
    void children;
    return {
      label: category.title,
      href: `/services/${category.slug}/`,
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

  // Deliberately NOT pushed into the nav: that group re-adds one leaf per
  // published service, which is the uniformity this cut removes. /services/
  // lists all of them in body content.
  void orphanServices;

  const publishedAreas = areas.filter((a) => a.data.published);
  const publishedCommunities = communities.filter((c) => c.data.published);

  // NAV CUT 2026-09-13: the 5 city pages and 12 community pages are out of the
  // sitewide nav entirely. The community pages carried zero impressions each over
  // sixteen months and have no business flattening the graph on every page; they
  // are conversion assets reached from their city page, and every city page is
  // reached from /service-areas/. Header renders this as a plain link now, so the
  // empty group is intentional rather than a dropdown with nothing in it.
  void publishedAreas;
  void publishedCommunities;
  const serviceAreasChildren: NavMenuItem[] = [];

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
