import type { Env } from './types.ts';
import { BUSINESS, serviceAreaList } from './config.ts';
import { KEY_LABELS, keyedHash, randomBytes } from './crypto.ts';
import {
  DAY,
  HOUR,
  bumpCounter,
  ensureSchema,
  findByRequestId,
  findRecentDuplicate,
  insertPending,
  purgeExpired,
  releaseRequestId,
  setRequestStatus,
} from './db.ts';
import {
  adminKey,
  chicagoDay,
  dailyCap,
  intakeEnabled,
  isLiveHost,
  jobberClientId,
  jobberClientSecret,
} from './env.ts';
import { JobberError, hasStoredTokens, writeServiceRequest, type WriteProgress } from './jobber.ts';
import { buildNote, buildTitle } from './note.ts';
import {
  mentionsElectrical,
  validateServiceRequest,
  type CleanRequest,
  type FieldError,
  type ValidateOptions,
} from './validate.ts';

export type IntakeStatus = 'needs_changes' | 'ready_to_submit' | 'submitted' | 'unavailable';

/** The tool / API response. Never carries PII or a Jobber id. */
export interface IntakeResult {
  status: IntakeStatus;
  errors: FieldError[];
  reference: string | null;
  message_for_customer: string;
  next_steps: string[];
}

export interface IntakeDeps {
  env: Env;
  request: Request;
  now: () => number;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  log: (entry: Record<string, string | number | null>) => void;
}

export const LIMITS = {
  perIpPerHour: 5,
  perPhonePerDay: 3,
  duplicateWindow: 48 * HOUR,
  requestIdWindow: 24 * HOUR,
} as const;

const PHONE = BUSINESS.phone;
const NAME = BUSINESS.name;
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

const ADDRESS_ON_CALL = `${NAME} will ask for the service address when it calls`;
const ELECTRICAL_STEP = `If the job involves electrical work, keep the details in the request; ${NAME} will explain what it can take on.`;
const NO_PROMISES_STEP =
  'Do not promise a price, arrival time, availability or response time, and do not claim licenses, insurance, guarantees, reviews or opening hours.';

export function newReference(): string {
  const bytes = randomBytes(5);
  let out = 'EYS-AI-';
  for (const byte of bytes) out += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  return out;
}

function withElectrical(steps: string[], request: { serviceSummary: string; jobDetails: string } | null): string[] {
  if (request && mentionsElectrical(`${request.serviceSummary} ${request.jobDetails}`)) return [...steps, ELECTRICAL_STEP];
  return steps;
}

function needsChanges(errors: FieldError[], outOfState: boolean, outsideArea: boolean): IntakeResult {
  if (outsideArea) {
    return {
      status: 'needs_changes',
      errors,
      reference: null,
      message_for_customer: `${NAME} serves ${serviceAreaList('and')}, TX, so this request cannot be sent; you can call ${PHONE} with any questions.`,
      next_steps: [
        'Tell the customer this request cannot be sent because the job is outside the service area.',
        `Give the customer ${PHONE}.`,
        'Only call again if the customer says the job is in or near one of those areas after all.',
      ],
    };
  }
  if (outOfState) {
    return {
      status: 'needs_changes',
      errors,
      reference: null,
      message_for_customer: `${NAME} only takes requests for Texas addresses, so this one cannot be sent; you can call ${PHONE} with any questions.`,
      next_steps: [
        'Tell the customer this request cannot be sent because the job is outside Texas.',
        'Only call again if the customer says the state was entered wrong.',
      ],
    };
  }
  return {
    status: 'needs_changes',
    errors,
    reference: null,
    message_for_customer: `A few details need fixing before this request can be sent to ${NAME}; you can also call ${PHONE}.`,
    next_steps: [
      'Ask the customer for each field listed in errors. Never guess or invent a value.',
      'Call submit_service_request again with the corrected details.',
    ],
  };
}

