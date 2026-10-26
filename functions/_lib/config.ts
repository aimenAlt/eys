/**
 * Business facts the AI-intake functions repeat to assistants.
 *
 * These MIRROR the site's single sources; they are not new sources. Workers
 * cannot import src/data/business.ts (it reaches import.meta.env through
 * images.ts), so the few constants needed here are copied, and
 * functions/_tests/drift.test.ts fails the moment any of them stops matching
 * business.ts, serviceCategories.ts, ServicePathwaysSection.astro or the
 * service-area content. Prices are never copied: they are imported from the
 * pure pricing module.
 */

export const BUSINESS = {
  name: 'Elevate Your Space Handyman',
  shortName: 'EYS',
  phone: '(346) 820-1629',
  phoneTel: '3468201629',
  website: 'https://www.eyshandyman.com',
} as const;

/** business.areaServed, in the site's order: Katy first, Fulshear its default partner. */
export const SERVICE_AREAS = ['Katy', 'Fulshear', 'Cypress', 'Richmond', 'West Houston'] as const;

/** "Katy, Fulshear, Cypress, Richmond and West Houston" (or "... or West Houston"). */
export function serviceAreaList(conjunction: 'and' | 'or'): string {
  return `${SERVICE_AREAS.slice(0, -1).join(', ')} ${conjunction} ${SERVICE_AREAS[SERVICE_AREAS.length - 1]}`;
}

/** The three service groups, titles and summaries from src/data/serviceCategories.ts. */
export const SERVICE_GROUPS = [
  {
    name: 'Repairs & Maintenance',
    summary:
      'Reliable repairs for the everyday problems that keep your home from feeling finished, safe, and fully functional.',
  },
  {
    name: 'Installation & Assembly',
    summary:
      'Precise installation work for doors, fixtures, furniture, cabinetry, and the details that make a home more usable.',
  },
  {
    name: 'Home Upgrades & Custom Projects',
    summary:
      'Finish carpentry, room upgrades, and custom home-improvement projects that elevate comfort, function, and appearance.',
  },
] as const;

export const SERVICE_PATHS = ['todo_list_visit', 'photo_estimate', 'custom_project', 'not_sure'] as const;
export type ServicePath = (typeof SERVICE_PATHS)[number];

/**
 * The site's three buying paths, named and described exactly as the homepage
 * pathway cards (ServicePathwaysSection.astro) do, plus "not sure".
 */
export const REQUEST_PATHS: Record<ServicePath, { name: string; best_for: string }> = {
  todo_list_visit: {
    name: 'Handyman To-Do List Visit',
    best_for:
      'Several smaller repairs, installations, and maintenance tasks completed in priority order during one reserved visit',
  },
  photo_estimate: {
    name: 'Free Photo Estimate',
    best_for:
      'Work that can be assessed from clear photographs, measurements, product details, and a written description',
  },
  custom_project: {
    name: 'Custom Project Estimate',
    best_for:
      'Custom carpentry, feature walls, larger repairs, coordinated room upgrades, material planning, or work expected to require multiple visits',
  },
  not_sure: {
    name: 'Not sure yet',
    best_for: 'The customer has not picked a path; EYS will help choose the right one.',
  },
};

/**
 * Every ZIP the site's service-area pages, community pages and city-service
 * pages name, plus the business's own ZIP. A Texas ZIP outside this set is
 * still accepted but flagged for EYS to confirm before scheduling.
 */
export const CORE_SERVICE_ZIPS = [
  '77406',
  '77407',
  '77433',
  '77441',
  '77449',
  '77450',
  '77469',
  '77493',
  '77494',
] as const;

export const SOURCES = ['chatgpt', 'claude', 'gemini', 'copilot', 'perplexity', 'other'] as const;
export type Source = (typeof SOURCES)[number];

/** Label used in the Jobber title prefix, e.g. "[ChatGPT] ...". */
export const SOURCE_LABELS: Record<Source, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  copilot: 'Copilot',
  perplexity: 'Perplexity',
  other: 'AI assistant',
};

/** The OpenAPI description (JSON API and GPT Actions, which collect the service address). */
export const ASSISTANT_INSTRUCTIONS = `You are submitting a request for ${BUSINESS.name}, a Katy, TX handyman and home-improvement company, on behalf of a customer. Collect every field from the customer; never invent or guess one. Read the details back and get an explicit yes before calling with confirmed_by_customer true. Tell the customer that their name, phone, address and job details will be shared with the business so it can contact them. This is a request, not a booking: never promise a price, arrival time, availability or response time, and never claim licenses, insurance, guarantees, reviews or opening hours. If the customer would rather talk, give ${BUSINESS.phone}.`;

/**
 * Returned by MCP initialize / server/discover. The MCP tool collects no
 * address (assistant directories do not allow it): EYS asks on its call.
 */
export const MCP_ASSISTANT_INSTRUCTIONS = `You are submitting a request for ${BUSINESS.name}, a Katy, TX handyman and home-improvement company, on behalf of a customer. Only submit for jobs in or near ${serviceAreaList('or')}, TX. Collect every field from the customer; never invent or guess one. Read the details back and get an explicit yes before calling with confirmed_by_customer true. Tell the customer that their name, phone number and job details will be shared with the business so it can contact them, and that ${BUSINESS.shortName} will ask for the service address when it calls. This is a request, not a booking: never promise a price, arrival time, availability or response time, and never claim licenses, insurance, guarantees, reviews or opening hours. If the customer would rather talk, give ${BUSINESS.phone}.`;
