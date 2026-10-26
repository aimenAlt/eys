/**
 * Response helpers shared by every AI-intake route.
 *
 * Every response is no-store and noindex, and none carries CORS headers: the
 * callers are assistant servers, and the page-level WebMCP script is
 * same-origin.
 */

const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
  'X-Content-Type-Options': 'nosniff',
};

export const MAX_BODY_BYTES = 16 * 1024;

function withHeaders(extra: Record<string, string>): Headers {
  return new Headers({ ...BASE_HEADERS, ...extra });
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withHeaders({ 'Content-Type': 'application/json; charset=utf-8', ...extra }),
  });
}

export function text(body: string, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: withHeaders({ 'Content-Type': 'text/plain; charset=utf-8', ...extra }),
  });
}

/** Bare status with no body (202 for MCP notifications, 302 redirects). */
export function empty(status: number, extra: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: withHeaders(extra) });
}

/** Admin pages only. Locked down: no scripts, no framing, no referrer. */
export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: withHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    }),
  });
}

export function methodNotAllowed(allow: string[]): Response {
  return json({ error: 'method_not_allowed', allow }, 405, { Allow: allow.join(', ') });
}

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

/**
 * Reads a JSON body without ever buffering more than `maxBytes`: the stream is
 * cancelled as soon as it crosses the cap, whatever Content-Length claimed.
 */
export async function readJsonBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<BodyResult> {
  const type = (request.headers.get('Content-Type') ?? '').toLowerCase();
  if (!type.startsWith('application/json')) {
    return { ok: false, status: 415, error: 'Content-Type must be application/json.' };
  }
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > maxBytes) {
    return { ok: false, status: 413, error: `Body must be at most ${maxBytes} bytes.` };
  }
  if (!request.body) return { ok: false, status: 400, error: 'Body is empty.' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false, status: 413, error: `Body must be at most ${maxBytes} bytes.` };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, error: 'Body is not valid JSON.' };
  }
}
