/**
 * /q/<code>/view: the customer's quote on our own page, read from Jobber on
 * every tap. Covers the fresh read per tap, every fallback to the
 * phone-number page, the hourly limit, the email-only online button, and that
 * /q/<code> itself (which link previews fetch) never calls Jobber.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Env } from '../_lib/types.ts';
import { onRequest as intro } from '../q/[[code]].ts';
import { insertQLink } from '../_lib/desk-db.ts';
import { DAY } from '../_lib/db.ts';
import { INTRO_REVIEW_IDS, INTRO_TOKENS, introReviewFor, introTemplatePath, newIntroCode } from '../_lib/intro.ts';
import { MAX_VIEWS_PER_HOUR, VIEW_TEMPLATE_PATH, VIEW_TOKENS, approveSmsBody, customerQuote, fillViewTemplate } from '../_lib/quote-view.ts';
import { check } from './helpers.ts';
import { deskHarness, withFetch, type DeskHarness, type FakeQuote } from './desk-helpers.ts';

const root = new URL('../../', import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const T = VIEW_TOKENS;
const FALLBACK = '<html><body><h1>This link isn&rsquo;t working.</h1></body></html>';
const INTRO = `<html><body><h1>Hi ${INTRO_TOKENS.first}, here&rsquo;s your quote.</h1><a href="${INTRO_TOKENS.ctaHref}" data-go-cta>View your quote</a></body></html>`;
const SHELL =
  `<html><body><p class="kicker">${T.kicker}</p><h1>${T.title}</h1><div class="qv-card">${T.body}</div>` +
  `${T.actionsStart}<a data-approve href="sms:+13468201629?&amp;body=${T.smsBody}">Text Essa to approve</a>` +
  `${T.onlineStart}<a data-online href="${T.hubUrl}">Approve and sign online</a><p>Jobber will email you a sign-in link.</p>${T.onlineEnd}` +
  `${T.actionsEnd}<a href="tel:+13468201629">Questions? Call or text (346) 820-1629</a></body></html>`;

const MESSAGE = [
  '______________________________',
  'Estimate Disclaimer',
  'This estimate covers labor only and the contract terms apply.',
  '',
  '______________________________',
  'Client Notes: Bring the rods you picked. I will hang them at 9 ft.',
].join('\n');

function assets(): NonNullable<Env['ASSETS']> {
  return {
    async fetch(input) {
      const path = new URL(String(input)).pathname;
      if (path === '/q/') return new Response(FALLBACK, { status: 200 });
      if (path === VIEW_TEMPLATE_PATH) return new Response(SHELL, { status: 200 });
      if (INTRO_REVIEW_IDS.some((id) => path === introTemplatePath(id))) return new Response(INTRO, { status: 200 });
      return new Response('not found', { status: 404 });
    },
  };
}

interface Setup {
  h: DeskHarness;
  q: FakeQuote;
  code: string;
}

async function setup(options: { quote?: Partial<FakeQuote>; linkAge?: number; clientId?: string; quoteId?: string } = {}): Promise<Setup> {
  const h = await deskHarness();
  h.env.ASSETS = assets();
  const q = h.jobber.addQuote({
    id: 'quote-272',
    quoteNumber: '272',
    title: 'High Ceiling Curtain Installation',
    quoteStatus: 'awaiting_response',
    message: MESSAGE,
    ...options.quote,
  });
  const code = newIntroCode();
  const row = await insertQLink(h.db, {
    code,
    quoteId: options.quoteId ?? q.id,
    clientId: options.clientId ?? q.client.id,
    firstName: 'malik',
    title: q.title,
    hubUrl: q.clientHubUri ?? '',
    reviewId: introReviewFor(q.title),
    now: Date.now() - (options.linkAge ?? 0),
  });
  assert.notEqual(row, 'collision');
  return { h, q, code };
}

function view(h: DeskHarness, code: string, init: { method?: string; ip?: string } = {}) {
  return h.call(intro, `/q/${code}/view`, { method: init.method, ip: init.ip, params: { code: [code, 'view'] } });
}

const quoteReads = (h: DeskHarness) => h.jobber.operations.filter((op) => op === 'EysCustomerQuote').length;

async function isFallback(response: Response, label: string): Promise<void> {
  assert.equal(response.status, 404, label);
  assert.equal(await response.text(), FALLBACK, label);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store', label);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow', label);
}

await check('/q/<code>: never calls Jobber, and "View your quote" goes to /q/<code>/view', async () => {
  const { h, code } = await setup();
  let calls = 0;
  await withFetch(
    async () => {
      calls += 1;
      throw new Error('/q/<code> must not call Jobber');
    },
    async () => {
      const page = await h.call(intro, `/q/${code}`, { params: { code: [code] } });
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.ok(html.includes(`href="/q/${code}/view"`), 'the button (and the auto-open that clicks it) point at the quote page');
      assert.ok(!html.includes('getjobber.com'));
      assert.equal((await h.call(intro, `/q/${code}`, { method: 'HEAD', params: { code: [code] } })).status, 200);
      // A HEAD of the view (a crawler, a prefetch) answers without asking Jobber either.
      assert.equal((await view(h, code, { method: 'HEAD' })).status, 200);
    },
  );
  assert.equal(calls, 0);
  assert.equal(h.jobber.operations.length, 0);
});

await check('/q/<code>/view: reads the quote from Jobber fresh on every tap and stores none of it', async () => {
  const { h, q, code } = await setup();
  await withFetch(h.jobber.fetch, async () => {
    const first = await view(h, code);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(first.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.ok((await first.text()).includes('$400.00'));

    q.lineItems.nodes[0].totalPrice = 450;
    q.amounts = { ...q.amounts, subtotal: 450, total: 463.5 };
    const second = await (await view(h, code)).text();
    assert.ok(second.includes('$450.00') && second.includes('$463.50'), 'the second tap shows what Jobber says now');
    assert.ok(!second.includes('$400.00'));
  });
  assert.equal(quoteReads(h), 2, 'one Jobber read per tap');
  const link = h.db.raw.prepare('SELECT hub_url, title FROM q_links WHERE code = ?').get(code) as { hub_url: string; title: string };
  assert.equal(link.hub_url, q.clientHubUri, 'the stored link is untouched');
  const kv = h.db.raw.prepare('SELECT key FROM desk_kv').all() as { key: string }[];
  assert.deepEqual(kv.map((r) => r.key), ['jobber_schema'], 'nothing but the schema snapshot is kept');
});

await check('/q/<code>/view: shows the quote and only its client note; never internal notes, costs or the disclaimer', async () => {
  const { h, code } = await setup({
    quote: {
      amounts: { subtotal: 300, taxAmount: 9, discountAmount: 0, total: 309, depositAmount: 100 },
      lineItems: {
        nodes: [
          { id: 'l1', name: 'Install curtain rods', description: 'Two windows\nHigh ceiling', quantity: 2, unitPrice: 150, unitCost: 37.25, totalCost: 74.5, totalPrice: 300, textOnly: false, optional: false, sortOrder: 1 },
          { id: 'l3', name: 'Measurements', description: 'Confirmed on site.', quantity: 1, textOnly: true, optional: false, sortOrder: 3 },
          { id: 'l2', name: 'Haul away old blinds', description: null, quantity: 1, unitPrice: 0, totalPrice: 0, textOnly: false, optional: false, sortOrder: 2 },
        ],
      },
    },
  });
  const html = await withFetch(h.jobber.fetch, async () => (await view(h, code)).text());
  assert.ok(html.includes('<p class="kicker">Quote #272</p>'));
  assert.ok(html.includes('<h1>High Ceiling Curtain Installation</h1>'));
  assert.ok(html.includes('Install curtain rods') && html.includes('Two windows<br>High ceiling'));
  assert.ok(html.includes('Qty 2') && !html.includes('Qty 1'), 'quantity only when more than 1');
  assert.ok(html.includes('$300.00') && html.includes('Included'), 'line totals; a $0 line reads Included');
  assert.ok(html.indexOf('Install curtain rods') < html.indexOf('Haul away') && html.indexOf('Haul away') < html.indexOf('Measurements'), 'Jobber order');
  for (const part of ['Subtotal', 'Card processing fee', '$9.00', 'Total', '$309.00', 'Deposit required', '$100.00']) {
    assert.ok(html.includes(part), part);
  }
  assert.ok(html.includes('Bring the rods you picked. I will hang them at 9 ft.'), 'the client note');
  for (const never of ['Estimate Disclaimer', 'contract terms', 'Margin note', '2 hrs', '$37.25', '$74.50', '$150.00', '>Tax<', '__EYS_']) {
    assert.ok(!html.includes(never), `never shows ${never}`);
  }
  const body = encodeURIComponent('Hi Essa, I approve quote #272 for the high ceiling curtain installation.');
  assert.ok(html.includes(`href="sms:+13468201629?&amp;body=${body}"`), 'the approve text, ready to send');
});

await check('/q/<code>/view: "Approve and sign online" only for a customer with an email on file', async () => {
  const without = await setup();
  const plain = await withFetch(without.h.jobber.fetch, async () => (await view(without.h, without.code)).text());
  assert.ok(plain.includes('Text Essa to approve'));
  assert.ok(!plain.includes('Approve and sign online') && !plain.includes('Jobber will email you'), 'no email, no online button');

  const withEmail = await setup();
  withEmail.q.client.emails = [{ address: 'malik@example.com', primary: true }];
  const html = await withFetch(withEmail.h.jobber.fetch, async () => (await view(withEmail.h, withEmail.code)).text());
  assert.ok(html.includes('Text Essa to approve'));
  assert.ok(html.includes(`<a data-online href="${withEmail.q.clientHubUri}">Approve and sign online</a>`));
  assert.ok(html.includes('Jobber will email you a sign-in link.'));
  assert.ok(!html.includes('malik@example.com'), 'the email itself is never shown');
});

await check('/q/<code>/view: an approved quote shows no approve buttons', async () => {
  for (const status of ['approved', 'converted']) {
    const { h, code } = await setup({ quote: { quoteStatus: status } });
    const html = await withFetch(h.jobber.fetch, async () => (await view(h, code)).text());
    assert.ok(html.includes('You approved this quote. Thank you.'), status);
    assert.ok(!html.includes('Text Essa to approve') && !html.includes('Approve and sign online'), status);
    assert.ok(html.includes('Questions? Call or text'), status);
  }
});

await check('/q/<code>/view: links texted before this change work with no resend; 30 days after the text they stop', async () => {
  const old = await setup({ linkAge: 29 * DAY });
  assert.equal((await withFetch(old.h.jobber.fetch, () => view(old.h, old.code))).status, 200, 'a link texted 29 days ago');

  const expired = await setup({ linkAge: 31 * DAY });
  const response = await withFetch(expired.h.jobber.fetch, () => view(expired.h, expired.code));
  await isFallback(response, 'over 30 days');
  assert.equal(expired.h.jobber.operations.length, 0, 'an expired link never asks Jobber');
  // The intro itself still opens (its own one-year life); only the quote page gives way.
  assert.equal((await expired.h.call(intro, `/q/${expired.code}`, { params: { code: [expired.code] } })).status, 200);
});

await check('/q/<code>/view: Jobber failing, disconnected or hiding quotes, an archived quote, or someone else\'s quote get the phone-number page', async () => {
  const network = await setup();
  await isFallback(
    await withFetch(async () => {
      throw new TypeError('fetch failed');
    }, () => view(network.h, network.code)),
    'network failure',
  );

  const http500 = await setup();
  await isFallback(await withFetch(async () => new Response('oops', { status: 500 }), () => view(http500.h, http500.code)), 'Jobber 500');

  const hidden = await setup();
  hidden.h.jobber.quotesScope = false;
  await isFallback(await withFetch(hidden.h.jobber.fetch, () => view(hidden.h, hidden.code)), 'quotes hidden from the token');

  const disconnected = await setup();
  disconnected.h.db.raw.prepare('DELETE FROM jobber_tokens').run();
  await isFallback(await withFetch(disconnected.h.jobber.fetch, () => view(disconnected.h, disconnected.code)), 'Jobber disconnected');

  const archived = await setup({ quote: { quoteStatus: 'archived' } });
  await isFallback(await withFetch(archived.h.jobber.fetch, () => view(archived.h, archived.code)), 'archived quote');

  const missing = await setup({ quoteId: 'quote-gone' });
  await isFallback(await withFetch(missing.h.jobber.fetch, () => view(missing.h, missing.code)), 'quote no longer in Jobber');

  const stranger = await setup({ clientId: 'client-someone-else' });
  await isFallback(await withFetch(stranger.h.jobber.fetch, () => view(stranger.h, stranger.code)), 'quote belongs to another client');
});

await check(`/q/<code>/view: more than ${MAX_VIEWS_PER_HOUR} taps in an hour fall back without asking Jobber`, async () => {
  const { h, code, q } = await setup();
  const other = newIntroCode();
  await insertQLink(h.db, { code: other, quoteId: 'quote-273', clientId: q.client.id, firstName: 'malik', title: 'TV Mounting', hubUrl: q.clientHubUri ?? '', reviewId: introReviewFor('TV Mounting'), now: Date.now() });
  h.jobber.addQuote({ id: 'quote-273', quoteStatus: 'awaiting_response', client: q.client });
  await withFetch(h.jobber.fetch, async () => {
    for (let i = 0; i < MAX_VIEWS_PER_HOUR; i++) {
      assert.equal((await view(h, code, { ip: `198.51.100.${i}` })).status, 200, `tap ${i + 1}`);
    }
    await isFallback(await view(h, code, { ip: '198.51.100.99' }), `tap ${MAX_VIEWS_PER_HOUR + 1}`);
    assert.equal(quoteReads(h), MAX_VIEWS_PER_HOUR, 'the refused tap never reached Jobber');
    assert.equal((await view(h, other)).status, 200, 'the limit is per code');
  });
});

await check('/q/: unknown codes and other paths under a code get the phone-number page', async () => {
  const { h, code } = await setup();
  await withFetch(h.jobber.fetch, async () => {
    await isFallback(await h.call(intro, '/q/AbCdEfGh/view', { params: { code: ['AbCdEfGh', 'view'] } }), 'unknown code');
    await isFallback(await h.call(intro, `/q/${code}/open`, { params: { code: [code, 'open'] } }), '/open');
    await isFallback(await h.call(intro, `/q/${code}/view/x`, { params: { code: [code, 'view', 'x'] } }), 'deeper path');
    await isFallback(await h.call(intro, '/q/view-template/', { params: { code: ['view-template'] } }), 'the raw template');
  });
  assert.equal(quoteReads(h), 0);
});

await check('/q/<code>/view: Jobber text is escaped', async () => {
  const { h, code } = await setup({
    quote: {
      title: '<img src=x onerror=alert(1)>',
      lineItems: { nodes: [{ name: '<script>alert(1)</script>', description: '"quoted" & <b>', quantity: 1, totalPrice: 10, textOnly: false, optional: false, sortOrder: 1 }] },
    },
  });
  const html = await withFetch(h.jobber.fetch, async () => (await view(h, code)).text());
  assert.ok(!html.includes('<script>alert') && !html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && html.includes('&quot;quoted&quot; &amp; &lt;b&gt;'));
});

await check('approve text: the title reads the way the quote text writes it', () => {
  assert.equal(approveSmsBody('272', 'TV Mounting'), 'Hi Essa, I approve quote #272 for the TV mounting.');
  assert.equal(approveSmsBody('272', 'The Fence Repair Quote'), 'Hi Essa, I approve quote #272 for the fence repair.');
  assert.equal(approveSmsBody('272', 'Quote #272'), 'Hi Essa, I approve quote #272.');
  assert.equal(approveSmsBody('272', null), 'Hi Essa, I approve quote #272.');
  assert.ok(!/[–—]/.test(approveSmsBody('9', 'Drywall – patch')), 'no dashes');
});

await check('view fill: a shell missing a token is refused; the client note is exactly the desk\'s', () => {
  const q = customerQuote({ quoteNumber: '5', title: 'X', quoteStatus: 'awaiting_response', message: MESSAGE, client: { id: 'c', emails: [] } });
  assert.equal(q.clientNote, 'Bring the rods you picked. I will hang them at 9 ft.');
  assert.equal(fillViewTemplate('<html>no tokens</html>', q, null), null);
  assert.equal(fillViewTemplate(SHELL.replace(T.onlineEnd, ''), q, null), null);
  // A customer typing a token into a note cannot pull in another value.
  const sneaky = customerQuote({ quoteNumber: '5', title: T.body, message: `Client Notes: ${T.hubUrl}`, client: { id: 'c', emails: [{ address: 'a@b.c' }] } });
  const html = fillViewTemplate(SHELL, sneaky, 'https://hub.getjobber.com/x') ?? '';
  assert.ok(html.includes(`<h1>${T.body}</h1>`) && html.includes(`<p>${T.hubUrl}</p>`));
});

await check('view template: every token, the two buttons, and the customer copy rules', () => {
  const source = read('src/pages/q/view-template.astro');
  const visible = source.split('---').slice(2).join('---');
  for (const key of Object.keys(T)) assert.ok(visible.includes(`{VIEW_TOKENS.${key}}`) || visible.includes(`\${VIEW_TOKENS.${key}}`), key);
  assert.ok(visible.includes('href={`sms:+1${site.phoneTel}?&body=${VIEW_TOKENS.smsBody}`}'), 'the number comes from site data');
  for (const copy of ['Text Essa to approve', 'Approve and sign online', 'Jobber will email you a sign-in link.']) assert.ok(visible.includes(copy), copy);
  const lib = read('functions/_lib/quote-view.ts');
  const strings = [visible, ...(lib.match(/'[^'\n]*'|`[^`\n]*`/g) ?? [])].join('\n');
  assert.ok(!/[–—]|&mdash;|&ndash;/.test(strings), 'no em or en dashes');
  for (const banned of [/licensed/i, /\bHOA\b/]) assert.ok(!banned.test(strings), `${banned} never shown`);
});
