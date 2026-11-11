/**
 * Test doubles for the Quote Desk: a fake Jobber that answers the desk's
 * introspection from a trimmed copy of Jobber's real schema
 * (fixtures/jobber-quote-schema.json) and its queries and mutations from
 * in-memory quotes, plus a fake Quo.
 */
import { readFileSync } from 'node:fs';
import type { Env, PagesContext, PagesFunction } from '../_lib/types.ts';
import { JOBBER_GRAPHQL_URL, saveConnection, type FieldInfo, type JobberDeps } from '../_lib/jobber.ts';
import { ensureSchema } from '../_lib/db.ts';
import { ensureDeskSchema } from '../_lib/desk-db.ts';
import { issueSession, DESK_COOKIE } from '../_lib/desk-auth.ts';
import { ADMIN_KEY, Clock, createTestD1, testEnv, type TestD1 } from './helpers.ts';

export const BASE = 'https://www.eyshandyman.com';
export const PINS = 'Essa:4826,Aimen:7391';

interface Fixture {
  queryFields: FieldInfo[];
  mutationFields: FieldInfo[];
  types: { name: string }[];
}

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/jobber-quote-schema.json', import.meta.url), 'utf8'),
) as Fixture;

export interface FakeQuote {
  id: string;
  quoteNumber: string;
  title: string | null;
  quoteStatus: string;
  createdAt: string;
  clientHubUri: string | null;
  clientHubViewedAt?: string | null;
  jobberWebUri: string;
  amounts: { subtotal: number; total: number; taxAmount: number; discountAmount: number; depositAmount: number };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    phones: { number: string; primary: boolean; smsAllowed: boolean; smsStopped?: boolean }[];
    billingAddress?: { city: string };
  };
  lineItems: { nodes: Record<string, unknown>[] };
  notes: { nodes: Record<string, unknown>[] };
  request: { id: string } | null;
  lastTransitioned?: { approvedAt: string | null };
}

export class FakeDeskJobber {
  quotesScope = true;
  /** Mutation names the token can see. */
  visibleMutations = new Set(['quotesMarkAwaitingResponse', 'quoteCreateNote', 'quoteEdit', 'requestCreate', 'clientCreate', 'propertyCreate']);
  quotes = new Map<string, FakeQuote>();
  requests = new Map<string, Record<string, unknown>>();
  operations: string[] = [];
  mutationCalls: { name: string; variables: Record<string, unknown> }[] = [];
  notesAdded: { quoteId: string; message: string }[] = [];
  /** When true, quotesMarkAwaitingResponse succeeds but the status only flips on the next poll. */
  delayStatusFlip = false;
  pendingFlips: string[] = [];

  addQuote(overrides: Partial<FakeQuote> & { id: string }): FakeQuote {
    const n = this.quotes.size + 1;
    const quote: FakeQuote = {
      quoteNumber: String(300 + n),
      title: 'TV Mounting',
      quoteStatus: 'draft',
      createdAt: new Date(Date.UTC(2026, 10, 10, 15, 0, 0)).toISOString(),
      clientHubUri: `https://hub.getjobber.com/client_hubs/hub-${n}/quotes/${n}`,
      jobberWebUri: `https://secure.getjobber.com/quotes/${n}`,
      amounts: { subtotal: 400, total: 412, taxAmount: 0, discountAmount: 0, depositAmount: 0 },
      client: {
        id: `client-${n}`,
        firstName: 'jennifer',
        lastName: 'Lopez',
        name: 'Jennifer Lopez',
        phones: [{ number: '(281) 555-0142', primary: true, smsAllowed: true }],
        billingAddress: { city: 'Katy' },
      },
      lineItems: {
        nodes: [
          { name: 'TV mounting', description: 'Mount a 65 inch TV on drywall', quantity: 1, unitPrice: 400, totalPrice: 400, textOnly: false, optional: false, sortOrder: 1 },
          { name: 'Card Fee', description: '3%', quantity: 1, unitPrice: 12, totalPrice: 12, textOnly: false, optional: false, sortOrder: 2 },
        ],
      },
      notes: { nodes: [{ __typename: 'QuoteNote', id: 'note-1', message: 'Margin note: 2 hrs labor', createdAt: '2026-11-10T15:00:00Z' }] },
      request: { id: `request-${n}` },
      ...overrides,
    };
    this.quotes.set(quote.id, quote);
    return quote;
  }