function readyToSubmit(request: CleanRequest, validateOnlyHost: boolean): IntakeResult {
  const addressFree = request.street === null;
  const steps = request.confirmed
    ? [
        'This server only validates requests; nothing was sent or stored. Use https://www.eyshandyman.com to submit.',
      ]
    : [
        'Read every detail back to the customer.',
        addressFree
          ? `Tell the customer that their name, phone number and job details will be shared with ${NAME} so it can contact them, and that ${ADDRESS_ON_CALL}.`
          : `Tell the customer that their name, phone, address and job details will be shared with ${NAME} so it can contact them.`,
        'Only after the customer clearly says yes, call again with the same details, confirmed_by_customer true and the same request_id.',
        NO_PROMISES_STEP,
      ];
  return {
    status: 'ready_to_submit',
    errors: [],
    reference: null,
    message_for_customer: validateOnlyHost
      ? `These details are complete, but this test server cannot send requests; please call ${PHONE}.`
      : addressFree
        ? `Everything needed is here; once you confirm these details are correct, your name, phone number and job details can be sent to ${NAME}, and they will ask for the service address when they call you; you can also call ${PHONE} instead.`
        : `Everything needed is here; once you confirm these details are correct, the request can be sent to ${NAME}, or you can call ${PHONE} instead.`,
    next_steps: withElectrical(steps, request),
  };
}

function submitted(reference: string, request: CleanRequest, alreadySent: boolean): IntakeResult {
  if (request.street === null) {
    return {
      status: 'submitted',
      errors: [],
      reference,
      message_for_customer: alreadySent
        ? `This request was already sent to ${NAME} as ${reference}, so there is no need to send it again; they will ask for the service address when they call you, and you can call ${PHONE} to add anything.`
        : `Your request ${reference} has been sent to ${NAME} with your name, phone number and job details; they will ask for the service address when they call you, and you can also call ${PHONE}.`,
      next_steps: withElectrical(
        [
          `Give the customer the reference ${reference}.`,
          `Tell the customer that ${ADDRESS_ON_CALL}.`,
          alreadySent
            ? 'Do not submit this request again.'
            : `If the customer has photos of the job, they can share them when ${NAME} gets in touch.`,
          NO_PROMISES_STEP,
        ],
        request,
      ),
    };
  }
  return {
    status: 'submitted',
    errors: [],
    reference,
    message_for_customer: alreadySent
      ? `This request was already sent to ${NAME} as ${reference}, so there is no need to send it again; you can call ${PHONE} to add anything.`
      : `Your request ${reference} has been sent to ${NAME}, and they will contact you about it; you can also call ${PHONE}.`,
    next_steps: withElectrical(
      [
        `Give the customer the reference ${reference}.`,
        alreadySent
          ? 'Do not submit this request again.'
          : `If the customer has photos of the job, they can share them when ${NAME} gets in touch.`,
        NO_PROMISES_STEP,
      ],
      request,
    ),
  };
}

