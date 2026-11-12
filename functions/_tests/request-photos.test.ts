import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { Env, PagesContext, PagesFunction } from '../_lib/types.ts';
import { ensureSchema, HOUR } from '../_lib/db.ts';
import { saveConnection, type JobberDeps } from '../_lib/jobber.ts';
import {
  READBACK_WAITS,
  addRequestPhotos,
  isQuoMediaUrl,
  parsePhotoTimes,
  parsePhotosBody,
  photosKey,
  type PhotosInput,
} from '../_lib/request-photos.ts';
import { onRequest as requestPhotos } from '../api/admin/jobber/request-photos.ts';
import { ADMIN_KEY, check, harness, type Harness } from './helpers.ts';

/**
 * POST /api/admin/jobber/request-photos: customers' photos texted to Quo go
 * onto their Jobber request as one note with the files attached (Jobber's
 * RequestCreateNoteInput.attachments, each a `url` Jobber downloads).
 */

const REQUEST_ID = 'Z2lkOi8vSm9iYmVyL1JlcXVlc3QvMzYwODEzMjc=';
const MEDIA_A = 'https://share.quo.com/m/AbC123def';
const MEDIA_B = 'https://share.quo.com/m/GhI456jkl';
const MEDIA_C = 'https://share.quo.com/m/MnO789pqr';
const T1 = '2026-11-11T20:15:03.000Z';
const T2 = '2026-11-11T21:02:44Z';

interface FakeFile {
  id: string;
  status: 'PROCESSING' | 'READY';
}
interface FakeNote {
  id: string;
  message: string;
  files: FakeFile[];
  /** Files Jobber is still downloading: they appear after `readsLeft` more reads. */
  waiting: number;
  readsLeft: number;
}

/** One Jobber request with notes, plus the share.quo.com media the Worker checks. */
class PhotoRequest {
  notes: FakeNote[] = [];
  /** Reads of the request before a new note's files show up; Infinity: never (Jobber's download failed). */
  readsBeforeFiles = 0;
  /** Files per note that Jobber never manages to download. */
  dropFiles = 0;
  media = new Map<string, { status: number; type: string }>([
    [MEDIA_A, { status: 200, type: 'image/jpeg' }],
    [MEDIA_B, { status: 200, type: 'image/heic' }],
    [MEDIA_C, { status: 200, type: 'video/mp4' }],
  ]);
  mediaFetches: string[] = [];
  private ids = 0;
  private h: Harness;

  constructor(h: Harness) {
    this.h = h;
    h.fake.handlers.set('EysPhotoNotes', (_q, v) => this.read(String(v.id)));
    h.fake.handlers.set('EysAddRequestPhotos', (_q, v) => this.add(v));
  }

  private nextId(prefix: string): string {
    this.ids += 1;
    return `${prefix}-${this.ids}`;
  }

  addNote(message: string, files = 0): FakeNote {
    const note: FakeNote = {
      id: this.nextId('note'),
      message,
      files: Array.from({ length: files }, () => ({ id: this.nextId('file'), status: 'READY' as const })),
      waiting: 0,
      readsLeft: 0,
    };
    this.notes.push(note);
    return note;
  }

  private read(id: string) {
    if (id !== REQUEST_ID) return { data: { request: null } };
    for (const note of this.notes) {
      if (note.waiting === 0) continue;
      note.readsLeft -= 1;
      if (note.readsLeft <= 0) {
        for (let i = 0; i < note.waiting; i++) note.files.push({ id: this.nextId('file'), status: 'PROCESSING' });
        note.waiting = 0;
      }
    }
    return {
      data: {
        request: {
          id: REQUEST_ID,
          notes: {
            nodes: [
              { __typename: 'ClientNote' },
              ...this.notes.map((n) => ({
                __typename: 'RequestNote',
                id: n.id,
                message: n.message,
                fileAttachments: { nodes: n.files },
              })),
            ],
          },
          noteAttachments: { nodes: this.notes.flatMap((n) => n.files.map((f) => ({ id: f.id }))) },
        },
      },
    };
  }

