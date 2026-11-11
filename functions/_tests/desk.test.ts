/**
 * Essa's Quote Desk, read side: PIN login and lockout, sessions, the
 * missing-scope state, schema pruning and the list rules.
 */
import assert from 'node:assert/strict';
import { onRequest as login } from '../api/desk/login.ts';
import { onRequest as session } from '../api/desk/session.ts';
import { onRequest as quotes } from '../api/desk/quotes.ts';
import { onRequest as quote } from '../api/desk/quote.ts';
import { MAX_PIN_FAILURES, PIN_WINDOW, parsePins, verifySession, issueSession } from '../_lib/desk-auth.ts';
import { prune, type DeskSchema } from '../_lib/desk-schema.ts';
import { pickStatusBranch } from '../_lib/desk-jobber.ts';
import { buildList, isExcludedClient, shortClientName } from '../_lib/desk-view.ts';
import type { DeskQuoteRow } from '../_lib/desk-db.ts';
import { check } from './helpers.ts';
import { deskHarness, jwt, withFetch } from './desk-helpers.ts';

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

await check('DESK_PINS parsing: name:pin pairs, malformed pieces skipped', () => {
  assert.deepEqual(parsePins(' Essa:4826 , Aimen:7391,bad,Nopin:, :1234,Short:12'), [
    { name: 'Essa', pin: '4826' },
    { name: 'Aimen', pin: '7391' },
  ]);
  assert.deepEqual(parsePins(undefined), []);
});

await check('login: right PIN gets a 90-day HttpOnly Secure SameSite=Lax cookie and is logged', async () => {
  const h = await deskHarness();
  const response = await h.call(login, '/api/desk/login', json({ pin: '4826' }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).name, 'Essa');
  const cookie = response.headers.get('Set-Cookie') ?? '';
  assert.match(cookie, /^eys_desk=[^;]+; Path=\/api\/desk\/; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax$/);
  const me = await h.call(session, '/api/desk/session', { cookie: cookie.split(';')[0] });
  assert.deepEqual(await me.json(), { configured: true, signedIn: true, name: 'Essa' });
  const events = h.db.raw.prepare("SELECT actor, action FROM desk_events WHERE action = 'login'").all();
  assert.deepEqual(events.map((e) => ({ ...e })), [{ actor: 'Essa', action: 'login' }]);
});

await check('PIN lockout: five wrong tries per 15 minutes per IP, then even the right PIN waits', async () => {
  const h = await deskHarness();
  for (let i = 1; i < MAX_PIN_FAILURES; i++) {
    const wrong = await h.call(login, '/api/desk/login', json({ pin: '0000' }));
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).triesLeft, MAX_PIN_FAILURES - i);
  }
  assert.equal((await h.call(login, '/api/desk/login', json({ pin: '1111' }))).status, 429, 'fifth wrong try locks');
  assert.equal((await h.call(login, '/api/desk/login', json({ pin: '4826' }))).status, 429, 'locked even for the right PIN');
  assert.equal(
    (await h.call(login, '/api/desk/login', { ...json({ pin: '4826' }), ip: '198.51.100.30' })).status,
    200,
    'another IP is not locked',
  );
  // The window is fixed-length: a new window starts clean.
  const realNow = Date.now;
  Date.now = () => realNow() + PIN_WINDOW + 1000;
  try {
    assert.equal((await h.call(login, '/api/desk/login', json({ pin: '4826' }))).status, 200);
  } finally {
    Date.now = realNow;
  }
});

