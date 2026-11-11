/**
 * The /q/<code> quote intro: codes, template filling, the Function that serves
 * it and the open/click beacon.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Env, PagesContext, PagesFunction } from '../_lib/types.ts';
import { onRequest as intro, MAX_MISSES_PER_HOUR } from '../q/[[code]].ts';
import { onRequest as event } from '../api/q/event.ts';
import { ensureDeskSchema, insertQLink } from '../_lib/desk-db.ts';
import {
  INTRO_DEFAULT_REVIEW,
  INTRO_REVIEW_IDS,
  INTRO_REVIEW_RULES,
  INTRO_TOKENS,
  displayFirstName,
  fillIntroTemplate,
  introReviewFor,
  introTemplatePath,
  isClientHubUrl,
  isIntroCode,
  newIntroCode,
} from '../_lib/intro.ts';
import { check, createTestD1, testEnv, type TestD1 } from './helpers.ts';

const BASE = 'https://www.eyshandyman.com';
const root = new URL('../../', import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const TEMPLATE = `<html><head><link rel="canonical" href="${BASE}/q/${INTRO_TOKENS.code}"></head><body><h1>Hi ${INTRO_TOKENS.first}, here&rsquo;s your quote.</h1><a href="${INTRO_TOKENS.hubUrl}" data-go-cta>View your quote</a></body></html>`;
const FALLBACK = '<html><body><h1>This link isn&rsquo;t working.</h1></body></html>';
const HUB = 'https://hub.getjobber.com/client_hubs/abc-123/quotes/987?source=share_link&x=1';

function assets(): Env['ASSETS'] & { paths: string[] } {
  const paths: string[] = [];
  return {
    paths,
    async fetch(input) {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      if (path === '/q/') return new Response(FALLBACK, { status: 200 });
      if (INTRO_REVIEW_IDS.some((id) => path === introTemplatePath(id))) {
        return new Response(TEMPLATE.replace('<body>', `<body data-review="${path}">`), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    },
  };
}

function call(
  fn: PagesFunction<Env>,
  env: Env,
  path: string,
  params: Record<string, string | string[]> = {},
  init: RequestInit = {},
  ip = '203.0.113.9',
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('CF-Connecting-IP', ip);
  const request = new Request(`${BASE}${path}`, { ...init, headers });
  const context: PagesContext<Env> = {
    request,
    env,
    params,
    data: {},
    waitUntil: () => {},
    next: async () => new Response('next', { status: 404 }),
  };
  return Promise.resolve(fn(context));
}

async function seeded(): Promise<{ db: TestD1; env: Env; code: string }> {
  const db = createTestD1();
  await ensureDeskSchema(db);
  const code = newIntroCode();
  const row = await insertQLink(db, {
    code,
    quoteId: 'Z2lkOi8vSm9iYmVyL1F1b3RlLzE=',
    clientId: 'client-1',
    firstName: 'jennifer',
    title: 'TV Mounting',
    hubUrl: HUB,
    reviewId: introReviewFor('TV Mounting'),
    now: Date.now(),
  });
  assert.notEqual(row, 'collision');
  return { db, env: { ...testEnv(db), ASSETS: assets() }, code };
}

await check('intro codes: 8 characters, no look-alikes, never repeated', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const code = newIntroCode();
    assert.ok(isIntroCode(code), code);
    assert.ok(!/[0O1lIo]/.test(code), `no look-alike characters in ${code}`);
    seen.add(code);
  }
  assert.equal(seen.size, 2000);
  for (const bad of ['', 'short', 'abcdefgh1', 'abcd-efg', 'ABCDEFG0', '../../x', 'intro']) {
    assert.equal(isIntroCode(bad), false, bad);
  }
});

await check('first names: lowercase entries get capitals, typed capitals are kept', () => {
  assert.equal(displayFirstName('jennifer'), 'Jennifer');
  assert.equal(displayFirstName('  mary ann '), 'Mary Ann');
  assert.equal(displayFirstName('McKenzie'), 'McKenzie');
  assert.equal(displayFirstName('DeShawn'), 'DeShawn');
  assert.equal(displayFirstName(''), '');
  assert.equal(displayFirstName(null), '');
});

await check('template filling escapes every value and handles a missing name', () => {
  const filled = fillIntroTemplate(TEMPLATE, { code: 'AbCdEfGh', firstName: '<script>x</script>', hubUrl: HUB });
  assert.ok(filled);
  assert.ok(!filled.includes('<script>x'), 'name is escaped');
  assert.ok(filled.includes('Hi &lt;script&gt;x&lt;/script&gt;, here'));
  assert.ok(filled.includes('source=share_link&amp;x=1'), 'link is attribute-escaped');
  assert.ok(filled.includes(`${BASE}/q/AbCdEfGh`));
  assert.ok(!filled.includes('__EYS_Q_'), 'no token left behind');
  const nameless = fillIntroTemplate(TEMPLATE, { code: 'AbCdEfGh', firstName: '  ', hubUrl: HUB });
  assert.ok(nameless?.includes('<h1>Hi, here&rsquo;s your quote.</h1>'));
  assert.equal(fillIntroTemplate('<html>no tokens</html>', { code: 'x', firstName: 'A', hubUrl: HUB }), null);
});

await check('client hub links only', () => {
  assert.ok(isClientHubUrl(HUB));
  assert.ok(isClientHubUrl('https://getjobber.com/x'));
  assert.equal(isClientHubUrl('http://hub.getjobber.com/x'), false);
  assert.equal(isClientHubUrl('https://getjobber.com.evil.example/x'), false);
  assert.equal(isClientHubUrl('javascript:alert(1)'), false);
  assert.equal(isClientHubUrl(null), false);
});

await check('reviews: service-matched where one fits, the /go/ default otherwise', () => {
  assert.equal(introReviewFor('High ceiling curtain installation'), 'vanesa-morgia');
  assert.equal(introReviewFor('Drapes for living room'), 'vanesa-morgia');
  assert.equal(introReviewFor('Fence repair'), 'yong-sun');
  assert.equal(introReviewFor('TV Mounting'), INTRO_DEFAULT_REVIEW);
  assert.equal(introReviewFor('Project Quote'), INTRO_DEFAULT_REVIEW);
  assert.equal(introReviewFor(null), INTRO_DEFAULT_REVIEW);
});

await check('review ids mirror src/data/goLinks.ts and exist as published reviews', () => {
  const goLinks = read('src/data/goLinks.ts');
  assert.ok(goLinks.includes(`export const GO_DEFAULT_REVIEW = '${INTRO_DEFAULT_REVIEW}';`), 'same default as /go/');
  for (const rule of INTRO_REVIEW_RULES) {
    assert.ok(goLinks.includes(`reviewId: '${rule.review}'`), `${rule.review} is a /go/ review`);
  }
  for (const id of INTRO_REVIEW_IDS) {
    const review = read(`src/content/reviews/${id}.md`);
    assert.ok(/^published: true$/m.test(review), `${id} is published`);
  }
});

await check('/q/<code>: a known code renders its filled template, private and noindex', async () => {
  const { env, code } = await seeded();
  const response = await call(intro, env, `/q/${code}`, { code: [code] });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  const html = await response.text();
  assert.ok(html.includes('Hi Jennifer, here&rsquo;s your quote.'));
  assert.ok(html.includes(`href="${HUB.replace(/&/g, '&amp;')}"`));
  assert.ok(html.includes(`data-review="${introTemplatePath(INTRO_DEFAULT_REVIEW)}"`));
  // Trailing slash works too.
  assert.equal((await call(intro, env, `/q/${code}/`, { code: [code] })).status, 200);
});

await check('/q/: unknown, malformed or template paths get the phone-number page with a 404', async () => {
  const { env } = await seeded();
  for (const [path, params] of [
    ['/q/AbCdEfGh', { code: ['AbCdEfGh'] }],
    ['/q/nope', { code: ['nope'] }],
    ['/q/', {}],
    ['/q/intro/jamal-ansari/', { code: ['intro', 'jamal-ansari'] }],
  ] as const) {
    const response = await call(intro, env, path, params as Record<string, string[]>);
    assert.equal(response.status, 404, path);
    assert.equal(await response.text(), FALLBACK, path);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  }
  const bare = await call(intro, {}, '/q/AbCdEfGh', { code: ['AbCdEfGh'] });
  assert.equal(bare.status, 404, 'no D1, no assets: still a page, never an error');
  assert.ok((await bare.text()).includes('(346) 820-1629'));
});

await check('/q/: lookups stop for an IP after too many misses', async () => {
  const { env, code } = await seeded();
  for (let i = 0; i < MAX_MISSES_PER_HOUR; i++) {
    await call(intro, env, `/q/${newIntroCode()}`, { code: [newIntroCode()] }, {}, '198.51.100.4');
  }
  const blocked = await call(intro, env, `/q/${code}`, { code: [code] }, {}, '198.51.100.4');
  assert.equal(blocked.status, 404, 'even a real code is refused once the IP is over the limit');
  const other = await call(intro, env, `/q/${code}`, { code: [code] }, {}, '198.51.100.5');
  assert.equal(other.status, 200, 'other visitors are unaffected');
});

await check('/q/: a stored link that is not a Client Hub URL is never rendered', async () => {
  const db = createTestD1();
  await ensureDeskSchema(db);
  await insertQLink(db, {
    code: 'AbCdEfGh',
    quoteId: 'q-2',
    clientId: null,
    firstName: 'Sam',
    title: null,
    hubUrl: 'https://evil.example/phish',
    reviewId: INTRO_DEFAULT_REVIEW,
    now: Date.now(),
  });
  const response = await call(intro, { ...testEnv(db), ASSETS: assets() }, '/q/AbCdEfGh', { code: ['AbCdEfGh'] });
  assert.equal(response.status, 404);
});

await check('one link per quote: a second insert returns the first code', async () => {
  const { db, code } = await seeded();
  const again = await insertQLink(db, {
    code: newIntroCode(),
    quoteId: 'Z2lkOi8vSm9iYmVyL1F1b3RlLzE=',
    clientId: 'client-1',
    firstName: 'Jennifer',
    title: 'TV Mounting',
    hubUrl: HUB,
    reviewId: INTRO_DEFAULT_REVIEW,
    now: Date.now(),
  });
  assert.notEqual(again, 'collision');
  assert.equal(again === 'collision' ? '' : again.code, code);
});

await check('/api/q/event records real opens and clicks, and says nothing about unknown codes', async () => {
  const { db, env, code } = await seeded();
  const post = (body: unknown) =>
    call(event, env, '/api/q/event', {}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  assert.equal((await post({ code, event: 'open' })).status, 204);
  assert.equal((await post({ code, event: 'open' })).status, 204);
  assert.equal((await post({ code, event: 'click' })).status, 204);
  assert.equal((await post({ code: 'AbCdEfGh', event: 'open' })).status, 204);
  assert.equal((await post({ code, event: 'delete' })).status, 204);
  const row = db.raw.prepare('SELECT open_count, click_count, opened_at, clicked_at FROM q_links WHERE code = ?').get(code) as {
    open_count: number;
    click_count: number;
    opened_at: number | null;
    clicked_at: number | null;
  };
  assert.equal(row.open_count, 2);
  assert.equal(row.click_count, 1);
  assert.ok(row.opened_at && row.clicked_at);
  assert.equal((await call(event, env, '/api/q/event')).status, 405);
});

await check('intro template copy follows the customer text rules', () => {
  const source = read('src/pages/q/intro/[review].astro');
  const visible = source.split('---').slice(2).join('---');
  assert.ok(!/[–—]|&mdash;|&ndash;/.test(visible), 'no em or en dashes');
  assert.ok(visible.includes('I own EYS and I write every quote myself.'));
  assert.ok(/I got my start in construction in the U\.S\. military\. That&rsquo;s where I learned to prepare and\s+do the work right, not just fast\./.test(visible));
  assert.ok(visible.includes('ctaLabel="View your quote"'));
  for (const banned of [/licensed/i, /\bHOA\b/, /\$\d/, /\bhours?\b/i, /718/]) {
    assert.ok(!banned.test(visible), `${banned} not in the intro`);
  }
  const fallback = read('src/pages/q/index.astro').split('---').slice(2).join('---');
  assert.ok(!/[–—]|&mdash;|&ndash;/.test(fallback), 'fallback has no dashes either');
});
