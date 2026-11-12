/**
 * GET /api/admin/jobber/request: the quoting routine reads a request's form
 * answers, notes and photos through the site, so it no longer needs Chrome
 * signed in to Jobber (the Jobber connector's get_request leaves the form
 * answers out). Same key as the photos route.
 */
import assert from 'node:assert/strict';
import { onRequest as readRequest } from '../api/admin/jobber/request.ts';
import { photosKey } from '../_lib/request-photos.ts';
import { ADMIN_KEY, check } from './helpers.ts';
import { deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

const REQUEST_ID = 'Z2lkOi8vSm9iYmVyL1JlcXVlc3QvMzYxMDk0Nzc=';

const SONA_NOTE =
  'Call Summary\nThe caller requested an estimate for hanging items on a stone fireplace.\n\n' +
  '📈 New customer intake\nFirst and last name \nJanney Chetta \n\nAddress \n2514 Avon Gates Court, Katy, TX 77494\n';

function seed(h: DeskHarness): void {
  h.jobber.requests.set(REQUEST_ID, {
    id: REQUEST_ID,
    title: 'Hanging artwork and items on stone fireplace and bookshelves',
    createdAt: '2026-11-12T17:04:30Z',
    jobberWebUri: 'https://secure.getjobber.com/work_requests/36109477',
    source: 'Quo ',
    requestDetails: {
      form: {
        sections: {
          nodes: [
            {
              label: 'Project details',
              items: {
                nodes: [
                  { __typename: 'FormTextInput', label: 'Work requested', textAnswer: 'Hang items on a stone fireplace, bookshelves, and artwork.' },
                  { __typename: 'FormTextInput', label: 'Photos', textAnswer: 'Photos: promised' },
                  { __typename: 'FormNumber', label: 'How many pieces', numberAnswer: 6 },
                  { __typename: 'FormTextInput', label: 'Left blank', textAnswer: null },
                ],
              },
            },
          ],
        },
      },
    },
    assessment: { instructions: 'Bring the masonry bits' },
    notes: {
      nodes: [
        { __typename: 'RequestNote', message: SONA_NOTE, createdAt: '2026-11-12T17:06:53Z', fileAttachments: { nodes: [] } },
        {
          __typename: 'RequestNote',
          message: 'Photos texted to Quo (346) 820-1629, Thu Nov 12, 1:15 pm CT',
          createdAt: '2026-11-12T19:20:00Z',
          fileAttachments: {
            nodes: [
              { url: 'https://files.example/fireplace.jpg', thumbnailUrl: 'https://files.example/fireplace-t.jpg', fileName: 'fireplace.jpg', contentType: 'image/jpeg' },
              { url: 'https://files.example/shelves.heic', thumbnailUrl: null, fileName: 'shelves.heic', contentType: 'application/octet-stream' },
            ],
          },
        },
      ],
    },
    noteAttachments: {
      nodes: [
        { url: 'https://files.example/fireplace.jpg', thumbnailUrl: 'https://files.example/fireplace-t.jpg', fileName: 'fireplace.jpg', contentType: 'image/jpeg' },
        { url: 'https://files.example/quote.pdf', thumbnailUrl: null, fileName: 'quote.pdf', contentType: 'application/pdf' },
      ],
    },
  });
}

function get(h: DeskHarness, path: string, key?: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (key !== undefined) headers.set('Authorization', `Bearer ${key}`);
  return withFetch(h.jobber.fetch, () => h.call(readRequest, path, { ...init, headers }));
}

await check('request read: the routine key returns the form answers, notes with times, photos and the web link', async () => {
  const h = await deskHarness();
  seed(h);
  const response = await get(h, `/api/admin/jobber/request?id=${encodeURIComponent(REQUEST_ID)}`, await photosKey(ADMIN_KEY));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.equal(body.status, 'ok');
  const r = body.request;
  assert.equal(r.id, REQUEST_ID);
  assert.equal(r.title, 'Hanging artwork and items on stone fireplace and bookshelves');
  assert.equal(r.createdAt, '2026-11-12T17:04:30Z');
  assert.equal(r.source, 'Quo');
  assert.equal(r.jobberWebUri, 'https://secure.getjobber.com/work_requests/36109477');
  assert.deepEqual(r.answers, [
    { section: 'Project details', label: 'Work requested', answer: 'Hang items on a stone fireplace, bookshelves, and artwork.' },
    { section: 'Project details', label: 'Photos', answer: 'Photos: promised' },
    { section: 'Project details', label: 'How many pieces', answer: '6' },
  ]);
  assert.equal(r.instructions, 'Bring the masonry bits');
  assert.deepEqual(
    r.notes.map((n: { createdAt: string; files: number }) => [n.createdAt, n.files]),
    [
      ['2026-11-12T17:06:53Z', 0],
      ['2026-11-12T19:20:00Z', 2],
    ],
  );
  assert.ok(r.notes[0].message.includes('Address \n2514 Avon Gates Court, Katy, TX 77494'), "Sona's intake note comes back whole");
  assert.deepEqual(
    r.photos.map((p: { fileName: string; image: boolean }) => [p.fileName, p.image]),
    [
      ['fireplace.jpg', true],
      ['quote.pdf', false],
      ['shelves.heic', true],
    ],
    'request files and note files, each once',
  );
  assert.deepEqual(h.jobber.mutationCalls, [], 'read only: nothing written to Jobber');
});

await check('request read: the admin key works too; no key or a wrong key is 401 and counts toward the lockout', async () => {
  const h = await deskHarness();
  seed(h);
  const path = `/api/admin/jobber/request?id=${encodeURIComponent(REQUEST_ID)}`;
  assert.equal((await get(h, path, ADMIN_KEY)).status, 200);
  const none = await get(h, path);
  assert.equal(none.status, 401);
  assert.equal(none.headers.get('WWW-Authenticate'), 'Bearer');
  for (let i = 0; i < 4; i++) assert.equal((await get(h, path, 'wrong-key')).status, 401);
  const locked = await get(h, path, ADMIN_KEY);
  assert.equal(locked.status, 429, 'five wrong keys in an hour lock the IP out, even with the right key');
  assert.deepEqual(await locked.json(), { error: 'too_many_attempts' });
});

await check('request read: GET only, a bad id is 400, an unknown request is 404', async () => {
  const h = await deskHarness();
  seed(h);
  const key = await photosKey(ADMIN_KEY);
  const post = await get(h, `/api/admin/jobber/request?id=${encodeURIComponent(REQUEST_ID)}`, key, { method: 'POST' });
  assert.equal(post.status, 405);
  const bad = await get(h, '/api/admin/jobber/request?id=36109477%3Cscript%3E', key);
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, 'invalid_id');
  const missing = await get(h, '/api/admin/jobber/request', key);
  assert.equal(missing.status, 400);
  const unknown = await get(h, `/api/admin/jobber/request?id=${encodeURIComponent('Z2lkOi8vSm9iYmVyL1JlcXVlc3QvOTk5OTk5')}`, key);
  assert.equal(unknown.status, 404);
  assert.deepEqual(await unknown.json(), { error: 'request_not_found' });
});

await check('request read: Jobber failing is 502 jobber_unavailable, with no Jobber detail leaked', async () => {
  const h = await deskHarness();
  seed(h);
  const key = await photosKey(ADMIN_KEY);
  const failing = async () => new Response('upstream exploded', { status: 500 });
  const response = await withFetch(failing, () =>
    h.call(readRequest, `/api/admin/jobber/request?id=${encodeURIComponent(REQUEST_ID)}`, { headers: { Authorization: `Bearer ${key}` } }),
  );
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error, 'jobber_unavailable');
  assert.ok(!JSON.stringify(body).includes('exploded'));
});
