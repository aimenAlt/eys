/** Astro `base` (always ends with `/`). Root deploys use `/`. */
export function baseUrl(): string {
  return import.meta.env.BASE_URL || '/';
}

/** Strip the configured base prefix so path compares stay site-root relative. */
export function stripBasePath(pathname: string): string {
  const base = baseUrl().replace(/\/$/, '');
  if (!base) return pathname || '/';
  if (pathname === base || pathname === `${base}/`) return '/';
  if (pathname.startsWith(`${base}/`)) {
    const rest = pathname.slice(base.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname || '/';
}

/**
 * Prefix an internal path with Astro `base` for GitHub Pages project URLs.
 * Leaves absolute http(s), mailto, tel, and hash-only links alone.
 */
export function withBase(path: string): string {
  if (
    !path ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:') ||
    path.startsWith('//')
  ) {
    return path;
  }

  if (path.startsWith('#')) return path;

  const hashIndex = path.indexOf('#');
  if (hashIndex !== -1) {
    const pathname = path.slice(0, hashIndex) || '/';
    const hash = path.slice(hashIndex);
    return `${withBase(pathname)}${hash}`;
  }

  const base = baseUrl();
  const clean = path.replace(/^\//, '');
  return `${base}${clean}`;
}
