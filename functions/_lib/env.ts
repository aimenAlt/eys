import type { Env } from './types.ts';

/**
 * The only host that may write to Jobber. pages.dev, preview aliases and local
 * dev are validate-only, whatever their vars say.
 */
export const LIVE_HOST = 'www.eyshandyman.com';
export const LIVE_ORIGIN = `https://${LIVE_HOST}`;

/** Shorter admin keys are treated as not configured. */
const MIN_ADMIN_KEY_LENGTH = 16;

const DEFAULT_DAILY_CAP = 20;
const MAX_DAILY_CAP = 500;

export function isLiveHost(request: Request): boolean {
  return new URL(request.url).hostname === LIVE_HOST;
}

/** Kill switch: anything other than exactly "true" stops every Jobber write. */
export function intakeEnabled(env: Env): boolean {
  return env.AI_INTAKE_ENABLED === 'true';
}

export function dailyCap(env: Env): number {
  const raw = Number.parseInt(env.AI_INTAKE_DAILY_CAP ?? '', 10);
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_DAILY_CAP;
  return Math.min(raw, MAX_DAILY_CAP);
}

export function adminKey(env: Env): string | null {
  const key = env.AI_ADMIN_KEY ?? '';
  return key.length >= MIN_ADMIN_KEY_LENGTH ? key : null;
}

/** Booleans only — health output must never carry a secret or its length. */
export function configured(env: Env) {
  return {
    d1: Boolean(env.EYS_AI_DB),
    jobber_client: Boolean(env.JOBBER_CLIENT_ID),
    jobber_secret: Boolean(env.JOBBER_CLIENT_SECRET),
    admin_key: adminKey(env) !== null,
  };
}

/** YYYY-MM-DD in America/Chicago — daily caps follow the business's day. */
export function chicagoDay(now: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}

/** "Oct 25, 2026, 4:55 PM CDT" for the Jobber note. */
export function chicagoTimestamp(now: number): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
    .format(new Date(now))
    .concat(' ', chicagoZoneName(now));
}

function chicagoZoneName(now: number): string {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    timeZoneName: 'short',
  })
    .formatToParts(new Date(now))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? 'CT';
}
