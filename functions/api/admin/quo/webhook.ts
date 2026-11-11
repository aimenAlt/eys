import type { Env, PagesFunction } from '../../../_lib/types.ts';
import { adminPage, checkAdminKey, escapeHtml } from '../../../_lib/admin.ts';
import { encryptSecret } from '../../../_lib/crypto.ts';
import { ensureDeskSchema, kvGet, kvSet } from '../../../_lib/desk-db.ts';
import { adminKey } from '../../../_lib/env.ts';
import { html, methodNotAllowed } from '../../../_lib/http.ts';
import { EYS_PHONE_NUMBER_ID, QUO_API, QUO_API_VERSION, quoKey } from '../../../_lib/quo.ts';

export const QUO_WEBHOOK_URL = 'https://www.eyshandyman.com/api/quo/webhook';
const MAX_FORM_BYTES = 4096;

const FORM = adminPage(
  'Register the Quo webhook',
  `<p>Registers one Quo webhook (call.completed on (346) 820-1629) pointing at this site, for the hang-up text. Changes nothing else in Quo.</p>
<form method="post" autocomplete="off">
<label for="key">Admin key</label>
<input id="key" name="key" type="password" required autocomplete="off">
<button type="submit">Register</button>
</form>`,
);

function page(title: string, message: string, status: number): Response {
  return html(adminPage(title, `<p>${message}</p><p><a href="/api/admin/quo/webhook">Back</a></p>`), status);
}

interface QuoWebhook {
  id?: string;
  url?: string;
  events?: string[];
  key?: string;
  status?: string;
}

/**
 * GET: admin-key form. POST: with AI_ADMIN_KEY and QUO_API_KEY set, creates
 * the call.completed webhook through Quo's API (POST /webhooks) unless one for
 * this URL exists, and keeps Quo's signing key encrypted in D1 (desk_kv
 * 'quo_webhook'). The key is never shown.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return html(FORM);
  if (request.method !== 'POST') return methodNotAllowed(['GET', 'POST']);
  if (Number(request.headers.get('Content-Length') ?? '0') > MAX_FORM_BYTES) return page('Quo webhook', 'Too large.', 413);
  let presented = '';
  try {
    const value = (await request.formData()).get('key');
    presented = typeof value === 'string' ? value.trim() : '';
  } catch {
    return page('Quo webhook', 'That form could not be read.', 400);
  }
  const check = await checkAdminKey(env, request, presented, Date.now());
  if (check === 'not_configured') return page('Quo webhook', 'D1 or the admin key is missing.', 503);
  if (check === 'locked') return page('Quo webhook', 'Too many wrong keys from this network. Try again in an hour.', 429);
  if (check === 'bad_key') return page('Quo webhook', 'That admin key is not right.', 403);
  const quo = quoKey(env);
  const admin = adminKey(env);
  const db = env.EYS_AI_DB;
  if (!quo || !admin || !db) return page('Quo webhook', 'QUO_API_KEY is not set in Cloudflare yet.', 503);
  await ensureDeskSchema(db);

  const headers = { Authorization: quo, 'Quo-Api-Version': QUO_API_VERSION, 'Content-Type': 'application/json', Accept: 'application/json' };
  const saved = await kvGet<{ id?: string }>(db, 'quo_webhook');
  try {
    const listed = await fetch(`${QUO_API}/webhooks`, { headers });
    if (listed.ok) {
      const existing = ((await listed.json()) as { data?: QuoWebhook[] }).data ?? [];
      const ours = existing.find((w) => w.url === QUO_WEBHOOK_URL);
      if (ours) {
        if (saved?.id === ours.id) return page('Quo webhook', `Already registered (${escapeHtml(String(ours.id))}, ${escapeHtml(ours.status ?? 'enabled')}).`, 200);
        if (ours.key) {
          await kvSet(db, 'quo_webhook', { id: ours.id, key: await encryptSecret(admin, ours.key), events: ours.events }, Date.now());
          return page('Quo webhook', `Found the existing webhook (${escapeHtml(String(ours.id))}) and saved its signing key.`, 200);
        }
        return page('Quo webhook', `A webhook for this URL already exists in Quo (${escapeHtml(String(ours.id))}) but its signing key is not readable. Copy its signing secret from Quo into the Cloudflare secret QUO_WEBHOOK_SECRET.`, 409);
      }
    }
    const created = await fetch(`${QUO_API}/webhooks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: QUO_WEBHOOK_URL,
        events: ['call.completed'],
        resourceIds: [EYS_PHONE_NUMBER_ID],
        label: 'EYS hang-up text (eyshandyman.com)',
        status: 'enabled',
      }),
    });
    const body = ((await created.json().catch(() => ({}))) as { data?: QuoWebhook; title?: string }) ?? {};
    if (!created.ok || !body.data?.key) {
      return page('Quo webhook', `Quo did not create it (${created.status} ${escapeHtml(body.title ?? '')}). Nothing was saved.`, 502);
    }
    await kvSet(db, 'quo_webhook', { id: body.data.id, key: await encryptSecret(admin, body.data.key), events: body.data.events }, Date.now());
    return page('Quo webhook', `Registered (${escapeHtml(String(body.data.id))}): call.completed on (346) 820-1629 to ${escapeHtml(QUO_WEBHOOK_URL)}. The signing key is saved.`, 200);
  } catch {
    return page('Quo webhook', 'Quo did not answer. Nothing was saved.', 502);
  }
};
