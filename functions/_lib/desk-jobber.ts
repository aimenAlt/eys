import type { D1Database, Env } from './types.ts';
import { DAY } from './db.ts';
import { adminKey } from './env.ts';
import { JobberError, getAccessToken, graphql, hasStoredTokens, jwtScopes, type JobberDeps } from './jobber.ts';
import { deskSchema, forgetDeskSchema, prune, type DeskSchema, type Sel } from './desk-schema.ts';
import { kvGet, kvSet } from './desk-db.ts';

/**
 * Jobber reads (and, in actions, the two writes) for Essa's Quote Desk.
 *
 * Every query is a wish list pruned against the live schema (desk-schema.ts),
 * so it asks only for what this app's token can see. A missing quotes scope
 * is a normal state until the app is reconnected with it: it shows as
 * "Jobber needs reconnecting for quotes", never as an error.
 */

export const OLDER_DRAFT_AGE = 30 * DAY;

// ---------------------------------------------------------------------------
// Wish lists
// ---------------------------------------------------------------------------

const FILES: Sel = { url: true, thumbnailUrl: true, fileName: true, contentType: true };

const LIST_SEL: Sel = {
  id: true,
  quoteNumber: true,
  title: true,
  quoteStatus: true,
  createdAt: true,
  amounts: { sel: { total: true } },
  client: { sel: { id: true, firstName: true, lastName: true, name: true, companyName: true } },
};

const QUOTE_SEL: Sel = {
  id: true,
  quoteNumber: true,
  title: true,
  quoteStatus: true,
  createdAt: true,
  sentAt: true,
  jobberWebUri: true,
  clientHubUri: true,
  clientHubViewedAt: true,
  message: true,
  contractDisclaimer: true,
  amounts: {
    sel: { subtotal: true, discountAmount: true, taxAmount: true, total: true, depositAmount: true, outstandingDepositAmount: true },
  },
  lineItems: {
    args: { first: '100' },
    sel: {
      nodes: {
        sel: {
          name: true,
          description: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          taxable: true,
          optional: true,
          textOnly: true,
          recommended: true,
          sortOrder: true,
        },
      },
    },
  },
  client: {
    sel: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      companyName: true,
      phones: { sel: { number: true, primary: true, smsAllowed: true, smsStopped: true, description: true } },
      billingAddress: { sel: { city: true } },
    },
  },
  property: { sel: { address: { sel: { city: true } } } },
  request: { sel: { id: true } },
  notes: {
    args: { first: '30' },
    sel: {
      nodes: {
        sel: {
          __typename: true,
          '...QuoteNote': {
            sel: {
              id: true,
              message: true,
              createdAt: true,
              pinned: true,
              fileAttachments: { args: { first: '20' }, sel: { nodes: { sel: FILES } } },
            },
          },
        },
      },
    },
  },
  noteAttachments: { args: { first: '50' }, sel: { nodes: { sel: FILES } } },
};

