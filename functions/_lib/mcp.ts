import { ASSISTANT_INSTRUCTIONS, BUSINESS } from './config.ts';
import { empty, json, readJsonBody } from './http.ts';
import { businessInfo } from './info.ts';
import { submitServiceRequest, type IntakeDeps } from './intake.ts';
import {
  BUSINESS_INFO_OUTPUT_SCHEMA,
  INFO_DESCRIPTION,
  SERVICE_REQUEST_INPUT_SCHEMA,
  SERVICE_REQUEST_OUTPUT_SCHEMA,
  SUBMIT_DESCRIPTION,
} from './schemas.ts';

/**
 * Stateless MCP server over Streamable HTTP, JSON responses only (no SSE,
 * no sessions, no GET stream).
 *
 * Dual-era, per the 2026-07-28 spec's backward-compatibility rules:
 * - Modern requests carry `_meta["io.modelcontextprotocol/protocolVersion"]`
 *   plus the MCP-Protocol-Version / Mcp-Method / Mcp-Name headers; they are
 *   validated and served per request, and `server/discover` is implemented.
 * - Legacy clients (2025-11-25 and earlier — ChatGPT and most clients today)
 *   open with `initialize`; the version is negotiated and the instructions are
 *   returned there. No session id is ever minted.
 */

export const MODERN_VERSIONS = ['2026-07-28'] as const;
export const LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'] as const;

const META_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';
const LIST_TTL_MS = 60 * 60_000;

/** Web origins an assistant's own MCP client might send. Anything else → 403. */
const ASSISTANT_ORIGINS = new Set([
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://claude.ai',
  'https://gemini.google.com',
  'https://copilot.microsoft.com',
  'https://www.perplexity.ai',
]);

const SERVER_INFO = {
  name: 'eys-handyman',
  title: BUSINESS.name,
  version: '1.0.0',
  websiteUrl: BUSINESS.website,
};

const ERRORS = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
  headerMismatch: -32020,
  unsupportedVersion: -32022,
} as const;

