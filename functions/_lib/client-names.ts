import { graphql } from './jobber.ts';
import { ensureDeskTypes, prune, type Sel } from './desk-schema.ts';
import { idType, run, schemaFor, type DeskJobber } from './desk-jobber.ts';
import { logDeskEvent } from './desk-db.ts';
import { bumpCounter, DAY, HOUR, readCounter } from './db.ts';
import { EYS_NUMBER, searchContactNames, type QuoDeps } from './quo.ts';
import { archiveRequest, fileUrls, isQuoRequest, noteList, NOTE_TYPES, readRequest, requestNumber, type DedupeRequest } from './request-dedupe.ts';

/**
 * Real names for the placeholder clients Quo's Jobber integration creates.
 *
 * When someone calls or texts, Quo makes a Jobber client named
 * "New Call [+18325550100]" (or "New Text [...]"). EYS then texts the link to
 * Jobber's request form; the customer types their real name, but Jobber matches
 * the existing client by phone, files the request under it and never updates
 * the client's name. The typed name is on the request (Request.contactName),
 * so this copies it onto the client with Jobber's clientEdit (firstName and
 * lastName only), and only while the client still has the placeholder name.
 * A real name is never overwritten.
 *
 * A caller who never fills in the form has no typed name, so the sweep then
 * tries, in order: the name saved on the caller's Quo contact (Mark or Hamid
 * saving it in Quo is enough), then the name the caller gave on the call
 * ("This is Maya", "My name is Lena Ortiz", or their answer when Sona asks
 * for it). A Quo request whose caller said nothing at all (a pocket dial,
 * a hang-up at the greeting) is archived after an hour; archiving is
 * reversible in Jobber.
 */

const PLACEHOLDER = /^New (?:Call|Text) \[\+?(\d{10,15})\]$/;
const MAX_NAME = 80;
const ACTOR = 'name-fix';
const SWEEP_SIZE = 50;

export function isPlaceholderName(name: string | null | undefined): boolean {
  return typeof name === 'string' && PLACEHOLDER.test(name.trim());
}

/** "+1XXXXXXXXXX" (E.164) for a 10 or 11 digit US number, else "+<digits>"; null when it isn't a number. */
export function e164(raw: string | null | undefined): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** The phone number inside a Quo placeholder name, as E.164, or null. */
export function phoneFromPlaceholder(name: string | null | undefined): string | null {
  const match = typeof name === 'string' ? PLACEHOLDER.exec(name.trim()) : null;
  return match ? e164(match[1]) : null;
}

// ---------------------------------------------------------------------------
// Names said on a call
// ---------------------------------------------------------------------------

