import {
  additionalTimeLabel,
  formatUsd,
  smallRepairPricing,
} from '../../src/data/pricing/todoList.ts';
import {
  BUSINESS,
  REQUEST_PATHS,
  SERVICE_AREAS,
  SERVICE_GROUPS,
  SERVICE_PATHS,
} from './config.ts';

/**
 * get_business_info / GET /api/ai/info. Only facts already published on the
 * site; no hours, reviews, licenses, guarantees or response times.
 */
export function businessInfo() {
  return {
    business_name: BUSINESS.name,
    short_name: BUSINESS.shortName,
    phone: BUSINESS.phone,
    website: BUSINESS.website,
    based_in: 'Katy, TX',
    service_areas: [...SERVICE_AREAS],
    service_groups: SERVICE_GROUPS.map((group) => ({ ...group })),
    request_paths: SERVICE_PATHS.map((id) => ({ id, ...REQUEST_PATHS[id] })),
    todo_list_visit_pricing: {
      path: REQUEST_PATHS.todo_list_visit.name,
      starting_at: formatUsd(smallRepairPricing.oneHour),
      flat_visit_blocks: [
        { visit: 'One-hour visit', price: formatUsd(smallRepairPricing.oneHour) },
        { visit: 'Two-hour visit', price: formatUsd(smallRepairPricing.twoHours) },
        { visit: 'Three-hour visit', price: formatUsd(smallRepairPricing.threeHours) },
      ],
      additional_time: additionalTimeLabel,
      notes: [
        'Tasks are completed in priority order during the reserved visit.',
        'Materials and specialty equipment are additional.',
      ],
      how_to_describe:
        'Describe these as flat visit blocks with a set price per visit length, never as an hourly rate. Other work is priced by estimate after EYS reviews the request.',
    },
    how_to_request:
      'Collect the details from the customer and call submit_service_request (MCP) or POST /api/ai/service-requests: first with confirmed_by_customer false to check them, then with true only after the customer confirms. Or the customer can call the phone number.',
  };
}

export type BusinessInfo = ReturnType<typeof businessInfo>;