  private add(v: Record<string, unknown>) {
    if (v.id !== REQUEST_ID) {
      return { data: { requestCreateNote: { requestNote: null, userErrors: [{ message: 'Request not found', path: ['requestId'] }] } } };
    }
    const input = v.input as { message: string; attachments: { url: string }[] };
    const note = this.addNote(input.message);
    const arriving = Math.max(0, input.attachments.length - this.dropFiles);
    if (this.readsBeforeFiles === 0) {
      for (let i = 0; i < arriving; i++) note.files.push({ id: this.nextId('file'), status: 'PROCESSING' });
    } else {
      note.waiting = arriving;
      note.readsLeft = this.readsBeforeFiles;
    }
    return {
      data: {
        requestCreateNote: {
          requestNote: { id: note.id, fileAttachments: { nodes: note.files } },
          userErrors: [],
        },
      },
    };
  }

  /** Jobber's fake plus share.quo.com; anything else is an unexpected fetch. */
  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    if (url.startsWith('https://share.quo.com/')) {
      this.mediaFetches.push(url);
      const media = this.media.get(url);
      if (!media) return new Response('gone', { status: 404, headers: { 'Content-Type': 'text/html' } });
      return new Response(new Uint8Array(64), { status: media.status, headers: { 'Content-Type': media.type } });
    }
    return this.h.fake.fetch(input, init);
  };

  deps(): JobberDeps {
    return { ...this.h.jobberDeps(), fetch: this.fetch };
  }
}

async function setup(): Promise<{ h: Harness; jobber: PhotoRequest }> {
  const h = harness();
  await ensureSchema(h.db);
  const pair = h.fake.issue();
  await saveConnection(
    h.jobberDeps(),
    { access: pair.access, refresh: pair.refresh, expiresAt: h.clock.now() + HOUR },
    { id: 'account-1', name: 'Elevate Your Space Handyman' },
  );
  return { h, jobber: new PhotoRequest(h) };
}

