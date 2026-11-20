import { graphql } from './jobber.ts';
import { ensureDeskTypes, prune, type Sel } from './desk-schema.ts';
import { idType, run, schemaFor, type DeskJobber } from './desk-jobber.ts';
import { logDeskEvent } from './desk-db.ts';

/**
 * Real names for the placeholder clients Quo's Jobber integration creates.
 *
 * When someone calls or texts, Quo makes a Jobber client named
 * "New Call [+18328007390]" (or "New Text [...]"). EYS then texts the link to
 * Jobber's request form; the customer types their real name, but Jobber matches
 * the existing client by phone, files the request under it and never updates
 * the client's name. The typed name is on the request (Request.contactName),
 * so this copies it onto the client with Jobber's clientEdit (firstName and
 * lastName only), and only while the client still has the placeholder name.
 * A real name is never overwritten.
 */

const PLACEHOLDER = /^New (Call|Text) \[\+?\d{10,15}\]$/;
const MAX_NAME = 80;
const ACTOR = 'name-fix';
const SWEEP_SIZE = 50;

export function isPlaceholderName(name: string | null | undefined): boolean {
  return typeof name === 'string' && PLACEHOLDER.test(name.trim());
}

/** The customer's typed name as first and last, or null when it is not a usable name. */
export function realNameFrom(contactName: string | null | undefined): { firstName: string; lastName: string } | null {
  if (typeof contactName !== 'string') return null;
  const name = contactName.trim().replace(/\s+/g, ' ');
  if (name === '' || name.length > MAX_NAME) return null;
  if (!/\p{L}/u.test(name)) return null;
  if ((name.match(/\d/g) ?? []).length >= 5) return null;
  if (name.includes('@')) return null;
  if (isPlaceholderName(name)) return null;
  const space = name.indexOf(' ');
  if (space === -1) return { firstName: name, lastName: '' };
  return { firstName: name.slice(0, space), lastName: name.slice(space + 1) };
}

export interface RenameResult {
  status: 'renamed' | 'skipped' | 'failed';
  from: string | null;
  to: string | null;
  reason?: string;
}

export interface NameClient {
  id?: string | null;
  name?: string | null;
}

function fullName(n: { firstName: string; lastName: string }): string {
  return `${n.firstName} ${n.lastName}`.trim();
}

/** clientEdit with only firstName and lastName, built from the live schema. */
async function editClientName(j: DeskJobber, clientId: string, name: { firstName: string; lastName: string }): Promise<{ ok: true } | { ok: false; reason: string }> {
  const schema = await schemaFor(j);
  const field = schema.mutations.clientEdit;
  const idArg = field && Object.keys(field.args).find((a) => /^clientId$|^id$/i.test(a));
  const inputType = field?.args.input;
  if (!field || !idArg || !inputType) return { ok: false, reason: 'unsupported' };
  const inputName = inputType.replace(/[!\[\]]/g, '');
  await ensureDeskTypes(j.deps, j.db, schema, [field.type, inputName]);
  const input = schema.types[inputName];
  if (!input?.fields.firstName || !input.fields.lastName) return { ok: false, reason: 'unsupported' };
  const payload = schema.types[field.type];
  const data = await graphql<{ clientEdit?: { userErrors?: ({ message?: string | null } | null)[] | null } | null }>(
    j.deps,
    `mutation EysClientRename($clientId: ${field.args[idArg]}, $input: ${inputType}) { clientEdit(${idArg}: $clientId, input: $input) { ${payload?.fields.userErrors ? 'userErrors { message }' : '__typename'} } }`,
    { clientId, input: { firstName: name.firstName, lastName: name.lastName } },
  );
  const result = data.clientEdit;
  if (!result) return { ok: false, reason: 'no_result' };
  const problem = (result.userErrors ?? []).map((e) => e?.message).find(Boolean);
  if (problem) return { ok: false, reason: String(problem).slice(0, 200) };
  return { ok: true };
}

