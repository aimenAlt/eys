import type { Env, PagesFunction } from '../../_lib/types.ts';
import { json, methodNotAllowed, readJsonBody } from '../../_lib/http.ts';
import { intakeDeps, submitServiceRequest } from '../../_lib/intake.ts';

/**
 * POST /api/ai/service-requests — the JSON door. Same body and response as
 * the MCP submit_service_request tool. Business outcomes are always HTTP 200;
 * callers read `status`.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  const body = await readJsonBody(request);
  if (!body.ok) return json({ error: body.error }, body.status);
  return json(await submitServiceRequest(body.value, intakeDeps(env, request)));
};
