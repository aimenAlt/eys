import { graphql } from './jobber.ts';
import { ensureDeskTypes, prune, type Sel } from './desk-schema.ts';
import { idType, run, schemaFor, type DeskJobber } from './desk-jobber.ts';
import { logDeskEvent } from './desk-db.ts';
import { DAY } from './db.ts';

/**
 * One Jobber request per customer, not two.
 *
 * Quo's Jobber integration opens a "Quo Request" (source "Quo " with a
 * trailing space, title "Quo Request", status new) for every call. When the
 * customer then fills in Jobber's request form, Jobber files that request under
 * the same client, so the customer has two. This copies the Quo request's notes
 * and files onto the form request in one note (its last line is a marker, which
 * makes a repeat harmless), reads the note back, and only then archives the Quo
 * request. A Quo request with no form request, a quote, an assessment, or a
 * status other than new is never touched.
 */

const ACTOR = 'dedupe';
const SWEEP_SIZE = 100;
const WINDOW = 7 * DAY;
/** A Quo request older than this is left alone: whoever handled it by hand has long since moved on. */
const STALE = 30 * DAY;
/** Waits between read-backs while Jobber downloads the attached files. */
export const DEDUPE_READBACK_WAITS = [1_500, 3_000, 5_000];
export const MARKER_PREFIX = 'Merged from Quo request ';
export const NOTE_TYPES = [
  'RequestConnection',
  'RequestNoteUnionConnection',
  'RequestNoteUnion',
  'RequestNote',
  'NoteFileInterfaceConnection',
  'NoteFileInterface',
  'Assessment',
  'QuoteConnection',
  'RequestStatusTypeEnum',
];

export interface DedupeRequest {
  id: string;
  title?: string | null;
  source?: string | null;
  requestStatus?: string | null;
  createdAt?: string | null;
  client?: { id?: string | null; name?: string | null } | null;
  quotes?: { nodes?: ({ id?: string } | null)[] | null } | null;
  assessment?: { id?: string } | null;
  notes?: { nodes?: (RawNote | null)[] | null } | null;
}

export interface RawNote {
  __typename?: string;
  id?: string;
  message?: string | null;
  createdAt?: string | null;
  fileAttachments?: { nodes?: ({ id?: string; url?: string | null } | null)[] | null } | null;
}

export interface DedupePair {
  archive: DedupeRequest;
  keep: DedupeRequest;
}

const time = (r: DedupeRequest): number => {
  const ms = Date.parse(r.createdAt ?? '');
  return Number.isFinite(ms) ? ms : NaN;
};

export function isQuoRequest(r: DedupeRequest): boolean {
  return (r.source ?? '').trim().toLowerCase() === 'quo' || (r.title ?? '') === 'Quo Request';
}

const isNew = (r: DedupeRequest) => (r.requestStatus ?? '').toLowerCase() === 'new';

/** Quo requests that have a form request for the same client within 7 days, each with the closest such form request. */
export function findDuplicates(requests: DedupeRequest[], now: number): DedupePair[] {
  const pairs: DedupePair[] = [];
  const forms = requests.filter((r) => !isQuoRequest(r) && (r.requestStatus ?? '').toLowerCase() !== 'archived');
  for (const quo of requests) {
    const clientId = quo.client?.id;
    const at = time(quo);
    if (!isQuoRequest(quo) || !isNew(quo) || !clientId || Number.isNaN(at)) continue;
    if (now - at > STALE) continue;
    if ((quo.quotes?.nodes ?? []).some(Boolean) || quo.assessment) continue;
    let best: DedupeRequest | null = null;
    let bestGap = Infinity;
    for (const form of forms) {
      const formAt = time(form);
      if (form.client?.id !== clientId || Number.isNaN(formAt)) continue;
      const gap = Math.abs(formAt - at);
      if (gap <= WINDOW && gap < bestGap) {
        best = form;
        bestGap = gap;
      }
    }
    if (best) pairs.push({ archive: quo, keep: best });
  }
  return pairs;
}

export interface MergeResult {
  status: 'merged' | 'files_pending' | 'failed';
  archiveId: string;
  keepId: string;
  client: string | null;
  reason?: string;
}

/** "Nov 20, 10:55 AM" in the shop's time zone. */
/**
 * The request number Essa sees in Jobber (the one in its web address). An
 * encoded id is base64 of "gid://Jobber/Request/<number>"; anything else is
 * shown as given.
 */
export function requestNumber(id: string): string {
  try {
    const match = /^gid:\/\/Jobber\/Request\/(\d+)$/.exec(atob(id));
    if (match) return match[1];
  } catch {
    // not base64
  }
  return id;
}

