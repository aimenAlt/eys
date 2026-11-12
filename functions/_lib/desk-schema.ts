import type { D1Database } from './types.ts';
import { FIELD_SELECTION, JobberError, fetchTypes, graphql, renderType, unwrap, type FieldInfo, type JobberDeps, type TypeInfo } from './jobber.ts';
import { DAY, HOUR } from './db.ts';
import { kvGet, kvSet } from './desk-db.ts';

/**
 * What the desk's Jobber token can actually see, read by introspection and
 * cached in D1 (desk_kv 'jobber_schema'), plus a tiny selection builder that
 * drops any field the schema does not have before a query is sent.
 *
 * Jobber does not publish its reference, and an app token sees less than the
 * full schema (fields outside its scopes are hidden), so every query the desk
 * runs is built from a wish list and pruned against this snapshot. A missing
 * optional field costs that one line on the desk, never the whole page.
 */

export interface CompactField {
  /** Named type at the bottom of NON_NULL / LIST wrappers. */
  type: string;
  kind: string;
  /** Argument name → rendered GraphQL type ("EncodedId!", "[QuotesSortInput!]"). */
  args: Record<string, string>;
}

export interface CompactType {
  kind: string;
  fields: Record<string, CompactField>;
  possible: string[];
  enumValues: string[];
}

export interface DeskSchema {
  fetchedAt: number;
  queries: Record<string, CompactField>;
  mutations: Record<string, CompactField>;
  types: Record<string, CompactType>;
}

const KV_KEY = 'jobber_schema';
const SCHEMA_TTL = 12 * HOUR;
/** Past the TTL a snapshot is still served (and refreshed in the background) for up to this long. */
const SCHEMA_STALE_MAX = 7 * DAY;

/** Types every desk query starts from; anything below them is discovered by walking the wish lists. */
const SEED_TYPES = [
  'Quote',
  'QuoteConnection',
  'Client',
  'Request',
  'QuoteStatusTypeEnum',
  'QuoteFilterAttributes',
  'QuotesSortInput',
  'QuotesSortKey',
  'QuotesMarkAwaitingResponsePayload',
  'QuoteCreateNotePayload',
  'QuoteCreateNoteInput',
  'QuoteEditLineItemAttributes',
  'QuoteEditLineItemsPayload',
  'QuoteArchivePayload',
  'PageInfo',
];

function compactField(field: FieldInfo): CompactField {
  const t = unwrap(field.type);
  const args: Record<string, string> = {};
  for (const arg of field.args ?? []) args[arg.name] = renderType(arg.type);
  return { type: t.name, kind: t.kind, args };
}

function compactType(info: TypeInfo): CompactType {
  const fields: Record<string, CompactField> = {};
  for (const field of info.fields ?? []) fields[field.name] = compactField(field);
  for (const input of info.inputFields ?? []) fields[input.name] = compactField({ ...input, args: [] });
  return {
    kind: info.kind,
    fields,
    possible: (info.possibleTypes ?? []).map((p) => p.name),
    enumValues: (info.enumValues ?? []).map((v) => v.name),
  };
}

// ---------------------------------------------------------------------------
// Selection wish lists
// ---------------------------------------------------------------------------

/** `true` for a leaf; a branch for an object. Keys: "field", "alias:field", or "...TypeName" for a fragment. */
export type Sel = { [key: string]: true | Branch };
export interface Branch {
  /** Argument name → GraphQL literal or $variable. Arguments the field does not take are dropped. */
  args?: Record<string, string>;
  sel: Sel;
}

function parseKey(key: string): { alias: string | null; field: string } {
  const at = key.indexOf(':');
  return at > 0 ? { alias: key.slice(0, at), field: key.slice(at + 1) } : { alias: null, field: key };
}

/** Every type name a wish list would touch under `typeName`, given what is known so far. */
function wanted(schema: Pick<DeskSchema, 'types'>, typeName: string, sel: Sel, out: Set<string>): void {
  const type = schema.types[typeName];
  if (!type) {
    out.add(typeName);
    return;
  }
  for (const [key, value] of Object.entries(sel)) {
    if (key.startsWith('...')) {
      const target = key.slice(3);
      if (value !== true) wanted(schema, target, value.sel, out);
      continue;
    }
    const field = type.fields[parseKey(key).field];
    if (!field || value === true) continue;
    wanted(schema, field.type, value.sel, out);
  }
  for (const possible of type.possible) if (!schema.types[possible]) out.add(possible);
}

/**
 * The selection text for `sel` on `typeName`, keeping only what the schema
 * has. Empty string when nothing survives.
 */
