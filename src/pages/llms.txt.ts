import type { APIRoute } from 'astro';
import { business, site } from '../data/business';

/**
 * /llms.txt — plain-text pointer for AI assistants: who EYS is, where it
 * works, and how an assistant can send a service request (the AI-intake doors
 * in functions/). Built from business.ts so the phone and service areas never
 * drift. No prices, hours, reviews or other claims.
 */
const areas = business.areaServed;
const areaLine = `${areas.slice(0, -1).join(', ')} & ${areas[areas.length - 1]}`;

const body = `# ${site.name}

> Handyman and home-improvement company based in Katy, Texas (${site.shortName} for short). Phone: ${site.phone}.

Service areas: ${areaLine}, Texas.

## Requesting service through an AI assistant

An assistant helping a customer can send a service request straight to ${site.shortName}:

- MCP server (Streamable HTTP, no authentication): ${site.url}/mcp — tools \`get_business_info\` and \`submit_service_request\`.
- HTTP API (OpenAPI 3.1): ${site.url}/api/ai/openapi.json — \`GET /api/ai/info\` and \`POST /api/ai/service-requests\`.

Collect every detail from the customer and never guess one. Call first with \`confirmed_by_customer: false\` to check the details, read them back to the customer, and send with \`true\` only after the customer says yes. A request is not a booking. If the customer would rather talk, give ${site.phone}.

## Website

- [Services](${site.url}/services/)
- [Service areas](${site.url}/service-areas/)
- [Book or request service](${site.url}/book/)
- [Contact](${site.url}/contact/)
`;

export const GET: APIRoute = () =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