export const TOOLS = [
  {
    name: 'get_business_info',
    title: 'Get business info',
    description: INFO_DESCRIPTION,
    inputSchema: { type: 'object', additionalProperties: false },
    outputSchema: BUSINESS_INFO_OUTPUT_SCHEMA,
    annotations: {
      title: 'Get business info',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'submit_service_request',
    title: 'Submit a service request',
    description: SUBMIT_DESCRIPTION,
    inputSchema: SERVICE_REQUEST_INPUT_SCHEMA,
    outputSchema: SERVICE_REQUEST_OUTPUT_SCHEMA,
    annotations: {
      title: 'Submit a service request',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
];

type Id = string | number | null;

interface RpcMessage {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

interface Outcome {
  status: number;
  body: unknown | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rpcError(id: Id, code: number, message: string, data?: unknown) {
  return { jsonrpc: '2.0', id, error: data === undefined ? { code, message } : { code, message, data } };
}

function rpcResult(id: Id, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

/** Decodes the `=?base64?…?=` sentinel used for non-ASCII header values. */
function decodeHeaderValue(value: string | null): string | null {
  if (value === null) return null;
  const match = /^=\?base64\?(.*)\?=$/.exec(value);
  if (!match) return value;
  try {
    const binary = atob(match[1]);
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

async function callTool(name: unknown, args: unknown, intake: IntakeDeps): Promise<Record<string, unknown> | null> {
  if (name === 'get_business_info') {
    const info = businessInfo();
    return { content: [{ type: 'text', text: JSON.stringify(info) }], structuredContent: info, isError: false };
  }
  if (name === 'submit_service_request') {
    const outcome = await submitServiceRequest(isRecord(args) ? args : {}, intake);
    return {
      content: [{ type: 'text', text: JSON.stringify(outcome) }],
      structuredContent: outcome,
      isError: outcome.status === 'needs_changes' || outcome.status === 'unavailable',
    };
  }
  return null;
}

function initializeResult(params: Record<string, unknown>) {
  const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
  const protocolVersion = (LEGACY_VERSIONS as readonly string[]).includes(requested) ? requested : LEGACY_VERSIONS[0];
  return {
    protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: SERVER_INFO,
    instructions: ASSISTANT_INSTRUCTIONS,
  };
}

async function legacy(id: Id, method: string, params: Record<string, unknown>, intake: IntakeDeps): Promise<Outcome> {
  switch (method) {
    case 'initialize':
      return { status: 200, body: rpcResult(id, initializeResult(params)) };
    case 'ping':
      return { status: 200, body: rpcResult(id, {}) };
    case 'tools/list':
      return { status: 200, body: rpcResult(id, { tools: TOOLS }) };
    case 'tools/call': {
      const result = await callTool(params.name, params.arguments, intake);
      if (!result) return { status: 200, body: rpcError(id, ERRORS.invalidParams, `Unknown tool: ${String(params.name)}`) };
      return { status: 200, body: rpcResult(id, result) };
    }
    default:
      return { status: 200, body: rpcError(id, ERRORS.methodNotFound, `Method not found: ${method}`) };
  }
}

async function modern(
  id: Id,
  method: string,
  version: string,
  params: Record<string, unknown>,
  request: Request,
  intake: IntakeDeps,
): Promise<Outcome> {
  const mismatch = (message: string): Outcome => ({ status: 400, body: rpcError(id, ERRORS.headerMismatch, message) });
  const header = request.headers.get('MCP-Protocol-Version');
  if (header === null) return mismatch('Header mismatch: MCP-Protocol-Version header is required.');
  if (header !== version) {
    return mismatch(`Header mismatch: MCP-Protocol-Version '${header}' does not match _meta '${version}'.`);
  }
  if (!(MODERN_VERSIONS as readonly string[]).includes(version)) {
    return {
      status: 400,
      body: rpcError(id, ERRORS.unsupportedVersion, 'Unsupported protocol version', {
        supported: [...MODERN_VERSIONS],
        requested: version,
      }),
    };
  }
  const methodHeader = request.headers.get('Mcp-Method');
  if (methodHeader !== method) {
    return mismatch(
      methodHeader === null
        ? 'Header mismatch: Mcp-Method header is required.'
        : `Header mismatch: Mcp-Method '${methodHeader}' does not match body method '${method}'.`,
    );
  }
  if (method === 'tools/call' || method === 'resources/read' || method === 'prompts/get') {
    const bodyName = method === 'resources/read' ? params.uri : params.name;
    const nameHeader = decodeHeaderValue(request.headers.get('Mcp-Name'));
    if (nameHeader === null || nameHeader !== bodyName) {
      return mismatch('Header mismatch: Mcp-Name header is missing or does not match the request body.');
    }
  }

  const meta = { [META_SERVER_INFO]: SERVER_INFO };
  switch (method) {
    case 'server/discover':
      return {
        status: 200,
        body: rpcResult(id, {
          resultType: 'complete',
          supportedVersions: [...MODERN_VERSIONS],
          capabilities: { tools: { listChanged: false } },
          instructions: ASSISTANT_INSTRUCTIONS,
          ttlMs: LIST_TTL_MS,
          cacheScope: 'public',
          _meta: meta,
        }),
      };
    case 'tools/list':
      return {
        status: 200,
        body: rpcResult(id, { resultType: 'complete', tools: TOOLS, ttlMs: LIST_TTL_MS, cacheScope: 'public', _meta: meta }),
      };
    case 'tools/call': {
      const result = await callTool(params.name, params.arguments, intake);
      if (!result) return { status: 200, body: rpcError(id, ERRORS.invalidParams, `Unknown tool: ${String(params.name)}`) };
      return { status: 200, body: rpcResult(id, { resultType: 'complete', ...result, _meta: meta }) };
    }
    default:
      return { status: 404, body: rpcError(id, ERRORS.methodNotFound, `Method not found: ${method}`) };
  }
}

async function handleMessage(message: unknown, request: Request, intake: IntakeDeps, inBatch: boolean): Promise<Outcome> {
  if (!isRecord(message) || message.jsonrpc !== '2.0') {
    return { status: 400, body: rpcError(null, ERRORS.invalidRequest, 'Invalid JSON-RPC message.') };
  }
  const rpc = message as RpcMessage;
  // Responses (to server requests this server never sends) and notifications: accepted, no body.
  if (rpc.method === undefined && ('result' in rpc || 'error' in rpc)) return { status: 202, body: null };
  if (typeof rpc.method !== 'string') {
    return { status: 400, body: rpcError(null, ERRORS.invalidRequest, 'Missing method.') };
  }
  if (!('id' in rpc)) return { status: 202, body: null };
  const id = rpc.id;
  if (typeof id !== 'string' && typeof id !== 'number') {
    return { status: 400, body: rpcError(null, ERRORS.invalidRequest, 'Request id must be a string or number.') };
  }
  const params = isRecord(rpc.params) ? rpc.params : {};
  const meta = isRecord(params._meta) ? params._meta : {};
  const modernVersion = typeof meta[META_VERSION] === 'string' ? (meta[META_VERSION] as string) : null;

  if (modernVersion !== null && rpc.method !== 'initialize') {
    if (inBatch) return { status: 400, body: rpcError(id, ERRORS.invalidRequest, 'Batching is not supported.') };
    return modern(id, rpc.method, modernVersion, params, request, intake);
  }

  // Legacy: a version header, when present, must be one this server speaks.
  const header = request.headers.get('MCP-Protocol-Version');
  if (header !== null && rpc.method !== 'initialize' && !(LEGACY_VERSIONS as readonly string[]).includes(header)) {
    if ((MODERN_VERSIONS as readonly string[]).includes(header)) {
      return {
        status: 400,
        body: rpcError(id, ERRORS.headerMismatch, `Header mismatch: request body has no _meta protocol version for '${header}'.`),
      };
    }
    return {
      status: 400,
      body: rpcError(id, ERRORS.unsupportedVersion, 'Unsupported protocol version', {
        supported: [...MODERN_VERSIONS, ...LEGACY_VERSIONS],
        requested: header,
      }),
    };
  }
  return legacy(id, rpc.method, params, intake);
}

/** POST /mcp. */
export async function handleMcp(request: Request, intake: IntakeDeps): Promise<Response> {
  if (request.method !== 'POST') {
    return json(rpcError(null, ERRORS.invalidRequest, 'The MCP endpoint accepts POST only.'), 405, { Allow: 'POST' });
  }
  // DNS-rebinding guard (spec MUST): a present Origin must be this site or a
  // known assistant's web app. Assistant servers normally send none.
  const origin = request.headers.get('Origin');
  if (origin !== null && origin !== new URL(request.url).origin && !ASSISTANT_ORIGINS.has(origin)) {
    return json(rpcError(null, ERRORS.invalidRequest, 'Origin not allowed.'), 403);
  }
  const body = await readJsonBody(request);
  if (!body.ok) {
    return json(rpcError(null, body.status === 400 ? ERRORS.parse : ERRORS.invalidRequest, body.error), body.status);
  }

  if (Array.isArray(body.value)) {
    // JSON-RPC batches existed only in 2025-03-26; answered for compatibility.
    if (body.value.length === 0) return json(rpcError(null, ERRORS.invalidRequest, 'Empty batch.'), 400);
    const replies: unknown[] = [];
    for (const message of body.value) {
      const outcome = await handleMessage(message, request, intake, true);
      if (outcome.body !== null) replies.push(outcome.body);
    }
    return replies.length > 0 ? json(replies) : empty(202);
  }

  const outcome = await handleMessage(body.value, request, intake, false);
  return outcome.body === null ? empty(outcome.status) : json(outcome.body, outcome.status);
}
