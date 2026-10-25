import {
  CORE_SERVICE_ZIPS,
  SERVICE_PATHS,
  SOURCES,
  type ServicePath,
  type Source,
} from './config.ts';

export const CONTACT_PREFERENCES = ['call', 'text', 'email'] as const;
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number];

export interface FieldError {
  field: string;
  problem: string;
}

/** A request after validation: trimmed, cleaned and normalised. */
export interface CleanRequest {
  firstName: string;
  lastName: string;
  fullName: string;
  /** +1XXXXXXXXXX */
  phoneE164: string;
  /** XXXXXXXXXX */
  phoneDigits: string;
  /** (XXX) XXX-XXXX */
  phoneDisplay: string;
  email: string | null;
  street: string;
  city: string;
  state: 'TX';
  zip: string;
  serviceSummary: string;
  jobDetails: string;
  servicePath: ServicePath;
  preferredTiming: string | null;
  contactPreference: ContactPreference | null;
  confirmed: boolean;
  source: Source;
  requestId: string | null;
  /** False for a Texas ZIP the site does not list: accepted, but flagged in the note. */
  coreArea: boolean;
}

export type ValidationResult =
  | { ok: true; value: CleanRequest }
  | { ok: false; errors: FieldError[]; outOfState: boolean; source: Source | null };

export const LIMITS = {
  name: 80,
  phone: 30,
  email: 254,
  streetMin: 5,
  street: 120,
  cityMin: 2,
  city: 60,
  summaryMin: 5,
  summary: 120,
  detailsMin: 20,
  details: 2000,
  timing: 200,
} as const;

// C0/C1 controls except tab and newline (handled separately).
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Zero-width and bidi-override characters that can hide text from a reader.
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
const TAG = /<[^>]*>/g;

/**
 * Plain text only: strips HTML tags, stray angle brackets, control and
 * invisible characters. Links survive as ordinary text.
 */
export function cleanText(value: string, multiline = false): string {
  let s = value.normalize('NFC').replace(INVISIBLE, '').replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  s = s.replace(CONTROL, '').replace(TAG, ' ').replace(/[<>]/g, '');
  if (!multiline) return s.replace(/\s+/g, ' ').trim();
  return s
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** NANP-valid US number as 10 digits, or null. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  const area = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  // Area code: NXX with 9 reserved in the middle digit; no N11 service codes.
  if (!/^[2-9][0-8]\d$/.test(area) || /^[2-9]11$/.test(area)) return null;
  if (!/^[2-9]\d\d$/.test(exchange) || /^[2-9]11$/.test(exchange)) return null;
  // 555-0100 to 555-0199 are reserved for fiction.
  if (exchange === '555' && digits.slice(6, 8) === '01') return null;
  return digits;
}

export function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const EMAIL =
  /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;
const CITY = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PO_BOX = /\bp\.?\s*o\.?\s*box\b|\bpost\s+office\s+box\b/i;
/** Texas ZIP prefixes: 750–799 plus 733 (Austin) and 885 (El Paso). */
const TEXAS_ZIP = /^(?:7[5-9]\d{3}|733\d{2}|885\d{2})$/;
const ELECTRICAL = /\b(?:electric\w*|wiring|rewir\w*|outlets?|breakers?|circuits?)\b/i;

