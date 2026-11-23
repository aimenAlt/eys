import Anthropic from '@anthropic-ai/sdk';
import type { Env } from './types.ts';

/**
 * The Claude API, for the few jobs on the site that need judgment over words:
 * writing the follow-up text to a caller who left no details, and reading
 * their replies (functions/_lib/info-ask.ts).
 *
 * Official SDK, model claude-opus-5-5, structured JSON output
 * (output_config.format), and the server-side refusal fallback
 * (`fallbacks: "default"`, beta server-side-fallback-2026-07-01), so a
 * declined request is re-run on the fallback model inside the same call.
 * Key: the Pages secret ANTHROPIC_API_KEY. Never logs the key, the prompt or
 * the answer.
 */

export const CLAUDE_MODEL = 'claude-opus-5-5';
export const CLAUDE_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export interface ClaudeDeps {
  key: string;
  fetch: typeof fetch;
}

export function claudeDeps(env: Env, fetcher: typeof fetch): ClaudeDeps | null {
  const key = (env.ANTHROPIC_API_KEY ?? '').trim();
  return key ? { key, fetch: fetcher } : null;
}

export interface JsonRequest {
  system: string;
  prompt: string;
  /** JSON schema of the answer: every object needs `additionalProperties: false` and `required`. */
  schema: Record<string, unknown>;
  effort?: 'low' | 'medium' | 'high';
  maxTokens?: number;
}

/** One answer matching `schema`, or null when Claude can't be asked, declines, runs out of room or answers badly. */
export async function claudeJson<T>(deps: ClaudeDeps, request: JsonRequest): Promise<T | null> {
  const client = new Anthropic({ apiKey: deps.key, fetch: deps.fetch, maxRetries: 1, timeout: 60_000 });
  try {
    const response = await client.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: request.maxTokens ?? 8000,
      betas: [CLAUDE_FALLBACK_BETA],
      fallbacks: 'default',
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
      output_config: { effort: request.effort ?? 'medium', format: { type: 'json_schema', schema: request.schema } },
    });
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      console.log(JSON.stringify({ evt: 'claude_no_answer', stop_reason: response.stop_reason }));
      return null;
    }
    const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
    return JSON.parse(text) as T;
  } catch (error) {
    const status = error instanceof Anthropic.APIError ? error.status : null;
    console.log(JSON.stringify({ evt: 'claude_failed', status: status ?? null, kind: error instanceof SyntaxError ? 'bad_json' : 'error' }));
    return null;
  }
}
