/**
 * POST /api/admin/jobber/quote-note: the quoting routine saves Eyad's internal
 * note on its draft through the site (Jobber's quoteCreateNote), so it no
 * longer needs Chrome signed in to Jobber for that (create_quote has no notes
 * field). Drafts only, idempotent, read back after writing.
 */
import assert from 'node:assert/strict';
import type { Env, PagesContext } from '../_lib/types.ts';
import { onRequest as quoteNote } from '../api/admin/jobber/quote-note.ts';
import { MAX_INTERNAL_NOTE } from '../_lib/quote-note.ts';
import { photosKey } from '../_lib/request-photos.ts';
import { ADMIN_KEY, check } from './helpers.ts';
import { deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

const QUOTE_ID = 'Z2lkOi8vSm9iYmVyL1F1b3RlLzEyMzQ1Njc=';
const NOTE =
  'SUMMARY\n- Nov 12, req 36109477, quote #273: hang 6 pieces on stone fireplace + shelves, $450 all-in, PROPOSED.\n' +
  '- WARNING: confirm the stone is real fieldstone (masonry anchors).\n\nLABOR\n- 3.5 man-hours x $65 = $227.50';

function post(h: DeskHarness, body: unknown, options: { key?: string; host?: string; method?: string } = {}): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.20' });
  if (options.key !== '') headers.set('Authorization', `Bearer ${options.key ?? ADMIN_KEY}`);
  const method = options.method ?? 'POST';
  const request = new Request(`https://${options.host ?? 'www.eyshandyman.com'}/api/admin/jobber/quote-note`, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const context: PagesContext<Env> = {
    request,
    env: h.env,
    params: {},
    data: {},
    waitUntil: () => {},
    next: async () => new Response('next', { status: 404 }),
  };
  return withFetch(h.jobber.fetch, async () => quoteNote(context));
}

function noteCalls(h: DeskHarness) {
  return h.jobber.mutationCalls.filter((c) => c.name === 'quoteCreateNote');
}

await check('quote note: the routine key saves the internal note on a draft and reads it back', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: QUOTE_ID, quoteNumber: '273' });
  const response = await post(h, { quoteId: QUOTE_ID, message: NOTE }, { key: await photosKey(ADMIN_KEY) });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'added');
  assert.equal(body.quote_number, '273');
  assert.equal(body.verified, true, 'the note was found on the quote afterwards');
  assert.deepEqual(noteCalls(h).map((c) => (c.variables.input as { message: string }).message), [NOTE]);
  assert.equal(noteCalls(h)[0].variables.id, QUOTE_ID);
  assert.deepEqual(
    h.jobber.mutationCalls.map((c) => c.name),
    ['quoteCreateNote'],
    'only the note: no status move, edit or send',
  );
});

await check('quote note: the same note again is already_added, even with different spacing, and nothing is written', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: QUOTE_ID });
  assert.equal((await (await post(h, { quoteId: QUOTE_ID, message: NOTE })).json()).status, 'added');
  const again = await post(h, { quoteId: QUOTE_ID, message: `  ${NOTE.replace(/\n/g, '\r\n')}\n\n` });
  assert.equal(again.status, 200);
  assert.equal((await again.json()).status, 'already_added');
  assert.equal(noteCalls(h).length, 1);
});

await check('quote note: drafts only; a sent quote is 409 not_draft and nothing is written', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: QUOTE_ID, quoteStatus: 'awaiting_response' });
  const response = await post(h, { quoteId: QUOTE_ID, message: NOTE });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'not_draft', quote_status: 'awaiting_response', written: false });
  assert.equal(noteCalls(h).length, 0);
});

await check('quote note: dryRun, and any host but www, answer without writing', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: QUOTE_ID, quoteNumber: '273' });
  const dry = await (await post(h, { quoteId: QUOTE_ID, message: NOTE, dryRun: true })).json();
  assert.deepEqual(dry, { status: 'dry_run', live: true, quote_id: QUOTE_ID, quote_number: '273', chars: NOTE.length });
  const preview = await (await post(h, { quoteId: QUOTE_ID, message: NOTE }, { host: 'abc123.eys.pages.dev' })).json();
  assert.equal(preview.status, 'dry_run');
  assert.equal(preview.live, false);
  assert.equal(noteCalls(h).length, 0);
});

await check('quote note: bad bodies are 400, GET is 405, a wrong key is 401, an unknown quote is 404', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: QUOTE_ID });
  const empty = await post(h, { quoteId: QUOTE_ID, message: '   ' });
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error, 'invalid_body');
  assert.equal((await post(h, { quoteId: 'bad id!', message: NOTE })).status, 400);
  assert.equal((await post(h, { quoteId: QUOTE_ID, message: 'x'.repeat(MAX_INTERNAL_NOTE + 1) })).status, 400);
  assert.equal((await post(h, { quoteId: QUOTE_ID, message: NOTE, dryRun: 'yes' })).status, 400);
  assert.equal((await post(h, {}, { method: 'GET' })).status, 405);
  assert.equal((await post(h, { quoteId: QUOTE_ID, message: NOTE }, { key: 'wrong' })).status, 401);
  const unknown = await post(h, { quoteId: 'Z2lkOi8vSm9iYmVyL1F1b3RlLzk5OTk5', message: NOTE });
  assert.equal(unknown.status, 404);
  assert.deepEqual(await unknown.json(), { error: 'quote_not_found', written: false });
  assert.equal(noteCalls(h).length, 0);
});

await check('quote note: Jobber refusing it is 422 jobber_rejected with its reason', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: QUOTE_ID });
  h.jobber.rejectNoteMessage = 'Message is too long';
  const response = await post(h, { quoteId: QUOTE_ID, message: NOTE });
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: 'jobber_rejected', written: false, user_errors: ['Message is too long'] });
});
