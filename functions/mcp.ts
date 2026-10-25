import type { Env, PagesFunction } from './_lib/types.ts';
import { intakeDeps } from './_lib/intake.ts';
import { handleMcp } from './_lib/mcp.ts';

/** POST /mcp — the MCP door (ChatGPT developer mode, Claude, other MCP clients). */
export const onRequest: PagesFunction<Env> = ({ request, env }) => handleMcp(request, intakeDeps(env, request));