await check('login refuses cross-site posts and non-JSON bodies', async () => {
  const h = await deskHarness();
  assert.equal((await h.call(login, '/api/desk/login', { ...json({ pin: '4826' }), headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await h.call(login, '/api/desk/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'pin=4826' })).status, 415);
});

await check('sessions: tampering, expiry and a changed PIN all sign the phone out', async () => {
  const h = await deskHarness();
  const token = (await issueSession(h.env, { name: 'Essa', pin: '4826' }, Date.now())) as string;
  assert.equal(await verifySession(h.env, token, Date.now()), 'Essa');
  const [body, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ n: 'Aimen', f: 'x', e: Date.now() + 1e9 })).toString('base64url');
  assert.equal(await verifySession(h.env, `${forged}.${sig}`, Date.now()), null, 'payload swap fails the signature');
  assert.equal(await verifySession(h.env, `${body}.AAAA`, Date.now()), null);
  assert.equal(await verifySession(h.env, token, Date.now() + 91 * 86_400_000), null, 'expired after 90 days');
  assert.equal(await verifySession({ ...h.env, DESK_PINS: 'Essa:9999,Aimen:7391' }, token, Date.now()), null, 'PIN changed');
  assert.equal(await verifySession({ ...h.env, DESK_PINS: 'Aimen:7391' }, token, Date.now()), null, 'removed');
  assert.equal((await h.call(quotes, '/api/desk/quotes')).status, 401, 'no cookie, no data');
});

await check('missing quotes scope: the desk says "needs reconnecting", never errors', async () => {
  const h = await deskHarness();
  h.jobber.quotesScope = false;
  const cookie = await h.cookie();
  const response = await withFetch(h.jobber.fetch, () => h.call(quotes, '/api/desk/quotes', { cookie }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.access, 'needs_reconnect');
  assert.equal(body.list, null);
  const one = await withFetch(h.jobber.fetch, () => h.call(quote, '/api/desk/quote?id=q-1', { cookie }));
  assert.equal((await one.json()).access, 'needs_reconnect');
});

await check('missing quotes scope from the token itself: no Jobber call needed', async () => {
  const h = await deskHarness({}, jwt({ scope: 'read_clients write_clients read_requests write_requests', exp: 4102444800 }));
  const cookie = await h.cookie();
  const body = await (await withFetch(h.jobber.fetch, () => h.call(quotes, '/api/desk/quotes', { cookie }))).json();
  assert.equal(body.access, 'needs_reconnect');
  assert.deepEqual(h.jobber.operations, []);
});

await check('scope added later: a schema cached without quotes is looked at again', async () => {
  const h = await deskHarness();
  h.jobber.quotesScope = false;
  const cookie = await h.cookie();
  await withFetch(h.jobber.fetch, () => h.call(quotes, '/api/desk/quotes', { cookie }));
  h.jobber.quotesScope = true;
  h.jobber.addQuote({ id: 'q-1' });
  const body = await (await withFetch(h.jobber.fetch, () => h.call(quotes, '/api/desk/quotes', { cookie }))).json();
  assert.equal(body.access, 'ok');
  assert.equal(body.list.drafts.length, 1);
});

await check('list: drafts newest first, XXX template excluded, older than 30 days folded', async () => {
  const h = await deskHarness();
  const day = 86_400_000;
  const iso = (ago: number) => new Date(Date.now() - ago).toISOString();
  h.jobber.addQuote({ id: 'q-new', createdAt: iso(1 * day) });
  h.jobber.addQuote({ id: 'q-mid', createdAt: iso(5 * day) });
  h.jobber.addQuote({ id: 'q-old', createdAt: iso(45 * day) });
  h.jobber.addQuote({ id: 'q-sent', createdAt: iso(2 * day), quoteStatus: 'awaiting_response' });
  h.jobber.addQuote({
    id: 'q-200',
    quoteNumber: '200',
    createdAt: iso(3 * day),
    client: { id: 'c-x', firstName: 'XXX', lastName: 'XXX', name: 'XXX XXX', phones: [] },
  });
  const cookie = await h.cookie();
  const body = await (await withFetch(h.jobber.fetch, () => h.call(quotes, '/api/desk/quotes', { cookie }))).json();
  assert.equal(body.access, 'ok');
  assert.deepEqual(body.list.drafts.map((q: { id: string }) => q.id), ['q-new', 'q-mid']);
  assert.deepEqual(body.list.older.map((q: { id: string }) => q.id), ['q-old']);
  assert.equal(body.list.drafts[0].client, 'Jennifer L.');
  assert.equal(body.list.drafts[0].total, 412);
  assert.equal(body.list.drafts[0].ageDays, 1);
  assert.equal(body.branch.kind, 'mutation', 'footer shows the schema-allowed branch');
});

await check('quote screen: request answers, photos, the quote as the client sees it, private note, history', async () => {
  const h = await deskHarness();
  h.jobber.addQuote({ id: 'q-1' });
  h.jobber.requests.set('request-1', {
    id: 'request-1',
    title: 'TV Mounting',
    requestDetails: {
      form: {
        sections: {
          nodes: [{ label: 'Job', items: { nodes: [{ __typename: 'FormTextInput', label: 'TV size', textAnswer: '65 inch' }, { __typename: 'FormTextInput', label: 'Empty', textAnswer: null }] } }],
        },
      },
    },
    noteAttachments: { nodes: [{ url: 'https://files.example/wall.jpg', thumbnailUrl: 'https://files.example/wall-t.jpg', fileName: 'wall.jpg', contentType: 'image/jpeg' }] },
    notes: { nodes: [] },
  });
  const cookie = await h.cookie();
  const body = await (await withFetch(h.jobber.fetch, () => h.call(quote, '/api/desk/quote?id=q-1', { cookie }))).json();
  const q = body.quote;
  assert.equal(q.client.first, 'Jennifer');
  assert.equal(q.client.city, 'Katy');
  assert.equal(q.client.phone, '+12815550142');
  assert.deepEqual(q.request.answers, [{ section: 'Job', label: 'TV size', answer: '65 inch' }]);
  assert.equal(q.request.photos[0].image, true);
  assert.deepEqual(q.lines.map((l: { name: string }) => l.name), ['TV mounting', 'Card Fee']);
  assert.equal(q.amounts.total, 412);
  assert.deepEqual(q.privateNote, ['Margin note: 2 hrs labor']);
  assert.ok(q.jobberWebUri.startsWith('https://'));
  assert.ok(Array.isArray(q.history), 'history still loads when the jobs scope is missing');
});

await check('schema pruning: fields, fragments and arguments the schema lacks are dropped', () => {
  const schema: Pick<DeskSchema, 'types'> = {
    types: {
      Quote: {
        kind: 'OBJECT',
        fields: {
          id: { type: 'EncodedId', kind: 'SCALAR', args: {} },
          title: { type: 'String', kind: 'SCALAR', args: {} },
          client: { type: 'Client', kind: 'OBJECT', args: {} },
          lineItems: { type: 'Conn', kind: 'OBJECT', args: { first: 'Int' } },
        },
        possible: [],
        enumValues: [],
      },
      Client: { kind: 'OBJECT', fields: { name: { type: 'String', kind: 'SCALAR', args: {} } }, possible: [], enumValues: [] },
      Conn: { kind: 'OBJECT', fields: { nodes: { type: 'Line', kind: 'OBJECT', args: {} } }, possible: [], enumValues: [] },
      Line: { kind: 'OBJECT', fields: { name: { type: 'String', kind: 'SCALAR', args: {} } }, possible: [], enumValues: [] },
    },
  };
  const text = prune(schema, 'Quote', {
    id: true,
    title: true,
    clientHubUri: true,
    client: { sel: { name: true, phones: { sel: { number: true } } } },
    lineItems: { args: { first: '50', filter: '{}' }, sel: { nodes: { sel: { name: true, cost: true } } } },
    property: { sel: { address: { sel: { city: true } } } },
    '...QuoteNote': { sel: { message: true } },
    client2: true,
  });
  assert.equal(text, 'id title client { name } lineItems(first: 50) { nodes { name } }');
});

await check('status branch: the no-message mutation when visible, else manual; send mutations never', () => {
  const field = (args: Record<string, string>, type: string) => ({ type, kind: 'OBJECT', args });
  const base: DeskSchema = { fetchedAt: 0, queries: {}, mutations: {}, types: { P: { kind: 'OBJECT', fields: { userErrors: { type: 'E', kind: 'OBJECT', args: {} } }, possible: [], enumValues: [] } } };
  const withMark = { ...base, mutations: { quotesMarkAwaitingResponse: field({ quoteIds: '[EncodedId!]!' }, 'P'), workObjectSendSms: field({ input: 'X!' }, 'P') } };
  const picked = pickStatusBranch(withMark);
  assert.equal(picked.kind, 'mutation');
  assert.equal(picked.kind === 'mutation' && picked.mutation, 'quotesMarkAwaitingResponse');
  const onlySend = { ...base, mutations: { workObjectSendSms: field({ input: 'X!' }, 'P'), quoteSend: field({ id: 'ID!' }, 'P') } };
  const manual = pickStatusBranch(onlySend);
  assert.equal(manual.kind, 'manual');
  assert.ok(manual.kind === 'manual' && manual.messagingOnly.includes('workObjectSendSms'));
  assert.equal(pickStatusBranch(base).kind, 'manual');
});

await check('list helpers: names, XXX, hidden and approved quotes', () => {
  assert.equal(shortClientName({ firstName: 'mary ann', lastName: 'smith' }), 'Mary Ann S.');
  assert.equal(shortClientName({ firstName: '', lastName: '', companyName: 'Acme Rentals' }), 'Acme Rentals');
  assert.ok(isExcludedClient({ name: 'XXX' }));
  assert.ok(!isExcludedClient({ name: 'Rex Xu' }));
  const now = Date.now();
  const raw = (id: string) => ({ id, createdAt: new Date(now).toISOString(), client: { firstName: 'A', lastName: 'B' } });
  const row = (id: string, state: DeskQuoteRow['state']) => ({ quote_id: id, state, hidden_by: 'Essa', hidden_at: now }) as DeskQuoteRow;
  const list = buildList([raw('a'), raw('b'), raw('c')], [row('b', 'hidden'), row('c', 'approved')], now);
  assert.deepEqual(list.drafts.map((q) => q.id), ['a']);
  assert.deepEqual(list.hidden.map((q) => q.id), ['b']);
});