function chicago(iso: string | null | undefined): string {
  const ms = Date.parse(iso ?? '');
  if (!Number.isFinite(ms)) return 'unknown time';
  return new Date(ms)
    .toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .replace(/[  ]/g, ' ');
}

const markerFor = (quoId: string) => `${MARKER_PREFIX}${quoId}`;

function hasMarker(message: string, marker: string): boolean {
  return message.split(/\r?\n/).some((line) => line.trim() === marker);
}

export function noteList(r: DedupeRequest | null | undefined): RawNote[] {
  return (r?.notes?.nodes ?? []).filter((n): n is RawNote => !!n && n.__typename === 'RequestNote' && typeof n.id === 'string');
}

export function fileUrls(note: RawNote): string[] {
  return (note.fileAttachments?.nodes ?? []).map((f) => f?.url).filter((u): u is string => typeof u === 'string' && u !== '');
}

const FILE_SEL: Sel = { id: true, url: true, fileName: true, contentType: true };
const NOTES_SEL: Sel = {
  notes: {
    args: { first: '40' },
    sel: {
      nodes: {
        sel: {
          __typename: true,
          '...RequestNote': { sel: { id: true, message: true, createdAt: true, fileAttachments: { args: { first: '50' }, sel: { nodes: { sel: FILE_SEL } } } } },
        },
      },
    },
  },
};
const LIST_SEL: Sel = {
  id: true,
  title: true,
  source: true,
  requestStatus: true,
  createdAt: true,
  client: { sel: { id: true, name: true } },
  quotes: { args: { first: '1' }, sel: { nodes: { sel: { id: true } } } },
  assessment: { sel: { id: true } },
};

export async function readRequest(j: DeskJobber, id: string): Promise<DedupeRequest | null> {
  let schema = await schemaFor(j);
  schema = await ensureDeskTypes(j.deps, j.db, schema, NOTE_TYPES);
  const data = await run<{ request?: DedupeRequest | null }>(j, (s) => {
    if (!s.queries.request) return null;
    const selection = prune(s, s.queries.request.type, { id: true, ...NOTES_SEL });
    return { query: `query EysDedupeRead($id: ${idType(s, 'request')}) { request(id: $id) { ${selection} } }`, variables: { id } };
  });
  return data?.request ?? null;
}

export interface Written {
  noteId: string | null;
  error?: string;
}

export async function addNote(j: DeskJobber, keepId: string, message: string, urls: string[]): Promise<Written> {
  const schema = await schemaFor(j);
  const field = schema.mutations.requestCreateNote;
  if (!field) return { noteId: null, error: 'unsupported' };
  const idArg = field.args.requestId ?? 'EncodedId!';
  const inputType = field.args.input ?? 'RequestCreateNoteInput!';
  const data = await graphql<{ requestCreateNote?: { requestNote?: { id?: string } | null; userErrors?: ({ message?: string | null } | null)[] | null } | null }>(
    j.deps,
    `mutation EysDedupeAddNote($id: ${idArg}, $input: ${inputType}) { requestCreateNote(requestId: $id, input: $input) { requestNote { id } userErrors { message } } }`,
    { id: keepId, input: { message, ...(urls.length ? { attachments: urls.map((url) => ({ url })) } : {}) } },
  );
  const payload = data.requestCreateNote;
  const problem = (payload?.userErrors ?? []).map((e) => e?.message).find(Boolean);
  if (problem) return { noteId: null, error: String(problem).slice(0, 200) };
  if (!payload?.requestNote?.id) return { noteId: null, error: 'no_note' };
  return { noteId: payload.requestNote.id };
}

export async function archiveRequest(j: DeskJobber, id: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const schema = await schemaFor(j);
  const field = schema.mutations.requestArchive;
  if (!field) return { ok: false, reason: 'unsupported' };
  const data = await graphql<{ requestArchive?: { userErrors?: ({ message?: string | null } | null)[] | null } | null }>(
    j.deps,
    `mutation EysDedupeArchive($id: ${field.args.requestId ?? 'EncodedId!'}) { requestArchive(requestId: $id) { userErrors { message } } }`,
    { id },
  );
  if (!data.requestArchive) return { ok: false, reason: 'no_result' };
  const problem = (data.requestArchive.userErrors ?? []).map((e) => e?.message).find(Boolean);
  return problem ? { ok: false, reason: String(problem).slice(0, 200) } : { ok: true };
}

