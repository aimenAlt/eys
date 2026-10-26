/**
 * Test doubles for the AI-intake functions: a D1 stand-in backed by
 * node:sqlite (real SQL semantics), and a fake Jobber that answers the OAuth
 * token endpoint and the GraphQL operations the write path sends, including
 * introspection, from a small schema shaped like Jobber's.
 */
import { DatabaseSync } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1Result, Env } from '../_lib/types.ts';
import { JOBBER_GRAPHQL_URL, JOBBER_TOKEN_URL, resetPlanCache, type JobberDeps, type TypeRef } from '../_lib/jobber.ts';
import type { IntakeDeps } from '../_lib/intake.ts';

export const ADMIN_KEY = 'test-admin-key-0123456789abcdef';
export const LIVE_URL = 'https://www.eyshandyman.com/api/ai/service-requests';

// ---------------------------------------------------------------------------
// D1
// ---------------------------------------------------------------------------

export interface TestD1 extends D1Database {
  raw: DatabaseSync;
  tables(): string[];
}

type SqlValue = string | number | null;

/**
 * D1 binds numbered parameters (?1, ?2 — reusable); node:sqlite only binds
 * anonymous ones, so each ?N is rewritten to ? with its value repeated.
 */
function positional(sql: string, params: SqlValue[]): [string, SqlValue[]] {
  const values: SqlValue[] = [];
  const rewritten = sql.replace(/\?(\d+)/g, (_, n: string) => {
    values.push(params[Number(n) - 1] ?? null);
    return '?';
  });
  return [rewritten, rewritten === sql ? params : values];
}

export function createTestD1(): TestD1 {
  const raw = new DatabaseSync(':memory:');
  const statement = (source: string, bound: SqlValue[] = []): D1PreparedStatement => {
    const [sql, params] = positional(source, bound);
    return {
      bind: (...values: unknown[]) => statement(source, values.map((v) => (v === undefined ? null : (v as SqlValue)))),
      first: async <T>() => (raw.prepare(sql).get(...params) as T | undefined) ?? null,
      all: async <T>() => ({ results: raw.prepare(sql).all(...params) as T[], success: true, meta: {} }),
      run: async () => {
        const result = raw.prepare(sql).run(...params);
        return {
          results: [],
          success: true,
          meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
        } as D1Result;
      },
    };
  };
  return {
    raw,
    prepare: (sql: string) => statement(sql),
    batch: async (statements: D1PreparedStatement[]) => {
      const out: D1Result[] = [];
      for (const s of statements) out.push(await s.run());
      return out;
    },
    tables: () =>
      (raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]).map(
        (r) => r.name,
      ),
  };
}

// ---------------------------------------------------------------------------
// Fake Jobber schema (introspection answers)
// ---------------------------------------------------------------------------

const named = (kind: string, name: string): TypeRef => ({ kind, name, ofType: null });
export const nonNull = (type: TypeRef): TypeRef => ({ kind: 'NON_NULL', name: null, ofType: type });
const list = (type: TypeRef): TypeRef => ({ kind: 'LIST', name: null, ofType: type });
export const STRING = named('SCALAR', 'String');
const ID = named('SCALAR', 'EncodedId');
const BOOL = named('SCALAR', 'Boolean');
const INT = named('SCALAR', 'Int');
const obj = (name: string) => named('OBJECT', name);
const input = (name: string) => named('INPUT_OBJECT', name);

interface FakeField {
  name: string;
  args?: { name: string; type: TypeRef }[];
  type: TypeRef;
}
interface FakeType {
  name: string;
  kind: string;
  fields: FakeField[] | null;
  inputFields: { name: string; type: TypeRef; defaultValue?: string | null }[] | null;
  possibleTypes: { name: string }[] | null;
  enumValues?: { name: string }[] | null;
}

const f = (name: string, type: TypeRef, args: [string, TypeRef][] = []): FakeField => ({
  name,
  type,
  args: args.map(([n, t]) => ({ name: n, type: t })),
});
const objectType = (name: string, fields: FakeField[]): FakeType => ({
  name,
  kind: 'OBJECT',
  fields,
  inputFields: null,
  possibleTypes: null,
});
export const enumType = (name: string, values: string[]): FakeType => ({
  name,
  kind: 'ENUM',
  fields: null,
  inputFields: null,
  possibleTypes: null,
  enumValues: values.map((value) => ({ name: value })),
});
export const inputType = (name: string, fields: [string, TypeRef][]): FakeType => ({
  name,
  kind: 'INPUT_OBJECT',
  fields: null,
  inputFields: fields.map(([n, t]) => ({ name: n, type: t })),
  possibleTypes: null,
});

