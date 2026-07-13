import { getCollection } from 'astro:content';
import { serviceCategories } from './serviceCategories';
import { customServicePages } from './sitePresentation';

export type SiteMapLink = {
  title: string;
  href: string;
};

export type SiteMapSection = {
  title: string;
  links: SiteMapLink[];
};

const corePages: SiteMapLink[] = [
  { title: 'Home', href: '/' },
  { title: 'About', href: '/about/' },
  { title: 'Book Service', href: '/book/' },
  { title: 'Contact', href: '/contact/' },
  { title: 'Pricing', href: '/pricing/' },
  { title: 'Reviews', href: '/reviews/' },
  { title: 'Services', href: '/services/' },
  { title: 'Service Areas', href: '/service-areas/' },
  { title: 'Projects', href: '/projects/' },
  { title: 'Blog', href: '/blog/' },
  { title: 'Privacy Policy', href: '/privacy/' },
  { title: 'Terms of Service', href: '/terms/' },
];

export async function buildSiteMap(): Promise<{ sections: SiteMapSection[]; totalCount: number }> {
  const [services, serviceAreas, communities, projects, blogPosts, cityServicePages] = await Promise.all([
    getCollection('services', ({ data }) => data.published === true),
    getCollection('serviceAreas', ({ data }) => data.published === true),
    getCollection('communities', ({ data }) => data.published === true),
    getCollection('projects', ({ data }) => data.published === true),
    getCollection('blog', ({ data }) => data.published === true),
    getCollection('cityServices', ({ data }) => data.published === true),
  ]);

  services.sort((a, b) => a.data.title.localeCompare(b.data.title));
  serviceAreas.sort((a, b) => a.data.title.localeCompare(b.data.title));
  communities.sort((a, b) => a.data.title.localeCompare(b.data.title));
  projects.sort((a, b) => a.data.title.localeCompare(b.data.title));
  blogPosts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  const categoryHubs: SiteMapLink[] = serviceCategories.map((category) => ({
    title: category.title,
    href: `/services/${category.slug}/`,
  }));

  const customServiceLinks: SiteMapLink[] = Object.entries(customServicePages).map(
    ([slug, meta]) => ({
      title: meta.title,
      href: `/services/${slug}/`,
    }),
  );

  const serviceLinks: SiteMapLink[] = [
    ...customServiceLinks,
    ...services.map((entry) => ({
      title: entry.data.title,
      href: `/services/${entry.data.slug}/`,
    })),
  ].sort((a, b) => a.title.localeCompare(b.title));

  const cityLinks: SiteMapLink[] = serviceAreas.map((entry) => ({
    title: entry.data.title,
    href: `/service-areas/${entry.data.slug}/`,
  }));

  const communityLinks: SiteMapLink[] = communities.map((entry) => ({
    title: entry.data.title,
    href: `/service-areas/${entry.data.citySlug}/${entry.data.slug}/`,
  }));

  const projectLinks: SiteMapLink[] = projects.map((entry) => ({
    title: entry.data.title,
    href: `/projects/${entry.data.slug}/`,
  }));

  const blogLinks: SiteMapLink[] = blogPosts.map((entry) => ({
    title: entry.data.title,
    href: `/blog/${entry.data.slug}/`,
  }));

  const cityServiceLinks: SiteMapLink[] = cityServicePages
    .sort((a, b) => a.data.heroTitle.localeCompare(b.data.heroTitle))
    .map((entry) => ({
      title: entry.data.heroTitle,
      href: `/${entry.data.legacySlug}/`,
    }));

  const sections: SiteMapSection[] = [
    { title: 'Core Pages', links: corePages },
    { title: 'Service Categories', links: categoryHubs },
    { title: 'Services', links: serviceLinks },
    { title: 'City Service Pages', links: cityServiceLinks },
    { title: 'Cities', links: cityLinks },
    { title: 'Communities', links: communityLinks },
    { title: 'Projects', links: projectLinks },
    { title: 'Blog', links: blogLinks },
  ].filter((section) => section.links.length > 0);

  const totalCount = sections.reduce((sum, section) => sum + section.links.length, 0);

  return { sections, totalCount };
}