export async function renamePlaceholderClient(
  j: DeskJobber,
  client: NameClient | null | undefined,
  contactName: string | null | undefined,
  options: { dryRun?: boolean } = {},
): Promise<RenameResult> {
  const from = client?.name ?? null;
  if (!client?.id || !isPlaceholderName(from)) return { status: 'skipped', from, to: null, reason: 'not_placeholder' };
  const real = realNameFrom(contactName);
  if (!real) return { status: 'skipped', from, to: null, reason: 'no_usable_name' };
  const to = fullName(real);
  if (options.dryRun) return { status: 'renamed', from, to };
  let outcome: { ok: true } | { ok: false; reason: string };
  try {
    outcome = await editClientName(j, client.id, real);
  } catch (error) {
    outcome = { ok: false, reason: (error as { errorClass?: string })?.errorClass ?? 'error' };
  }
  const detail = `${from} -> ${to}`;
  if (outcome.ok) {
    await logDeskEvent(j.db, { actor: ACTOR, action: 'client_renamed', detail, now: j.deps.now() });
    return { status: 'renamed', from, to };
  }
  await logDeskEvent(j.db, { actor: ACTOR, action: 'client_rename_failed', detail: `${detail}: ${outcome.reason}`, now: j.deps.now() });
  return { status: 'failed', from, to, reason: outcome.reason };
}

const CLIENT_SEL: Sel = { id: true, name: true, firstName: true, lastName: true, companyName: true, isCompany: true };
const NAME_SEL: Sel = { id: true, contactName: true, createdAt: true, client: { sel: CLIENT_SEL } };

interface NamedRequest {
  id?: string;
  contactName?: string | null;
  createdAt?: string | null;
  client?: NameClient | null;
}

/** Read one request's typed name and client, then rename the client if it is still a placeholder. */
export async function fixRequestClientName(j: DeskJobber, requestId: string): Promise<RenameResult> {
  const data = await run<{ request?: NamedRequest | null }>(j, (schema) => {
    if (!schema.queries.request) return null;
    const selection = prune(schema, schema.queries.request.type, NAME_SEL);
    return { query: `query EysClientNameRequest($id: ${idType(schema, 'request')}) { request(id: $id) { ${selection} } }`, variables: { id: requestId } };
  });
  const request = data?.request;
  if (!request) return { status: 'skipped', from: null, to: null, reason: 'request_not_found' };
  return renamePlaceholderClient(j, request.client, request.contactName);
}

export interface SweepSummary {
  checked: number;
  renamed: { clientId: string; from: string | null; to: string | null }[];
  skipped: number;
  failed: { clientId: string; from: string | null; to: string | null; reason?: string }[];
  dryRun: boolean;
}

/** The newest requests: every placeholder client still on one gets the name its newest usable request carries. */
export async function sweepPlaceholderNames(j: DeskJobber, options: { dryRun?: boolean } = {}): Promise<SweepSummary> {
  const dryRun = options.dryRun === true;
  const data = await run<{ requests?: { nodes?: (NamedRequest | null)[] } | null }>(j, (schema) => {
    const field = schema.queries.requests;
    if (!field) return null;
    const args = [`first: ${SWEEP_SIZE}`];
    if (field.args.sort && schema.types.RequestsSortKey?.enumValues.includes('REQUESTED_AT')) args.push('sort: [{ key: REQUESTED_AT, direction: DESCENDING }]');
    const selection = prune(schema, field.type, { nodes: { sel: NAME_SEL } });
    return { query: `query EysClientNameSweep { requests(${args.join(', ')}) { ${selection} } }` };
  });
  const nodes = (data?.requests?.nodes ?? []).filter((n): n is NamedRequest => !!n);
  nodes.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  const summary: SweepSummary = { checked: nodes.length, renamed: [], skipped: 0, failed: [], dryRun };
  const done = new Set<string>();
  for (const request of nodes) {
    const clientId = request.client?.id ?? '';
    if (!clientId || done.has(clientId) || !isPlaceholderName(request.client?.name) || !realNameFrom(request.contactName)) {
      summary.skipped++;
      continue;
    }
    done.add(clientId);
    const result = await renamePlaceholderClient(j, request.client, request.contactName, { dryRun });
    if (result.status === 'renamed') summary.renamed.push({ clientId, from: result.from, to: result.to });
    else if (result.status === 'failed') summary.failed.push({ clientId, from: result.from, to: result.to, reason: result.reason });
    else summary.skipped++;
  }
  return summary;
}
