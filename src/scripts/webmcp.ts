/**
 * WebMCP: offers this site's two AI-intake tools to a browser's built-in
 * agent (Web Model Context API, W3C WebML CG draft of 20 Oct 2026;
 * https://webmachinelearning.github.io/webmcp/).
 *
 * Does nothing unless the browser exposes `document.modelContext` (or
 * `navigator.modelContext`, the name early Chrome previews used). No network
 * on load and no cookies: a tool calls the same-origin AI-intake API only when
 * an agent runs it. Never throws; never touches analytics.
 *
 * The enums and required fields mirror functions/_lib (the server validates
 * every call anyway); functions/_tests/webmcp.test.ts fails if they drift.
 */

type ModelContext = { registerTool(tool: object, options?: object): unknown };
type ExecuteOptions = { signal?: AbortSignal };

const str = { type: 'string' };
const SERVICE_PATHS = ['todo_list_visit', 'photo_estimate', 'custom_project', 'not_sure'];
const SOURCES = ['chatgpt', 'claude', 'gemini', 'copilot', 'perplexity', 'other'];

export const REQUIRED = [
  'customer_name',
  'phone',
  'street_address',
  'city',
  'state',
  'zip',
  'service_summary',
  'job_details',
  'service_path',
  'consent_to_contact',
  'confirmed_by_customer',
  'source',
];

async function call(path: string, body: unknown, options?: ExecuteOptions): Promise<string> {
  try {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options?.signal,
    });
    return await response.text();
  } catch {
    return JSON.stringify({
      status: 'unavailable',
      next_steps: ['The request could not be sent from this page. Give the customer the phone number shown on the page.'],
    });
  }
}

export const TOOLS = [
  {
    name: 'get_business_info',
    title: 'Get business info',
    description:
      "This business's phone, service areas, service groups, request paths and Handyman To-Do List Visit flat visit prices.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: (_input: unknown, options?: ExecuteOptions) => call('/api/ai/info', undefined, options),
  },
  {
    name: 'submit_service_request',
    title: 'Submit a service request',
    description:
      'Send a service request to this business for the customer. Ask the customer for every field and never guess one. Call first with confirmed_by_customer false, read the details back, and call again with true only after the customer says yes. Texas addresses only (state TX). A request, not a booking: never promise a price, arrival time or availability.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: REQUIRED,
      properties: {
        customer_name: str,
        phone: str,
        email: str,
        street_address: str,
        city: str,
        state: str,
        zip: str,
        service_summary: str,
        job_details: str,
        service_path: { type: 'string', enum: SERVICE_PATHS },
        preferred_timing: str,
        contact_preference: { type: 'string', enum: ['call', 'text', 'email'] },
        consent_to_contact: { type: 'boolean' },
        confirmed_by_customer: { type: 'boolean' },
        source: { type: 'string', enum: SOURCES },
        request_id: str,
      },
    },
    annotations: { consequentialHint: true },
    execute: (input: unknown, options?: ExecuteOptions) => call('/api/ai/service-requests', input ?? {}, options),
  },
];

function register(): void {
  if (typeof document === 'undefined') return;
  const context =
    (document as Document & { modelContext?: ModelContext }).modelContext ??
    (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  if (!context || typeof context.registerTool !== 'function') return;
  for (const tool of TOOLS) {
    try {
      // Current builds return a Promise; early previews returned nothing.
      Promise.resolve(context.registerTool(tool)).catch(() => {});
    } catch {
      // Registration refused (e.g. permissions policy): the page works as before.
    }
  }
}

register();