/** Words a transcript capitalizes at the start of a sentence that are never a caller's name. */
const NOT_NAMES = new Set(
  (
    'yes yeah yep yup no nope okay ok alright hello hi hey good fine great sure right correct well so um uh mhmm hmm oh ' +
    'thank thanks sorry please just not the a an and but or is it its me my him her his them they we you your our i ' +
    'calling regarding about for from with in on at to of this that there here what who where when why how ' +
    'interested looking trying going wondering also still again actually really either both one two ' +
    'elevate space handyman essa eyad mark hamid sona operator customer service ' +
    'monday tuesday wednesday thursday friday saturday sunday january february march april may june july august ' +
    'september october november december katy houston texas fulshear richmond cypress sugar land rosenberg ' +
    'mister miss mrs mr ms sir maam ma'
  ).split(' '),
);
const NAME_WORD = /^[A-Z][a-z]+(?:['’-][A-Za-z]+)?$/;
const LINE = /^\[(\+?\d{7,15})\]:\s*(.*)$/;
const INTRO = /(?:^|[\s,.!?])(?:[Mm]y name(?: is|['’]s)|[Tt]his is)\s+([A-Z][a-z]+(?:['’-][A-Za-z]+)?)(?:\s+([A-Z][a-z]+(?:['’-][A-Za-z]+)?))?/;
const ASKS_NAME = /\b(?:first and last name|your name|who am i speaking|who i'?m speaking|name for the request)\b/i;
const ANSWER_LEAD = /^(?:(?:yes|yeah|sure|okay|ok|it'?s|it is|my name is|my name'?s|this is|i'?m|i am)[\s,.]+)+/i;

const isNameWord = (w: string | undefined): w is string => !!w && NAME_WORD.test(w) && !NOT_NAMES.has(w.toLowerCase());

export interface TranscriptLine {
  caller: boolean;
  text: string;
}

/** The lines of a Quo "Call Transcript" note, each marked caller or EYS; null when the note is not a transcript. */
export function transcriptLines(message: string | null | undefined): TranscriptLine[] | null {
  if (typeof message !== 'string' || !/^\s*Call Transcript\b/.test(message)) return null;
  const lines: TranscriptLine[] = [];
  for (const raw of message.split(/\r?\n/)) {
    const match = LINE.exec(raw.trim());
    if (match) lines.push({ caller: e164(match[1]) !== EYS_NUMBER, text: match[2].trim() });
  }
  return lines;
}

function nameOf(first: string | undefined, last: string | undefined): { firstName: string; lastName: string } | null {
  if (!isNameWord(first)) return null;
  return { firstName: first, lastName: isNameWord(last) ? last : '' };
}

/**
 * The name the caller gave on the call: "This is Maya", "My name is Lena
 * Ortiz", or a bare name answering EYS's (or Sona's) name question. Only the
 * caller's own lines count, so "This is Sona" is never taken. Null when unsure.
 */
export function nameFromTranscript(message: string | null | undefined): { firstName: string; lastName: string } | null {
  const lines = transcriptLines(message);
  if (!lines) return null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.caller) {
      const intro = INTRO.exec(line.text);
      const found = intro && nameOf(intro[1], intro[2]);
      if (found) return found;
      continue;
    }
    if (!ASKS_NAME.test(line.text)) continue;
    const next = lines[i + 1];
    if (!next?.caller) continue;
    const words = next.text.replace(ANSWER_LEAD, '').replace(/[.!?,]+$/, '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 3 || !words.every((w) => isNameWord(w))) continue;
    return { firstName: words[0], lastName: words.slice(1).join(' ') };
  }
  return null;
}

/** True when every note is a call transcript in which the caller said nothing, and no note has a file. */
export function isEmptyCall(notes: { message?: string | null; files: number }[]): boolean {
  if (notes.length === 0) return false;
  for (const note of notes) {
    if (note.files > 0) return false;
    const lines = transcriptLines(note.message);
    if (!lines) return false;
    if (lines.some((l) => l.caller && /\p{L}/u.test(l.text))) return false;
  }
  return true;
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

export type NameSource = 'form' | 'quo' | 'call';

/** How the event log says where a name came from (the form's own name carries no suffix). */
const SOURCE_NOTE: Record<NameSource, string> = { form: '', quo: ' (saved in Quo)', call: ' (said on the call)' };

export interface RenameResult {
  status: 'renamed' | 'skipped' | 'failed';
  from: string | null;
  to: string | null;
  source?: NameSource;
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

/** Rename a placeholder client to `real`, logging where the name came from. */
async function applyName(
  j: DeskJobber,
  client: NameClient,
  real: { firstName: string; lastName: string },
  source: NameSource,
  dryRun: boolean,
): Promise<RenameResult> {
  const from = client.name ?? null;
  if (!client.id || !isPlaceholderName(from)) return { status: 'skipped', from, to: null, reason: 'not_placeholder' };
  const to = fullName(real);
  if (dryRun) return { status: 'renamed', from, to, source };
  let outcome: { ok: true } | { ok: false; reason: string };
  try {
    outcome = await editClientName(j, client.id, real);
  } catch (error) {
    outcome = { ok: false, reason: (error as { errorClass?: string })?.errorClass ?? 'error' };
  }
  const detail = `${from} -> ${to}${SOURCE_NOTE[source]}`;
  if (outcome.ok) {
    await logDeskEvent(j.db, { actor: ACTOR, action: 'client_renamed', detail, now: j.deps.now() });
    return { status: 'renamed', from, to, source };
  }
  await logDeskEvent(j.db, { actor: ACTOR, action: 'client_rename_failed', detail: `${detail}: ${outcome.reason}`, now: j.deps.now() });
  return { status: 'failed', from, to, source, reason: outcome.reason };
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
  return applyName(j, client, real, 'form', options.dryRun === true);
}

const CLIENT_SEL: Sel = { id: true, name: true, firstName: true, lastName: true, companyName: true, isCompany: true };
const NAME_SEL: Sel = {
  id: true,
  contactName: true,
  createdAt: true,
  updatedAt: true,
  title: true,
  source: true,
  requestStatus: true,
  client: { sel: CLIENT_SEL },
  quotes: { args: { first: '1' }, sel: { nodes: { sel: { id: true } } } },
  assessment: { sel: { id: true } },
};

interface NamedRequest {
  id?: string;
  contactName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  title?: string | null;
  source?: string | null;
  requestStatus?: string | null;
  client?: NameClient | null;
  quotes?: { nodes?: ({ id?: string } | null)[] | null } | null;
  assessment?: { id?: string } | null;
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
  renamed: { clientId: string; from: string | null; to: string | null; source?: NameSource }[];
  skipped: number;
  failed: { clientId: string; from: string | null; to: string | null; reason?: string }[];
  /** Quo requests archived because the caller said nothing on the call. */
  archived: { requestId: string; number: string; from: string | null }[];
  /** Placeholder clients no source could name yet (they stay "New Call [...]" until one can). */
  unnamed: { clientId: string; from: string | null; requestId: string | null }[];
  dryRun: boolean;
}

export interface SweepOptions {
  dryRun?: boolean;
  /** Quo, to read the names saved on callers' contacts. Without it that step is skipped. */
  quo?: QuoDeps | null;
  now?: number;
}

/** Call transcripts read per sweep at most (each is one Jobber query). */
export const MAX_TRANSCRIPT_READS = 8;
/** An empty call is archived only once it is this old, so a slow transcript can't make a real call look empty. */
export const EMPTY_CALL_AFTER = HOUR;
/** A request read without finding a name is not read again until it changes (or this long passes). */
const CHECKED_TTL = 14 * DAY;

/**
 * The newest requests: every placeholder client still on one gets a real name,
 * from the request form, else the caller's Quo contact, else what the caller
 * said on the call. Quo requests whose caller said nothing are archived.
 */
export async function sweepPlaceholderNames(j: DeskJobber, options: SweepOptions = {}): Promise<SweepSummary> {
  const dryRun = options.dryRun === true;
  const now = options.now ?? j.deps.now();
  const schema = await schemaFor(j);
  await ensureDeskTypes(j.deps, j.db, schema, NOTE_TYPES);
  const data = await run<{ requests?: { nodes?: (NamedRequest | null)[] } | null }>(j, (s) => {
    const field = s.queries.requests;
    if (!field) return null;
    const args = [`first: ${SWEEP_SIZE}`];
    if (field.args.sort && s.types.RequestsSortKey?.enumValues.includes('REQUESTED_AT')) args.push('sort: [{ key: REQUESTED_AT, direction: DESCENDING }]');
    const selection = prune(s, field.type, { nodes: { sel: NAME_SEL } });
    return { query: `query EysClientNameSweep { requests(${args.join(', ')}) { ${selection} } }` };
  });
  const nodes = (data?.requests?.nodes ?? []).filter((n): n is NamedRequest => !!n);
  nodes.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  const summary: SweepSummary = { checked: nodes.length, renamed: [], skipped: 0, failed: [], archived: [], unnamed: [], dryRun };
  const record = (clientId: string, result: RenameResult) => {
    if (result.status === 'renamed') summary.renamed.push({ clientId, from: result.from, to: result.to, source: result.source });
    else if (result.status === 'failed') summary.failed.push({ clientId, from: result.from, to: result.to, reason: result.reason });
  };

  // 1. The name typed on the request form.
  const done = new Set<string>();
  for (const request of nodes) {
    const clientId = request.client?.id ?? '';
    if (!clientId || done.has(clientId) || !isPlaceholderName(request.client?.name) || !realNameFrom(request.contactName)) {
      summary.skipped++;
      continue;
    }
    done.add(clientId);
    const result = await renamePlaceholderClient(j, request.client, request.contactName, { dryRun });
    if (result.status === 'skipped') summary.skipped++;
    else record(clientId, result);
  }

  // Placeholder clients still unnamed, each with its requests newest first.
  const pending = new Map<string, { client: NameClient; requests: NamedRequest[] }>();
  for (const request of nodes) {
    const clientId = request.client?.id ?? '';
    if (!clientId || done.has(clientId) || !isPlaceholderName(request.client?.name)) continue;
    const entry = pending.get(clientId) ?? { client: request.client as NameClient, requests: [] };
    entry.requests.push(request);
    pending.set(clientId, entry);
  }

  // 2. The name saved on the caller's Quo contact.
  if (options.quo && pending.size) {
    const phones = new Map<string, string>();
    for (const [clientId, entry] of pending) {
      const phone = phoneFromPlaceholder(entry.client.name);
      if (phone) phones.set(clientId, phone);
    }
    const names = phones.size ? await searchContactNames(options.quo, [...phones.values()]) : null;
    for (const [clientId, phone] of phones) {
      const saved = names?.get(phone);
      const real = saved ? realNameFrom(`${saved.firstName} ${saved.lastName}`) : null;
      if (!real) continue;
      const result = await applyName(j, pending.get(clientId)!.client, real, 'quo', dryRun);
      record(clientId, result);
      if (result.status !== 'skipped') pending.delete(clientId);
    }
  }

  // 3. The name the caller said on the call; empty calls are archived.
  let reads = 0;
  for (const [clientId, entry] of pending) {
    let named = false;
    let archivedAny = false;
    for (const request of entry.requests) {
      if (!request.id || !isQuoRequest(request as DedupeRequest)) continue;
      const key = `namecheck:${request.id}:${request.updatedAt ?? ''}`;
      if ((await readCounter(j.db, key)) > 0) continue;
      if (reads >= MAX_TRANSCRIPT_READS) break;
      reads++;
      const notes = noteList(await readRequest(j, request.id));
      const real = notes.map((n) => nameFromTranscript(n.message)).find((n) => n !== null) ?? null;
      if (real) {
        const result = await applyName(j, entry.client, real, 'call', dryRun);
        record(clientId, result);
        if (result.status !== 'skipped') {
          named = true;
          break;
        }
      }
      const untouched = (request.requestStatus ?? '').toLowerCase() === 'new' && !(request.quotes?.nodes ?? []).some(Boolean) && !request.assessment;
      const empty = untouched && isEmptyCall(notes.map((n) => ({ message: n.message, files: fileUrls(n).length })));
      const age = now - Date.parse(request.createdAt ?? '');
      if (empty && !(age >= EMPTY_CALL_AFTER)) continue; // look again once it is an hour old
      if (empty) {
        const number = requestNumber(request.id);
        if (!dryRun) {
          const archived = await archiveRequest(j, request.id).catch((error) => ({ ok: false as const, reason: (error as { errorClass?: string })?.errorClass ?? 'error' }));
          if (!archived.ok) {
            await logDeskEvent(j.db, { actor: ACTOR, action: 'request_archive_failed', detail: `Quo request #${number}, an empty call: ${archived.reason}`, now: j.deps.now() });
            continue;
          }
          await logDeskEvent(j.db, { actor: ACTOR, action: 'request_archived_empty', detail: `Quo request #${number}: the caller said nothing on the call`, now: j.deps.now() });
        }
        summary.archived.push({ requestId: request.id, number, from: entry.client.name ?? null });
        archivedAny = true;
        continue;
      }
      if (!dryRun) await bumpCounter(j.db, key, CHECKED_TTL, now);
    }
    if (!named && !archivedAny) summary.unnamed.push({ clientId, from: entry.client.name ?? null, requestId: entry.requests[0]?.id ?? null });
  }
  return summary;
}