export interface FakeSchema {
  queries: FakeField[];
  mutations: FakeField[];
  types: Map<string, FakeType>;
}

export function jobberLikeSchema(): FakeSchema {
  const errors = f('userErrors', nonNull(list(nonNull(obj('MutationErrors')))));
  const types: FakeType[] = [
    objectType('ClientConnection', [f('nodes', nonNull(list(nonNull(obj('Client')))))]),
    objectType('Client', [
      f('id', nonNull(ID)),
      f('phones', nonNull(list(nonNull(obj('ClientPhoneNumber'))))),
      f('properties', nonNull(list(nonNull(obj('Property'))))),
    ]),
    objectType('ClientPhoneNumber', [f('number', STRING)]),
    objectType('Property', [f('id', nonNull(ID)), f('address', nonNull(obj('PropertyAddress')))]),
    objectType('PropertyAddress', [
      f('street1', STRING),
      f('street2', STRING),
      f('city', STRING),
      f('province', STRING),
      f('postalCode', STRING),
    ]),
    objectType('Request', [
      f('id', nonNull(ID)),
      f('title', STRING),
      f('notes', nonNull(obj('RequestNoteUnionConnection')), [['first', INT]]),
    ]),
    objectType('RequestNoteUnionConnection', [f('nodes', nonNull(list(nonNull(named('UNION', 'RequestNoteUnion')))))]),
    {
      name: 'RequestNoteUnion',
      kind: 'UNION',
      fields: null,
      inputFields: null,
      possibleTypes: [{ name: 'RequestNote' }, { name: 'ClientNote' }],
    },
    objectType('RequestNote', [f('id', nonNull(ID)), f('message', STRING)]),
    objectType('ClientNote', [f('id', nonNull(ID)), f('message', STRING)]),
    objectType('MutationErrors', [f('message', STRING), f('path', list(STRING))]),
    objectType('ClientCreatePayload', [f('client', obj('Client')), errors]),
    objectType('PropertyCreatePayload', [f('properties', list(nonNull(obj('Property')))), errors]),
    objectType('RequestCreatePayload', [f('request', obj('Request')), errors]),
    objectType('RequestCreateNotePayload', [f('requestNote', obj('RequestNote')), errors]),
    objectType('JobCreateNotePayload', [errors]),
    inputType('ClientCreateInput', [
      ['firstName', STRING],
      ['lastName', STRING],
      ['phones', list(nonNull(input('PhoneNumberCreateAttributes')))],
      ['emails', list(nonNull(input('EmailCreateAttributes')))],
      ['properties', list(nonNull(input('PropertyAttributes')))],
    ]),
    inputType('PhoneNumberCreateAttributes', [
      ['number', nonNull(STRING)],
      ['description', named('ENUM', 'PhoneNumberDescription')],
      ['primary', BOOL],
      ['smsAllowed', BOOL],
    ]),
    enumType('PhoneNumberDescription', ['MAIN', 'MOBILE', 'WORK', 'HOME', 'FAX', 'OTHER']),
    enumType('EmailDescription', ['MAIN', 'WORK', 'PERSONAL', 'OTHER']),
    inputType('EmailCreateAttributes', [
      ['address', nonNull(STRING)],
      ['description', named('ENUM', 'EmailDescription')],
      ['primary', BOOL],
    ]),
    inputType('PropertyCreateInput', [['properties', nonNull(list(nonNull(input('PropertyAttributes'))))]]),
    inputType('PropertyAttributes', [['address', nonNull(input('AddressAttributes'))], ['name', STRING]]),
    inputType('AddressAttributes', [
      ['street1', STRING],
      ['street2', STRING],
      ['city', STRING],
      ['province', STRING],
      ['postalCode', STRING],
      ['country', STRING],
    ]),
    inputType('RequestCreateInput', [
      ['clientId', nonNull(ID)],
      ['propertyId', ID],
      ['title', STRING],
    ]),
    inputType('RequestCreateNoteInput', [['message', nonNull(STRING)]]),
    inputType('JobCreateNoteInput', [['message', nonNull(STRING)]]),
  ];
  return {
    queries: [
      f('clients', nonNull(obj('ClientConnection')), [
        ['searchTerm', STRING],
        ['first', INT],
      ]),
      f('client', obj('Client'), [['id', nonNull(ID)]]),
      f('request', obj('Request'), [['id', nonNull(ID)]]),
      f('account', nonNull(obj('Account'))),
    ],
    mutations: [
      f('clientCreate', nonNull(obj('ClientCreatePayload')), [['input', nonNull(input('ClientCreateInput'))]]),
      f('propertyCreate', nonNull(obj('PropertyCreatePayload')), [
        ['clientId', nonNull(ID)],
        ['input', nonNull(input('PropertyCreateInput'))],
      ]),
      f('requestCreate', nonNull(obj('RequestCreatePayload')), [['input', nonNull(input('RequestCreateInput'))]]),
      f('requestCreateNote', nonNull(obj('RequestCreateNotePayload')), [
        ['requestId', nonNull(ID)],
        ['input', nonNull(input('RequestCreateNoteInput'))],
      ]),
      f('jobCreateNote', nonNull(obj('JobCreateNotePayload')), [
        ['jobId', nonNull(ID)],
        ['input', nonNull(input('JobCreateNoteInput'))],
      ]),
    ],
    types: new Map(types.map((t) => [t.name, t])),
  };
}

