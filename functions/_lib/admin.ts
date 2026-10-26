import type { Env } from './types.ts';
import { KEY_LABELS, keyedHash, timingSafeEqual } from './crypto.ts';
import { HOUR, bumpCounter, ensureSchema, readCounter } from './db.ts';
import { adminKey } from './env.ts';
import { JobberError, type JobberDeps } from './jobber.ts';

export const MAX_ADMIN_FAILURES_PER_HOUR = 5;

export type AdminCheck = 'ok' | 'bad_key' | 'locked' | 'not_configured';

/**
 * Admin key check for the Jobber connect / probe routes: constant-time, and
 * at most five wrong keys per hour per IP (counted in D1 by keyed IP hash).
 */
export async function checkAdminKey(env: Env, request: Request, presented: string, now: number): Promise<AdminCheck> {
  const key = adminKey(env);
  const db = env.EYS_AI_DB;
  if (!key || !db) return 'not_configured';
  await ensureSchema(db);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const counter = `adminfail:${await keyedHash(key, KEY_LABELS.ipHash, ip)}:${Math.floor(now / HOUR)}`;
  if ((await readCounter(db, counter)) >= MAX_ADMIN_FAILURES_PER_HOUR) return 'locked';
  const typed = presented.trim();
  if (typed && (await timingSafeEqual(typed, key))) return 'ok';
  await bumpCounter(db, counter, HOUR, now);
  return 'bad_key';
}

export function bearerToken(request: Request): string {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

/** JobberDeps for admin routes; only valid once checkAdminKey returned 'ok'. */
export function adminJobberDeps(env: Env): JobberDeps {
  const key = adminKey(env);
  const db = env.EYS_AI_DB;
  if (!key || !db) throw new JobberError('not_connected');
  return {
    env,
    db,
    adminKey: key,
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Minimal admin page shell. Callers escape every dynamic value. */
export function adminPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#15171a;background:#fff}
h1{font-size:1.4rem}label{display:block;font-weight:600;margin:1rem 0 .25rem}
input{width:100%;box-sizing:border-box;padding:.6rem;font:inherit;border:1px solid #c7cbd1;border-radius:6px}
button{margin-top:1rem;padding:.7rem 1.2rem;font:inherit;font-weight:700;color:#fff;background:#d62828;border:0;border-radius:6px;cursor:pointer}
.muted{color:#5e6670;font-size:.9rem}
h2{font-size:1.1rem;margin-top:2rem}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.4;background:#f4f5f7;padding:1rem;border-radius:6px}
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
</body>
</html>`;
}
