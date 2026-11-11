/**
 * Minimal local types for Cloudflare Pages Functions and D1.
 *
 * Declared here (only the members this code calls) so `astro check` can
 * type-check functions/ without adding @cloudflare/workers-types as a
 * dependency. Request, Response, fetch and crypto come from the DOM lib.
 */

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes?: number; last_row_id?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

/**
 * Bindings, secrets and vars. All optional: they are set in the Cloudflare
 * dashboard (never in the repo) and every route must degrade cleanly when one
 * is missing.
 */
/** Pages' static-asset binding: fetches a built file without running Functions. */
export interface AssetFetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  EYS_AI_DB?: D1Database;
  ASSETS?: AssetFetcher;
  JOBBER_CLIENT_ID?: string;
  JOBBER_CLIENT_SECRET?: string;
  AI_ADMIN_KEY?: string;
  AI_INTAKE_ENABLED?: string;
  AI_INTAKE_DAILY_CAP?: string;
  OPENAI_APPS_CHALLENGE_TOKEN?: string;
  JOBBER_EXPECTED_ACCOUNT?: string;
  /** Quote Desk logins, "name:pin,name:pin". */
  DESK_PINS?: string;
  /** "true" lets the desk text customers through Quo. Anything else: texting is off. */
  QUOTE_SEND_ENABLED?: string;
  /** Quo (formerly OpenPhone) API key. */
  QUO_API_KEY?: string;
  /** Signing secret Quo returned when the call webhook was created (whsec_...). */
  QUO_WEBHOOK_SECRET?: string;
  /** "true" turns on the text to callers who hang up on Sona. */
  HANGUP_TEXT_ENABLED?: string;
  /** Comma-separated E.164 numbers that never get the hang-up text. */
  HANGUP_SKIP_NUMBERS?: string;
}

export interface PagesContext<E = Env> {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  waitUntil(promise: Promise<unknown>): void;
  next(): Promise<Response>;
  data: Record<string, unknown>;
}

export type PagesFunction<E = Env> = (context: PagesContext<E>) => Response | Promise<Response>;
