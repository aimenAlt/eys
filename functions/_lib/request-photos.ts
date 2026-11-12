import { KEY_LABELS, base64url, deriveSubkey } from './crypto.ts';
import { graphql, type JobberDeps } from './jobber.ts';

/**
 * Customers' photos texted to Quo, put onto their Jobber request as one note
 * with the files attached (POST /api/admin/jobber/request-photos).
 *
 * Quo's Jobber integration never copies texted media, and the Jobber
 * connector can't write notes or files, so without this the quoting routine
 * needs a browser. Jobber's public schema (introspected 2026-11-11, API
 * 2026-09-25): RequestCreateNoteInput { message, attachments:
 * [NoteAttachmentAttributes!], pinned, linkedTo }, and NoteAttachmentAttributes
 * is { url, signedBlobId }. A `url` is downloaded by Jobber in the background
 * (ClientNoteAddAttachmentPayload calls them "being processed"), so each
 * share.quo.com link is checked here first and the files are read back after.
 *
 * Idempotent by Quo message time: the note ends with a line naming the
 * message times it covers, and a time already on the request is skipped.
 */

export const PHOTO_TIMES_PREFIX = 'Quo message times (UTC): ';
export const MAX_MEDIA = 20;
export const MAX_NOTE_CHARS = 3000;
export const MAX_URL_CHARS = 2048;
/** Waits between read-backs while Jobber downloads the files. */
export const READBACK_WAITS = [1_500, 3_000, 5_000];
const MEDIA_TIMEOUT = 15_000;
const MEDIA_HOST = 'share.quo.com';
const MEDIA_TYPE = /^(image|video)\/[\w.+-]+$|^application\/pdf$/;
const GENERIC_TYPE = /^(application|binary)\/octet-stream$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;
const ENCODED_ID = /^[A-Za-z0-9+/=_-]{8,200}$/;
const CONTENT_TYPE = /^[a-z0-9][\w.+-]*\/[\w.+-]+$/i;

export interface PhotoMedia {
  url: string;
  /** Canonical UTC time of the Quo message ("2026-11-11T20:15:03Z"). */
  sentAt: string;
  contentType: string | null;
}

export interface PhotosInput {
  requestId: string;
  note: string;
  media: PhotoMedia[];
  dryRun: boolean;
}

export interface PhotosResult {
  status: number;
  body: Record<string, unknown>;
}

/** HMAC-SHA256(AI_ADMIN_KEY, label) as base64url: the routine's key, accepted by its photos, request-read and quote-note routes only. */
export async function photosKey(adminKey: string): Promise<string> {
  return base64url(await deriveSubkey(adminKey, KEY_LABELS.photosKey));
}

/** https://share.quo.com/<path> only, so the route is never a fetcher for other hosts. */
export function isQuoMediaUrl(value: string): boolean {
  if (value.length > MAX_URL_CHARS) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname === MEDIA_HOST &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname.length > 1
  );
}

/** ISO 8601 with a zone → "YYYY-MM-DDTHH:MM:SSZ" (milliseconds kept only when not zero). */
export function canonicalTime(value: string): string | null {
  if (!ISO_TIME.test(value)) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().replace(/\.000Z$/, 'Z');
}

/** The note's last line: every message time it covers and how many files came with each. */
export function photoTimesLine(media: PhotoMedia[]): string {
  const counts = new Map<string, number>();
  for (const m of media) counts.set(m.sentAt, (counts.get(m.sentAt) ?? 0) + 1);
  const parts = [...counts].map(([time, n]) => `${time} (${n} file${n === 1 ? '' : 's'})`);
  return `${PHOTO_TIMES_PREFIX}${parts.join(', ')}`;
}

/** Message time → files claimed, from a note written by this route. */
export function parsePhotoTimes(message: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of message.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(PHOTO_TIMES_PREFIX)) continue;
    for (const part of trimmed.slice(PHOTO_TIMES_PREFIX.length).split(/,\s*/)) {
      const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)(?: \((\d+) files?\))?$/.exec(part.trim());
      if (match) out.set(match[1], Number(match[2] ?? 1));
    }
  }
  return out;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