export function prune(schema: Pick<DeskSchema, 'types'>, typeName: string, sel: Sel): string {
  const type = schema.types[typeName];
  if (!type) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(sel)) {
    if (key === '__typename') {
      parts.push('__typename');
      continue;
    }
    if (key.startsWith('...')) {
      const target = key.slice(3);
      const applies = target === typeName || type.possible.includes(target);
      if (!applies || value === true || !schema.types[target]) continue;
      const inner = prune(schema, target, value.sel);
      if (inner) parts.push(`... on ${target} { ${inner} }`);
      continue;
    }
    const { alias, field: name } = parseKey(key);
    const field = type.fields[name];
    if (!field) continue;
    const label = alias ? `${alias}: ${name}` : name;
    const isLeaf = field.kind === 'SCALAR' || field.kind === 'ENUM';
    if (value === true) {
      if (isLeaf) parts.push(label);
      continue;
    }
    if (isLeaf) continue;
    const inner = prune(schema, field.type, value.sel);
    if (!inner) continue;
    const args = Object.entries(value.args ?? {}).filter(([arg]) => arg in field.args);
    const argText = args.length ? `(${args.map(([arg, literal]) => `${arg}: ${literal}`).join(', ')})` : '';
    parts.push(`${label}${argText} { ${inner} }`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/** Root fields plus the types under every wish list, fetched until nothing new turns up. */
export async function introspectDesk(deps: JobberDeps, wishLists: { root: string; sel: Sel }[]): Promise<DeskSchema> {
  const root = await graphql<{
    __schema?: { queryType?: { fields: FieldInfo[] } | null; mutationType?: { fields: FieldInfo[] } | null };
  }>(deps, `query EysDeskSchemaRoots { __schema { queryType { fields { ${FIELD_SELECTION} } } mutationType { fields { ${FIELD_SELECTION} } } } }`);
  const queryFields = root.__schema?.queryType?.fields;
  if (!queryFields) throw new JobberError('schema');
  const schema: DeskSchema = { fetchedAt: deps.now(), queries: {}, mutations: {}, types: {} };
  for (const field of queryFields) schema.queries[field.name] = compactField(field);
  for (const field of root.__schema?.mutationType?.fields ?? []) schema.mutations[field.name] = compactField(field);

  let want = new Set<string>(SEED_TYPES);
  for (let round = 0; round < 14 && want.size > 0; round++) {
    const names = [...want].filter((n) => n && !schema.types[n]);
    if (names.length === 0 || Object.keys(schema.types).length > 200) break;
    const found = await fetchTypes(deps, names);
    for (const info of found) schema.types[info.name] = compactType(info);
    // A name the API does not know is recorded as absent, so it is not asked again.
    for (const name of names) schema.types[name] ??= { kind: 'ABSENT', fields: {}, possible: [], enumValues: [] };
    want = new Set<string>();
    for (const list of wishLists) wanted(schema, list.root, list.sel, want);
    for (const [, type] of Object.entries(schema.types)) {
      for (const possible of type.possible) if (!schema.types[possible]) want.add(possible);
    }
  }
  for (const [name, type] of Object.entries(schema.types)) if (type.kind === 'ABSENT') delete schema.types[name];
  return schema;
}

/** One background refresh at a time per isolate. */
let refreshing: Promise<DeskSchema> | null = null;

async function refreshSchema(deps: JobberDeps, db: D1Database, wishLists: { root: string; sel: Sel }[]): Promise<DeskSchema> {
  const fresh = await introspectDesk(deps, wishLists);
  await kvSet(db, KV_KEY, fresh, deps.now());
  return fresh;
}

/**
 * The cached snapshot. "Introspect once, cache the result in D1."
 *
 * After 12 hours it is refreshed, but nobody waits for that: with
 * `background` (the request's waitUntil) the old snapshot is served and the
 * walk (up to 15 Jobber calls) runs after the response. Only a missing or
 * week-old snapshot, or `force` (a query that came back with a schema error),
 * makes the caller wait.
 */
export async function deskSchema(
  deps: JobberDeps,
  db: D1Database,
  wishLists: { root: string; sel: Sel }[],
  force = false,
  background?: (promise: Promise<unknown>) => void,
): Promise<DeskSchema> {
  if (!force) {
    const cached = await kvGet<DeskSchema>(db, KV_KEY);
    if (cached) {
      const age = deps.now() - cached.fetchedAt;
      if (age < SCHEMA_TTL) return cached;
      if (background && age < SCHEMA_STALE_MAX) {
        if (!refreshing) {
          refreshing = refreshSchema(deps, db, wishLists).finally(() => {
            refreshing = null;
          });
          background(refreshing.catch(() => undefined));
        }
        return cached;
      }
    }
  }
  return refreshSchema(deps, db, wishLists);
}

/**
 * Types a snapshot taken before they were seeded (an input type for a new
 * action): fetched once, added to the snapshot and saved, so the next request
 * has them without a full walk.
 */
export async function ensureDeskTypes(deps: JobberDeps, db: D1Database, schema: DeskSchema, names: string[]): Promise<DeskSchema> {
  const missing = names.filter((n) => n && !schema.types[n]);
  if (missing.length === 0) return schema;
  const found = await fetchTypes(deps, missing);
  if (found.length === 0) return schema;
  for (const info of found) schema.types[info.name] = compactType(info);
  await kvSet(db, KV_KEY, schema, deps.now());
  return schema;
}

export async function forgetDeskSchema(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM desk_kv WHERE key = ?1').bind(KV_KEY).run();
}
