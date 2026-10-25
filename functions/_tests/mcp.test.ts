import assert from 'node:assert/strict';
import { handleMcp, LEGACY_VERSIONS, MODERN_VERSIONS } from '../_lib/mcp.ts';
import { ASSISTANT_INSTRUCTIONS } from '../_lib/config.ts';
import { onRequest as challenge } from '../.well-known/openai-apps-challenge.ts';
import type { Env, PagesContext } from '../_lib/types.ts';
import { check, harness, validBody } from './helpers.ts';

const URL_MCP = 'https://www.eyshandyman.com/mcp';
const h = harness();

async function post(body: unknown, headers: Record<string, string> = {}) {
  const response = await handleMcp(
    new Request(URL_MCP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    h.intakeDeps(URL_MCP),
  );
  assert.equal(response.headers.get('Mcp-Session-Id'), null, 'never mints a session');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const text = await response.text();
  return { status: response.status, type: response.headers.get('Content-Type'), body: text ? JSON.parse(text) : null };
}

const modernMeta = (version: string = MODERN_VERSIONS[0]) => ({
  _meta: {
    'io.modelcontextprotocol/protocolVersion': version,
    'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' },
    'io.modelcontextprotocol/clientCapabilities': {},
  },
});
const modernHeaders = (method: string, name?: string, version: string = MODERN_VERSIONS[0]) => ({
  'MCP-Protocol-Version': version,
  'Mcp-Method': method,
  ...(name ? { 'Mcp-Name': name } : {}),
});

await check('legacy initialize negotiates the version and returns the instructions', async () => {
  const r = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'openai-mcp', version: '1' } } });
  assert.equal(r.status, 200);
  assert.match(r.type ?? '', /^application\/json/);
  assert.equal(r.body.result.protocolVersion, '2025-06-18');
  assert.equal(r.body.result.instructions, ASSISTANT_INSTRUCTIONS);
  assert.deepEqual(r.body.result.capabilities, { tools: { listChanged: false } });
  const newer = await post({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2099-01-01' } });
  assert.equal(newer.body.result.protocolVersion, LEGACY_VERSIONS[0], 'unknown version → latest legacy');
});

await check('notifications get 202 with no body', async () => {
  const r = await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, { 'MCP-Protocol-Version': '2025-06-18' });
  assert.equal(r.status, 202);
  assert.equal(r.body, null);
});

await check('tools/list: two tools with the required annotations', async () => {
  const r = await post({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, { 'MCP-Protocol-Version': '2025-06-18' });
  const tools = r.body.result.tools as { name: string; annotations: Record<string, boolean>; inputSchema: { required?: string[] } }[];
  assert.deepEqual(tools.map((t) => t.name), ['get_business_info', 'submit_service_request']);
  assert.equal(tools[0].annotations.readOnlyHint, true);
  assert.deepEqual(
    { r: tools[1].annotations.readOnlyHint, d: tools[1].annotations.destructiveHint, i: tools[1].annotations.idempotentHint, o: tools[1].annotations.openWorldHint },
    { r: false, d: false, i: true, o: true },
  );
  assert.ok(tools[1].inputSchema.required?.includes('confirmed_by_customer'));
});

await check('tools/call: get_business_info and validate-only submit', async () => {
  const info = await post({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_business_info', arguments: {} } });
  assert.equal(info.body.result.structuredContent.phone, '(346) 820-1629');
  assert.equal(info.body.result.isError, false);
  assert.equal(JSON.parse(info.body.result.content[0].text).business_name, 'Elevate Your Space Handyman');

  const ready = await post({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'submit_service_request', arguments: validBody({ confirmed_by_customer: false }) },
  });
  assert.equal(ready.body.result.structuredContent.status, 'ready_to_submit');
  assert.equal(ready.body.result.isError, false);

  const empty = await post({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'submit_service_request' } });
  assert.equal(empty.body.result.structuredContent.status, 'needs_changes');
  assert.equal(empty.body.result.isError, true);

  const unknown = await post({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'book_now', arguments: {} } });
  assert.equal(unknown.body.error.code, -32602);
});