export function parsePhotosBody(value: unknown): { ok: true; input: PhotosInput } | { ok: false; errors: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['body: must be a JSON object'] };
  const raw = value as Record<string, unknown>;
  const errors: string[] = [];

  const requestId = str(raw.requestId) ?? '';
  if (!ENCODED_ID.test(requestId)) errors.push("requestId: the request's encoded Jobber id (get_request → id)");

  const note = str(raw.note) ?? '';
  if (note === '') errors.push('note: required (the "Photos texted to Quo ..." line and the customer\'s texts)');
  else if (note.length > MAX_NOTE_CHARS) errors.push(`note: at most ${MAX_NOTE_CHARS} characters`);

  let dryRun = false;
  if (raw.dryRun !== undefined) {
    if (typeof raw.dryRun === 'boolean') dryRun = raw.dryRun;
    else errors.push('dryRun: true or false');
  }

  const media: PhotoMedia[] = [];
  if (!Array.isArray(raw.media) || raw.media.length === 0) {
    errors.push('media: a non-empty list of {url, sentAt, contentType?}');
  } else if (raw.media.length > MAX_MEDIA) {
    errors.push(`media: at most ${MAX_MEDIA} per call`);
  } else {
    const seen = new Set<string>();
    raw.media.forEach((item, i) => {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const url = str(entry.url) ?? '';
      const sentAt = canonicalTime(str(entry.sentAt) ?? '');
      const typeRaw = entry.contentType === undefined || entry.contentType === null ? null : str(entry.contentType);
      let ok = true;
      if (!isQuoMediaUrl(url)) {
        errors.push(`media[${i}].url: must be an https://share.quo.com/ link`);
        ok = false;
      }
      if (!sentAt) {
        errors.push(`media[${i}].sentAt: the Quo message time, ISO 8601 with a zone`);
        ok = false;
      }
      if (typeRaw !== null && (typeRaw.length > 100 || !CONTENT_TYPE.test(typeRaw))) {
        errors.push(`media[${i}].contentType: a MIME type such as image/jpeg`);
        ok = false;
      }
      if (ok && sentAt && !seen.has(url)) {
        seen.add(url);
        media.push({ url, sentAt, contentType: typeRaw ? typeRaw.toLowerCase() : null });
      }
    });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, input: { requestId, note, media, dryRun } };
}

// ---------------------------------------------------------------------------
// Jobber
// ---------------------------------------------------------------------------

interface NoteFiles {
  id: string;
  message: string;
  files: { id: string; status: string | null }[];
}

interface RequestNotes {
  notes: NoteFiles[];
  requestFiles: number;
}

// Notes come back in Jobber's default order; a request with more than 40
// notes could hide an older photo note (none had more than a dozen in 2026).
const NOTES_QUERY = `query EysPhotoNotes($id: EncodedId!) { request(id: $id) { id notes(first: 40) { nodes { __typename ... on RequestNote { id message fileAttachments(first: 50) { nodes { id status } } } } } noteAttachments(first: 100) { nodes { id } } } }`;

const ADD_MUTATION = `mutation EysAddRequestPhotos($id: EncodedId!, $input: RequestCreateNoteInput!) { requestCreateNote(requestId: $id, input: $input) { requestNote { id fileAttachments(first: 50) { nodes { id status } } } userErrors { message path } } }`;

type FileNodes = { nodes?: ({ id?: string; status?: string | null } | null)[] | null } | null | undefined;

function files(connection: FileNodes): { id: string; status: string | null }[] {
  return (connection?.nodes ?? [])
    .filter((n): n is { id: string; status?: string | null } => typeof n?.id === 'string')
    .map((n) => ({ id: n.id, status: n.status ?? null }));
}

async function readNotes(deps: JobberDeps, requestId: string): Promise<RequestNotes | null> {
  const data = await graphql<{
    request?: {
      notes?: { nodes?: ({ __typename?: string; id?: string; message?: string | null; fileAttachments?: FileNodes } | null)[] };
      noteAttachments?: FileNodes;
    } | null;
  }>(deps, NOTES_QUERY, { id: requestId });
  if (!data.request) return null;
  const notes: NoteFiles[] = [];
  for (const node of data.request.notes?.nodes ?? []) {
    if (node?.__typename !== 'RequestNote' || typeof node.id !== 'string') continue;
    notes.push({ id: node.id, message: node.message ?? '', files: files(node.fileAttachments) });
  }
  return { notes, requestFiles: files(data.request.noteAttachments).length };
}