// ---------------------------------------------------------------------------
// Fake Jobber (token endpoint + GraphQL)
// ---------------------------------------------------------------------------

interface FakeClient {
  id: string;
  firstName: string;
  lastName: string;
  phones: { number: string; smsAllowed?: boolean }[];
  emails: { address: string }[];
  properties: { id: string; address: { street1: string; city: string; province: string; postalCode: string } }[];
}
interface FakeRequest {
  id: string;
  clientId: string;
  propertyId: string;
  title: string;
  notes: string[];
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
}

export class FakeJobber {
  schema: FakeSchema = jobberLikeSchema();
  introspection = true;
  accountName = 'Elevate Your Space Handyman';
  clients: FakeClient[] = [];
  requests: FakeRequest[] = [];
  /** GraphQL operation names, in call order. */
  operations: string[] = [];
  variables: Record<string, unknown>[] = [];
  tokenCalls: string[] = [];
  validAccess = new Set<string>();
  validRefresh = new Set<string>();
  throttleNext = 0;
  unauthorizedNext = 0;
  userErrorsOn = new Set<string>();
  /** Operations answered with HTTP 500. */
  failOperations = new Set<string>();
  /** Title the fake stores instead of the one sent (to make read-back fail). */
  tamperTitle = false;
  private issued = 0;
  private ids = 0;

  /** Issues a token pair the way Jobber would after a code exchange. */
  issue(): { access: string; refresh: string } {
    this.issued += 1;
    const access = `access-${this.issued}`;
    const refresh = `refresh-${this.issued}`;
    this.validAccess.add(access);
    this.validRefresh.add(refresh);
    return { access, refresh };
  }

  addClient(client: Omit<FakeClient, 'id' | 'emails'> & { emails?: { address: string }[] }): FakeClient {
    const full: FakeClient = { id: this.nextId('client'), emails: [], ...client };
    this.clients.push(full);
    return full;
  }