await check('transport rules: POST only, Origin guard, parse errors, legacy version header', async () => {
  const get = await handleMcp(new Request(URL_MCP), h.intakeDeps(URL_MCP));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('Allow'), 'POST');
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { Origin: 'https://chatgpt.com' })).status, 200);
  const bad = await post('{nope');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, -32700);
  const oldHeader = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { 'MCP-Protocol-Version': '1999-01-01' });
  assert.equal(oldHeader.status, 400);
  assert.equal(oldHeader.body.error.code, -32022);
  const unknown = await post({ jsonrpc: '2.0', id: 9, method: 'resources/list' });
  assert.equal(unknown.body.error.code, -32601);
});

await check('modern: server/discover, header validation, unsupported version', async () => {
  const discover = await post({ jsonrpc: '2.0', id: 'd1', method: 'server/discover', params: modernMeta() }, modernHeaders('server/discover'));
  assert.equal(discover.status, 200);
  assert.equal(discover.body.result.resultType, 'complete');
  assert.deepEqual(discover.body.result.supportedVersions, [...MODERN_VERSIONS]);
  assert.equal(discover.body.result.instructions, ASSISTANT_INSTRUCTIONS);
  assert.equal(discover.body.result._meta['io.modelcontextprotocol/serverInfo'].name, 'eys-handyman');

  const list = await post({ jsonrpc: '2.0', id: 'l1', method: 'tools/list', params: modernMeta() }, modernHeaders('tools/list'));
  assert.equal(list.body.result.resultType, 'complete');
  assert.equal(list.body.result.cacheScope, 'public');
  assert.ok(list.body.result.ttlMs > 0);

  const missing = await post({ jsonrpc: '2.0', id: 'l2', method: 'tools/list', params: modernMeta() }, { 'MCP-Protocol-Version': MODERN_VERSIONS[0] });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error.code, -32020);

  const unsupported = await post(
    { jsonrpc: '2.0', id: 'u1', method: 'tools/list', params: modernMeta('2099-01-01') },
    modernHeaders('tools/list', undefined, '2099-01-01'),
  );
  assert.equal(unsupported.status, 400);
  assert.equal(unsupported.body.error.code, -32022);
  assert.deepEqual(unsupported.body.error.data, { supported: [...MODERN_VERSIONS], requested: '2099-01-01' });

  const notFound = await post({ jsonrpc: '2.0', id: 'n1', method: 'prompts/list', params: modernMeta() }, modernHeaders('prompts/list'));
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.error.code, -32601);

  const headerOnly = await post({ jsonrpc: '2.0', id: 'h1', method: 'tools/list' }, modernHeaders('tools/list'));
  assert.equal(headerOnly.status, 400);
  assert.equal(headerOnly.body.error.code, -32020);
});

await check('modern tools/call checks Mcp-Name (base64 sentinel decoded)', async () => {
  const params = { name: 'get_business_info', arguments: {}, ...modernMeta() };
  const plain = await post({ jsonrpc: '2.0', id: 'c1', method: 'tools/call', params }, modernHeaders('tools/call', 'get_business_info'));
  assert.equal(plain.body.result.resultType, 'complete');
  assert.equal(plain.body.result.structuredContent.phone, '(346) 820-1629');
  const encoded = `=?base64?${btoa('get_business_info')}?=`;
  const b64 = await post({ jsonrpc: '2.0', id: 'c2', method: 'tools/call', params }, modernHeaders('tools/call', encoded));
  assert.equal(b64.status, 200);
  const wrong = await post({ jsonrpc: '2.0', id: 'c3', method: 'tools/call', params }, modernHeaders('tools/call', 'submit_service_request'));
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.error.code, -32020);
});

await check('legacy JSON-RPC batch (2025-03-26) answered in one response', async () => {
  const r = await post([
    { jsonrpc: '2.0', id: 1, method: 'ping' },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  ]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.map((m: { id: number }) => m.id), [1, 2]);
});

await check('openai-apps-challenge serves the token as text/plain, 404 when unset', async () => {
  const ctx = (env: Env): PagesContext<Env> => ({
    request: new Request('https://www.eyshandyman.com/.well-known/openai-apps-challenge'),
    env,
    params: {},
    data: {},
    waitUntil: () => {},
    next: async () => new Response(null, { status: 404 }),
  });
  const set = await challenge(ctx({ OPENAI_APPS_CHALLENGE_TOKEN: 'abc123token' }));
  assert.equal(set.status, 200);
  assert.match(set.headers.get('Content-Type') ?? '', /^text\/plain/);
  assert.equal(await set.text(), 'abc123token');
  assert.equal((await challenge(ctx({}))).status, 404);
});