function input(overrides: Partial<Record<string, unknown>> = {}): PhotosInput {
  const parsed = parsePhotosBody({
    requestId: REQUEST_ID,
    note: 'Photos texted to Quo ((346) 820-1629), Wed Nov 11, 2:15 pm CT\n"Here is the wall"',
    media: [
      { url: MEDIA_A, contentType: 'image/jpeg', sentAt: T1 },
      { url: MEDIA_B, contentType: 'image/heic', sentAt: T1 },
    ],
    ...overrides,
  });
  assert.ok(parsed.ok, JSON.stringify(parsed));
  return parsed.input;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

await check('only https://share.quo.com media URLs are accepted (no open proxy)', () => {
  assert.equal(isQuoMediaUrl(MEDIA_A), true);
  for (const url of [
    'http://share.quo.com/m/AbC123',
    'https://share.quo.com.evil.example/m/AbC123',
    'https://evil.example/share.quo.com/m/AbC123',
    'https://user:pw@share.quo.com/m/AbC123',
    'https://share.quo.com:8443/m/AbC123',
    'https://files.quo.com/m/AbC123',
    'https://share.quo.com/',
    'javascript:alert(1)',
    'not a url',
    `https://share.quo.com/${'a'.repeat(2100)}`,
  ]) {
    assert.equal(isQuoMediaUrl(url), false, url);
  }
});

await check('body: requestId, note and media are required and checked', () => {
  const ok = parsePhotosBody({
    requestId: ` ${REQUEST_ID} `,
    note: '  Photos texted to Quo  ',
    media: [
      { url: MEDIA_A, sentAt: T1, contentType: 'image/jpeg' },
      { url: MEDIA_A, sentAt: T1 },
      { url: MEDIA_B, sentAt: '2026-11-11T15:02:44-06:00' },
    ],
  });
  assert.ok(ok.ok);
  assert.equal(ok.input.requestId, REQUEST_ID);
  assert.equal(ok.input.note, 'Photos texted to Quo');
  assert.equal(ok.input.dryRun, false);
  assert.deepEqual(
    ok.input.media.map((m) => [m.url, m.sentAt]),
    [
      [MEDIA_A, '2026-11-11T20:15:03Z'],
      [MEDIA_B, '2026-11-11T21:02:44Z'],
    ],
    'duplicate URL dropped; message times normalised to UTC seconds',
  );

  const bad = (value: unknown, field: string) => {
    const result = parsePhotosBody(value);
    assert.ok(!result.ok, `${field} should be rejected`);
    assert.ok(result.errors.some((e) => e.includes(field)), `${field}: ${JSON.stringify(result.errors)}`);
  };
  const base = { requestId: REQUEST_ID, note: 'x', media: [{ url: MEDIA_A, sentAt: T1 }] };
  bad(null, 'body');
  bad({ ...base, requestId: '' }, 'requestId');
  bad({ ...base, requestId: 'has spaces in it' }, 'requestId');
  bad({ ...base, note: '' }, 'note');
  bad({ ...base, note: 'x'.repeat(3001) }, 'note');
  bad({ ...base, media: [] }, 'media');
  bad({ ...base, media: 'x' }, 'media');
  bad({ ...base, media: Array.from({ length: 21 }, (_, i) => ({ url: `${MEDIA_A}${i}`, sentAt: T1 })) }, 'media');
  bad({ ...base, media: [{ url: 'https://evil.example/a.jpg', sentAt: T1 }] }, 'media[0].url');
  bad({ ...base, media: [{ url: MEDIA_A, sentAt: 'yesterday' }] }, 'media[0].sentAt');
  bad({ ...base, media: [{ url: MEDIA_A }] }, 'media[0].sentAt');
  bad({ ...base, media: [{ url: MEDIA_A, sentAt: T1, contentType: 'not a type' }] }, 'media[0].contentType');
  bad({ ...base, dryRun: 'yes' }, 'dryRun');
});

await check('photo-time line: written and read back the same way', () => {
  const times = parsePhotoTimes(
    'Photos texted to Quo\r\n"hi"\r\n\r\nQuo message times (UTC): 2026-11-11T20:15:03Z (2 files), 2026-11-11T21:02:44.120Z (1 file)',
  );
  assert.deepEqual([...times], [
    ['2026-11-11T20:15:03Z', 2],
    ['2026-11-11T21:02:44.120Z', 1],
  ]);
  assert.equal(parsePhotoTimes('Photos texted to Quo, Wed Nov 11, 2:15 pm CT').size, 0, 'browser-written notes are the routine’s to read');
});

// ---------------------------------------------------------------------------
// Writing the note
// ---------------------------------------------------------------------------

await check('one note with every photo attached by URL, count read back from the request', async () => {
  const { h, jobber } = await setup();
  jobber.addNote('Request from the website', 1);
  const result = await addRequestPhotos(jobber.deps(), input(), { live: true });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.status, 'attached');
  assert.equal(result.body.attached, 2);
  assert.equal(result.body.expected, 2);
  assert.equal(result.body.request_attachments, 3, 'every file on the request');
  assert.equal(result.body.note_id, jobber.notes[1].id);

  const sent = h.fake.variablesOf('EysAddRequestPhotos') as { id: string; input: { message: string; attachments: unknown[] } };
  assert.equal(sent.id, REQUEST_ID);
  assert.deepEqual(sent.input.attachments, [{ url: MEDIA_A }, { url: MEDIA_B }]);
  assert.equal(
    sent.input.message,
    'Photos texted to Quo ((346) 820-1629), Wed Nov 11, 2:15 pm CT\n"Here is the wall"\n\nQuo message times (UTC): 2026-11-11T20:15:03Z (2 files)',
  );
  assert.deepEqual(jobber.mediaFetches, [MEDIA_A, MEDIA_B], 'each photo checked server-side before writing');
  assert.equal(h.fake.operations.filter((o) => o === 'EysAddRequestPhotos').length, 1);
  assert.deepEqual(h.sleeps, [], 'no waiting when the files are already there');
});

await check('idempotent by message time: a repeat writes nothing; only newer messages are added', async () => {
  const { h, jobber } = await setup();
  const deps = jobber.deps();
  assert.equal((await addRequestPhotos(deps, input(), { live: true })).body.status, 'attached');

  const repeat = await addRequestPhotos(deps, input(), { live: true });
  assert.equal(repeat.status, 200);
  assert.equal(repeat.body.status, 'already_attached');
  assert.deepEqual(repeat.body.skipped, [{ sent_at: '2026-11-11T20:15:03Z', note_id: 'note-1', attached: 2, claimed: 2 }]);
  assert.equal(h.fake.operations.filter((o) => o === 'EysAddRequestPhotos').length, 1, 'no second note');

  const mixed = await addRequestPhotos(
    deps,
    input({
      media: [
        { url: MEDIA_A, sentAt: T1 },
        { url: MEDIA_B, sentAt: T1 },
        { url: MEDIA_C, sentAt: T2, contentType: 'video/mp4' },
      ],
    }),
    { live: true },
  );
  assert.equal(mixed.body.status, 'attached');
  assert.equal(mixed.body.expected, 1);
  const second = h.fake.variables[h.fake.operations.lastIndexOf('EysAddRequestPhotos')] as {
    input: { message: string; attachments: unknown[] };
  };
  assert.deepEqual(second.input.attachments, [{ url: MEDIA_C }]);
  assert.ok(second.input.message.endsWith('Quo message times (UTC): 2026-11-11T21:02:44Z (1 file)'));
  assert.equal((mixed.body.skipped as unknown[]).length, 1);
});

