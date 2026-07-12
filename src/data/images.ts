import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { absoluteUrl } from './business';

const LOCAL_OG = '/images/og-default.jpg';

/** Neutral branded placeholder shown until real photos are uploaded to public/images/. */
export const imagePlaceholder = '/images/placeholder.svg';

const assetsBase = import.meta.env.PUBLIC_ASSETS_BASE_URL?.replace(/\/$/, '') ?? '';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../../public');

/**
 * True when a site-relative asset path exists in public/ at build time.
 * When assets are served from a remote base (R2), we assume they exist.
 */
function localAssetExists(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (assetsBase) return true;
  return existsSync(join(publicDir, path));
}

/**
 * Resolve an image path to a usable src, falling back to the branded placeholder
 * when a local file has not been uploaded yet. Full URLs pass through untouched.
 */
export function imageOrPlaceholder(path?: string, fallback = imagePlaceholder): string {
  const raw = path?.trim();
  if (!raw) return fallback;
  if (raw.startsWith('http')) return raw;
  return localAssetExists(raw) ? assetUrl(raw) : fallback;
}

/** True when a real image (uploaded local file or remote URL) is available. */
export function hasImage(path?: string): boolean {
  const raw = path?.trim();
  if (!raw) return false;
  if (raw.startsWith('http')) return true;
  return localAssetExists(raw);
}

export function assetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (assetsBase) return `${assetsBase}${normalized}`;
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${normalized.replace(/^\//, '')}`;
}

/** Resolve local path to absolute URL for OG/meta; relative paths work in img src via resolveHeroImage. */
export function resolveAssetPath(path: string): string {
  if (path.startsWith('http')) return path;
  return absoluteUrl(path.startsWith('/') ? path : `/${path}`);
}

export const defaultOgImage = LOCAL_OG;

export const cityHeroImages: Record<string, string> = {
  katy: '/images/heroes/katy.jpg',
  cypress: '/images/heroes/cypress.jpg',
  fulshear: '/images/heroes/fulshear.jpg',
  richmond: '/images/heroes/richmond.jpg',
  'west-houston': '/images/heroes/west-houston.jpg',
};

export const serviceHeroImages: Record<string, string> = {
  'tv-mounting': '/images/services/tv-mounting.jpg',
  'ceiling-fan-installation': '/images/services/ceiling-fan.jpg',
  'general-handyman-services': '/images/services/general-handyman.jpg',
  'furniture-assembly': '/images/services/furniture-assembly.jpg',
  'drywall-repair': '/images/services/drywall-repair.jpg',
  painting: '/images/services/painting.jpg',
  'door-repair-installation': '/images/services/door-install.jpg',
  'electrical-services': '/images/services/electrical.jpg',
  'cabinet-installation': '/images/services/cabinet-install.jpg',
  'bathroom-remodeling': '/images/services/bathroom-remodel.jpg',
  'kitchen-remodeling': '/images/services/kitchen-remodel.jpg',
  'flooring-and-decor': '/images/services/flooring.jpg',
  'custom-carpentry': '/images/services/custom-carpentry.jpg',
  'curtain-installation': '/images/services/curtain-install.jpg',
};

export const categoryHeroImages: Record<string, string> = {
  'repairs-and-maintenance': '/images/categories/repairs-installs.jpg',
  'installation-and-assembly': '/images/categories/repairs-installs.jpg',
  'remodeling-and-upgrades': '/images/categories/remodeling.jpg',
};

export const homeImages = {
  whoWeAre1: '/images/home/who-we-are-1.jpg',
  whoWeAre2: '/images/home/who-we-are-2.jpg',
  whyChooseUsBg: '/images/home/why-choose-us-bg.jpg',
  ctaBg: '/images/home/cta-bg.jpg',
};

export function resolveCityHero(citySlug?: string, override?: string): string {
  if (override?.trim()) return imageOrPlaceholder(override);
  if (citySlug && cityHeroImages[citySlug]) return imageOrPlaceholder(cityHeroImages[citySlug]);
  return imagePlaceholder;
}

export function resolveServiceHero(serviceSlug?: string, override?: string): string {
  if (override?.trim()) return imageOrPlaceholder(override);
  if (serviceSlug && serviceHeroImages[serviceSlug]) return imageOrPlaceholder(serviceHeroImages[serviceSlug]);
  return imagePlaceholder;
}