  private hidden(): Response {
    return Response.json({ data: null, errors: [{ message: 'The field quotes on an object of type Query was hidden due to permissions' }] });
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url !== JOBBER_GRAPHQL_URL) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(String(init?.body ?? '{}')) as { query: string; variables: Record<string, unknown> };
    const operation = /^(?:query|mutation)\s+(\w+)/.exec(body.query.trim())?.[1] ?? 'anonymous';
    this.operations.push(operation);
    const v = body.variables ?? {};
    switch (operation) {
      case 'EysDeskSchemaRoots':
        return Response.json({
          data: {
            __schema: {
              queryType: {
                fields: fixture.queryFields.filter((f) => this.quotesScope || !/^quotes?$/.test(f.name)),
              },
              mutationType: { fields: fixture.mutationFields.filter((f) => this.visibleMutations.has(f.name)) },
            },
          },
        });
      case 'EysSchemaTypes': {
        const data: Record<string, unknown> = {};
        for (const m of body.query.matchAll(/(t\d+): __type\(name: "(\w+)"\)/g)) {
          data[m[1]] = fixture.types.find((t) => t.name === m[2]) ?? null;
        }
        return Response.json({ data });
      }
      case 'EysDeskDrafts': {
        if (!this.quotesScope) return this.hidden();
        const filtered = /status: draft/.test(body.query);
        const nodes = [...this.quotes.values()].filter((q) => !filtered || q.quoteStatus === 'draft');
        return Response.json({ data: { quotes: { nodes, pageInfo: { hasNextPage: false, endCursor: null } } } });
      }
      case 'EysDeskQuote':
        if (!this.quotesScope) return this.hidden();
        return Response.json({ data: { quote: this.quotes.get(String(v.id)) ?? null } });
      case 'EysDeskRequest':
        return Response.json({ data: { request: this.requests.get(String(v.id)) ?? null } });
      case 'EysDeskHistory':
        if (/jobs/.test(body.query)) {
          return Response.json({ data: null, errors: [{ message: 'The field jobs on an object of type Client was hidden due to permissions' }] });
        }
        return Response.json({
          data: {
            client: {
              quotes: { nodes: [...this.quotes.values()].filter((q) => q.client.id === v.id).map((q) => ({ id: q.id, title: q.title, quoteStatus: q.quoteStatus, amounts: { total: q.amounts.total } })) },
              requests: { nodes: [] },
            },
          },
        });
      case 'EysDeskStatuses': {
        if (!this.quotesScope) return this.hidden();
        for (const id of this.pendingFlips.splice(0)) {
          const q = this.quotes.get(id);
          if (q) q.quoteStatus = 'awaiting_response';
        }
        const data: Record<string, unknown> = {};
        for (const m of body.query.matchAll(/(q\d+): quote\(id: \$(id\d+)\)/g)) {
          data[m[1]] = this.quotes.get(String(v[m[2]])) ?? null;
        }
        return Response.json({ data });
      }
      case 'EysDeskMarkAwaiting': {
        this.mutationCalls.push({ name: 'quotesMarkAwaitingResponse', variables: v });
        const ids = (Object.values(v)[0] as string[]) ?? [];
        for (const id of ids) {
          if (this.delayStatusFlip) this.pendingFlips.push(id);
          else {
            const q = this.quotes.get(id);
            if (q) q.quoteStatus = 'awaiting_response';
          }
        }
        return Response.json({ data: { quotesMarkAwaitingResponse: { userErrors: [] } } });
      }
      case 'EysDeskAddNote': {
        this.mutationCalls.push({ name: 'quoteCreateNote', variables: v });
        this.notesAdded.push({ quoteId: String(v.id), message: String((v.input as { message?: string })?.message ?? '') });
        return Response.json({ data: { quoteCreateNote: { userErrors: [] } } });
      }
      default:
        return Response.json({ errors: [{ message: `unknown operation ${operation}` }] });
    }
  };
}

export interface DeskHarness {
  db: TestD1;
  jobber: FakeDeskJobber;
  clock: Clock;
  env: Env;
  fetchCalls: string[];
  deps(): JobberDeps;
  cookie(name?: string): Promise<string>;
  call(fn: PagesFunction<Env>, path: string, init?: RequestInit & { cookie?: string; ip?: string; params?: Record<string, string | string[]> }): Promise<Response>;
}

/** A connected desk: fresh Jobber tokens in D1, DESK_PINS set, global fetch pointed at the fakes. */
export async function deskHarness(envOverrides: Partial<Env> = {}, accessToken = 'access-1'): Promise<DeskHarness> {
  const db = createTestD1();
  const jobber = new FakeDeskJobber();
  const clock = new Clock(Date.UTC(2026, 10, 11, 18, 0, 0));
  const env = testEnv(db, { DESK_PINS: PINS, ...envOverrides });
  await ensureSchema(db);
  await ensureDeskSchema(db);
  const h: DeskHarness = {
    db,
    jobber,
    clock,
    env,
    fetchCalls: [],
    deps() {
      return { env, db, adminKey: ADMIN_KEY, fetch: jobber.fetch, now: clock.now, sleep: async () => {} };
    },
    async cookie(name = 'Essa') {
      const pin = name === 'Essa' ? '4826' : '7391';
      return `${DESK_COOKIE}=${await issueSession(env, { name, pin }, Date.now())}`;
    },
    async call(fn, path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set('CF-Connecting-IP', init.ip ?? '203.0.113.20');
      if (init.cookie) headers.set('Cookie', init.cookie);
      if (init.method === 'POST' && !headers.has('Origin')) headers.set('Origin', BASE);
      const request = new Request(`${BASE}${path}`, { ...init, headers });
      const context: PagesContext<Env> = {
        request,
        env,
        params: init.params ?? {},
        data: {},
        waitUntil: () => {},
        next: async () => new Response('next', { status: 404 }),
      };
      return fn(context);
    },
  };
  await saveConnection(h.deps(), { access: accessToken, refresh: 'refresh-1', expiresAt: Date.now() + 3_600_000 }, {
    id: 'account-1',
    name: 'Elevate Your Space Handyman',
  });
  return h;
}

/**
 * Routes build their Jobber deps on the global fetch; point it at the fakes
 * for the length of `fn`.
 */
export async function withFetch<T>(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

export function jwt(payload: Record<string, unknown>): string {
  const b64 = (s: string) => Buffer.from(s).toString('base64url');
  return `${b64('{"alg":"none"}')}.${b64(JSON.stringify(payload))}.sig`;
}