async function checkMedia(deps: JobberDeps, media: PhotoMedia): Promise<string | null> {
  let response: Response;
  try {
    response = await deps.fetch(media.url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'image/*,video/*,application/pdf;q=0.9,*/*;q=0.1' },
      signal: AbortSignal.timeout(MEDIA_TIMEOUT),
    });
  } catch {
    return 'network';
  }
  const type = (response.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  // Only the headers matter here; Jobber downloads the bytes itself.
  try {
    await response.body?.cancel();
  } catch {
    // already closed
  }
  if (!response.ok) return `http_${response.status}`;
  if (MEDIA_TYPE.test(type)) return null;
  if (GENERIC_TYPE.test(type) && media.contentType && MEDIA_TYPE.test(media.contentType)) return null;
  return `type ${type || 'missing'}`;
}

/**
 * Read the request's notes, skip message times already there, check every
 * remaining link, write one note with them attached, then read the files back
 * (waiting while Jobber downloads). `live: false` (any host but the live one)
 * and `dryRun` stop before the write.
 */
export async function addRequestPhotos(deps: JobberDeps, input: PhotosInput, options: { live: boolean }): Promise<PhotosResult> {
  const before = await readNotes(deps, input.requestId);
  if (!before) return { status: 404, body: { error: 'request_not_found', written: false } };

  const covered = new Map<string, { note_id: string; attached: number; claimed: number }>();
  for (const note of before.notes) {
    for (const [time, claimed] of parsePhotoTimes(note.message)) {
      covered.set(time, { note_id: note.id, attached: note.files.length, claimed });
    }
  }
  const pending = input.media.filter((m) => !covered.has(m.sentAt));
  const skippedTimes = [...new Set(input.media.filter((m) => covered.has(m.sentAt)).map((m) => m.sentAt))];
  const skipped = skippedTimes.map((time) => ({ sent_at: time, ...covered.get(time)! }));

  if (pending.length === 0) {
    return {
      status: 200,
      body: { status: 'already_attached', request_id: input.requestId, skipped, request_attachments: before.requestFiles },
    };
  }

  const failed: { url: string; sent_at: string; reason: string }[] = [];
  for (const media of pending) {
    const reason = await checkMedia(deps, media);
    if (reason) failed.push({ url: media.url, sent_at: media.sentAt, reason });
  }
  if (failed.length) return { status: 422, body: { error: 'media_unreachable', written: false, failed } };

  const message = `${input.note}\n\n${photoTimesLine(pending)}`;
  if (input.dryRun || !options.live) {
    return {
      status: 200,
      body: {
        status: 'dry_run',
        live: options.live,
        request_id: input.requestId,
        would_attach: pending.length,
        skipped,
        message,
      },
    };
  }

  const data = await graphql<{
    requestCreateNote?: {
      requestNote?: { id?: string; fileAttachments?: FileNodes } | null;
      userErrors?: { message?: string | null; path?: string[] | null }[] | null;
    } | null;
  }>(deps, ADD_MUTATION, {
    id: input.requestId,
    input: { message, attachments: pending.map((m) => ({ url: m.url })) },
  });
  const payload = data.requestCreateNote;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    return {
      status: 422,
      body: {
        error: 'jobber_rejected',
        written: false,
        user_errors: userErrors.map((e) => ({ message: String(e.message ?? '').slice(0, 300), path: e.path ?? [] })),
      },
    };
  }
  const noteId = payload?.requestNote?.id;
  // Jobber answered without a note: whether it wrote one is unknown. A repeat
  // call is safe (the times line makes it skip anything that did land).
  if (!noteId) return { status: 502, body: { error: 'jobber_unavailable', error_class: 'graphql', written: 'unknown' } };

  const result = (attached: number | null, ready: number | null, requestFiles: number | null, extra: Record<string, unknown> = {}) => {
    const done = attached !== null && attached >= pending.length;
    return {
      status: done ? 200 : 202,
      body: {
        status: done ? 'attached' : 'processing',
        request_id: input.requestId,
        note_id: noteId,
        attached,
        ready,
        expected: pending.length,
        request_attachments: requestFiles,
        skipped,
        ...extra,
      },
    };
  };

  for (let attempt = 0; ; attempt++) {
    let after: RequestNotes | null;
    try {
      after = await readNotes(deps, input.requestId);
    } catch {
      return result(null, null, null, { readback: 'failed' });
    }
    const found = after?.notes.find((n) => n.id === noteId)?.files ?? [];
    if (found.length >= pending.length || attempt >= READBACK_WAITS.length) {
      return result(found.length, found.filter((f) => f.status === 'READY').length, after?.requestFiles ?? null);
    }
    await deps.sleep(READBACK_WAITS[attempt]);
  }
}
