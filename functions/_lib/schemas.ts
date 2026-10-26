import { ASSISTANT_INSTRUCTIONS, BUSINESS, REQUEST_PATHS, SERVICE_PATHS, SOURCES, serviceAreaList } from './config.ts';
import { LIMITS } from './validate.ts';

/**
 * JSON Schemas shared by the MCP tool definitions and the OpenAPI document.
 * Every description tells the assistant to ask the customer, never guess.
 */

const ASK = 'Ask the customer; never guess or invent it.';

const pathDescriptions = SERVICE_PATHS.map(
  (id) => `${id} = ${REQUEST_PATHS[id].name}: ${REQUEST_PATHS[id].best_for}`,
).join('; ');

export const SERVICE_REQUEST_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
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
  ],
  properties: {
    customer_name: {
      type: 'string',
      maxLength: LIMITS.name,
      description: `The customer's first and last name. ${ASK}`,
    },
    phone: {
      type: 'string',
      maxLength: LIMITS.phone,
      description: `The customer's 10-digit US phone number (area code included, any format) where EYS can reach them. ${ASK}`,
    },
    email: {
      type: 'string',
      maxLength: LIMITS.email,
      description: "Optional. The customer's email address, only if the customer gives one. Never guess it.",
    },
    street_address: {
      type: 'string',
      minLength: LIMITS.streetMin,
      maxLength: LIMITS.street,
      description: `House number and street where the work is (plus unit, if any). Not a PO box. ${ASK}`,
    },
    city: {
      type: 'string',
      minLength: LIMITS.cityMin,
      maxLength: LIMITS.city,
      description: `City of the job address. ${ASK}`,
    },
    state: {
      type: 'string',
      description: `State of the job address. ${BUSINESS.name} only serves Texas, so this is TX. If the job is outside Texas, do not submit; give the customer ${BUSINESS.phone}.`,
    },
    zip: {
      type: 'string',
      pattern: '^[0-9]{5}(-[0-9]{4})?$',
      description: `5-digit ZIP code of the job address. ${ASK}`,
    },
    service_summary: {
      type: 'string',
      minLength: LIMITS.summaryMin,
      maxLength: LIMITS.summary,
      description: `A few words naming the job, in the customer's words, e.g. "Mount a 65-inch TV and hide the wires". ${ASK}`,
    },
    job_details: {
      type: 'string',
      minLength: LIMITS.detailsMin,
      maxLength: LIMITS.details,
      description:
        "What needs doing, in the customer's own words: the tasks, rooms, sizes, and any materials they already have. If the job involves electrical work, include the details; EYS will explain what it can take on. Never add details the customer did not give.",
    },
    service_path: {
      type: 'string',
      enum: [...SERVICE_PATHS],
      description: `The request path, chosen with the customer. ${pathDescriptions}.`,
    },
    preferred_timing: {
      type: 'string',
      maxLength: LIMITS.timing,
      description: 'Optional. When the customer would like the work done, in their words. A preference, not a booking.',
    },
    contact_preference: {
      type: 'string',
      enum: ['call', 'text', 'email'],
      description: 'Optional. How the customer prefers to be contacted. Ask; never assume.',
    },
    consent_to_contact: {
      type: 'boolean',
      description: `true only if the customer agreed that ${BUSINESS.name} may contact them about this request using the details given. Ask the customer.`,
    },
    confirmed_by_customer: {
      type: 'boolean',
      description:
        'false = only check the details; nothing is sent or stored. true = send the request, ONLY after you read every detail back to the customer and they said yes.',
    },
    source: {
      type: 'string',
      enum: [...SOURCES],
      description: 'Which assistant is submitting. Use other if none of these.',
    },
    request_id: {
      type: 'string',
      format: 'uuid',
      description:
        'Optional. A UUID you generate once for this request and reuse on every retry, so it is never sent twice within 24 hours.',
    },
  },
} as const;

/**
 * The MCP tool's input: the same fields minus the service address, which
 * assistant directories do not allow a tool to request; EYS asks for it on
 * its call. The customer attests the job is in the service area instead.
 */
const { street_address: _street, city: _city, state: _state, zip: _zip, ...ADDRESS_FREE_PROPERTIES } =
  SERVICE_REQUEST_INPUT_SCHEMA.properties;
const ADDRESS_FIELDS: readonly string[] = ['street_address', 'city', 'state', 'zip'];