const REQUEST_SEL: Sel = {
  id: true,
  title: true,
  createdAt: true,
  jobberWebUri: true,
  source: true,
  requestDetails: {
    sel: {
      form: {
        sel: {
          sections: {
            args: { first: '30' },
            sel: {
              nodes: {
                sel: {
                  label: true,
                  items: {
                    args: { first: '60' },
                    sel: {
                      nodes: {
                        sel: {
                          __typename: true,
                          label: true,
                          '...FormTextInput': { sel: { 'textAnswer:answer': true } },
                          '...FormAutocompleteInput': { sel: { 'textAnswer:answer': true } },
                          '...FormMultipleChoice': { sel: { 'textAnswer:answer': true } },
                          '...FormNumber': { sel: { 'numberAnswer:answer': true } },
                          '...FormDateInput': { sel: { 'dateAnswer:dateAnswer': true } },
                          '...FormServicesSelect': { sel: { 'serviceAnswer:answer': { sel: { name: true, quantity: true } } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  assessment: { sel: { instructions: true } },
  notes: {
    args: { first: '30' },
    sel: {
      nodes: {
        sel: {
          __typename: true,
          '...RequestNote': {
            sel: { message: true, createdAt: true, fileAttachments: { args: { first: '30' }, sel: { nodes: { sel: FILES } } } },
          },
        },
      },
    },
  },
  noteAttachments: { args: { first: '60' }, sel: { nodes: { sel: FILES } } },
};

const HISTORY_SEL: Sel = {
  quotes: {
    args: { first: '20' },
    sel: { nodes: { sel: { id: true, quoteNumber: true, title: true, quoteStatus: true, createdAt: true, amounts: { sel: { total: true } } } } },
  },
  requests: { args: { first: '20' }, sel: { nodes: { sel: { id: true, title: true, requestStatus: true, createdAt: true } } } },
};

const JOBS_SEL: Sel = {
  jobs: { args: { first: '20' }, sel: { nodes: { sel: { id: true, jobNumber: true, title: true, jobStatus: true, total: true, createdAt: true } } } },
};

const STATUS_SEL: Sel = {
  id: true,
  quoteStatus: true,
  sentAt: true,
  clientHubUri: true,
  clientHubViewedAt: true,
  title: true,
  lastTransitioned: { sel: { approvedAt: true } },
  client: {
    sel: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      phones: { sel: { number: true, primary: true, smsAllowed: true, smsStopped: true } },
    },
  },
};

export const WISH_LISTS = [
  { root: 'QuoteConnection', sel: { nodes: { sel: LIST_SEL }, pageInfo: { sel: { hasNextPage: true, endCursor: true } } } as Sel },
  { root: 'Quote', sel: QUOTE_SEL },
  { root: 'Request', sel: REQUEST_SEL },
  { root: 'Client', sel: { ...HISTORY_SEL, ...JOBS_SEL } },
  { root: 'Quote', sel: STATUS_SEL },
];

// ---------------------------------------------------------------------------
// Access: is Jobber connected, and can this token read quotes?
// ---------------------------------------------------------------------------

export type QuotesAccess = 'not_connected' | 'needs_reconnect' | 'ok';

export interface DeskJobber {
  deps: JobberDeps;
  db: D1Database;
}

export function deskJobberDeps(env: Env): DeskJobber | null {
  const key = adminKey(env);
  const db = env.EYS_AI_DB;
  if (!key || !db) return null;
  return {
    db,
    deps: {
      env,
      db,
      adminKey: key,
      fetch: (input, init) => fetch(input, init),
      now: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  };
}

async function schemaFor(j: DeskJobber, force = false): Promise<DeskSchema> {
  return deskSchema(j.deps, j.db, WISH_LISTS, force);
}

/**
 * 'needs_reconnect' when the token's own scope claim leaves out quotes, or the
 * schema it sees has no `quotes` query (fields outside an app's scopes are
 * hidden). The first real query settles it either way.
 */
export async function quotesAccess(j: DeskJobber): Promise<{ access: QuotesAccess; schema: DeskSchema | null }> {
  try {
    if (!(await hasStoredTokens(j.db))) return { access: 'not_connected', schema: null };
  } catch {
    return { access: 'not_connected', schema: null };
  }
  try {
    const token = await getAccessToken(j.deps);
    const scopes = jwtScopes(token);
    if (scopes && !scopes.some((s) => /quote/i.test(s))) return { access: 'needs_reconnect', schema: null };
    let schema = await schemaFor(j);
    if (!schema.queries.quotes || !schema.types.Quote) {
      // Cached before the scope was added? Look again once.
      schema = await schemaFor(j, true);
    }
    if (!schema.queries.quotes || !schema.types.Quote) return { access: 'needs_reconnect', schema };
    return { access: 'ok', schema };
  } catch (error) {
    if (error instanceof JobberError && (error.errorClass === 'not_connected' || error.errorClass === 'refresh_failed')) {
      return { access: 'not_connected', schema: null };
    }
    if (error instanceof JobberError && error.errorClass === 'scope') return { access: 'needs_reconnect', schema: null };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Status branch: how a quote moves to Awaiting Response without Jobber
// texting or emailing the client.
// ---------------------------------------------------------------------------

export type StatusBranch =
  | { kind: 'mutation'; mutation: string; arg: string; argType: string; userErrors: boolean; label: string }
  | { kind: 'manual'; label: string; messagingOnly: string[] };

/** Mutations that would message the client. Never used, only reported. */
const MESSAGING = /send|email|sms|notify|deliver/i;

export function pickStatusBranch(schema: DeskSchema): StatusBranch {
  const names = Object.keys(schema.mutations);
  // "Mark" moves the status the way Jobber web's More > Mark as Awaiting
  // Response does: no email, no text. Anything named send/email/sms does message.
  const candidates = names
    .filter((n) => /^quotes?Mark\w*(AwaitingResponse|Sent)$/i.test(n) && !MESSAGING.test(n))
    .sort((a, b) => (a === 'quotesMarkAwaitingResponse' ? -1 : b === 'quotesMarkAwaitingResponse' ? 1 : a.localeCompare(b)));
  for (const name of candidates) {
    const field = schema.mutations[name];
    const arg = Object.keys(field.args).find((a) => /quoteIds?|^ids?$/i.test(a));
    if (!arg) continue;
    const payload = schema.types[field.type];
    return {
      kind: 'mutation',
      mutation: name,
      arg,
      argType: field.args[arg],
      userErrors: Boolean(payload?.fields.userErrors),
      label: `${name} (no message to the client)`,
    };
  }
  const messagingOnly = names.filter((n) => /quote/i.test(n) && MESSAGING.test(n)).concat(
    names.filter((n) => /^workObjectSend/i.test(n)),
  );
  return {
    kind: 'manual',
    label: 'Manual: in Jobber web, More, then Mark as Awaiting Response',
    messagingOnly: [...new Set(messagingOnly)].sort(),
  };
}

/** Cached for the desk footer; recomputed with the schema. */
export async function statusBranch(j: DeskJobber, schema: DeskSchema): Promise<StatusBranch> {
  const branch = pickStatusBranch(schema);
  const cached = await kvGet<StatusBranch>(j.db, 'status_branch');
  if (!cached || JSON.stringify(cached) !== JSON.stringify(branch)) await kvSet(j.db, 'status_branch', branch, j.deps.now());
  return branch;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** One pruned query. A schema error refreshes the snapshot and tries once more. */
async function run<T>(
  j: DeskJobber,
  build: (schema: DeskSchema) => { query: string; variables?: Record<string, unknown> } | null,
): Promise<T | null> {
  let schema = await schemaFor(j);
  for (let attempt = 0; attempt < 2; attempt++) {
    const built = build(schema);
    if (!built) return null;
    try {
      return await graphql<T>(j.deps, built.query, built.variables ?? {});
    } catch (error) {
      if (attempt === 0 && error instanceof JobberError && error.errorClass === 'schema') {
        await forgetDeskSchema(j.db);
        schema = await schemaFor(j, true);
        continue;
      }
      throw error;
    }
  }
  return null;
}

function idType(schema: DeskSchema, query: string): string {
  return schema.queries[query]?.args.id ?? 'EncodedId!';
}

export interface RawQuoteListItem {
  id: string;
  quoteNumber?: string | null;
  title?: string | null;
  quoteStatus?: string | null;
  createdAt?: string | null;
  amounts?: { total?: number | null } | null;
  client?: RawClientName | null;
}

export interface RawClientName {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  companyName?: string | null;
}

/** Drafts, newest first: `quotes(filter: {status: draft})` when the schema takes it, else filtered here. */
export async function listDraftQuotes(j: DeskJobber): Promise<RawQuoteListItem[]> {
  const out: RawQuoteListItem[] = [];
  let after: string | null = null;
  for (let page = 0; page < 5; page++) {
    const data: {
      quotes?: { nodes?: RawQuoteListItem[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } | null;
    } | null = await run(j, (schema) => {
      const field = schema.queries.quotes;
      if (!field) return null;
      const filterType = schema.types[field.args.filter?.replace(/[!\[\]]/g, '') ?? ''];
      const statusEnum = schema.types[filterType?.fields.status?.type ?? ''];
      const draft = statusEnum?.enumValues.find((v) => v.toLowerCase() === 'draft');
      const sortKey = schema.types.QuotesSortKey?.enumValues.includes('CREATED_AT');
      const args: string[] = ['first: 50'];
      if (field.args.filter && draft) args.push(`filter: { status: ${draft} }`);
      if (field.args.sort && sortKey) args.push('sort: [{ key: CREATED_AT, direction: DESCENDING }]');
      if (field.args.after && after) args.push('after: $after');
      const selection = prune(schema, field.type, { nodes: { sel: LIST_SEL }, pageInfo: { sel: { hasNextPage: true, endCursor: true } } });
      const vars = field.args.after && after ? '($after: String)' : '';
      return {
        query: `query EysDeskDrafts${vars} { quotes(${args.join(', ')}) { ${selection} } }`,
        variables: after ? { after } : {},
      };
    });
    const nodes = data?.quotes?.nodes ?? [];
    out.push(...nodes.filter((q) => !q.quoteStatus || q.quoteStatus.toLowerCase() === 'draft'));
    const info = data?.quotes?.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    after = info.endCursor;
  }
  return out.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

export async function fetchQuote(j: DeskJobber, id: string): Promise<Record<string, unknown> | null> {
  const data = await run<{ quote?: Record<string, unknown> | null }>(j, (schema) => {
    if (!schema.queries.quote) return null;
    const selection = prune(schema, schema.queries.quote.type, QUOTE_SEL);
    return { query: `query EysDeskQuote($id: ${idType(schema, 'quote')}) { quote(id: $id) { ${selection} } }`, variables: { id } };
  });
  return data?.quote ?? null;
}

export async function fetchRequest(j: DeskJobber, id: string): Promise<Record<string, unknown> | null> {
  const data = await run<{ request?: Record<string, unknown> | null }>(j, (schema) => {
    if (!schema.queries.request) return null;
    const selection = prune(schema, schema.queries.request.type, REQUEST_SEL);
    return { query: `query EysDeskRequest($id: ${idType(schema, 'request')}) { request(id: $id) { ${selection} } }`, variables: { id } };
  });
  return data?.request ?? null;
}

/** Earlier quotes and requests, then jobs on their own: the jobs scope is not one this app asks for. */
export async function fetchClientHistory(j: DeskJobber, clientId: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const sel of [HISTORY_SEL, JOBS_SEL]) {
    try {
      const data = await run<{ client?: Record<string, unknown> | null }>(j, (schema) => {
        if (!schema.queries.client) return null;
        const selection = prune(schema, schema.queries.client.type, sel);
        if (!selection) return null;
        return {
          query: `query EysDeskHistory($id: ${idType(schema, 'client')}) { client(id: $id) { ${selection} } }`,
          variables: { id: clientId },
        };
      });
      Object.assign(out, data?.client ?? {});
    } catch (error) {
      if (!(error instanceof JobberError && (error.errorClass === 'scope' || error.errorClass === 'graphql'))) throw error;
    }
  }
  return out;
}

export interface RawQuoteStatus {
  id: string;
  quoteStatus?: string | null;
  sentAt?: string | null;
  clientHubUri?: string | null;
  clientHubViewedAt?: string | null;
  title?: string | null;
  lastTransitioned?: { approvedAt?: string | null } | null;
  client?: (RawClientName & { phones?: RawPhone[] | null }) | null;
}

export interface RawPhone {
  number?: string | null;
  primary?: boolean | null;
  smsAllowed?: boolean | null;
  smsStopped?: boolean | null;
  description?: string | null;
}

/** Status, Client Hub link and view time for several quotes in one call (aliases q0, q1, ...). */
export async function fetchQuoteStatuses(j: DeskJobber, ids: string[]): Promise<Map<string, RawQuoteStatus>> {
  const out = new Map<string, RawQuoteStatus>();
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const data = await run<Record<string, RawQuoteStatus | null>>(j, (schema) => {
      if (!schema.queries.quote) return null;
      const selection = prune(schema, schema.queries.quote.type, STATUS_SEL);
      const type = idType(schema, 'quote');
      const vars = batch.map((_, n) => `$id${n}: ${type}`).join(', ');
      const fields = batch.map((_, n) => `q${n}: quote(id: $id${n}) { ${selection} }`).join(' ');
      return {
        query: `query EysDeskStatuses(${vars}) { ${fields} }`,
        variables: Object.fromEntries(batch.map((id, n) => [`id${n}`, id])),
      };
    });
    batch.forEach((id, n) => {
      const row = data?.[`q${n}`];
      if (row) out.set(id, row);
    });
  }
  return out;
}