/** Wait (briefly) until the copy note on the kept request holds `expected` files. */
async function filesLanded(j: DeskJobber, keepId: string, noteId: string | null, marker: string, expected: number): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    const kept = await readRequest(j, keepId);
    const note = noteList(kept).find((n) => (noteId ? n.id === noteId : hasMarker(n.message ?? '', marker)));
    if (note && fileUrls(note).length >= expected) return true;
    if (attempt >= DEDUPE_READBACK_WAITS.length) return false;
    await j.deps.sleep(DEDUPE_READBACK_WAITS[attempt]);
  }
}

export async function mergeDuplicate(j: DeskJobber, pair: DedupePair): Promise<MergeResult> {
  const { archive: quo, keep } = pair;
  const client = quo.client?.name ?? null;
  const base = { archiveId: quo.id, keepId: keep.id, client };
  const detail = `Quo #${quo.id} -> form #${keep.id} (client ${client ?? 'unknown'})`;
  const fail = async (reason: string): Promise<MergeResult> => {
    await logDeskEvent(j.db, { actor: ACTOR, action: 'request_merge_failed', detail: `${detail}: ${reason}`, now: j.deps.now() });
    return { status: 'failed', ...base, reason };
  };
  try {
    const marker = markerFor(quo.id);
    const [quoFull, keepFull] = await Promise.all([readRequest(j, quo.id), readRequest(j, keep.id)]);
    if (!quoFull || !keepFull) return await fail('request_not_found');
    const quoNotes = noteList(quoFull).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
    const urls = [...new Set(quoNotes.flatMap(fileUrls))];
    const existing = noteList(keepFull).find((n) => hasMarker(n.message ?? '', marker));
    let noteId: string | null = existing?.id ?? null;
    if (!existing) {
      const message = [
        `From the call (Quo request #${requestNumber(quo.id)}, ${chicago(quo.createdAt)}):`,
        ...quoNotes.map((n) => (n.message ?? '').trim()).filter(Boolean),
        marker,
      ].join('\n\n');
      const written = await addNote(j, keep.id, message, urls);
      if (!written.noteId) return await fail(written.error ?? 'note_failed');
      noteId = written.noteId;
    }
    if (!(await filesLanded(j, keep.id, noteId, marker, urls.length))) return { status: 'files_pending', ...base };
    const archived = await archiveRequest(j, quo.id);
    if (!archived.ok) return await fail(archived.reason);
    await logDeskEvent(j.db, { actor: ACTOR, action: 'request_merged', detail, now: j.deps.now() });
    return { status: 'merged', ...base };
  } catch (error) {
    return await fail((error as { errorClass?: string })?.errorClass ?? 'error');
  }
}

export interface DedupeSummary {
  checked: number;
  merged: { archiveId: string; keepId: string; client: string | null }[];
  pending: { archiveId: string; keepId: string; client: string | null }[];
  failed: { archiveId: string; keepId: string; client: string | null; reason?: string }[];
  dryRun: boolean;
}

/** The newest 100 requests: every Quo request with a form request for the same client is merged into it and archived. */
export async function sweepDuplicates(j: DeskJobber, options: { dryRun?: boolean; now?: number } = {}): Promise<DedupeSummary> {
  const dryRun = options.dryRun === true;
  let schema = await schemaFor(j);
  schema = await ensureDeskTypes(j.deps, j.db, schema, NOTE_TYPES);
  const data = await run<{ requests?: { nodes?: (DedupeRequest | null)[] } | null }>(j, (s) => {
    const field = s.queries.requests;
    if (!field) return null;
    const args = [`first: ${SWEEP_SIZE}`];
    if (field.args.sort && s.types.RequestsSortKey?.enumValues.includes('REQUESTED_AT')) args.push('sort: [{ key: REQUESTED_AT, direction: DESCENDING }]');
    const selection = prune(s, field.type, { nodes: { sel: LIST_SEL } });
    return { query: `query EysDedupeSweep { requests(${args.join(', ')}) { ${selection} } }` };
  });
  const nodes = (data?.requests?.nodes ?? []).filter((n): n is DedupeRequest => !!n);
  nodes.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  const summary: DedupeSummary = { checked: nodes.length, merged: [], pending: [], failed: [], dryRun };
  for (const pair of findDuplicates(nodes, options.now ?? j.deps.now())) {
    const base = { archiveId: pair.archive.id, keepId: pair.keep.id, client: pair.archive.client?.name ?? null };
    if (dryRun) {
      summary.merged.push(base);
      continue;
    }
    const result = await mergeDuplicate(j, pair);
    if (result.status === 'merged') summary.merged.push(base);
    else if (result.status === 'files_pending') summary.pending.push(base);
    else summary.failed.push({ ...base, reason: result.reason });
  }
  return summary;
}
