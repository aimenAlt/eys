/**
 * Local Quote Desk with fake Jobber and fake Quo, for UI work only.
 *
 *   npm run build   # once, for dist/
 *   node --experimental-strip-types --no-warnings functions/_tests/desk-dev.ts
 *   open http://localhost:8790/essa/quotes/   (PIN 4826 = Essa, 7391 = Aimen)
 *
 * Serves dist/ and runs the real desk and /q/ Functions against an in-memory
 * D1 and the test fakes. Nothing here talks to Jobber, Quo or Cloudflare.
 * Also launchable from .claude/launch.json as "desk-fake".
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import type { Env, PagesContext, PagesFunction } from '../_lib/types.ts';
import { deskHarness } from './desk-helpers.ts';

const PORT = Number(process.env.PORT ?? 8790);
const DIST = new URL('../../dist/', import.meta.url).pathname;

const h = await deskHarness({ QUOTE_SEND_ENABLED: process.env.SEND === 'on' ? 'true' : 'false', QUO_API_KEY: 'fake-quo-key' });
const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
const photo = (name: string) => ({ url: `/images/${name}`, thumbnailUrl: `/images/${name}`, fileName: name.split('/').pop(), contentType: 'image/jpeg' });

h.jobber.addQuote({ id: 'q-tv', title: 'TV Mounting and wire concealment', createdAt: ago(0) });
h.jobber.addQuote({
  id: 'q-curtain',
  title: 'High ceiling curtain installation',
  createdAt: ago(2),
  amounts: { subtotal: 1280, total: 1318.4, taxAmount: 0, discountAmount: 0, depositAmount: 659.2 },
  client: { id: 'client-c', firstName: 'Priya', lastName: 'Raman', name: 'Priya Raman', phones: [{ number: '832-555-0199', primary: true, smsAllowed: true }], billingAddress: { city: 'Fulshear' } },
  lineItems: {
    nodes: [
      { name: 'High ceiling curtain rods', description: 'Install 3 rods at 18 ft on the two-story family room wall. Customer supplies rods and panels.', quantity: 3, unitPrice: 360, totalPrice: 1080, sortOrder: 1 },
      { name: 'Lift rental', description: 'Scaffold for the stairwell window', quantity: 1, unitPrice: 200, totalPrice: 200, sortOrder: 2 },
      { name: 'Card Fee', description: '3%', quantity: 1, unitPrice: 38.4, totalPrice: 38.4, sortOrder: 3 },
    ],
  },
  request: { id: 'request-c' },
});
h.jobber.addQuote({ id: 'q-fence', title: 'Project Quote', createdAt: ago(9), client: { id: 'client-f', firstName: 'marcus', lastName: 'Webb', name: 'Marcus Webb', phones: [{ number: '713-555-0110', primary: true, smsAllowed: true }] } });
h.jobber.addQuote({ id: 'q-old', title: 'Bathroom vanity swap', createdAt: ago(41) });
h.jobber.requests.set('request-c', {
  id: 'request-c',
  title: 'High ceiling curtains',
  requestDetails: {
    form: {
      sections: {
        nodes: [
          {
            label: 'Your project',
            items: {
              nodes: [
                { __typename: 'FormTextInput', label: 'How high is the ceiling?', textAnswer: 'About 18 feet' },
                { __typename: 'FormNumber', label: 'How many windows?', numberAnswer: 3 },
                { __typename: 'FormMultipleChoice', label: 'Do you have the rods?', textAnswer: 'Yes' },
              ],
            },
          },
        ],
      },
    },
  },
  notes: { nodes: [{ __typename: 'RequestNote', message: 'Called Nov 9. Wants it done before Thanksgiving.' }] },
  noteAttachments: { nodes: [photo('services/media-walls/marble-wood-slat.jpg'), photo('team/essa-portrait.webp')] },
});

// Fake Quo: accepts every text.
let quoIds = 0;
const quoFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = String(input);
  if (url.includes('/messages') && init?.method === 'POST') return Response.json({ data: { id: `AC${++quoIds}`, status: 'queued' } }, { status: 202 });
  if (url.includes('/messages')) return Response.json({ data: [], nextCursor: null });
  return Response.json({ data: [] });
};
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('https://api.getjobber.com')) return h.jobber.fetch(input, init);
  if (url.startsWith('https://api.quo.com')) return quoFetch(input, init);
  throw new Error(`desk-dev: no network (${url})`);
}) as typeof fetch;

async function route(path: string): Promise<PagesFunction<Env> | null> {
  const name = /^\/api\/desk\/(\w+)$/.exec(path)?.[1];
  if (name) {
    try {
      return (await import(`../api/desk/${name}.ts`)).onRequest;
    } catch {
      return null;
    }
  }
  if (path === '/api/q/event') return (await import('../api/q/event.ts')).onRequest;
  if (path.startsWith('/q/')) return (await import('../q/[[code]].ts')).onRequest;
  return null;
}

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

async function asset(path: string): Promise<Response> {
  let file = normalize(join(DIST, decodeURIComponent(path)));
  if (!file.startsWith(DIST)) return new Response('no', { status: 403 });
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    return new Response(await readFile(file), { headers: { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' } });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
h.env.ASSETS = { fetch: async (input) => asset(new URL(String(input)).pathname) };

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined,
  });
  const fn = await route(url.pathname);
  let response: Response;
  if (fn) {
    const segments = url.pathname.startsWith('/q/') ? url.pathname.slice(3).split('/').filter(Boolean) : [];
    const context: PagesContext<Env> = { request, env: h.env, params: { code: segments }, data: {}, waitUntil: () => {}, next: async () => asset(url.pathname) };
    response = await fn(context);
  } else response = await asset(url.pathname);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, () => console.log(`desk-dev on http://localhost:${PORT}/essa/quotes/ (PIN 4826)`));
