import type { Env, PagesFunction } from '../../_lib/types.ts';
import { json, methodNotAllowed } from '../../_lib/http.ts';
import { businessInfo } from '../../_lib/info.ts';

/** GET /api/ai/info — same facts as the MCP get_business_info tool. */
export const onRequest: PagesFunction<Env> = ({ request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed(['GET', 'HEAD']);
  return json(businessInfo());
};
