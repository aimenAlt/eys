import type { D1Database, Env } from './types.ts';
import { decryptSecret, encryptSecret, fromBase64url, randomToken } from './crypto.ts';
import { jobberClientId, jobberClientSecret } from './env.ts';
import { NOTE_HEADER } from './note.ts';
import { formatPhone, normalizePhone, type CleanRequest } from './validate.ts';

/**
 * Jobber's official GraphQL API only (no hosted-form scripting).
 * https://developer.getjobber.com/docs/building_your_app/app_authorization/
 */
export const JOBBER_GRAPHQL_URL = 'https://api.getjobber.com/api/graphql';
export const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
export const JOBBER_AUTHORIZE_URL = 'https://api.getjobber.com/api/oauth/authorize';
/** Newest active version in Jobber's changelog on 2026-10-25. */
export const JOBBER_API_VERSION = '2026-09-25';
export const JOBBER_REDIRECT_URI = 'https://www.eyshandyman.com/api/admin/jobber/callback';

/** Refresh this long before the access token's stated expiry. */
const EXPIRY_MARGIN = 2 * 60_000;
const LOCK_TTL = 30_000;
const REFRESH_ATTEMPTS = 4;
const THROTTLE_WAIT = 1_500;
const PLAN_TTL = 6 * 60 * 60_000;
const PLAN_PROBLEM_TTL = 10 * 60_000;

export type JobberErrorClass =
  | 'not_connected'
  | 'auth'
  | 'refresh_failed'
  | 'lock_busy'
  | 'throttled'
  | 'network'
  | 'http'
  | 'graphql'
  | 'schema'
  | 'user_errors'
  | 'verify';

/** Carries a class only: Jobber messages can echo customer input, so they are never kept. */
export class JobberError extends Error {
  readonly errorClass: JobberErrorClass;
  constructor(errorClass: JobberErrorClass) {
    super(`jobber:${errorClass}`);
    this.name = 'JobberError';
    this.errorClass = errorClass;
  }
}

export interface JobberDeps {
  env: Env;
  db: D1Database;
  adminKey: string;
  fetch: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export interface TokenSet {
  access: string;
  refresh: string;
  expiresAt: number;
}

interface StoredTokens extends TokenSet {
  status: string;
  accountName: string | null;
}

// ---------------------------------------------------------------------------
// Token store (D1, encrypted at rest)
// ---------------------------------------------------------------------------

export async function hasStoredTokens(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS ok FROM jobber_tokens WHERE id = 1 AND token_status != 'refresh_failed'")
    .first<{ ok: number }>();
  return Boolean(row);
}

async function loadTokens(deps: JobberDeps): Promise<StoredTokens | null> {
  const row = await deps.db
    .prepare(
      'SELECT access_token, refresh_token, access_expires_at, token_status, account_name FROM jobber_tokens WHERE id = 1',
    )
    .first<{
      access_token: string;
      refresh_token: string;
      access_expires_at: number;
      token_status: string;
      account_name: string | null;
    }>();
  if (!row) return null;
  const [access, refresh] = await Promise.all([
    decryptSecret(deps.adminKey, row.access_token),
    decryptSecret(deps.adminKey, row.refresh_token),
  ]);
  // Sealed under a different AI_ADMIN_KEY: treat as disconnected.
  if (!access || !refresh) return null;
  return {
    access,
    refresh,
    expiresAt: row.access_expires_at,
    status: row.token_status,
    accountName: row.account_name,
  };
}

export async function saveConnection(
  deps: JobberDeps,
  tokens: TokenSet,
  account: { id: string | null; name: string },
): Promise<void> {
  const [access, refresh] = await Promise.all([
    encryptSecret(deps.adminKey, tokens.access),
    encryptSecret(deps.adminKey, tokens.refresh),
  ]);
  await deps.db
    .prepare(
      `INSERT INTO jobber_tokens (id, access_token, access_expires_at, refresh_token, account_id, account_name, token_status, lock_owner, lock_until, updated_at)
       VALUES (1, ?1, ?2, ?3, ?4, ?5, 'valid', NULL, 0, ?6)
       ON CONFLICT(id) DO UPDATE SET
         access_token = excluded.access_token,
         access_expires_at = excluded.access_expires_at,
         refresh_token = excluded.refresh_token,
         account_id = excluded.account_id,
         account_name = excluded.account_name,
         token_status = 'valid',
         lock_owner = NULL,
         lock_until = 0,
         updated_at = excluded.updated_at`,
    )
    .bind(access, tokens.expiresAt, refresh, account.id, account.name, deps.now())
    .run();
}

/**
 * Rotation is on: Jobber invalidates the old refresh token the moment a new
 * one is issued, so the new pair is written before anything else happens,
 * whether or not this isolate still holds the lock.
 */
async function saveRefreshed(deps: JobberDeps, tokens: TokenSet): Promise<void> {
  const [access, refresh] = await Promise.all([
    encryptSecret(deps.adminKey, tokens.access),
    encryptSecret(deps.adminKey, tokens.refresh),
  ]);
  await deps.db
    .prepare(
      `UPDATE jobber_tokens SET access_token = ?1, access_expires_at = ?2, refresh_token = ?3,
         token_status = 'valid', updated_at = ?4 WHERE id = 1`,
    )
    .bind(access, tokens.expiresAt, refresh, deps.now())
    .run();
}

/** Atomic in D1: only one isolate can move lock_owner from free to itself. */
async function tryLock(deps: JobberDeps, owner: string): Promise<boolean> {
  const now = deps.now();
  const result = await deps.db
    .prepare(
      'UPDATE jobber_tokens SET lock_owner = ?1, lock_until = ?2 WHERE id = 1 AND (lock_owner IS NULL OR lock_until < ?3)',
    )
    .bind(owner, now + LOCK_TTL, now)
    .run();
  return (result.meta.changes ?? 0) === 1;
}

async function releaseLock(deps: JobberDeps, owner: string): Promise<void> {
  await deps.db
    .prepare('UPDATE jobber_tokens SET lock_owner = NULL, lock_until = 0 WHERE id = 1 AND lock_owner = ?1')
    .bind(owner)
    .run();
}

async function markRefreshFailed(deps: JobberDeps): Promise<void> {
  await deps.db.prepare("UPDATE jobber_tokens SET token_status = 'refresh_failed' WHERE id = 1").run();
}

// ---------------------------------------------------------------------------
// OAuth token endpoint
// ---------------------------------------------------------------------------

type TokenOutcome = { ok: true; tokens: TokenSet } | { ok: false; invalidGrant: boolean };

function jwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(token.split('.')[1] ?? '')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** expires_in when given, else the JWT's exp, else Jobber's documented 60 minutes. */
export function accessExpiry(data: Record<string, unknown>, now: number): number {
  if (typeof data.expires_in === 'number' && data.expires_in > 0) return now + data.expires_in * 1000;
  const exp = typeof data.access_token === 'string' ? jwtExpiry(data.access_token) : null;
  return exp ?? now + 60 * 60_000;
}

async function requestTokens(
  deps: JobberDeps,
  params: Record<string, string>,
  previousRefresh?: string,
): Promise<TokenOutcome> {
  const body = new URLSearchParams({
    client_id: jobberClientId(deps.env) ?? '',
    client_secret: jobberClientSecret(deps.env) ?? '',
    ...params,
  });
  let response: Response;
  try {
    response = await deps.fetch(JOBBER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
  } catch {
    throw new JobberError('network');
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON error page.
  }
  if (response.ok && typeof data.access_token === 'string') {
    const refresh = typeof data.refresh_token === 'string' ? data.refresh_token : previousRefresh;
    if (!refresh) return { ok: false, invalidGrant: false };
    return {
      ok: true,
      tokens: { access: data.access_token, refresh, expiresAt: accessExpiry(data, deps.now()) },
    };
  }
  const reason = `${String(data.error ?? '')} ${String(data.error_description ?? '')} ${String(data.message ?? '')}`;
  return { ok: false, invalidGrant: /invalid_grant|not valid/i.test(reason) };
}

export async function exchangeCode(deps: JobberDeps, code: string, verifier: string): Promise<TokenSet> {
  const outcome = await requestTokens(deps, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: JOBBER_REDIRECT_URI,
    code_verifier: verifier,
  });
  if (!outcome.ok) throw new JobberError('auth');
  return outcome.tokens;
}

function isFresh(tokens: StoredTokens | null, now: number): tokens is StoredTokens {
  return Boolean(tokens) && (tokens as StoredTokens).expiresAt - EXPIRY_MARGIN > now;
}

/**
 * A usable access token. `rejected` is a token Jobber just answered 401 to,
 * which forces a refresh even if its stated expiry is in the future.
 */
export async function getAccessToken(deps: JobberDeps, rejected?: string): Promise<string> {
  const stored = await loadTokens(deps);
  if (!stored || stored.status === 'refresh_failed') throw new JobberError('not_connected');
  if (isFresh(stored, deps.now()) && stored.access !== rejected) return stored.access;
  return refreshAccessToken(deps, stored.access);
}

/**
 * Refreshes under the D1 lock so only one isolate redeems the refresh token.
 * Losers wait and re-read. On invalid_grant the row is re-read (another
 * isolate may have rotated it a moment earlier) and retried with backoff;
 * only a refresh token that keeps failing marks the connection broken.
 */
async function refreshAccessToken(deps: JobberDeps, stale: string): Promise<string> {
  const owner = randomToken(12);
  let invalidGrants = 0;
  for (let attempt = 0; attempt < REFRESH_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await deps.sleep(200 * 2 ** (attempt - 1));
      const current = await loadTokens(deps);
      if (isFresh(current, deps.now()) && current.access !== stale) return current.access;
    }
    if (!(await tryLock(deps, owner))) continue;
    try {
      const current = await loadTokens(deps);
      if (!current) throw new JobberError('not_connected');
      if (isFresh(current, deps.now()) && current.access !== stale) return current.access;
      const outcome = await requestTokens(
        deps,
        { grant_type: 'refresh_token', refresh_token: current.refresh },
        current.refresh,
      );
      if (outcome.ok) {
        await saveRefreshed(deps, outcome.tokens);
        return outcome.tokens.access;
      }
      if (!outcome.invalidGrant) throw new JobberError('auth');
      invalidGrants += 1;
    } finally {
      await releaseLock(deps, owner);
    }
  }
  if (invalidGrants > 0) {
    await markRefreshFailed(deps);
    throw new JobberError('refresh_failed');
  }
  throw new JobberError('lock_busy');
}

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