  private nextId(prefix: string): string {
    this.ids += 1;
    return `${prefix}-${this.ids}`;
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url === JOBBER_TOKEN_URL) return this.token(String(init?.body ?? ''));
    if (url === JOBBER_GRAPHQL_URL) {
      const headers = new Headers(init?.headers);
      return this.graphql(headers, JSON.parse(String(init?.body ?? '{}')));
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  private token(body: string): Response {
    const params = new URLSearchParams(body);
    const grant = params.get('grant_type') ?? '';
    this.tokenCalls.push(grant);
    if (params.get('client_id') !== 'client-id' || params.get('client_secret') !== 'client-secret') {
      return Response.json({ error: 'invalid_client' }, { status: 401 });
    }
    if (grant === 'authorization_code') {
      if (params.get('code') !== 'good-code' || !params.get('code_verifier')) {
        return Response.json({ error: 'invalid_grant' }, { status: 400 });
      }
    } else if (grant === 'refresh_token') {
      const presented = params.get('refresh_token') ?? '';
      if (!this.validRefresh.has(presented)) {
        return Response.json(
          { error: 'invalid_grant', error_description: 'The provided refresh token is not valid.' },
          { status: 400 },
        );
      }
      // Rotation on: the redeemed token dies immediately.
      this.validRefresh.delete(presented);
    } else {
      return Response.json({ error: 'unsupported_grant_type' }, { status: 400 });
    }
    const pair = this.issue();
    return Response.json({ access_token: pair.access, refresh_token: pair.refresh, token_type: 'Bearer', expires_in: 3600 });
  }

  private graphql(headers: Headers, body: { query: string; variables?: Record<string, unknown> }): Response {
    const token = (headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    if (headers.get('X-JOBBER-GRAPHQL-VERSION') !== '2026-09-25') {
      return Response.json({ errors: [{ message: 'missing version' }] }, { status: 400 });
    }
    if (this.unauthorizedNext > 0 || !this.validAccess.has(token)) {
      if (this.unauthorizedNext > 0) this.unauthorizedNext -= 1;
      return Response.json({ message: 'Invalid Token Error' }, { status: 401 });
    }
    if (this.throttleNext > 0) {
      this.throttleNext -= 1;
      return Response.json({ errors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] });
    }
    const operation = /^\s*(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1] ?? 'anonymous';
    const variables = body.variables ?? {};
    this.operations.push(operation);
    this.variables.push(variables);
    if (this.failOperations.has(operation)) return Response.json({ message: 'Internal error' }, { status: 500 });
    if (this.userErrorsOn.has(operation)) {
      const field = /\{\s*(\w+)\s*\(/.exec(body.query.slice(body.query.indexOf('{')))?.[1] ?? 'x';
      return Response.json({ data: { [field]: { userErrors: [{ message: 'Rejected by Jobber' }] } } });
    }
    return Response.json(this.answer(operation, body.query, variables));
  }

  private answer(operation: string, query: string, v: Record<string, unknown>): unknown {
    switch (operation) {
      case 'EysSchemaRoots':
        if (!this.introspection) return { errors: [{ message: 'Introspection is not allowed' }] };
        return {
          data: {
            __schema: { queryType: { fields: this.schema.queries }, mutationType: { fields: this.schema.mutations } },
          },
        };
      case 'EysSchemaTypes': {
        const data: Record<string, unknown> = {};
        for (const match of query.matchAll(/(t\d+): __type\(name: "(\w+)"\)/g)) {
          data[match[1]] = this.schema.types.get(match[2]) ?? null;
        }
        return { data };
      }
      case 'EysAccount':
        return { data: { account: { id: 'account-1', name: this.accountName } } };
      case 'EysFindClients': {
        // Fuzzy like a real search: any client sharing the last seven digits.
        const tail = digitsOf(String(v.term)).slice(-7);
        const nodes = this.clients
          .filter((c) => c.phones.some((p) => digitsOf(p.number).endsWith(tail)))
          .map((c) => ({ id: c.id, phones: c.phones.map((p) => ({ number: p.number })) }));
        return { data: { clients: { nodes } } };
      }
      case 'EysClientProperties': {
        const client = this.clients.find((c) => c.id === v.id);
        return { data: { client: client ? { properties: client.properties } : null } };
      }
      case 'EysCreateClient': {
        const i = v.input as {
          firstName: string;
          lastName: string;
          phones: { number: string; smsAllowed?: boolean }[];
          emails?: { address: string }[];
        };
        const client = this.addClient({ firstName: i.firstName, lastName: i.lastName, phones: i.phones, emails: i.emails ?? [], properties: [] });
        return { data: { clientCreate: { client: { id: client.id }, userErrors: [] } } };
      }
      case 'EysCreateProperty': {
        const client = this.clients.find((c) => c.id === v.clientId);
        if (!client) return { data: { propertyCreate: { properties: null, userErrors: [{ message: 'no client' }] } } };
        const attrs = (v.input as { properties: { address: FakeClient['properties'][number]['address'] }[] }).properties[0];
        const property = { id: this.nextId('property'), address: attrs.address };
        client.properties.push(property);
        return { data: { propertyCreate: { properties: [{ id: property.id }], userErrors: [] } } };
      }
      case 'EysCreateRequest': {
        const i = v.input as { clientId: string; propertyId: string; title: string };
        const request: FakeRequest = {
          id: this.nextId('request'),
          clientId: i.clientId,
          propertyId: i.propertyId,
          title: this.tamperTitle ? 'something else' : i.title,
          notes: [],
        };
        this.requests.push(request);
        return { data: { requestCreate: { request: { id: request.id }, userErrors: [] } } };
      }
      case 'EysAddNote': {
        const request = this.requests.find((r) => r.id === v.id);
        if (!request) return { data: { requestCreateNote: { userErrors: [{ message: 'no request' }] } } };
        request.notes.push((v.value as { message: string }).message);
        return { data: { requestCreateNote: { userErrors: [] } } };
      }
      case 'EysVerifyRequest': {
        const request = this.requests.find((r) => r.id === v.id);
        return {
          data: {
            request: request
              ? {
                  id: request.id,
                  title: request.title,
                  notes: { nodes: request.notes.map((message) => ({ __typename: 'RequestNote', message })) },
                }
              : null,
          },
        };
      }
      default:
        return { errors: [{ message: `unknown operation ${operation}` }] };
    }
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

export function testEnv(db: D1Database | undefined, overrides: Partial<Env> = {}): Env {
  return {
    EYS_AI_DB: db,
    JOBBER_CLIENT_ID: 'client-id',
    JOBBER_CLIENT_SECRET: 'client-secret',
    AI_ADMIN_KEY: ADMIN_KEY,
    AI_INTAKE_ENABLED: 'true',
    AI_INTAKE_DAILY_CAP: '20',
    ...overrides,
  };
}

export class Clock {
  t: number;
  constructor(t = Date.UTC(2026, 9, 25, 18, 0, 0)) {
    this.t = t;
  }
  now = () => this.t;
  advance(ms: number) {
    this.t += ms;
  }
}

export interface Harness {
  db: TestD1;
  fake: FakeJobber;
  clock: Clock;
  env: Env;
  logs: Record<string, string | number | null>[];
  sleeps: number[];
  /** Runs between retries; lets a test change state "while" the code waits. */
  onSleep?: () => Promise<void> | void;
  jobberDeps(): JobberDeps;
  intakeDeps(url?: string, ip?: string): IntakeDeps;
}

export function harness(envOverrides: Partial<Env> = {}): Harness {
  resetPlanCache();
  const db = createTestD1();
  const fake = new FakeJobber();
  const clock = new Clock();
  const h: Harness = {
    db,
    fake,
    clock,
    env: testEnv(db, envOverrides),
    logs: [],
    sleeps: [],
    jobberDeps() {
      return {
        env: h.env,
        db,
        adminKey: ADMIN_KEY,
        fetch: fake.fetch,
        now: clock.now,
        sleep: async (ms: number) => {
          h.sleeps.push(ms);
          await h.onSleep?.();
        },
      };
    },
    intakeDeps(url = LIVE_URL, ip = '203.0.113.7') {
      return {
        env: h.env,
        request: new Request(url, { method: 'POST', headers: { 'CF-Connecting-IP': ip } }),
        now: clock.now,
        fetch: fake.fetch,
        sleep: async (ms: number) => {
          h.sleeps.push(ms);
          await h.onSleep?.();
        },
        log: (entry) => h.logs.push(entry),
      };
    },
  };
  return h;
}

/** A complete, valid request body. */
export function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    customer_name: 'Dana Whitfield',
    phone: '(281) 555-2368',
    email: 'dana.whitfield@example.com',
    street_address: '2418 Cane Field Drive',
    city: 'Katy',
    state: 'TX',
    zip: '77494',
    service_summary: 'Mount a 65-inch TV and hide the wires',
    job_details: 'Living room wall is drywall over studs. TV and bracket are already here; would like the cords hidden.',
    service_path: 'todo_list_visit',
    preferred_timing: 'Weekday afternoons',
    contact_preference: 'text',
    consent_to_contact: true,
    confirmed_by_customer: true,
    source: 'chatgpt',
    ...overrides,
  };
}

export async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