export function mentionsElectrical(text: string): boolean {
  return ELECTRICAL.test(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates and normalises a submit_service_request body. Problems are
 * phrased for the assistant: what to ask the customer, never what to assume.
 */
export function validateServiceRequest(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ field: 'body', problem: 'Send a JSON object with the request fields.' }],
      outOfState: false,
      source: null,
    };
  }
  const errors: FieldError[] = [];
  const add = (field: string, problem: string) => errors.push({ field, problem });

  const str = (field: string, multiline = false): string | null => {
    const raw = input[field];
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== 'string') {
      add(field, 'Must be text.');
      return null;
    }
    const cleaned = cleanText(raw, multiline);
    return cleaned === '' ? null : cleaned;
  };
  const required = (field: string, value: string | null, ask: string): value is string => {
    if (value !== null) return true;
    if (!errors.some((e) => e.field === field)) add(field, `Required. ${ask}`);
    return false;
  };
  const length = (field: string, value: string, min: number, max: number, what: string) => {
    if (value.length < min) add(field, `Too short: ${what} needs at least ${min} characters.`);
    else if (value.length > max) add(field, `Too long: ${what} must be at most ${max} characters.`);
  };

  // Source first, so even a rejected call is logged against its assistant.
  let source: Source | null = null;
  const rawSource = typeof input.source === 'string' ? input.source.trim().toLowerCase() : null;
  if (rawSource && (SOURCES as readonly string[]).includes(rawSource)) source = rawSource as Source;
  else add('source', `Required. Use one of: ${SOURCES.join(', ')}.`);

  // Name: first + last.
  let firstName = '';
  let lastName = '';
  const name = str('customer_name');
  if (required('customer_name', name, "Ask the customer for their first and last name.")) {
    const parts = name.split(' ').filter(Boolean);
    if (name.length > LIMITS.name) add('customer_name', `Too long: at most ${LIMITS.name} characters.`);
    else if (!NAME.test(name)) add('customer_name', 'Use letters only (spaces, hyphens and apostrophes are fine).');
    else if (parts.length < 2) add('customer_name', 'Ask the customer for both their first and last name.');
    else {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
  }

  // Phone.
  let phoneDigits = '';
  const rawPhone = typeof input.phone === 'number' ? String(input.phone) : str('phone');
  if (required('phone', rawPhone, 'Ask the customer for a US phone number EYS can reach them on.')) {
    const digits = rawPhone.length <= LIMITS.phone ? normalizePhone(rawPhone) : null;
    if (!digits) add('phone', 'Not a valid US phone number. Read it back to the customer and ask again.');
    else phoneDigits = digits;
  }

  // Email (optional).
  let email: string | null = null;
  const rawEmail = str('email');
  if (rawEmail !== null) {
    const at = rawEmail.lastIndexOf('@');
    const candidate = at > 0 ? `${rawEmail.slice(0, at)}@${rawEmail.slice(at + 1).toLowerCase()}` : rawEmail;
    if (candidate.length > LIMITS.email || !EMAIL.test(candidate)) {
      add('email', 'Not a valid email address. Ask the customer again, or leave it out.');
    } else email = candidate;
  }

  // Address.
  const street = str('street_address');
  if (required('street_address', street, 'Ask the customer for the street address where the work is.')) {
    length('street_address', street, LIMITS.streetMin, LIMITS.street, 'the street address');
    if (!/\d/.test(street) || !/\p{L}/u.test(street)) {
      add('street_address', 'Needs a house number and street name. Ask the customer.');
    } else if (PO_BOX.test(street)) {
      add('street_address', 'Needs the street address where the work is, not a PO box.');
    }
  }

  const city = str('city');
  if (required('city', city, 'Ask the customer which city the job is in.')) {
    length('city', city, LIMITS.cityMin, LIMITS.city, 'the city');
    if (!CITY.test(city)) add('city', 'Use the city name only.');
  }

  let outOfState = false;
  const state = str('state');
  if (required('state', state, 'Ask the customer which state the job is in.')) {
    const s = state.replace(/[.\s]/g, '').toLowerCase();
    if (s !== 'tx' && s !== 'texas') {
      outOfState = true;
      add(
        'state',
        'Elevate Your Space Handyman only takes requests for Texas addresses. Do not change this unless the customer gave the wrong state.',
      );
    }
  }

  let zip = '';
  const rawZip = typeof input.zip === 'number' ? String(input.zip) : str('zip');
  if (required('zip', rawZip, 'Ask the customer for the 5-digit ZIP code of the job address.')) {
    const match = /^(\d{5})(?:-\d{4})?$/.exec(rawZip.replace(/\s/g, ''));
    if (!match) add('zip', 'Must be a 5-digit ZIP code.');
    else if (!outOfState && !TEXAS_ZIP.test(match[1])) {
      add('zip', 'That is not a Texas ZIP code. Check it with the customer.');
    } else zip = match[1];
  }

  // The job.
  const summary = str('service_summary');
  if (required('service_summary', summary, 'Ask the customer to describe the job in a few words.')) {
    length('service_summary', summary, LIMITS.summaryMin, LIMITS.summary, 'the summary');
  }
  const details = str('job_details', true);
  if (required('job_details', details, "Ask the customer what needs doing, in their own words.")) {
    length('job_details', details, LIMITS.detailsMin, LIMITS.details, 'the job details');
  }

  let servicePath: ServicePath | null = null;
  if (typeof input.service_path === 'string' && (SERVICE_PATHS as readonly string[]).includes(input.service_path)) {
    servicePath = input.service_path as ServicePath;
  } else {
    add('service_path', `Required. Use one of: ${SERVICE_PATHS.join(', ')} (not_sure if the customer has not chosen).`);
  }

  const timing = str('preferred_timing');
  if (timing !== null && timing.length > LIMITS.timing) {
    add('preferred_timing', `Too long: at most ${LIMITS.timing} characters.`);
  }

  let contactPreference: ContactPreference | null = null;
  const pref = input.contact_preference;
  if (pref !== undefined && pref !== null && pref !== '') {
    if (typeof pref === 'string' && (CONTACT_PREFERENCES as readonly string[]).includes(pref)) {
      contactPreference = pref as ContactPreference;
    } else add('contact_preference', `Use one of: ${CONTACT_PREFERENCES.join(', ')}, or leave it out.`);
  }

  if (input.consent_to_contact !== true) {
    add(
      'consent_to_contact',
      input.consent_to_contact === false
        ? 'The customer has not agreed to be contacted, so this cannot be sent. Ask whether EYS may contact them about this request.'
        : 'Required. Ask the customer whether Elevate Your Space Handyman may contact them about this request; send true only if they agree.',
    );
  }

  if (typeof input.confirmed_by_customer !== 'boolean') {
    add(
      'confirmed_by_customer',
      'Required: false to check the details, true only after the customer confirmed them.',
    );
  }

  let requestId: string | null = null;
  if (input.request_id !== undefined && input.request_id !== null && input.request_id !== '') {
    if (typeof input.request_id === 'string' && UUID.test(input.request_id.trim())) {
      requestId = input.request_id.trim().toLowerCase();
    } else add('request_id', 'Must be a UUID, or leave it out.');
  }

  if (errors.length > 0 || !source || !servicePath || !name || !street || !city || !summary || !details) {
    return { ok: false, errors, outOfState, source };
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phoneE164: `+1${phoneDigits}`,
      phoneDigits,
      phoneDisplay: formatPhone(phoneDigits),
      email,
      street,
      city,
      state: 'TX',
      zip,
      serviceSummary: summary,
      jobDetails: details,
      servicePath,
      preferredTiming: timing,
      contactPreference,
      confirmed: input.confirmed_by_customer === true,
      source,
      requestId,
      coreArea: (CORE_SERVICE_ZIPS as readonly string[]).includes(zip),
    },
  };
}