interface GraphQLErrorShape {
  message?: string;
  extensions?: { code?: string };
}

const SCHEMA_ERROR_CODES = new Set([
  'undefinedField',
  'argumentNotAccepted',
  'missingRequiredArguments',
  'missingRequiredInputObjectAttribute',
  'undefinedType',
  'argumentLiteralsIncompatible',
  'variableMismatch',
  'inputObjectAttributeNotAccepted',
]);

function isThrottled(error: GraphQLErrorShape): boolean {
  return error.extensions?.code === 'THROTTLED' || /throttl/i.test(error.message ?? '');
}

function isSchemaError(error: GraphQLErrorShape): boolean {
  if (error.extensions?.code && SCHEMA_ERROR_CODES.has(error.extensions.code)) return true;
  return /doesn't exist on type|isn't a defined input type|Unknown argument|is missing required arguments|has an invalid value|InputObject '.*' doesn't accept argument/i.test(
    error.message ?? '',
  );
}

/**
 * One GraphQL call. 401 → refresh once and retry; THROTTLED (HTTP 429 or a
 * THROTTLED error) → one short wait and retry. With `accessToken` the stored
 * tokens are bypassed (used during the OAuth callback, before saving).
 */
export async function graphql<T>(
  deps: JobberDeps,
  query: string,
  variables: Record<string, unknown> = {},
  accessToken?: string,
): Promise<T> {
  let token = accessToken ?? (await getAccessToken(deps));
  let retriedAuth = Boolean(accessToken);
  let retriedThrottle = false;
  for (;;) {
    let response: Response;
    try {
      response = await deps.fetch(JOBBER_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch {
      throw new JobberError('network');
    }
    if (response.status === 401 && !retriedAuth) {
      retriedAuth = true;
      token = await getAccessToken(deps, token);
      continue;
    }
    if (response.status === 429) {
      if (retriedThrottle) throw new JobberError('throttled');
      retriedThrottle = true;
      await deps.sleep(THROTTLE_WAIT);
      continue;
    }
    if (!response.ok) throw new JobberError(response.status === 401 ? 'auth' : 'http');
    let body: { data?: T; errors?: GraphQLErrorShape[] };
    try {
      body = (await response.json()) as { data?: T; errors?: GraphQLErrorShape[] };
    } catch {
      throw new JobberError('http');
    }
    const errors = Array.isArray(body.errors) ? body.errors : [];
    if (errors.some(isThrottled)) {
      if (retriedThrottle) throw new JobberError('throttled');
      retriedThrottle = true;
      await deps.sleep(THROTTLE_WAIT);
      continue;
    }
    if (errors.length > 0) throw new JobberError(errors.some(isSchemaError) ? 'schema' : 'graphql');
    if (body.data === undefined || body.data === null) throw new JobberError('graphql');
    return body.data;
  }
}

export async function fetchAccount(
  deps: JobberDeps,
  accessToken: string,
): Promise<{ id: string | null; name: string }> {
  const data = await graphql<{ account?: { id?: string; name?: string } }>(
    deps,
    'query EysAccount { account { id name } }',
    {},
    accessToken,
  );
  const name = data.account?.name;
  if (typeof name !== 'string') throw new JobberError('graphql');
  return { id: data.account?.id ?? null, name };
}

// ---------------------------------------------------------------------------
// Schema discovery
//
// Jobber does not publish its mutation/input reference, so before the first
// write the shapes are read by introspection and the write plan is derived
// from what is actually there. Defaults (used only if introspection is off)
// follow Jobber's naming conventions.
// ---------------------------------------------------------------------------

export interface TypeRef {
  kind: string;
  name: string | null;
  ofType: TypeRef | null;
}
interface ArgInfo {
  name: string;
  type: TypeRef;
  /** GraphQL literal, or null when the argument / input field has no default. */
  defaultValue?: string | null;
}
interface FieldInfo {
  name: string;
  args?: ArgInfo[];
  type: TypeRef;
}
interface TypeInfo {
  name: string;
  kind: string;
  fields: FieldInfo[] | null;
  inputFields: ArgInfo[] | null;
  possibleTypes: { name: string }[] | null;
  enumValues?: { name: string }[] | null;
}
export interface SchemaSnapshot {
  queries: Map<string, FieldInfo>;
  mutations: Map<string, FieldInfo>;
  types: Map<string, TypeInfo>;
}

const TYPE_REF = 'kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } }';
const FIELD_SELECTION = `name args { name type { ${TYPE_REF} } defaultValue } type { ${TYPE_REF} }`;
/** Object fields worth following when collecting types for the plan. */
const FOLLOW_FIELDS = new Set(['address', 'properties', 'clientProperties', 'notes', 'nodes', 'phones', 'client', 'request', 'property']);
const SEED_TYPES = ['Client', 'Property', 'Request', 'RequestNote'];
const TEXT_FIELDS = ['message', 'body', 'note', 'content', 'text'];
const DETAILS_FIELDS = ['details', 'description', 'instructions', 'requestDetails'];

export function unwrap(type: TypeRef): { name: string; kind: string; list: boolean } {
  let list = false;
  let current: TypeRef | null = type;
  while (current && (current.kind === 'NON_NULL' || current.kind === 'LIST')) {
    if (current.kind === 'LIST') list = true;
    current = current.ofType;
  }
  return { name: current?.name ?? '', kind: current?.kind ?? '', list };
}

export function renderType(type: TypeRef): string {
  if (type.kind === 'NON_NULL' && type.ofType) return `${renderType(type.ofType)}!`;
  if (type.kind === 'LIST' && type.ofType) return `[${renderType(type.ofType)}]`;
  return type.name ?? 'String';
}

function noteMutationCandidates(mutations: Map<string, FieldInfo>): string[] {
  const names = [...mutations.keys()];
  const exact = names.filter((n) => n === 'requestCreateNote');
  const loose = names.filter(
    (n) => n !== 'requestCreateNote' && /^request\w*note/i.test(n) && /create|add/i.test(n),
  );
  const prefixed = names.filter((n) => /^(create|add)\w*requestnote/i.test(n));
  return [...exact, ...loose, ...prefixed];
}

async function fetchTypes(deps: JobberDeps, names: string[]): Promise<TypeInfo[]> {
  const safe = names.filter((n) => /^\w+$/.test(n));
  const out: TypeInfo[] = [];
  for (let i = 0; i < safe.length; i += 25) {
    const batch = safe.slice(i, i + 25);
    const selections = batch
      .map(
        (name, index) =>
          `t${index}: __type(name: "${name}") { name kind fields { ${FIELD_SELECTION} } inputFields { name type { ${TYPE_REF} } defaultValue } possibleTypes { name } enumValues { name } }`,
      )
      .join(' ');
    const data = await graphql<Record<string, TypeInfo | null>>(deps, `query EysSchemaTypes { ${selections} }`);
    for (const value of Object.values(data)) if (value) out.push(value);
  }
  return out;
}

/** Null when introspection is disabled. `extraMutations` widens the probe. */
export async function introspect(
  deps: JobberDeps,
  extraMutations: (name: string) => boolean = () => false,
): Promise<SchemaSnapshot | null> {
  let root: {
    __schema?: { queryType?: { fields: FieldInfo[] } | null; mutationType?: { fields: FieldInfo[] } | null };
  };
  try {
    root = await graphql(
      deps,
      `query EysSchemaRoots { __schema { queryType { fields { ${FIELD_SELECTION} } } mutationType { fields { ${FIELD_SELECTION} } } } }`,
    );
  } catch (error) {
    if (error instanceof JobberError && (error.errorClass === 'graphql' || error.errorClass === 'schema')) {
      return null;
    }
    throw error;
  }
  const schema = root.__schema;
  if (!schema?.mutationType?.fields || !schema.queryType?.fields) return null;

  const snapshot: SchemaSnapshot = {
    queries: new Map(schema.queryType.fields.map((f) => [f.name, f])),
    mutations: new Map(schema.mutationType.fields.map((f) => [f.name, f])),
    types: new Map(),
  };

  const want = new Set<string>(SEED_TYPES);
  const mutationNames = ['clientCreate', 'propertyCreate', 'requestCreate', ...noteMutationCandidates(snapshot.mutations)];
  for (const name of snapshot.mutations.keys()) if (extraMutations(name)) mutationNames.push(name);
  for (const name of mutationNames) {
    const field = snapshot.mutations.get(name);
    if (!field) continue;
    want.add(unwrap(field.type).name);
    for (const arg of field.args ?? []) {
      const t = unwrap(arg.type);
      if (t.kind === 'INPUT_OBJECT') want.add(t.name);
    }
  }
  for (const name of ['clients', 'client', 'request']) {
    const field = snapshot.queries.get(name);
    if (field) want.add(unwrap(field.type).name);
  }

  for (let round = 0; round < 4 && want.size > 0; round++) {
    const names = [...want].filter((n) => n && !snapshot.types.has(n));
    want.clear();
    if (names.length === 0 || snapshot.types.size > 120) break;
    for (const type of await fetchTypes(deps, names)) {
      snapshot.types.set(type.name, type);
      for (const input of type.inputFields ?? []) {
        const t = unwrap(input.type);
        if ((t.kind === 'INPUT_OBJECT' || t.kind === 'ENUM') && !snapshot.types.has(t.name)) want.add(t.name);
      }
      for (const field of type.fields ?? []) {
        const t = unwrap(field.type);
        if ((t.kind === 'OBJECT' || t.kind === 'UNION') && FOLLOW_FIELDS.has(field.name) && !snapshot.types.has(t.name)) {
          want.add(t.name);
        }
      }
      for (const possible of type.possibleTypes ?? []) {
        if (!snapshot.types.has(possible.name)) want.add(possible.name);
      }
    }
  }
  return snapshot;
}

export interface MutationPlan {
  mutation: string;
  inputArg: string;
  inputType: string;
  userErrors: boolean;
}

export interface JobberPlan {
  source: 'introspection' | 'defaults';
  clientSearch: { arg: string; argType: string; first: boolean } | null;
  clientIdType: string;
  clientProperties: { field: string; connection: boolean; first: boolean } | null;
  propertyAddress: { street: string; zip: string };
  clientCreate: MutationPlan & {
    smsAllowed: boolean;
    emails: boolean;
    /** Enum value for the phone's `description` label, or null to omit the field. */
    phoneDescription: string | null;
    phonePrimary: boolean;
    emailDescription: string | null;
    emailPrimary: boolean;
  };
  propertyCreate: MutationPlan & {
    clientIdArg: string;
    clientIdType: string;
    wrapper: string | null;
    payloadField: string;
    payloadList: boolean;
  };
  requestCreate: MutationPlan & {
    detailsField: string | null;
    /**
     * RequestCreateInput.propertyId is non-null in the live schema (Jobber does
     * not publish it): a request sent without an address then needs a
     * placeholder property. Nullable: it is simply left out.
     */
    propertyIdRequired: boolean;
  };
  note:
    | {
        mutation: string;
        idArg: string;
        idType: string;
        inputArg: string;
        inputType: string | null;
        textField: string | null;
        userErrors: boolean;
      }
    | null;
  readback: {
    requestIdType: string;
    notes: { field: string; first: boolean; noteType: string; textField: string } | null;
  };
  /**
   * Why a request without an address cannot be written (the placeholder
   * property would leave a required input empty). Empty when it can; never
   * blocks requests that carry an address.
   */
  addressFreeProblems: string[];
}

export const DEFAULT_PLAN: JobberPlan = {
  source: 'defaults',
  clientSearch: { arg: 'searchTerm', argType: 'String', first: true },
  clientIdType: 'EncodedId!',
  clientProperties: { field: 'properties', connection: false, first: false },
  propertyAddress: { street: 'street1', zip: 'postalCode' },
  clientCreate: {
    mutation: 'clientCreate',
    inputArg: 'input',
    inputType: 'ClientCreateInput!',
    userErrors: true,
    smsAllowed: true,
    emails: true,
    phoneDescription: 'MAIN',
    phonePrimary: true,
    emailDescription: 'MAIN',
    emailPrimary: true,
  },
  propertyCreate: {
    mutation: 'propertyCreate',
    inputArg: 'input',
    inputType: 'PropertyCreateInput!',
    userErrors: true,
    clientIdArg: 'clientId',
    clientIdType: 'EncodedId!',
    wrapper: 'properties',
    payloadField: 'properties',
    payloadList: true,
  },
  requestCreate: {
    mutation: 'requestCreate',
    inputArg: 'input',
    inputType: 'RequestCreateInput!',
    userErrors: true,
    detailsField: null,
    propertyIdRequired: false,
  },
  note: {
    mutation: 'requestCreateNote',
    idArg: 'requestId',
    idType: 'EncodedId!',
    inputArg: 'input',
    inputType: 'RequestCreateNoteInput!',
    textField: 'message',
    userErrors: true,
  },
  readback: {
    requestIdType: 'EncodedId!',
    notes: { field: 'notes', first: true, noteType: 'RequestNote', textField: 'message' },
  },
  addressFreeProblems: [],
};

function fieldsOf(snapshot: SchemaSnapshot, typeName: string): FieldInfo[] {
  return snapshot.types.get(typeName)?.fields ?? [];
}
function inputFieldsOf(snapshot: SchemaSnapshot, typeName: string): ArgInfo[] {
  return snapshot.types.get(typeName)?.inputFields ?? [];
}
function hasField(snapshot: SchemaSnapshot, typeName: string, field: string): boolean {
  return fieldsOf(snapshot, typeName).some((f) => f.name === field);
}
function inputField(snapshot: SchemaSnapshot, typeName: string, field: string): ArgInfo | undefined {
  return inputFieldsOf(snapshot, typeName).find((f) => f.name === field);
}
function isStringType(type: TypeRef): boolean {
  const t = unwrap(type);
  return t.kind === 'SCALAR' && t.name === 'String' && !t.list;
}

/** NON_NULL with no default: the API rejects a call that leaves it out. */
function isRequired(field: ArgInfo): boolean {
  return field.type.kind === 'NON_NULL' && (field.defaultValue === undefined || field.defaultValue === null);
}

/**
 * Pre-flight: every required input field the write path does not fill is a
 * problem, so getPlan refuses before the first client or property exists.
 */
function requireSupplied(s: SchemaSnapshot, typeName: string, supplied: string[], problems: string[]): void {
  if (!typeName) return;
  for (const field of inputFieldsOf(s, typeName)) {
    if (isRequired(field) && !supplied.includes(field.name)) {
      problems.push(`${typeName}.${field.name} is required and not supplied`);
    }
  }
}

function requireArgs(field: FieldInfo, supplied: string[], problems: string[]): void {
  for (const arg of field.args ?? []) {
    if (isRequired(arg) && !supplied.includes(arg.name)) {
      problems.push(`${field.name}(${arg.name}) is required and not supplied`);
    }
  }
}

/**
 * The enum value for a phone or email `description` label: the first of
 * `preferred` the schema lists, else its first value. Null (omit the field)
 * when there is no such field or it is not an enum.
 */
function chooseLabel(s: SchemaSnapshot, typeName: string, preferred: string[]): string | null {
  const field = inputField(s, typeName, 'description');
  if (!field) return null;
  const t = unwrap(field.type);
  if (t.kind !== 'ENUM') return null;
  const values = (s.types.get(t.name)?.enumValues ?? []).map((v) => v.name);
  if (values.length === 0) return null;
  return preferred.find((v) => values.includes(v)) ?? values[0];
}

/** Reads the single INPUT_OBJECT argument of a mutation (conventionally `input`). */
function inputArgOf(field: FieldInfo): ArgInfo | undefined {
  const args = field.args ?? [];
  return args.find((a) => a.name === 'input') ?? args.find((a) => unwrap(a.type).kind === 'INPUT_OBJECT');
}

export function buildPlan(snapshot: SchemaSnapshot | null): { plan: JobberPlan; problems: string[]; warnings: string[] } {
  if (!snapshot) return { plan: DEFAULT_PLAN, problems: [], warnings: ['introspection disabled: using defaults'] };
  const problems: string[] = [];
  const warnings: string[] = [];
  const s = snapshot;

  // Client lookup by phone.
  let clientSearch: JobberPlan['clientSearch'] = null;
  const clientsQuery = s.queries.get('clients');
  const searchArg = clientsQuery?.args?.find((a) => ['searchTerm', 'search', 'query', 'term'].includes(a.name));
  const clientConnection = clientsQuery ? unwrap(clientsQuery.type).name : '';
  if (clientsQuery && searchArg && hasField(s, clientConnection, 'nodes') && hasField(s, 'Client', 'phones')) {
    clientSearch = {
      arg: searchArg.name,
      argType: renderType(searchArg.type).replace(/!$/, ''),
      first: Boolean(clientsQuery.args?.some((a) => a.name === 'first')),
    };
  } else warnings.push('no client search by phone: every AI request will create a new client');

  const clientQuery = s.queries.get('client');
  const clientIdArg = clientQuery?.args?.find((a) => a.name === 'id');
  let clientProperties: JobberPlan['clientProperties'] = null;
  const propertiesField = fieldsOf(s, 'Client').find((f) => f.name === 'properties' || f.name === 'clientProperties');
  if (clientQuery && clientIdArg && propertiesField) {
    const typeName = unwrap(propertiesField.type).name;
    clientProperties = {
      field: propertiesField.name,
      connection: hasField(s, typeName, 'nodes'),
      first: Boolean(propertiesField.args?.some((a) => a.name === 'first')),
    };
  } else warnings.push("cannot read a client's properties: a matched client always gets a new property");

  const addressType = unwrap(fieldsOf(s, 'Property').find((f) => f.name === 'address')?.type ?? DUMMY).name;
  const addressFields = fieldsOf(s, addressType).map((f) => f.name);
  const propertyAddress = {
    street: addressFields.includes('street1') ? 'street1' : addressFields.includes('street') ? 'street' : 'street1',
    zip: addressFields.includes('postalCode') ? 'postalCode' : addressFields.includes('zip') ? 'zip' : 'postalCode',
  };

  // clientCreate.
  const clientCreateField = s.mutations.get('clientCreate');
  const clientInput = clientCreateField && inputArgOf(clientCreateField);
  const clientInputType = clientInput ? unwrap(clientInput.type).name : '';
  const phonesInput = inputField(s, clientInputType, 'phones');
  const phoneType = phonesInput ? unwrap(phonesInput.type).name : '';
  const emailsInput = inputField(s, clientInputType, 'emails');
  const emailType = emailsInput ? unwrap(emailsInput.type).name : '';
  const emails = Boolean(emailsInput && inputField(s, emailType, 'address'));
  const phoneDescription = chooseLabel(s, phoneType, ['MAIN', 'MOBILE', 'OTHER']);
  const emailDescription = chooseLabel(s, emailType, ['MAIN', 'PERSONAL', 'OTHER']);
  const phonePrimary = Boolean(inputField(s, phoneType, 'primary'));
  const emailPrimary = Boolean(inputField(s, emailType, 'primary'));
  const smsAllowed = Boolean(inputField(s, phoneType, 'smsAllowed'));
  if (!clientCreateField || !clientInput) problems.push('mutation clientCreate(input) not found');
  else {
    for (const f of ['firstName', 'lastName', 'phones']) {
      if (!inputField(s, clientInputType, f)) problems.push(`${clientInputType}.${f} not found`);
    }
    if (phonesInput && !inputField(s, phoneType, 'number')) problems.push(`${phoneType}.number not found`);
    if (!hasField(s, unwrap(clientCreateField.type).name, 'client')) problems.push('clientCreate payload has no client');
    requireArgs(clientCreateField, [clientInput.name], problems);
    requireSupplied(s, clientInputType, ['firstName', 'lastName', 'phones', ...(emails ? ['emails'] : [])], problems);
    if (emails && emailsInput && isRequired(emailsInput)) {
      problems.push(`${clientInputType}.emails is required but only supplied when the customer gives an email`);
    }
    requireSupplied(
      s,
      phoneType,
      [
        'number',
        ...(phoneDescription ? ['description'] : []),
        ...(phonePrimary ? ['primary'] : []),
        ...(smsAllowed ? ['smsAllowed'] : []),
      ],
      problems,
    );
    if (emails) {
      requireSupplied(
        s,
        emailType,
        ['address', ...(emailDescription ? ['description'] : []), ...(emailPrimary ? ['primary'] : [])],
        problems,
      );
    }
  }
  const clientCreate: JobberPlan['clientCreate'] = {
    mutation: 'clientCreate',
    inputArg: clientInput?.name ?? 'input',
    inputType: clientInput ? renderType(clientInput.type) : 'ClientCreateInput!',
    userErrors: clientCreateField ? hasField(s, unwrap(clientCreateField.type).name, 'userErrors') : true,
    smsAllowed,
    emails,
    phoneDescription,
    phonePrimary,
    emailDescription,
    emailPrimary,
  };

  // propertyCreate.
  const propertyField = s.mutations.get('propertyCreate');
  let propertyCreate: JobberPlan['propertyCreate'] = DEFAULT_PLAN.propertyCreate;
  let addressInputType = '';
  if (!propertyField) problems.push('mutation propertyCreate not found');
  else {
    const idArg = propertyField.args?.find((a) => /client/i.test(a.name));
    const input = inputArgOf(propertyField);
    const inputTypeName = input ? unwrap(input.type).name : '';
    const listField = inputFieldsOf(s, inputTypeName).find(
      (f) => unwrap(f.type).list && unwrap(f.type).kind === 'INPUT_OBJECT',
    );
    const attrsType = listField ? unwrap(listField.type).name : inputTypeName;
    const addressInput = inputField(s, attrsType, 'address');
    addressInputType = addressInput ? unwrap(addressInput.type).name : '';
    const payloadType = unwrap(propertyField.type).name;
    const payload = fieldsOf(s, payloadType).find((f) => f.name === 'properties' || f.name === 'property');
    if (!idArg || !input) problems.push('propertyCreate(clientId, input) arguments not found');
    if (!addressInput) problems.push(`${attrsType || 'property input'}.address not found`);
    for (const f of ['street1', 'city', 'province', 'postalCode']) {
      if (addressInput && !inputField(s, addressInputType, f)) problems.push(`${addressInputType}.${f} not found`);
    }
    if (!payload) problems.push('propertyCreate payload has no properties/property');
    if (idArg && input) requireArgs(propertyField, [idArg.name, input.name], problems);
    if (listField) requireSupplied(s, inputTypeName, [listField.name], problems);
    requireSupplied(s, attrsType, ['address'], problems);
    requireSupplied(s, addressInputType, ['street1', 'city', 'province', 'postalCode'], problems);
    propertyCreate = {
      mutation: 'propertyCreate',
      inputArg: input?.name ?? 'input',
      inputType: input ? renderType(input.type) : 'PropertyCreateInput!',
      userErrors: hasField(s, payloadType, 'userErrors'),
      clientIdArg: idArg?.name ?? 'clientId',
      clientIdType: idArg ? renderType(idArg.type) : 'EncodedId!',
      wrapper: listField?.name ?? null,
      payloadField: payload?.name ?? 'properties',
      payloadList: payload ? unwrap(payload.type).list : true,
    };
  }

  // requestCreate.
  const requestField = s.mutations.get('requestCreate');
  const requestInput = requestField && inputArgOf(requestField);
  const requestInputType = requestInput ? unwrap(requestInput.type).name : '';
  if (!requestField || !requestInput) problems.push('mutation requestCreate(input) not found');
  else {
    for (const f of ['clientId', 'propertyId', 'title']) {
      if (!inputField(s, requestInputType, f)) problems.push(`${requestInputType}.${f} not found`);
    }
    if (!hasField(s, unwrap(requestField.type).name, 'request')) problems.push('requestCreate payload has no request');
  }
  const detailsField =
    DETAILS_FIELDS.find((name) => {
      const f = inputField(s, requestInputType, name);
      return f ? isStringType(f.type) : false;
    }) ?? null;
  const propertyIdInput = inputField(s, requestInputType, 'propertyId');
  const propertyIdRequired = Boolean(propertyIdInput && isRequired(propertyIdInput));
  if (requestField && requestInput) {
    requireArgs(requestField, [requestInput.name], problems);
    requireSupplied(
      s,
      requestInputType,
      ['clientId', ...(propertyIdRequired ? ['propertyId'] : []), 'title', ...(detailsField ? [detailsField] : [])],
      problems,
    );
  }
  const requestCreate: JobberPlan['requestCreate'] = {
    mutation: 'requestCreate',
    inputArg: requestInput?.name ?? 'input',
    inputType: requestInput ? renderType(requestInput.type) : 'RequestCreateInput!',
    userErrors: requestField ? hasField(s, unwrap(requestField.type).name, 'userErrors') : true,
    detailsField,
    propertyIdRequired,
  };

  // Without an address and with propertyId required, the placeholder property
  // fills only street1 and province.
  const addressFreeProblems: string[] = [];
  if (propertyIdRequired) requireSupplied(s, addressInputType, ['street1', 'province'], addressFreeProblems);
  if (addressFreeProblems.length > 0) {
    warnings.push(`requests without an address cannot be written: ${addressFreeProblems.join('; ')}`);
  }

  // Note on the request.
  let note: JobberPlan['note'] = null;
  let noteProblems: string[] = [];
  for (const name of noteMutationCandidates(s.mutations)) {
    const field = s.mutations.get(name);
    if (!field) continue;
    const idArg = field.args?.find((a) => /request/i.test(a.name)) ?? field.args?.find((a) => a.name === 'id');
    if (!idArg) continue;
    const input = inputArgOf(field);
    const payloadErrors = hasField(s, unwrap(field.type).name, 'userErrors');
    if (input) {
      const inputTypeName = unwrap(input.type).name;
      const textField = TEXT_FIELDS.find((t) => {
        const f = inputField(s, inputTypeName, t);
        return f ? isStringType(f.type) : false;
      });
      if (!textField) continue;
      const gaps: string[] = [];
      requireArgs(field, [idArg.name, input.name], gaps);
      requireSupplied(s, inputTypeName, [textField], gaps);
      if (gaps.length > 0) {
        if (noteProblems.length === 0) noteProblems = gaps;
        continue;
      }
      note = {
        mutation: name,
        idArg: idArg.name,
        idType: renderType(idArg.type),
        inputArg: input.name,
        inputType: renderType(input.type),
        textField,
        userErrors: payloadErrors,
      };
      break;
    }
    const direct = field.args?.find((a) => TEXT_FIELDS.includes(a.name) && isStringType(a.type));
    if (direct) {
      const gaps: string[] = [];
      requireArgs(field, [idArg.name, direct.name], gaps);
      if (gaps.length > 0) {
        if (noteProblems.length === 0) noteProblems = gaps;
        continue;
      }
      note = {
        mutation: name,
        idArg: idArg.name,
        idType: renderType(idArg.type),
        inputArg: direct.name,
        inputType: null,
        textField: null,
        userErrors: payloadErrors,
      };
      break;
    }
  }
  if (!note && !detailsField) {
    problems.push('no request note mutation and no details field: the job text could not be attached', ...noteProblems);
  } else if (!note && noteProblems.length > 0) {
    warnings.push(`note mutation skipped (${noteProblems.join('; ')}): the job text goes in ${detailsField}`);
  }

  // Read-back.
  const requestQuery = s.queries.get('request');
  const requestIdArg = requestQuery?.args?.find((a) => a.name === 'id');
  if (!requestQuery || !requestIdArg) problems.push('query request(id) not found');
  let notesReadback: JobberPlan['readback']['notes'] = null;
  const notesField = fieldsOf(s, 'Request').find((f) => f.name === 'notes');
  if (notesField) {
    const connection = unwrap(notesField.type).name;
    const nodesType = unwrap(fieldsOf(s, connection).find((f) => f.name === 'nodes')?.type ?? DUMMY).name;
    const candidates = [nodesType, ...(s.types.get(nodesType)?.possibleTypes ?? []).map((p) => p.name)];
    const noteType = candidates.find((t) => t === 'RequestNote') ?? candidates.find((t) => /note/i.test(t) && s.types.get(t)?.kind === 'OBJECT');
    const textField = noteType ? TEXT_FIELDS.find((t) => hasField(s, noteType, t)) : undefined;
    if (noteType && textField) {
      notesReadback = {
        field: 'notes',
        first: Boolean(notesField.args?.some((a) => a.name === 'first')),
        noteType,
        textField,
      };
    }
  }
  if (!notesReadback) warnings.push('request notes cannot be read back: only the title is verified');

  return {
    plan: {
      source: 'introspection',
      clientSearch,
      clientIdType: clientIdArg ? renderType(clientIdArg.type) : 'EncodedId!',
      clientProperties,
      propertyAddress,
      clientCreate,
      propertyCreate,
      requestCreate,
      note,
      readback: {
        requestIdType: requestIdArg ? renderType(requestIdArg.type) : 'EncodedId!',
        notes: notesReadback,
      },
      addressFreeProblems,
    },
    problems,
    warnings,
  };
}

const DUMMY: TypeRef = { kind: 'SCALAR', name: '', ofType: null };

let planCache: { plan: JobberPlan; problems: string[]; expires: number } | null = null;

export function resetPlanCache(): void {
  planCache = null;
}

/** Cached per isolate. Throws `schema` before any write if the plan has gaps. */
export async function getPlan(deps: JobberDeps): Promise<JobberPlan> {
  const now = deps.now();
  if (!planCache || planCache.expires < now) {
    const { plan, problems } = buildPlan(await introspect(deps));
    planCache = { plan, problems, expires: now + (problems.length ? PLAN_PROBLEM_TTL : PLAN_TTL) };
  }
  if (planCache.problems.length > 0) throw new JobberError('schema');
  return planCache.plan;
}

/** GET /api/admin/jobber/probe: what Jobber's schema actually accepts. */
export async function probeSchema(deps: JobberDeps) {
  const related = (name: string) => /request|note/i.test(name);
  const snapshot = await introspect(deps, related);
  if (!snapshot) {
    return {
      introspection: 'disabled',
      message:
        'Jobber did not answer the introspection query, so the input shapes could not be read. The write path would use its built-in defaults.',
      api_version: JOBBER_API_VERSION,
      default_plan: DEFAULT_PLAN,
    };
  }
  const describeInput = (type: TypeRef, depth: number): unknown => {
    const t = unwrap(type);
    if (t.kind !== 'INPUT_OBJECT') return undefined;
    return inputFieldsOf(snapshot, t.name).map((f) => {
      const inner = unwrap(f.type);
      const values = inner.kind === 'ENUM' ? snapshot.types.get(inner.name)?.enumValues : null;
      return {
        name: f.name,
        type: renderType(f.type),
        ...(isRequired(f) ? { required: true } : {}),
        ...(values ? { enum_values: values.map((v) => v.name) } : {}),
        ...(depth > 0 && inner.kind === 'INPUT_OBJECT' ? { input_fields: describeInput(f.type, depth - 1) } : {}),
      };
    });
  };
  const describe = (name: string) => {
    const field = snapshot.mutations.get(name);
    if (!field) return null;
    return {
      name,
      returns: renderType(field.type),
      args: (field.args ?? []).map((a) => ({
        name: a.name,
        type: renderType(a.type),
        input_fields: describeInput(a.type, 2),
      })),
    };
  };
  const { plan, problems, warnings } = buildPlan(snapshot);
  return {
    introspection: 'enabled',
    api_version: JOBBER_API_VERSION,
    request_create: describe('requestCreate'),
    client_create: describe('clientCreate'),
    property_create: describe('propertyCreate'),
    request_and_note_mutations: [...snapshot.mutations.keys()].filter(related).sort().map(describe),
    plan,
    plan_problems: problems,
    plan_warnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// Write sequence
// ---------------------------------------------------------------------------

const STREET_WORDS: Record<string, string> = {
  street: 'st', drive: 'dr', lane: 'ln', road: 'rd', avenue: 'ave', court: 'ct', boulevard: 'blvd',
  circle: 'cir', parkway: 'pkwy', trail: 'trl', place: 'pl', creek: 'crk', highway: 'hwy',
  terrace: 'ter', way: 'way', north: 'n', south: 's', east: 'e', west: 'w', apartment: 'apt',
  suite: 'ste', unit: 'unit', hollow: 'holw', crossing: 'xing', point: 'pt', ridge: 'rdg',
};

export function normalizeStreet(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => STREET_WORDS[word] ?? word)
    .join(' ');
}

interface PropertyAddress {
  street1: string;
  city: string;
  province: string;
  postalCode: string;
}
interface PlaceholderAddress {
  street1: string;
  province: string;
}

/** Never a real-looking address: it tells whoever opens the request what to do. */
export const PLACEHOLDER_ADDRESS: PlaceholderAddress = { street1: 'Address needed - ask on the call', province: 'TX' };

function assertNoUserErrors(payload: { userErrors?: { message?: string }[] | null } | null | undefined): void {
  if (!payload) throw new JobberError('graphql');
  if (payload.userErrors && payload.userErrors.length > 0) throw new JobberError('user_errors');
}

async function findClientByPhone(deps: JobberDeps, plan: JobberPlan, digits: string): Promise<string | null> {
  if (!plan.clientSearch) return null;
  const { arg, argType, first } = plan.clientSearch;
  const query = `query EysFindClients($term: ${argType}) { clients(${arg}: $term${first ? ', first: 10' : ''}) { nodes { id phones { number } } } }`;
  for (const term of [digits, formatPhone(digits)]) {
    const data = await graphql<{
      clients?: { nodes?: { id: string; phones?: ({ number?: string | null } | null)[] | null }[] };
    }>(deps, query, { term });
    for (const node of data.clients?.nodes ?? []) {
      // Search is fuzzy; only an exact digit match counts.
      const matches = (node.phones ?? []).some((p) => p?.number && normalizePhone(p.number) === digits);
      if (matches) return node.id;
    }
  }
  return null;
}

async function findPropertyOnStreet(
  deps: JobberDeps,
  plan: JobberPlan,
  clientId: string,
  address: PropertyAddress,
): Promise<string | null> {
  const props = plan.clientProperties;
  if (!props) return null;
  const { street, zip } = plan.propertyAddress;
  const selection = `id address { ${street} ${zip} }`;
  const field = props.connection
    ? `${props.field}${props.first ? '(first: 50)' : ''} { nodes { ${selection} } }`
    : `${props.field} { ${selection} }`;
  const data = await graphql<{
    client?: Record<string, unknown> | null;
  }>(deps, `query EysClientProperties($id: ${plan.clientIdType}) { client(id: $id) { ${field} } }`, { id: clientId });
  const raw = data.client?.[props.field] as
    | { nodes?: unknown[] }
    | unknown[]
    | undefined;
  const list = (Array.isArray(raw) ? raw : (raw?.nodes ?? [])) as {
    id: string;
    address?: Record<string, string | null> | null;
  }[];
  const want = normalizeStreet(address.street1);
  for (const property of list) {
    const found = property.address ?? {};
    const sameStreet = normalizeStreet(found[street] ?? '') === want;
    const sameZip = (found[zip] ?? '').slice(0, 5) === address.postalCode;
    if (sameStreet && sameZip) return property.id;
  }
  return null;
}

async function createClient(deps: JobberDeps, plan: JobberPlan, request: CleanRequest): Promise<string> {
  const c = plan.clientCreate;
  const phone: Record<string, unknown> = { number: request.phoneDisplay };
  if (c.phoneDescription) phone.description = c.phoneDescription;
  if (c.phonePrimary) phone.primary = true;
  if (c.smsAllowed) phone.smsAllowed = request.contactPreference === 'text';
  const input: Record<string, unknown> = {
    firstName: request.firstName,
    lastName: request.lastName,
    phones: [phone],
  };
  if (request.email && c.emails) {
    const email: Record<string, unknown> = { address: request.email };
    if (c.emailDescription) email.description = c.emailDescription;
    if (c.emailPrimary) email.primary = true;
    input.emails = [email];
  }
  const data = await graphql<{
    clientCreate?: { client?: { id: string } | null; userErrors?: { message?: string }[] | null };
  }>(
    deps,
    `mutation EysCreateClient($input: ${c.inputType}) { clientCreate(${c.inputArg}: $input) { client { id } ${c.userErrors ? 'userErrors { message }' : ''} } }`,
    { input },
  );
  assertNoUserErrors(data.clientCreate);
  const id = data.clientCreate?.client?.id;
  if (!id) throw new JobberError('graphql');
  return id;
}

async function createProperty(
  deps: JobberDeps,
  plan: JobberPlan,
  clientId: string,
  address: PropertyAddress | PlaceholderAddress,
): Promise<string> {
  const p = plan.propertyCreate;
  const attributes = { address };
  const input = p.wrapper ? { [p.wrapper]: [attributes] } : attributes;
  const data = await graphql<{ propertyCreate?: Record<string, unknown> | null }>(
    deps,
    `mutation EysCreateProperty($clientId: ${p.clientIdType}, $input: ${p.inputType}) { propertyCreate(${p.clientIdArg}: $clientId, ${p.inputArg}: $input) { ${p.payloadField} { id } ${p.userErrors ? 'userErrors { message }' : ''} } }`,
    { clientId, input },
  );
  const payload = data.propertyCreate as { userErrors?: { message?: string }[] | null } | null | undefined;
  assertNoUserErrors(payload);
  const created = data.propertyCreate?.[p.payloadField] as { id?: string } | { id?: string }[] | null | undefined;
  const id = Array.isArray(created) ? created[0]?.id : created?.id;
  if (!id) throw new JobberError('graphql');
  return id;
}

async function createRequest(
  deps: JobberDeps,
  plan: JobberPlan,
  ids: { clientId: string; propertyId: string | null },
  title: string,
  note: string,
): Promise<string> {
  const r = plan.requestCreate;
  const input: Record<string, unknown> = { clientId: ids.clientId };
  if (ids.propertyId !== null) input.propertyId = ids.propertyId;
  input.title = title;
  if (r.detailsField) input[r.detailsField] = note;
  const data = await graphql<{
    requestCreate?: { request?: { id: string } | null; userErrors?: { message?: string }[] | null };
  }>(
    deps,
    `mutation EysCreateRequest($input: ${r.inputType}) { requestCreate(${r.inputArg}: $input) { request { id } ${r.userErrors ? 'userErrors { message }' : ''} } }`,
    { input },
  );
  assertNoUserErrors(data.requestCreate);
  const id = data.requestCreate?.request?.id;
  if (!id) throw new JobberError('graphql');
  return id;
}

async function addNote(deps: JobberDeps, plan: JobberPlan, requestId: string, note: string): Promise<void> {
  const n = plan.note;
  if (!n) return;
  const value = n.inputType && n.textField ? { [n.textField]: note } : note;
  const valueType = n.inputType ?? 'String!';
  const data = await graphql<Record<string, { userErrors?: { message?: string }[] | null } | null>>(
    deps,
    `mutation EysAddNote($id: ${n.idType}, $value: ${valueType}) { ${n.mutation}(${n.idArg}: $id, ${n.inputArg}: $value) { ${n.userErrors ? 'userErrors { message }' : '__typename'} } }`,
    { id: requestId, value },
  );
  assertNoUserErrors(data[n.mutation]);
}

async function verifyRequest(deps: JobberDeps, plan: JobberPlan, requestId: string, title: string): Promise<void> {
  const notes = plan.readback.notes;
  const notesSelection = notes
    ? `${notes.field}${notes.first ? '(first: 20)' : ''} { nodes { __typename ... on ${notes.noteType} { ${notes.textField} } } }`
    : '';
  const data = await graphql<{
    request?: { id: string; title?: string | null; notes?: { nodes?: Record<string, unknown>[] } } | null;
  }>(
    deps,
    `query EysVerifyRequest($id: ${plan.readback.requestIdType}) { request(id: $id) { id title ${notesSelection} } }`,
    { id: requestId },
  );
  const found = data.request;
  if (!found || (found.title ?? '').trim() !== title.trim()) throw new JobberError('verify');
  if (notes && plan.note) {
    const texts = (found.notes?.nodes ?? []).map((node) => String(node[notes.textField] ?? ''));
    if (!texts.some((t) => t.startsWith(NOTE_HEADER))) throw new JobberError('verify');
  }
}

export interface WriteProgress {
  stage: 'plan' | 'client' | 'property' | 'request' | 'note' | 'verify' | 'done';
  requestCreated: boolean;
  reusedClient: boolean;
  createdProperty: boolean;
}

/**
 * (1) find the client by phone (verified digit-for-digit) or create one,
 * never editing an existing client; reuse or create the property (none for a
 * request sent without an address, unless Jobber requires one: then a
 * placeholder); (2) requestCreate; (3) attach the details note; (4) read it
 * back. `progress` records how far it got, so a failure after the request
 * exists is never retried into a duplicate.
 */
export async function writeServiceRequest(
  deps: JobberDeps,
  request: CleanRequest,
  title: string,
  note: string,
  progress: WriteProgress,
): Promise<void> {
  progress.stage = 'plan';
  const plan = await getPlan(deps);
  const address: PropertyAddress | null =
    request.street !== null && request.city !== null && request.zip !== null
      ? { street1: request.street, city: request.city, province: request.state, postalCode: request.zip }
      : null;
  // Refuse before anything exists in Jobber, like any other schema gap.
  if (!address && plan.addressFreeProblems.length > 0) throw new JobberError('schema');

  progress.stage = 'client';
  let clientId = await findClientByPhone(deps, plan, request.phoneDigits);
  let propertyId: string | null = null;
  if (clientId) {
    progress.reusedClient = true;
    if (address) propertyId = await findPropertyOnStreet(deps, plan, clientId, address);
  } else {
    clientId = await createClient(deps, plan, request);
  }

  if (!propertyId && (address || plan.requestCreate.propertyIdRequired)) {
    progress.stage = 'property';
    propertyId = await createProperty(deps, plan, clientId, address ?? PLACEHOLDER_ADDRESS);
    progress.createdProperty = true;
  }

  progress.stage = 'request';
  const requestId = await createRequest(deps, plan, { clientId, propertyId }, title, note);
  progress.requestCreated = true;

  progress.stage = 'note';
  await addNote(deps, plan, requestId, note);

  progress.stage = 'verify';
  await verifyRequest(deps, plan, requestId, title);
  progress.stage = 'done';
}
