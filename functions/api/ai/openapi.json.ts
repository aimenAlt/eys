import type { Env, PagesFunction } from '../../_lib/types.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';
import { openApiDocument } from '../../_lib/schemas.ts';

/** GET /api/ai/openapi.json — OpenAPI 3.1 for GPT Actions and HTTP callers. */
export const onRequest: PagesFunction<Env> = ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed(['GET', 'HEAD']);
  return json(openApiDocument(new URL(request.url).origin));
};
