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
export interface Env {
  EYS_AI_DB?: D1Database;
  JOBBER_CLIENT_ID?: string;
  JOBBER_CLIENT_SECRET?: string;
  AI_ADMIN_KEY?: string;
  AI_INTAKE_ENABLED?: string;
  AI_INTAKE_DAILY_CAP?: string;
  OPENAI_APPS_CHALLENGE_TOKEN?: string;
  JOBBER_EXPECTED_ACCOUNT?: string;
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
