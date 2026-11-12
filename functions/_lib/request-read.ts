import { fetchRequest, type DeskJobber } from './desk-jobber.ts';
import { formAnswers, requestFiles, requestNoteNodes, type FileView } from './desk-view.ts';

/**
 * One Jobber request as the quoting routine needs it
 * (GET /api/admin/jobber/request).
 *
 * The Jobber connector's get_request leaves out the customer's form answers,
 * so the routine opened the request's web page in Chrome to read them, and a
 * run stopped whenever Chrome was logged out of Jobber (8:35 am, 2026-11-12).
 * This is the Quote Desk's own request query (schema-pruned, so a field the
 * token can't see is left out instead of failing), read only.
 */

export const REQUEST_ID = /^[A-Za-z0-9+/=_-]{8,200}$/;

export interface RoutineRequest {
  id: string;
  title: string | null;
  createdAt: string | null;
  source: string | null;
  jobberWebUri: string | null;
  /** The form answers: the web request page's Overview. */
  answers: { section: string | null; label: string; answer: string }[];
  /** On-site assessment instructions, when the request has an assessment. */
  instructions: string | null;
  /** Request notes in Jobber's order, each whole (Sona's intake block and call transcript included). */
  notes: { createdAt: string | null; message: string; files: number }[];
  /** Every file on the request and its notes, each once; `url` opens it at full size. */
  photos: FileView[];
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function count(connection: unknown): number {
  const list = (connection as { nodes?: unknown[] } | null | undefined)?.nodes;
  return Array.isArray(list) ? list.filter((n) => n && typeof n === 'object').length : 0;
}

export async function readRoutineRequest(j: DeskJobber, id: string): Promise<RoutineRequest | null> {
  const raw = await fetchRequest(j, id);
  if (!raw) return null;
  const assessment = raw.assessment as { instructions?: unknown } | null | undefined;
  return {
    id: text(raw.id) ?? id,
    title: text(raw.title),
    createdAt: text(raw.createdAt),
    source: text(raw.source),
    jobberWebUri: text(raw.jobberWebUri),
    answers: formAnswers(raw),
    instructions: text(assessment?.instructions),
    notes: requestNoteNodes(raw)
      .map((n) => ({ createdAt: text(n.createdAt), message: typeof n.message === 'string' ? n.message : '', files: count(n.fileAttachments) }))
      .filter((n) => n.message !== '' || n.files > 0),
    photos: requestFiles(raw),
  };
}
