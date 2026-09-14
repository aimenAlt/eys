import { business } from './business';
import { withVehicleWrapUtm } from '../utils/utm';

/** Campaign constants for the ProMaster rear QR landing page. */
export const vanCampaign = {
  campaign: 'promaster_rear_2026',
  source: 'vehicle_wrap',
  medium: 'qr',
  /** E.164 for van landing tap-to-call (spec requires +1). */
  phoneTel: `+1${business.phoneTel}`,
  phoneDisplay: business.phone,
} as const;

function attributed(raw: string | undefined, content: string): string | undefined {
  const url = raw?.trim();
  return url ? withVehicleWrapUtm(url, content) : undefined;
}

/**
 * Van-page Jobber destinations built from raw hub URLs so vehicle-wrap UTMs
 * are not overwritten by the default website/referral getters.
 */
export const vanDestinations = {
  handymanBooking: attributed(business.jobber.handymanToDoListFormUrl, 'todo-list'),
  photoEstimate: attributed(business.jobber.projectEstimateFormUrl, 'photo_estimate'),
  customProject: attributed(business.jobber.projectEstimateFormUrl, 'custom_project'),
  tvMounting: attributed(business.jobber.onlineBookingUrl, 'tv_mounting'),
} as const;

/**
 * Photography for `/van/`.
 *
 * The page is reached by scanning a QR code off the van, so a visitor is
 * standing on a sidewalk on cellular data. Stills only — no video here, unlike
 * `/start/`: the media wall clip is 1.8MB and would spend that budget before
 * the first tap. Every frame is a finished EYS job, one per service path, so
 * each card shows the kind of work its button actually books.
 */
export const vanImages = {
  hero: {
    src: '/images/home/hero.jpg',
    alt: 'Finished two-tone kitchen remodel with sage island, white uppers, quartz counters, and gold fixtures',
    width: 1400,
    height: 1050,
  },
  routes: {
    handymanBooking: {
      src: '/images/projects/vaulted-crystal-chandelier/eys-fixture-installation-vaulted-living-crystal-chandelier-after-p008-01.jpg',
      alt: 'Crystal chandelier installed on a vaulted living-room ceiling',
      width: 1200,
      height: 1600,
    },
    photoEstimate: {
      src: '/images/projects/navy-office-builtins/eys-door-repair-installation-french-doors-sidelights-transom-after-p006-02.jpg',
      alt: 'White French doors with sidelights, transom, and fluted casing opening to a navy office',
      width: 3000,
      height: 4000,
    },
    customProject: {
      src: '/images/projects/marble-wood-slat-feature-wall/eys-custom-project-living-room-marble-wood-slat-wall-after-p002-01.jpg',
      alt: 'Custom marble and wood-slat feature wall completed in a living room',
      width: 3000,
      height: 4000,
    },
  },
  /** Proof strip. Captions matter — an uncaptioned thumbnail says nothing about scope. */
  proof: [
    {
      src: '/images/projects/double-height-curtains/eys-general-handyman-double-height-sheer-curtains-after-p023-04.jpg',
      alt: 'Floor-to-ceiling sheer white curtains installed on tall living-room windows',
      width: 1200,
      height: 1600,
      label: 'High-Ceiling Curtains',
    },
    {
      src: '/images/projects/understair-curved-shelving/eys-shelving-storage-under-stair-curved-shelving-after-p007-01.jpg',
      alt: 'Custom curved shelving built into an under-stair alcove',
      width: 2295,
      height: 3060,
      label: 'Built-In Shelving',
    },
    {
      src: '/images/projects/marble-wood-slat-feature-wall/eys-custom-project-living-room-marble-wood-slat-wall-after-p002-01.jpg',
      alt: 'Custom marble and wood-slat feature wall completed in a living room',
      width: 3000,
      height: 4000,
      label: 'Feature Wall & Media Wall',
    },
  ],
} as const;

export type VanRouteId = 'handyman_booking' | 'photo_estimate' | 'custom_project';

export type VanProjectId =
  | 'tv_mounting'
  | 'curtains_tracks'
  | 'lighting_fans'
  | 'drywall_painting'
  | 'doors_cabinets'
  | 'media_walls';