await check('a dead or non-media link writes nothing', async () => {
  for (const [media, reason] of [
    [{ status: 404, type: 'text/html' }, 'http_404'],
    [{ status: 200, type: 'text/html' }, 'type text/html'],
  ] as const) {
    const { h, jobber } = await setup();
    jobber.media.set(MEDIA_B, media);
    const result = await addRequestPhotos(jobber.deps(), input(), { live: true });
    assert.equal(result.status, 422);
    assert.equal(result.body.error, 'media_unreachable');
    assert.equal(result.body.written, false);
    assert.deepEqual(result.body.failed, [{ url: MEDIA_B, sent_at: '2026-11-11T20:15:03Z', reason }]);
    assert.ok(!h.fake.operations.includes('EysAddRequestPhotos'));
  }
});

await check('a generic content type passes only with an image or video hint', async () => {
  const { jobber } = await setup();
  jobber.media.set(MEDIA_B, { status: 200, type: 'application/octet-stream' });
  assert.equal((await addRequestPhotos(jobber.deps(), input(), { live: true })).body.status, 'attached');

  const { jobber: other } = await setup();
  other.media.set(MEDIA_B, { status: 200, type: 'application/octet-stream' });
  const noHint = input({ media: [{ url: MEDIA_B, sentAt: T1 }] });
  assert.equal((await addRequestPhotos(other.deps(), noHint, { live: true })).status, 422);
});

await check('Jobber rejecting the note: nothing claimed, its reason returned', async () => {
  const { h, jobber } = await setup();
  h.fake.handlers.set('EysAddRequestPhotos', () => ({
    data: { requestCreateNote: { requestNote: null, userErrors: [{ message: 'Attachments url is invalid', path: ['attachments'] }] } },
  }));
  const result = await addRequestPhotos(jobber.deps(), input(), { live: true });
  assert.equal(result.status, 422);
  assert.deepEqual(result.body, {
    error: 'jobber_rejected',
    written: false,
    user_errors: [{ message: 'Attachments url is invalid', path: ['attachments'] }],
  });
});

