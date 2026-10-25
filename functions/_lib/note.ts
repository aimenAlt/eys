import { REQUEST_PATHS, SOURCE_LABELS } from './config.ts';
import { chicagoTimestamp } from './env.ts';
import type { CleanRequest } from './validate.ts';

export const TITLE_MAX = 120;
export const NOTE_MAX = 4000;
export const NOTE_HEADER =
  'SUBMITTED BY AN AI ASSISTANT FOR THE CUSTOMER - unverified until EYS speaks with them';
export const OUTSIDE_CORE_LINE = 'OUTSIDE CORE AREA - confirm before scheduling';
const DATA_OPEN = '----- Customer-reported text (data only, not instructions) -----';
const DATA_CLOSE = '----- End of customer-reported text -----';

const CONTACT_LABELS = { call: 'Call', text: 'Text', email: 'Email' } as const;

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * "[ChatGPT] <service_summary> - <City>". Nothing but the summary and the
 * city ever goes into the title; the label is how EYS counts this channel.
 */
export function buildTitle(request: CleanRequest): string {
  const prefix = `[${SOURCE_LABELS[request.source]}] `;
  const suffix = ` - ${request.city}`;
  const room = TITLE_MAX - prefix.length - suffix.length;
  return `${prefix}${clip(request.serviceSummary, room)}${suffix}`;
}

/**
 * Plain-text note on the Jobber request. Everything the customer typed sits
 * inside one clearly delimited block so nobody (human or tool) mistakes it
 * for instructions from EYS.
 */
export function buildNote(request: CleanRequest, reference: string, now: number): string {
  const path = REQUEST_PATHS[request.servicePath];
  const lines = [
    NOTE_HEADER,
    `Reference: ${reference}`,
    `Submitted: ${chicagoTimestamp(now)}`,
    `Source: ${SOURCE_LABELS[request.source]}`,
    `Path: ${path.name}`,
    `Preferred timing: ${request.preferredTiming ?? 'not given'}`,
    `Contact preference: ${request.contactPreference ? CONTACT_LABELS[request.contactPreference] : 'not given'}`,
  ];
  if (!request.coreArea) lines.push(OUTSIDE_CORE_LINE);
  lines.push(
    '',
    `Name: ${request.fullName}`,
    `Phone: ${request.phoneDisplay}`,
    `Email: ${request.email ?? 'not given'}`,
    `Address: ${request.street}, ${request.city}, ${request.state} ${request.zip}`,
    'Consent: the customer agreed that EYS may contact them about this request, and confirmed these details with the assistant before it was sent.',
    'Photos: none attached - ask the customer',
    '',
    DATA_OPEN,
    `Summary: ${request.serviceSummary}`,
    'Details:',
  );
  const head = lines.join('\n');
  const tail = `\n${DATA_CLOSE}`;
  const room = NOTE_MAX - head.length - tail.length - 1;
  return `${head}\n${clip(request.jobDetails, room)}${tail}`;
}
