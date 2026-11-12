/**
 * Essa's Quote Desk, write side: approve → status move → one text, the Jobber
 * webhook, retries, and the exact customer text.
 */
import assert from 'node:assert/strict';
import type { Env, PagesContext } from '../_lib/types.ts';
import { onRequest as action } from '../api/desk/action.ts';
import { onRequest as webhook } from '../api/jobber/webhook.ts';
import { onRequest as quoteRoute } from '../api/desk/quote.ts';
import { jobberWebhookSignature, verifyJobberWebhook } from '../_lib/jobber-webhook.ts';
import { quoteTextMessage, titlePhrase } from '../_lib/quote-text.ts';
import { deskQuote } from '../_lib/desk-db.ts';
import { AUTO_SEND_WINDOW } from '../_lib/desk-flow.ts';
import { check } from './helpers.ts';
import { BASE, deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

const SECRET = 'client-secret';

interface FakeQuo {
  posts: { to: string[]; content: string; from: string }[];
  sent: { id: string; to: string[]; text: string; createdAt: string; direction: string; status: string }[];
  /** 'ok' | 'opted_out' | 'network_after_send' | 'server_error' */
  mode: string;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

function fakeQuo(): FakeQuo {
  const quo: FakeQuo = {
    posts: [],
    sent: [],
    mode: 'ok',
    fetch: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://api.quo.com');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'quo-test-key', 'bare key, no Bearer');
      assert.equal(headers.get('Quo-Api-Version'), '2026-03-30');
      if (url.pathname === '/messages' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { to: string[]; content: string; from: string };
        quo.posts.push(body);
        if (quo.mode === 'opted_out') return Response.json({ title: 'User Opted Out', message: 'User has opted out of receiving messages' }, { status: 400 });
        if (quo.mode === 'server_error') return Response.json({ title: 'Internal' }, { status: 500 });
        const id = `AC${quo.posts.length}`;
        quo.sent.push({ id, to: body.to, text: body.content, createdAt: new Date().toISOString(), direction: 'outgoing', status: 'queued' });
        if (quo.mode === 'network_after_send') throw new TypeError('network connection lost');
        return Response.json({ data: { id, status: 'queued' } }, { status: 202 });
      }
      if (url.pathname === '/messages') {
        const to = url.searchParams.get('to');
        return Response.json({ data: quo.sent.filter((m) => !to || m.to.includes(to)), nextCursor: null });
      }
      return Response.json({ title: 'Not found' }, { status: 404 });
    },
  };
  return quo;
}

async function setup(env: Partial<Env> = {}) {
  const h = await deskHarness({ QUOTE_SEND_ENABLED: 'true', QUO_API_KEY: 'quo-test-key', ...env });
  const quo = fakeQuo();
  const cookie = await h.cookie();
  const route = (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith('https://api.quo.com') ? quo.fetch(input, init) : h.jobber.fetch(input, init);
  return { h, quo, cookie, route };
}

function post(h: DeskHarness, cookie: string, body: unknown) {
  return h.call(action, '/api/desk/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cookie,
  });
}

/** A webhook delivery, its background work awaited. */
async function deliver(h: DeskHarness, topic: string, itemId: string, occurredAt: string, signature?: string): Promise<Response> {
  const raw = JSON.stringify({ data: { webHookEvent: { topic, appId: 'app', accountId: 'acct', itemId, occurredAt } } });
  const background: Promise<unknown>[] = [];
  const request = new Request(`${BASE}/api/jobber/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Jobber-Hmac-SHA256': signature ?? (await jobberWebhookSignature(SECRET, raw)) },
    body: raw,
  });
  const context: PagesContext<Env> = {
    request,
    env: h.env,
    params: {},
    data: {},
    waitUntil: (p) => background.push(p),
    next: async () => new Response(null, { status: 404 }),
  };
  const response = await webhook(context);
  await Promise.all(background);
  return response;
}

// ---------------------------------------------------------------------------

await check('the text, exactly: name, lower-case title with acronyms kept, the link, one question line', () => {
  assert.equal(
    quoteTextMessage('jennifer', 'TV Mounting', 'AbCdEfGh'),
    "Hi Jennifer, it's Essa with EYS Handyman. Your quote for the TV mounting is ready https://www.eyshandyman.com/q/AbCdEfGh\nAny questions just text me here.",
  );
  assert.equal(titlePhrase('High Ceiling Curtain Installation'), 'high ceiling curtain installation');
  assert.equal(titlePhrase('LED Lighting + HVAC Vent Cover'), 'LED lighting + HVAC vent cover');
  assert.equal(titlePhrase('The Kitchen Backsplash Quote'), 'kitchen backsplash');
  assert.equal(titlePhrase('Fence repair — back yard'), 'fence repair back yard', 'em dash never reaches a customer');
});

await check('generic or empty title: "Your quote is ready"', () => {
  for (const title of ['Project Quote', 'Quote', 'quote', 'Estimate', 'New Quote', 'Quote #212', '', '   ', null]) {
    assert.equal(
      quoteTextMessage('Marcus', title, 'AbCdEfGh'),
      "Hi Marcus, it's Essa with EYS Handyman. Your quote is ready https://www.eyshandyman.com/q/AbCdEfGh\nAny questions just text me here.",
      String(title),
    );
  }
  const text = quoteTextMessage('', 'TV Mounting \u{1F4FA}', 'AbCdEfGh');
  assert.ok(text.startsWith("Hi, it's Essa with EYS Handyman. Your quote for the TV mounting is ready"));
  assert.ok(!/[–—]|STOP|\p{Extended_Pictographic}|718/u.test(text));
});

await check('HMAC: X-Jobber-Hmac-SHA256 is the base64 HMAC of the raw body with the client secret', async () => {
  const body = '{"data":{"webHookEvent":{"topic":"APP_CONNECT","appId":"id","accountId":"id","itemId":"id","occurredAt":"ISO8601DateTime"}}}';
  const sig = await jobberWebhookSignature('MY_SECRET', body);
  assert.match(sig, /^[A-Za-z0-9+/]{43}=$/);
  assert.ok(await verifyJobberWebhook('MY_SECRET', sig, body));
  assert.equal(await verifyJobberWebhook('MY_SECRET', sig, body.replace('APP_CONNECT', 'APP_DISCONNECT')), false, 'body tampered');
  assert.equal(await verifyJobberWebhook('OTHER', sig, body), false, 'wrong secret');
  assert.equal(await verifyJobberWebhook('MY_SECRET', null, body), false, 'unsigned');
  assert.equal(await verifyJobberWebhook(null, sig, body), false, 'no secret configured');
  const { h } = await setup();
  assert.equal((await deliver(h, 'QUOTE_UPDATE', 'q-1', '2026-11-11T18:00:00Z', 'bm9wZQ==')).status, 401);
});

await check('approve: approval recorded, quote moved with the no-message mutation, one text with the /q/ link', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-1', title: 'TV Mounting' });
  await withFetch(route, async () => {
    const view = await (await h.call(quoteRoute, '/api/desk/quote?id=q-1', { cookie })).json();
    assert.equal(view.actions.approve, true);
    assert.equal(view.preview.last4, '0142');
    const response = await post(h, cookie, { id: 'q-1', action: 'approve' });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.desk.state, 'approved');
    assert.equal(body.desk.approved_by, 'Essa');
    assert.equal(body.desk.move_branch, 'quotesMarkAwaitingResponse');
    assert.equal(body.desk.text_state, 'sent');
    assert.equal(quo.posts.length, 1);
    assert.equal(quo.posts[0].from, 'PNeiWaFK2n');
    assert.deepEqual(quo.posts[0].to, ['+12815550142']);
    assert.equal(quo.posts[0].content, view.preview.text, 'the confirm sheet showed the exact text');
    const code = /\/q\/(\w{8})/.exec(quo.posts[0].content)?.[1];
    const link = h.db.raw.prepare('SELECT * FROM q_links WHERE code = ?').get(code ?? '') as { quote_id: string; hub_url: string; first_name: string };
    assert.equal(link.quote_id, 'q-1');
    assert.ok(link.hub_url.includes('getjobber.com'));
    assert.deepEqual(h.jobber.mutationCalls.map((c) => c.name), ['quotesMarkAwaitingResponse']);
    // A second tap changes nothing and sends nothing.
    await post(h, cookie, { id: 'q-1', action: 'approve' });
    assert.equal(quo.posts.length, 1);
    const actors = h.db.raw.prepare('SELECT actor, action FROM desk_events WHERE quote_id = ? ORDER BY id').all('q-1').map((r) => `${(r as { actor: string }).actor}:${(r as { action: string }).action}`);
    assert.ok(actors.includes('Essa:approve') && actors.includes('Essa:text_sent'), actors.join(','));
  });
});

await check('two webhooks + the poll at the same moment = one text', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.visibleMutations.delete('quotesMarkAwaitingResponse'); // manual branch: Essa marks it in Jobber web
  h.jobber.addQuote({ id: 'q-2', title: 'Fence repair' });
  await withFetch(route, async () => {
    const approved = await (await post(h, cookie, { id: 'q-2', action: 'approve' })).json();
    assert.equal(approved.desk.move_state, 'manual');
    assert.equal(approved.desk.text_state, 'none', 'still draft in Jobber: nothing sent yet');
    assert.equal(approved.actions.manualStep, true);
    assert.equal(quo.posts.length, 0);
    h.jobber.quotes.get('q-2')!.quoteStatus = 'awaiting_response';
    await Promise.all([
      deliver(h, 'QUOTE_UPDATE', 'q-2', '2026-11-11T18:01:00Z'),
      deliver(h, 'QUOTE_SENT', 'q-2', '2026-11-11T18:01:00Z'),
      post(h, cookie, { id: 'q-2', action: 'poll' }),
      deliver(h, 'QUOTE_UPDATE', 'q-2', '2026-11-11T18:01:00Z'),
    ]);
    assert.equal(quo.posts.length, 1, 'exactly one text');
    assert.equal((await deskQuote(h.db, 'q-2'))?.text_state, 'sent');
    const dupes = h.db.raw.prepare("SELECT COUNT(*) AS n FROM webhook_deliveries WHERE source = 'jobber'").get() as { n: number };
    assert.equal(dupes.n, 2, 'the repeated delivery was recorded once');
    // Later deliveries and polls still send nothing.
    await deliver(h, 'QUOTE_UPDATE', 'q-2', '2026-11-11T18:05:00Z');
    await post(h, cookie, { id: 'q-2', action: 'poll' });
    await post(h, cookie, { id: 'q-2', action: 'retry' });
    assert.equal(quo.posts.length, 1);
  });
});

await check('no desk approval = no text, whatever moves the quote', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-3', quoteStatus: 'awaiting_response' });
  h.jobber.addQuote({ id: 'q-4' });
  await withFetch(route, async () => {
    await deliver(h, 'QUOTE_SENT', 'q-3', '2026-11-11T18:00:00Z');
    // Viewed on the desk (row exists, state open) but never approved.
    await h.call(quoteRoute, '/api/desk/quote?id=q-4', { cookie });
    h.jobber.quotes.get('q-4')!.quoteStatus = 'awaiting_response';
    await deliver(h, 'QUOTE_UPDATE', 'q-4', '2026-11-11T18:00:00Z');
    await post(h, cookie, { id: 'q-4', action: 'poll' });
  });
  assert.equal(quo.posts.length, 0);
  assert.equal(h.db.raw.prepare('SELECT COUNT(*) AS n FROM q_links').get()!.n, 0);
});

await check('missing quotes scope: approve is refused with the reconnect message, nothing written', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-5' });
  h.jobber.quotesScope = false;
  await withFetch(route, async () => {
    const response = await post(h, cookie, { id: 'q-5', action: 'approve' });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).message, 'Jobber needs reconnecting for quotes');
  });
  assert.equal(quo.posts.length, 0);
  assert.deepEqual(h.jobber.mutationCalls, []);
  assert.equal((await deskQuote(h.db, 'q-5'))?.state ?? 'open', 'open');
});

await check('QUOTE_SEND_ENABLED off: everything works except the send, which says "Texting is off"', async () => {
  const { h, quo, cookie, route } = await setup({ QUOTE_SEND_ENABLED: undefined });
  h.jobber.addQuote({ id: 'q-6' });
  await withFetch(route, async () => {
    const body = await (await post(h, cookie, { id: 'q-6', action: 'approve' })).json();
    assert.equal(body.desk.state, 'approved');
    assert.equal(body.desk.move_state, 'done');
    assert.equal(body.desk.text_state, 'none');
    assert.equal(body.desk.text_error, 'Texting is off');
  });
  assert.equal(quo.posts.length, 0);
  assert.equal(h.jobber.quotes.get('q-6')!.quoteStatus, 'awaiting_response');
});

await check('unknown outcome: Retry checks Quo first and never sends twice', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-7' });
  quo.mode = 'network_after_send';
  await withFetch(route, async () => {
    const first = await (await post(h, cookie, { id: 'q-7', action: 'approve' })).json();
    assert.equal(first.desk.text_state, 'unknown');
    assert.equal(first.actions.retry, true);
    quo.mode = 'ok';
    const retried = await (await post(h, cookie, { id: 'q-7', action: 'retry' })).json();
    assert.equal(retried.desk.text_state, 'sent');
    assert.equal(retried.desk.text_message_id, 'AC1');
  });
  assert.equal(quo.posts.length, 1, 'the retry found the first text instead of sending another');
});

await check('a definite failure (opted out) can be retried, and only then', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-8' });
  quo.mode = 'opted_out';
  await withFetch(route, async () => {
    const first = await (await post(h, cookie, { id: 'q-8', action: 'approve' })).json();
    assert.equal(first.desk.text_state, 'failed');
    assert.equal(first.desk.text_error, 'Customer has opted out of texts');
    await post(h, cookie, { id: 'q-8', action: 'poll' });
    await deliver(h, 'QUOTE_UPDATE', 'q-8', '2026-11-11T18:02:00Z');
    assert.equal(quo.posts.length, 1, 'polls and webhooks never retry on their own');
    quo.mode = 'ok';
    const retried = await (await post(h, cookie, { id: 'q-8', action: 'retry' })).json();
    assert.equal(retried.desk.text_state, 'sent');
  });
  assert.equal(quo.posts.length, 2);
});

await check('approved over a day ago: no text on its own, Retry sends it', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.visibleMutations.delete('quotesMarkAwaitingResponse');
  h.jobber.addQuote({ id: 'q-9' });
  await withFetch(route, async () => {
    await post(h, cookie, { id: 'q-9', action: 'approve' });
    h.db.raw.prepare('UPDATE desk_quotes SET approved_at = approved_at - ? WHERE quote_id = ?').run(AUTO_SEND_WINDOW + 60_000, 'q-9');
    h.jobber.quotes.get('q-9')!.quoteStatus = 'awaiting_response';
    await deliver(h, 'QUOTE_UPDATE', 'q-9', '2026-11-12T18:00:00Z');
    assert.equal(quo.posts.length, 0);
    assert.equal((await deskQuote(h.db, 'q-9'))?.text_error, 'Tap Retry text to send it now');
    await post(h, cookie, { id: 'q-9', action: 'retry' });
  });
  assert.equal(quo.posts.length, 1);
});

await check('Needs a change: saved in D1, added to Jobber notes, status untouched', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-10' });
  await withFetch(route, async () => {
    const response = await post(h, cookie, { id: 'q-10', action: 'change', note: 'Add a second TV in the bedroom' });
    assert.equal(response.status, 200);
  });
  const change = h.db.raw.prepare('SELECT actor, note, jobber_note FROM desk_changes WHERE quote_id = ?').get('q-10') as Record<string, string>;
  assert.deepEqual({ ...change }, { actor: 'Essa', note: 'Add a second TV in the bedroom', jobber_note: 'added' });
  assert.equal(h.jobber.notesAdded.length, 1);
  assert.match(h.jobber.notesAdded[0].message, /^Needs a change \(Essa, .+, Quote Desk\): Add a second TV in the bedroom$/);
  assert.equal(h.jobber.quotes.get('q-10')!.quoteStatus, 'draft');
  assert.deepEqual(h.jobber.mutationCalls.map((c) => c.name), ['quoteCreateNote']);
  assert.equal(quo.posts.length, 0);
});

await check('Not sending hides a draft, Bring back restores it; a hidden quote cannot be approved', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-11' });
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-11', action: 'hide' })).status, 200);
    assert.equal((await deskQuote(h.db, 'q-11'))?.state, 'hidden');
    const view = await (await h.call(quoteRoute, '/api/desk/quote?id=q-11', { cookie })).json();
    assert.equal(view.actions.approve, false);
    assert.equal(view.actions.unhide, true);
    assert.equal((await post(h, cookie, { id: 'q-11', action: 'unhide' })).status, 200);
    assert.equal((await deskQuote(h.db, 'q-11'))?.state, 'open');
  });
  assert.equal(quo.posts.length, 0);
});

await check('actions need a same-origin JSON post from a signed-in phone', async () => {
  const { h, cookie } = await setup();
  const bad = await h.call(action, '/api/desk/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ id: 'q-1', action: 'approve' }),
    cookie,
  });
  assert.equal(bad.status, 403);
  const anon = await h.call(action, '/api/desk/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'q-1', action: 'approve' }) });
  assert.equal(anon.status, 401);
  assert.equal((await post(h, cookie, { id: 'q-1', action: 'delete' })).status, 400);
});

await check("Mark Awaiting Response, don't text: status moved, pinned 'not sent yet' note, no text ever on its own", async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-12', title: 'Drywall patch' });
  await withFetch(route, async () => {
    const view = await (await h.call(quoteRoute, '/api/desk/quote?id=q-12', { cookie })).json();
    assert.equal(view.actions.mark, true);
    const body = await (await post(h, cookie, { id: 'q-12', action: 'mark' })).json();
    assert.equal(body.desk.state, 'marked');
    assert.equal(body.desk.approved_by, null, 'no desk approval');
    assert.equal(body.desk.move_state, 'done');
    assert.equal(h.jobber.quotes.get('q-12')!.quoteStatus, 'awaiting_response');
    assert.equal(h.jobber.notesAdded.length, 1);
    assert.match(h.jobber.notesAdded[0].message, /^Quote not sent yet\. Set to Awaiting Response from the Quote Desk \(Essa, .+\)\. The customer has not been texted or emailed\.$/);
    assert.equal(h.jobber.notesAdded[0].pinned, true);
    // Webhooks and polls never text a marked quote.
    await deliver(h, 'QUOTE_UPDATE', 'q-12', '2026-11-11T19:00:00Z');
    await post(h, cookie, { id: 'q-12', action: 'poll' });
    assert.equal(quo.posts.length, 0);
    // It shows on the desk, and "Send to Jennifer now" texts it once, with a follow-up note.
    const later = await (await h.call(quoteRoute, '/api/desk/quote?id=q-12', { cookie })).json();
    assert.equal(later.actions.approve, true);
    assert.equal(later.actions.mark, false);
    assert.ok(later.preview.text.includes('Your quote for the drywall patch is ready'));
    const sent = await (await post(h, cookie, { id: 'q-12', action: 'approve' })).json();
    assert.equal(sent.desk.text_state, 'sent');
  });
  assert.equal(quo.posts.length, 1);
  assert.deepEqual(h.jobber.notesAdded.map((n) => n.message.split('.')[0]), ['Quote not sent yet', 'Quote texted to the customer from the Quote Desk (' + h.jobber.notesAdded[1].message.split('(')[1].split('.')[0]]);
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quotesMarkAwaitingResponse').length, 1, 'moved once');
});

await check("texting off: the approved quote gets one pinned 'not sent yet' note with the reason", async () => {
  const { h, quo, cookie, route } = await setup({ QUOTE_SEND_ENABLED: undefined });
  h.jobber.addQuote({ id: 'q-13' });
  await withFetch(route, async () => {
    await post(h, cookie, { id: 'q-13', action: 'approve' });
    await post(h, cookie, { id: 'q-13', action: 'poll' });
    await deliver(h, 'QUOTE_UPDATE', 'q-13', '2026-11-11T19:05:00Z');
  });
  assert.equal(quo.posts.length, 0);
  assert.equal(h.jobber.notesAdded.length, 1, 'once, however many checks follow');
  assert.ok(h.jobber.notesAdded[0].message.endsWith('has not been texted or emailed (Texting is off).'));
  assert.equal(h.jobber.notesAdded[0].pinned, true);
});

await check('edit a line: only the changed fields go to Jobber, with a note saying who changed what', async () => {
  const { h, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-e1' });
  await withFetch(route, async () => {
    const response = await post(h, cookie, { id: 'q-e1', action: 'edit', lines: [{ id: 'line-1-1', description: 'Mount a 75 inch TV on drywall, wires hidden', unitPrice: '$450' }] });
    assert.equal(response.status, 200);
  });
  const call = h.jobber.mutationCalls.find((c) => c.name === 'quoteEditLineItems');
  assert.deepEqual(call?.variables.lines, [{ lineItemId: 'line-1-1', description: 'Mount a 75 inch TV on drywall, wires hidden', unitPrice: 450, totalPrice: 450 }]);
  const line = h.jobber.quotes.get('q-e1')!.lineItems.nodes[0];
  assert.equal(line.unitPrice, 450);
  assert.match(h.jobber.notesAdded[0].message, /^Edited on the Quote Desk \(Essa, .+\): TV mounting: \$400\.00 to \$450\.00, description changed\.$/);
  const events = h.db.raw.prepare("SELECT action FROM desk_events WHERE quote_id = 'q-e1'").all() as { action: string }[];
  assert.ok(events.some((e) => e.action === 'edit'));
});

await check('edit a line: nothing changed means no Jobber write', async () => {
  const { h, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-e2' });
  await withFetch(route, () => post(h, cookie, { id: 'q-e2', action: 'edit', lines: [{ id: 'line-1-1', description: 'Mount a 65 inch TV on drywall', unitPrice: 400 }] }));
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEditLineItems').length, 0);
  assert.equal(h.jobber.notesAdded.length, 0);
});

await check('edit a line: refused for "licensed", HOA, a bad price, a sent quote or an approved one', async () => {
  const { h, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-e3' });
  h.jobber.addQuote({ id: 'q-e4', quoteStatus: 'awaiting_response' });
  const refusedWith = async (id: string, line: Record<string, unknown>) => {
    const response = await withFetch(route, () => post(h, cookie, { id, action: 'edit', lines: [line] }));
    assert.equal(response.status, 409);
    return (await response.json()).message as string;
  };
  assert.match(await refusedWith('q-e3', { id: 'line-1-1', description: 'Done by our licensed crew' }), /licensed/);
  assert.match(await refusedWith('q-e3', { id: 'line-1-1', description: 'Meets HOA rules' }), /HOA/);
  assert.match(await refusedWith('q-e3', { id: 'line-1-1', unitPrice: -5 }), /price/);
  assert.match(await refusedWith('q-e4', { id: 'line-2-1', unitPrice: 300 }), /Only a draft/);
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEditLineItems').length, 0);
});

await check('Archive: Jobber archives the draft, it leaves the desk list, an approved one stays', async () => {
  const { h, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-a1' });
  h.jobber.addQuote({ id: 'q-a2' });
  await withFetch(route, async () => {
    const response = await post(h, cookie, { id: 'q-a1', action: 'archive' });
    assert.equal(response.status, 200);
  });
  assert.deepEqual(h.jobber.mutationCalls.filter((c) => c.name === 'quoteArchive').map((c) => c.variables.id), ['q-a1']);
  assert.equal(h.jobber.quotes.get('q-a1')!.quoteStatus, 'archived');
  const row = await deskQuote(h.db as never, 'q-a1');
  assert.equal(row?.state, 'hidden');
  const events = h.db.raw.prepare("SELECT action, actor FROM desk_events WHERE quote_id = 'q-a1'").all() as { action: string; actor: string }[];
  assert.ok(events.some((e) => e.action === 'archive' && e.actor === 'Essa'));
  await withFetch(route, () => post(h, cookie, { id: 'q-a2', action: 'approve' }));
  const refused = await withFetch(route, () => post(h, cookie, { id: 'q-a2', action: 'archive' }));
  assert.equal(refused.status, 409);
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteArchive').length, 1);
});
