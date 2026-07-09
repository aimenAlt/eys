export type NavItem = {
  label: string;
  href: string;
};

export const mainNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'Services', href: '/services/' },
  { label: 'Service Areas', href: '/service-areas/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Contact', href: '/contact/' },
];

export const footerNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about/' },
  { label: 'Services', href: '/services/' },
  { label: 'Service Areas', href: '/service-areas/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Pricing', href: '/pricing/' },
  { label: 'Reviews', href: '/reviews/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contact Us', href: '/contact/' },
];

export const homeSectionNav: NavItem[] = [
  { label: 'About', href: '/#about' },
  { label: 'Gallery', href: '/#gallery' },
];

export function normalizePath(path: string): string {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

export function isNavActive(href: string, pathname: string): boolean {
  const hashIndex = href.indexOf('#');
  if (hashIndex !== -1) {
    const base = href.slice(0, hashIndex) || '/';
    return normalizePath(pathname) === normalizePath(base);
  }
  return normalizePath(pathname) === normalizePath(href);
}
