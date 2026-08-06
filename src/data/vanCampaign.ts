import { business } from './business';
import { withVehicleWrapUtm } from '../utils/utm';

/** Campaign constants for the ProMaster rear QR landing page. */
export const vanCampaign = {
  campaign: 'promaster_rear_2026',
  source: 'vehicle_wrap',
  medium: 'qr',
  /** E.164 for van landing tap-to-call (spec requires +1). */
  phoneTel: '+13468201629',
  phoneDisplay: '(346) 820-1629',
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

export type VanRouteId = 'handyman_booking' | 'photo_estimate' | 'custom_project';

export type VanProjectId =
  | 'tv_mounting'
  | 'curtains_tracks'
  | 'lighting_fans'
  | 'drywall_painting'
  | 'doors_cabinets'
  | 'media_walls';