/** Lower-cased, whitespace-collapsed job text: the duplicate key without an address. */
function jobText(request: CleanRequest): string {
  return `${request.serviceSummary} ${request.jobDetails}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

function unavailable(reference: string | null = null): IntakeResult {
  return {
    status: 'unavailable',
    errors: [],
    reference,
    message_for_customer: `This request could not be sent online right now; please call ${NAME} at ${PHONE}.`,
    next_steps: [
      `Give the customer the phone number ${PHONE}.`,
      'Do not retry this request more than once.',
    ],
  };
}

/**
 * The single core behind all three doors (MCP tool, JSON API, WebMCP).
 * Only the MCP door passes addressOptional (see validateServiceRequest).
 *
 * confirmed_by_customer false → validate only, write nothing anywhere.
 * Jobber writes need ALL of: host www.eyshandyman.com, AI_INTAKE_ENABLED
 * exactly "true", D1 + Jobber credentials + admin key, a stored connection,
 * no duplicate, and every rate limit under its cap.
 */
export async function submitServiceRequest(
  input: unknown,
  deps: IntakeDeps,
  options: ValidateOptions = {},
): Promise<IntakeResult> {
  const log = (status: IntakeStatus, source: string | null, errorClass: string | null, reference: string | null) =>
    deps.log({ evt: 'ai_intake', status, source, error_class: errorClass, reference });

  const validation = validateServiceRequest(input, options);
  if (!validation.ok) {
    const errorClass = validation.outsideArea ? 'outside_area' : validation.outOfState ? 'out_of_state' : 'validation';
    log('needs_changes', validation.source, errorClass, null);
    return needsChanges(validation.errors, validation.outOfState, validation.outsideArea);
  }
  const request = validation.value;

  if (!request.confirmed) {
    log('ready_to_submit', request.source, null, null);
    return readyToSubmit(request, false);
  }
  if (!isLiveHost(deps.request)) {
    log('ready_to_submit', request.source, 'validate_only_host', null);
    return readyToSubmit(request, true);
  }

  const { env } = deps;
  const fail = (errorClass: string, reference: string | null = null) => {
    log('unavailable', request.source, errorClass, reference);
    return unavailable(reference);
  };

  if (!intakeEnabled(env)) return fail('disabled');
  const key = adminKey(env);
  const db = env.EYS_AI_DB;
  if (!db || !key || !jobberClientId(env) || !jobberClientSecret(env)) return fail('not_configured');

  try {
    await ensureSchema(db);
    if (!(await hasStoredTokens(db))) return fail('not_connected');

    const now = deps.now();
    await purgeExpired(db, now);
    const phoneHash = await keyedHash(key, KEY_LABELS.phoneHash, request.phoneE164);
    // Next to the phone, the ZIP keys duplicates; without an address the job
    // text does, so the same customer can still send a different job.
    const dedupeKey = request.zip ?? (await keyedHash(key, KEY_LABELS.jobHash, jobText(request)));

    // Idempotency: the same request_id inside 24 hours, or the same phone + ZIP (or job) inside 48.
    if (request.requestId) {
      const prior = await findByRequestId(db, request.requestId);
      if (prior && prior.created_at >= now - LIMITS.requestIdWindow && prior.status !== 'failed') {
        log('submitted', request.source, 'duplicate_request_id', prior.reference);
        return submitted(prior.reference, request, true);
      }
      if (prior) await releaseRequestId(db, request.requestId);
    }
    const duplicate = await findRecentDuplicate(db, phoneHash, dedupeKey, now - LIMITS.duplicateWindow);
    if (duplicate) {
      log('submitted', request.source, request.zip ? 'duplicate_phone_zip' : 'duplicate_phone_job', duplicate.reference);
      return submitted(duplicate.reference, request, true);
    }

    // Rate limits, cheapest-to-trip first.
    const ip = deps.request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const ipHash = await keyedHash(key, KEY_LABELS.ipHash, ip);
    const hour = Math.floor(now / HOUR);
    const day = chicagoDay(now);
    if ((await bumpCounter(db, `ip:${ipHash}:${hour}`, HOUR, now)) > LIMITS.perIpPerHour) return fail('rate_ip');
    if ((await bumpCounter(db, `phone:${phoneHash}:${day}`, 2 * DAY, now)) > LIMITS.perPhonePerDay) {
      return fail('rate_phone');
    }
    if ((await bumpCounter(db, `global:${day}`, 2 * DAY, now)) > dailyCap(env)) return fail('daily_cap');

    // Reserve the reference before touching Jobber.
    let reference = '';
    for (let attempt = 0; attempt < 5 && !reference; attempt++) {
      const candidate = newReference();
      const outcome = await insertPending(db, {
        reference: candidate,
        requestId: request.requestId,
        phoneHash,
        zip: dedupeKey,
        source: request.source,
        now,
      });
      if (outcome === 'ok') reference = candidate;
      else if (outcome === 'conflict' && request.requestId) {
        const other = await findByRequestId(db, request.requestId);
        if (other) {
          log('submitted', request.source, 'duplicate_request_id', other.reference);
          return submitted(other.reference, request, true);
        }
      }
    }
    if (!reference) return fail('reference');

    const progress: WriteProgress = {
      stage: 'plan',
      requestCreated: false,
      reusedClient: false,
      createdProperty: false,
    };
    try {
      await writeServiceRequest(
        { env, db, adminKey: key, fetch: deps.fetch, now: deps.now, sleep: deps.sleep },
        request,
        buildTitle(request),
        buildNote(request, reference, now),
        progress,
      );
    } catch (error) {
      const errorClass = error instanceof JobberError ? `jobber_${error.errorClass}` : 'internal';
      // A request that may already exist in Jobber is never retried into a duplicate.
      await setRequestStatus(db, reference, progress.requestCreated ? 'unverified' : 'failed', deps.now());
      return fail(`${errorClass}@${progress.stage}`, progress.requestCreated ? reference : null);
    }
    await setRequestStatus(db, reference, 'submitted', deps.now());
    log('submitted', request.source, null, reference);
    return submitted(reference, request, false);
  } catch (error) {
    return fail(error instanceof JobberError ? `jobber_${error.errorClass}` : 'internal');
  }
}

/** Production deps for a route. */
export function intakeDeps(env: Env, request: Request): IntakeDeps {
  return {
    env,
    request,
    now: () => Date.now(),
    fetch: (input, init) => fetch(input, init),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (entry) => console.log(JSON.stringify(entry)),
  };
}