await check('files Jobber is still downloading: waits, then reports them', async () => {
  const { h, jobber } = await setup();
  jobber.readsBeforeFiles = 3;
  const result = await addRequestPhotos(jobber.deps(), input(), { live: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.status, 'attached');
  assert.equal(result.body.attached, 2);
  assert.equal(result.body.ready, 0, 'PROCESSING files count as attached, not ready');
  assert.deepEqual(h.sleeps, READBACK_WAITS.slice(0, 2));
});

await check('files that never arrive: 202 processing with the count, after the last wait', async () => {
  const { h, jobber } = await setup();
  jobber.dropFiles = 1;
  const result = await addRequestPhotos(jobber.deps(), input(), { live: true });
  assert.equal(result.status, 202);
  assert.equal(result.body.status, 'processing');
  assert.equal(result.body.attached, 1);
  assert.equal(result.body.expected, 2);
  assert.deepEqual(h.sleeps, READBACK_WAITS);
  // The note names its times, so a repeat shows the shortfall instead of writing again.
  const repeat = await addRequestPhotos(jobber.deps(), input(), { live: true });
  assert.equal(repeat.body.status, 'already_attached');
  assert.deepEqual(repeat.body.skipped, [{ sent_at: '2026-11-11T20:15:03Z', note_id: 'note-1', attached: 1, claimed: 2 }]);
});

await check('dry run and non-live hosts: checks everything, writes nothing', async () => {
  for (const [overrides, live] of [
    [{ dryRun: true }, true],
    [{}, false],
  ] as const) {
    const { h, jobber } = await setup();
    const result = await addRequestPhotos(jobber.deps(), input(overrides), { live });
    assert.equal(result.status, 200);
    assert.equal(result.body.status, 'dry_run');
    assert.equal(result.body.live, live);
    assert.equal(result.body.would_attach, 2);
    assert.ok(String(result.body.message).endsWith('Quo message times (UTC): 2026-11-11T20:15:03Z (2 files)'));
    assert.deepEqual(jobber.mediaFetches, [MEDIA_A, MEDIA_B]);
    assert.ok(!h.fake.operations.includes('EysAddRequestPhotos'));
  }
});

await check('unknown request: 404, nothing fetched or written', async () => {
  const { h, jobber } = await setup();
  const result = await addRequestPhotos(jobber.deps(), input({ requestId: 'Z2lkOi8vSm9iYmVyL1JlcXVlc3QvMQ==' }), { live: true });
  assert.equal(result.status, 404);
  assert.equal(result.body.error, 'request_not_found');
  assert.deepEqual(jobber.mediaFetches, []);
  assert.ok(!h.fake.operations.includes('EysAddRequestPhotos'));
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

function call(env: Env, init: RequestInit, host = 'www.eyshandyman.com'): Promise<Response> {
  const fn: PagesFunction<Env> = requestPhotos;
  const request = new Request(`https://${host}/api/admin/jobber/request-photos`, init);
  const context: PagesContext<Env> = {
    request,
    env,
    params: {},
    data: {},
    waitUntil: () => {},
    next: async () => new Response('next', { status: 404 }),
  };
  return Promise.resolve(fn(context));
}

function post(key: string, body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

const BODY = {
  requestId: REQUEST_ID,
  note: 'Photos texted to Quo',
  media: [{ url: MEDIA_A, contentType: 'image/jpeg', sentAt: T1 }],
};

await check('the routine key is HMAC-SHA256(AI_ADMIN_KEY, label), base64url, and not the admin key', async () => {
  const key = await photosKey(ADMIN_KEY);
  const expected = createHmac('sha256', ADMIN_KEY).update('eys/jobber-request-photos/v1').digest('base64url');
  assert.equal(key, expected, 'matches the openssl one-liner in docs/quoting/master-guide.md §6.2');
  assert.notEqual(key, ADMIN_KEY);
});

await check('route: POST only, admin or routine key, body checked, live host writes', async () => {
  const { h, jobber } = await setup();
  const realFetch = globalThis.fetch;
  globalThis.fetch = jobber.fetch as typeof fetch;
  try {
    assert.equal((await call(h.env, { method: 'GET' })).status, 405);
    const denied = await call(h.env, post('nope', BODY));
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('WWW-Authenticate'), 'Bearer');
    assert.ok(!h.fake.operations.includes('EysPhotoNotes'), 'nothing read before the key check');

    const routineKey = await photosKey(ADMIN_KEY);
    const bad = await call(h.env, post(routineKey, { ...BODY, media: [{ url: 'https://evil.example/x.jpg', sentAt: T1 }] }));
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, 'invalid_body');

    const notJson = await call(h.env, { ...post(routineKey, BODY), headers: { Authorization: `Bearer ${routineKey}` } });
    assert.equal(notJson.status, 415);

    const preview = await call(h.env, post(routineKey, BODY), 'eys.pages.dev');
    const previewBody = await preview.json();
    assert.equal(previewBody.status, 'dry_run', 'pages.dev never writes to Jobber');
    assert.equal(previewBody.live, false);

    const written = await call(h.env, post(routineKey, BODY));
    assert.equal(written.status, 200);
    assert.equal(written.headers.get('Cache-Control'), 'no-store');
    const text = await written.text();
    assert.equal(JSON.parse(text).status, 'attached');
    for (const secret of [ADMIN_KEY, routineKey, 'access-1']) assert.ok(!text.includes(secret), `response leaks ${secret}`);

    const again = await call(h.env, post(`  ${ADMIN_KEY} `, BODY));
    assert.equal((await again.json()).status, 'already_attached', 'the admin key works too');

    h.fake.failOperations.add('EysPhotoNotes');
    const down = await call(h.env, post(routineKey, BODY));
    assert.equal(down.status, 502);
    assert.deepEqual(await down.json(), { error: 'jobber_unavailable', error_class: 'http' });
  } finally {
    globalThis.fetch = realFetch;
  }
});

await check('route: wrong keys share the admin lockout', async () => {
  const { h } = await setup();
  for (let i = 0; i < 5; i++) assert.equal((await call(h.env, post(`wrong-${i}`, BODY))).status, 401);
  assert.equal((await call(h.env, post(await photosKey(ADMIN_KEY), BODY))).status, 429);
  const { h: bare } = await setup();
  bare.env.AI_ADMIN_KEY = undefined;
  assert.equal((await call(bare.env, post('anything', BODY))).status, 503);
});