export const MCP_SERVICE_REQUEST_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    ...SERVICE_REQUEST_INPUT_SCHEMA.required.filter((field) => !ADDRESS_FIELDS.includes(field)),
    'service_area_confirmed',
  ],
  properties: {
    ...ADDRESS_FREE_PROPERTIES,
    service_area_confirmed: {
      type: 'boolean',
      description: `true only if the customer said the job is in or near ${serviceAreaList('or')}, TX. If the job is elsewhere, do not submit; give the customer ${BUSINESS.phone}.`,
    },
  },
} as const;

export const SERVICE_REQUEST_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'errors', 'reference', 'message_for_customer', 'next_steps'],
  properties: {
    status: {
      type: 'string',
      enum: ['needs_changes', 'ready_to_submit', 'submitted', 'unavailable'],
      description:
        'needs_changes: fix the listed fields with the customer. ready_to_submit: details are complete; confirm with the customer, then call with confirmed_by_customer true. submitted: the request reached EYS. unavailable: give the customer the phone number.',
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'problem'],
        properties: { field: { type: 'string' }, problem: { type: 'string' } },
      },
    },
    reference: {
      type: ['string', 'null'],
      description: 'EYS-AI-xxxxx once the request has been sent; null otherwise.',
    },
    message_for_customer: {
      type: 'string',
      description: 'One plain sentence to pass on to the customer.',
    },
    next_steps: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const BUSINESS_INFO_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['business_name', 'phone', 'service_areas', 'service_groups', 'request_paths', 'todo_list_visit_pricing'],
  properties: {
    business_name: { type: 'string' },
    short_name: { type: 'string' },
    phone: { type: 'string' },
    website: { type: 'string' },
    based_in: { type: 'string' },
    service_areas: { type: 'array', items: { type: 'string' } },
    service_groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, summary: { type: 'string' } },
      },
    },
    request_paths: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' }, best_for: { type: 'string' } },
      },
    },
    todo_list_visit_pricing: { type: 'object' },
    how_to_request: { type: 'string' },
  },
} as const;

export const SUBMIT_DESCRIPTION = `Send a service request to ${BUSINESS.name} (Katy, TX) on the customer's behalf; it lands in the business's job list and EYS contacts the customer. Call first with confirmed_by_customer false to check the details, then with true only after the customer confirms. Never guess a field. Not a booking: no price, time or availability is promised.`;

export const MCP_SUBMIT_DESCRIPTION = `Send a service request to ${BUSINESS.name} (Katy, TX) for the customer: their name, phone number, optional email and a description of the job go to the business's job list, and ${BUSINESS.shortName} asks for the service address when it calls the customer back. Call first with confirmed_by_customer false to check the details, then with true only after the customer confirms them. Never guess a field. Not a booking: no price, time or availability is promised.`;

export const INFO_DESCRIPTION =`Facts about ${BUSINESS.name}: phone, service groups, service areas, the request paths, and Handyman To-Do List Visit flat visit prices. Read-only.`;

const ERROR_SCHEMA = {
  type: 'object',
  properties: { error: { type: 'string' } },
} as const;

/** OpenAPI 3.1 for GPT Actions and other HTTP callers. */
export function openApiDocument(origin: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: `${BUSINESS.name} — service requests`,
      version: '1.0.0',
      description: ASSISTANT_INSTRUCTIONS,
    },
    servers: [{ url: origin }],
    paths: {
      '/api/ai/info': {
        get: {
          operationId: 'getBusinessInfo',
          summary: 'Business facts',
          description: INFO_DESCRIPTION,
          responses: {
            '200': {
              description: 'Business facts.',
              content: { 'application/json': { schema: BUSINESS_INFO_OUTPUT_SCHEMA } },
            },
          },
        },
      },
      '/api/ai/service-requests': {
        post: {
          operationId: 'submitServiceRequest',
          summary: 'Check or send a service request',
          description: `${SUBMIT_DESCRIPTION} Every outcome returns HTTP 200; read status.`,
          'x-openai-isConsequential': true,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: SERVICE_REQUEST_INPUT_SCHEMA } },
          },
          responses: {
            '200': {
              description: 'The outcome; read status.',
              content: { 'application/json': { schema: SERVICE_REQUEST_OUTPUT_SCHEMA } },
            },
            '400': { description: 'Body is not JSON.', content: { 'application/json': { schema: ERROR_SCHEMA } } },
            '413': { description: 'Body over 16 KB.', content: { 'application/json': { schema: ERROR_SCHEMA } } },
            '415': {
              description: 'Content-Type is not application/json.',
              content: { 'application/json': { schema: ERROR_SCHEMA } },
            },
          },
        },
      },
    },
  };
}
