/**
 * src/scripts/webmcp.ts runs in the browser; here it is loaded under a fake
 * document.modelContext to check what it registers, that it stays silent
 * without one, and that its schema mirrors the server's.
 */
import assert from 'node:assert/strict';
import { SERVICE_PATHS, SOURCES } from '../_lib/config.ts';
import { CONTACT_PREFERENCES } from '../_lib/validate.ts';
import { SERVICE_REQUEST_INPUT_SCHEMA } from '../_lib/schemas.ts';
import { check } from './helpers.ts';

type Tool = {
  name: string;
  annotations: Record<string, boolean>;
  inputSchema: { required?: string[]; properties: Record<string, { enum?: string[] }> };
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<string>;
};

const g = globalThis as Record<string, unknown>;
const realFetch = globalThis.fetch;
let loads = 0;
const fetches: { url: string; init: RequestInit | undefined }[] = [];

async function load(modelContext: unknown): Promise<{ tools: Tool[]; registered: Tool[] }> {
  const registered: Tool[] = [];
  g.document = modelContext === undefined ? {} : { modelContext };
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    fetches.push({ url, init });
    return new Response('{"status":"ready_to_submit"}');
  }) as typeof fetch;
  if (modelContext && typeof (modelContext as { capture?: unknown }).capture === 'function') {
    (modelContext as { capture: (r: Tool[]) => void }).capture(registered);
  }
  loads += 1;
  const module = (await import(`../../src/scripts/webmcp.ts?load=${loads}`)) as { TOOLS: Tool[] };
  return { tools: module.TOOLS, registered };
}

function fakeContext(behaviour: 'promise' | 'sync' | 'throw' | 'reject') {
  let sink: Tool[] = [];
  return {
    capture: (r: Tool[]) => {
      sink = r;
    },
    registerTool(tool: Tool) {
      if (behaviour === 'throw') throw new Error('blocked by permissions policy');
      sink.push(tool);
      if (behaviour === 'reject') return Promise.reject(new DOMException('aborted', 'AbortError'));
      return behaviour === 'promise' ? Promise.resolve() : undefined;
    },
  };
}

try {
  await check('registers both tools with document.modelContext, no network on load', async () => {
    fetches.length = 0;
    const { registered } = await load(fakeContext('promise'));
    assert.deepEqual(registered.map((t) => t.name), ['get_business_info', 'submit_service_request']);
    assert.deepEqual(registered[0].annotations, { readOnlyHint: true });
    assert.deepEqual(registered[1].annotations, { consequentialHint: true });
    assert.equal(fetches.length, 0, 'nothing fetched until a tool runs');
  });

  await check('tools call the same-origin API without cookies', async () => {
    fetches.length = 0;
    const { registered } = await load(fakeContext('promise'));
    const out = await registered[1].execute({ source: 'gemini' });
    assert.equal(out, '{"status":"ready_to_submit"}');
    assert.equal(fetches[0].url, '/api/ai/service-requests');
    assert.equal(fetches[0].init?.method, 'POST');
    assert.equal(fetches[0].init?.credentials, 'omit');
    await registered[0].execute({});
    assert.equal(fetches[1].url, '/api/ai/info');
    assert.equal(fetches[1].init?.credentials, 'omit');
  });

  await check('network failure returns a result instead of throwing', async () => {
    const { registered } = await load(fakeContext('promise'));
    globalThis.fetch = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;
    const out = JSON.parse(await registered[1].execute({}));
    assert.equal(out.status, 'unavailable');
  });

  await check('silent without modelContext, and when registration throws or rejects', async () => {
    fetches.length = 0;
    await load(undefined);
    await load(fakeContext('throw'));
    await load(fakeContext('reject'));
    await load(fakeContext('sync'));
    await new Promise((resolve) => setTimeout(resolve, 0)); // let a rejection surface if unhandled
    assert.equal(fetches.length, 0);
  });

  await check('schema mirrors the server: required fields, properties and enums', async () => {
    const { tools } = await load(undefined);
    const schema = tools[1].inputSchema;
    assert.deepEqual(schema.required, [...SERVICE_REQUEST_INPUT_SCHEMA.required]);
    assert.deepEqual(Object.keys(schema.properties), Object.keys(SERVICE_REQUEST_INPUT_SCHEMA.properties));
    assert.deepEqual(schema.properties.service_path.enum, [...SERVICE_PATHS]);
    assert.deepEqual(schema.properties.source.enum, [...SOURCES]);
    assert.deepEqual(schema.properties.contact_preference.enum, [...CONTACT_PREFERENCES]);
  });
} finally {
  globalThis.fetch = realFetch;
  delete g.document;
}
