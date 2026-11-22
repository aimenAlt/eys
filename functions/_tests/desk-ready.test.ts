/**
 * "Ready for Mark": Essa marks a draft ready, the quote gets a pinned Jobber
 * note and the deposit, and Quo gets one task for the callers.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Env } from '../_lib/types.ts';
import { onRequest as action } from '../api/desk/action.ts';
import { onRequest as quoteRoute } from '../api/desk/quote.ts';
import { onRequest as quotesRoute } from '../api/desk/quotes.ts';
import { deskQuote } from '../_lib/desk-db.ts';
import { availableActions } from '../_lib/desk-flow.ts';
import { depositRule } from '../_lib/desk-ready.ts';
import { check } from './helpers.ts';
import { FakeQuoTasks, deskHarness, withFetch, type DeskHarness } from './desk-helpers.ts';

async function setup(env: Partial<Env> = {}) {
  const h = await deskHarness({ QUO_API_KEY: 'quo-test-key', ...env });
  const quo = new FakeQuoTasks();
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

function bigQuote(h: DeskHarness, id = 'q-big', total = 2400) {
  return h.jobber.addQuote({
    id,
    quoteNumber: '301',
    title: 'Kitchen Backsplash',
    amounts: { subtotal: total, total, taxAmount: 0, discountAmount: 0, depositAmount: 0 },
  });
}

await check('depositRule: over $1,000 is 50%, $1,000 or less is $150 flat', () => {
  assert.deepEqual(depositRule(999), { type: 'Unit', rate: 150, dollars: 150, label: '$150' });
  assert.deepEqual(depositRule(1000), { type: 'Unit', rate: 150, dollars: 150, label: '$150' });
  assert.deepEqual(depositRule(1000.01), { type: 'Percent', rate: 50, dollars: 500.01, label: '50% ($500.01)' });
  assert.deepEqual(depositRule(2400), { type: 'Percent', rate: 50, dollars: 1200, label: '50% ($1,200)' });
});

await check('ready on a $2,400 draft: deposit 50% to Jobber, one pinned note, one Quo task, state ready, fields stored', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h);
  await withFetch(route, async () => {
    const res = await post(h, cookie, { id: 'q-big', action: 'ready', note: 'Ask for photos of the fixtures' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.desk.state, 'ready');
    assert.equal(body.actions.ready, false);
    assert.equal(body.actions.unready, true);
    assert.equal(body.message, undefined);
  });
  const edits = h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit');
  assert.equal(edits.length, 1);
  assert.deepEqual(edits[0].variables, { quote: 'q-big', attributes: { deposit: { rate: 50, type: 'Percent' } } });
  assert.equal(h.jobber.notesAdded.length, 1);
  const note = h.jobber.notesAdded[0];
  assert.equal(note.pinned, true);
  assert.match(note.message, /^Ready for Mark \(Essa, .+\): ask for 50% \(\$1,200\) deposit\. Note: Ask for photos of the fixtures$/);
  assert.equal(quo.tasks.length, 1);
  const task = quo.tasks[0];
  assert.equal(task.title, 'Call Jennifer Lopez: quote ready, ask for 50% ($1,200) deposit (Quote #301)');
  assert.equal(task.phoneNumberId, 'PNeiWaFK2n', 'no conversation found: linked to the EYS inbox');
  assert.equal('conversationId' in task, false);
  assert.deepEqual(task.description.split('\n'), [
    'Jennifer Lopez, (281) 555-0142',
    'Quote total: $2,400.00',
    'Deposit to ask for: 50% ($1,200)',
    'Note from Essa: Ask for photos of the fixtures',
    'Jobber quote: https://secure.getjobber.com/quotes/1',
  ]);
  assert.doesNotMatch(task.description, /margin|labor|hours|cost/i);
  const row = await deskQuote(h.db as never, 'q-big');
  assert.equal(row?.state, 'ready');
  const stored = row as unknown as Record<string, unknown>;
  assert.equal(stored.ready_by, 'Essa');
  assert.equal(stored.ready_deposit, 1200);
  assert.equal(stored.ready_note, 'Ask for photos of the fixtures');
  assert.equal(stored.ready_task_id, 'TK1');
  assert.ok(Number(stored.ready_at) > 0);
  const events = (await h.db.prepare('SELECT action FROM desk_events WHERE quote_id = ?1').bind('q-big').all<{ action: string }>()).results.map((e) => e.action);
  assert.ok(events.includes('ready'));
});

await check('a second tap makes no second task, note or deposit write', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h);
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready' })).status, 200);
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready' })).status, 200);
    await Promise.all([post(h, cookie, { id: 'q-big', action: 'ready' }), post(h, cookie, { id: 'q-big', action: 'ready' })]);
  });
  assert.equal(quo.tasks.length, 1);
  assert.equal(h.jobber.notesAdded.length, 1);
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit').length, 1);
});

await check('the deposit already on the quote equals the target: no quoteEdit', async () => {
  const { h, cookie, route } = await setup();
  const q = bigQuote(h);
  q.amounts.depositAmount = 1200;
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready' })).status, 200);
  });
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit').length, 0);
  assert.equal(h.jobber.notesAdded.length, 1);
});

await check('a $400 quote gets $150 flat; overriding to 300 on $2,400 sends {rate 300, Unit}', async () => {
  const { h, quo, cookie, route } = await setup();
  h.jobber.addQuote({ id: 'q-small' });
  bigQuote(h, 'q-big');
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-small', action: 'ready' })).status, 200);
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready', deposit: 300 })).status, 200);
  });
  const edits = h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit');
  assert.deepEqual(edits[0].variables.attributes, { deposit: { rate: 150, type: 'Unit' } });
  assert.deepEqual(edits[1].variables.attributes, { deposit: { rate: 300, type: 'Unit' } });
  assert.match(quo.tasks[0].title, /ask for \$150 deposit/);
  assert.match(quo.tasks[1].title, /ask for \$300 deposit/);
  assert.match(h.jobber.notesAdded[1].message, /ask for \$300 deposit\.$/);
});

await check('a deposit equal to the default dollars keeps the default rule (50%), and a bad deposit is refused', async () => {
  const { h, cookie, route } = await setup();
  bigQuote(h);
  bigQuote(h, 'q-b2');
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready', deposit: 1200 })).status, 200);
    for (const deposit of [0, -5, 'abc', 2500]) {
      assert.equal((await post(h, cookie, { id: 'q-b2', action: 'ready', deposit })).status, 409, String(deposit));
    }
  });
  assert.deepEqual(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit')[0].variables.attributes, { deposit: { rate: 50, type: 'Percent' } });
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit').length, 1);
  assert.equal((await deskQuote(h.db as never, 'q-b2'))?.state ?? 'open', 'open');
});

await check('refusals write nothing: not a draft, a hidden row, a licensed note, a note over 1000 chars', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h, 'q-sent').quoteStatus = 'awaiting_response';
  bigQuote(h, 'q-hidden');
  bigQuote(h, 'q-note');
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-hidden', action: 'hide' })).status, 200);
    h.jobber.mutationCalls.length = 0;
    const sent = await post(h, cookie, { id: 'q-sent', action: 'ready' });
    assert.equal(sent.status, 409);
    assert.match((await sent.json()).message, /awaiting response in Jobber/);
    const hidden = await post(h, cookie, { id: 'q-hidden', action: 'ready' });
    assert.equal(hidden.status, 409);
    assert.match((await hidden.json()).message, /off the desk/i);
    const licensed = await post(h, cookie, { id: 'q-note', action: 'ready', note: 'We are fully licensed' });
    assert.equal(licensed.status, 409);
    assert.match((await licensed.json()).message, /licensed/);
    assert.equal((await post(h, cookie, { id: 'q-note', action: 'ready', note: 'HOA approval needed' })).status, 409);
    assert.equal((await post(h, cookie, { id: 'q-note', action: 'ready', note: 'x'.repeat(1001) })).status, 409);
  });
  assert.deepEqual(h.jobber.mutationCalls, []);
  assert.equal(h.jobber.notesAdded.length, 0);
  assert.equal(quo.tasks.length, 0);
  assert.equal((await deskQuote(h.db as never, 'q-note'))?.state ?? 'open', 'open');
  assert.equal((await deskQuote(h.db as never, 'q-hidden'))?.state, 'hidden');
});

await check('an approved row is refused too', async () => {
  const { h, quo, cookie, route } = await setup({ QUOTE_SEND_ENABLED: 'true' });
  bigQuote(h);
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'approve' })).status, 200);
    h.jobber.quotes.get('q-big')!.quoteStatus = 'draft';
    h.jobber.mutationCalls.length = 0;
    const res = await post(h, cookie, { id: 'q-big', action: 'ready' });
    assert.equal(res.status, 409);
  });
  assert.equal(quo.tasks.length, 0);
  assert.equal(h.jobber.mutationCalls.filter((c) => c.name === 'quoteEdit').length, 0);
});

await check('Quo refusing the task: still ready, note still added, message says no task, event ready_task_failed', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h);
  quo.taskStatus = 500;
  await withFetch(route, async () => {
    const res = await post(h, cookie, { id: 'q-big', action: 'ready' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.desk.state, 'ready');
    assert.match(body.message, /task wasn.t created/i);
  });
  assert.equal(h.jobber.notesAdded.length, 1);
  assert.equal(((await deskQuote(h.db as never, 'q-big')) as unknown as Record<string, unknown>).ready_task_id, null);
  const events = (await h.db.prepare('SELECT action FROM desk_events WHERE quote_id = ?1').bind('q-big').all<{ action: string }>()).results.map((e) => e.action);
  assert.ok(events.includes('ready_task_failed'));
});

await check('no QUO_API_KEY: still ready, note added, no Quo call, message says no task', async () => {
  const { h, quo, cookie, route } = await setup({ QUO_API_KEY: '' });
  bigQuote(h);
  await withFetch(route, async () => {
    const body = await (await post(h, cookie, { id: 'q-big', action: 'ready' })).json();
    assert.equal(body.desk.state, 'ready');
    assert.match(body.message, /task wasn.t created/i);
  });
  assert.deepEqual(quo.calls, []);
  assert.equal(h.jobber.notesAdded.length, 1);
});

await check('Jobber refusing the deposit: still ready and tasked, the message says to set it in Jobber', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h);
  h.jobber.rejectDeposit = 'Deposit not allowed';
  await withFetch(route, async () => {
    const body = await (await post(h, cookie, { id: 'q-big', action: 'ready' })).json();
    assert.equal(body.desk.state, 'ready');
    assert.match(body.message, /deposit/i);
  });
  assert.equal(quo.tasks.length, 1);
});

await check('the task links to the customer’s conversation when Quo lists one', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h);
  quo.conversations = [
    { id: 'CNother', participants: ['+12815550000'] },
    { id: 'CNmine', participants: ['+12815550142'] },
  ];
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready' })).status, 200);
  });
  assert.equal(quo.tasks[0].conversationId, 'CNmine');
  assert.equal('phoneNumberId' in quo.tasks[0], false);
  assert.ok(quo.calls.some((c) => c.startsWith('GET /conversations?') && c.includes('phoneNumberId=PNeiWaFK2n')));
});

await check('a Quo conversations error falls back to the inbox link', async () => {
  const { h, quo, cookie, route } = await setup();
  bigQuote(h);
  quo.conversationsOk = false;
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready' })).status, 200);
  });
  assert.equal(quo.tasks[0].phoneNumberId, 'PNeiWaFK2n');
});

await check('availableActions: ready only on an open draft; unready returns it to open and clears nothing in Jobber', async () => {
  const none = availableActions(null, 'draft', null, Date.now());
  assert.equal(none.ready, true);
  assert.equal(none.unready, false);
  assert.equal(availableActions(null, 'awaiting_response', null, Date.now()).ready, false);
  assert.equal(availableActions({ quote_id: 'q', state: 'hidden' } as never, 'draft', null, Date.now()).ready, false);

  const { h, cookie, route } = await setup();
  bigQuote(h);
  await withFetch(route, async () => {
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'ready' })).status, 200);
    const view = await (await h.call(quoteRoute, '/api/desk/quote?id=q-big', { cookie })).json();
    assert.equal(view.actions.ready, false);
    assert.equal(view.actions.unready, true);
    assert.equal(view.actions.approve, true, 'Looks good stays available');
    assert.equal(view.actions.hide, false);
    assert.equal(view.deposit.dollars, 1200);
    assert.equal(view.deposit.label, '50% ($1,200)');
    assert.equal(view.deposit.hint, '50% of $2,400');
    h.jobber.mutationCalls.length = 0;
    const back = await post(h, cookie, { id: 'q-big', action: 'unready' });
    assert.equal(back.status, 200);
    const body = await back.json();
    assert.equal(body.desk.state, 'open');
    assert.equal(body.actions.ready, true);
    assert.equal((await post(h, cookie, { id: 'q-big', action: 'unready' })).status, 409, 'not ready any more');
  });
  assert.deepEqual(h.jobber.mutationCalls, []);
  const events = (await h.db.prepare('SELECT action FROM desk_events WHERE quote_id = ?1').bind('q-big').all<{ action: string }>()).results.map((e) => e.action);
  assert.ok(events.includes('unready'));
});

await check('the list has a "With Mark" group of ready quotes, out of Drafts, with the note’s first line', async () => {
  const { h, cookie, route } = await setup();
  bigQuote(h);
  h.jobber.addQuote({ id: 'q-other' });
  await withFetch(route, async () => {
    await post(h, cookie, { id: 'q-big', action: 'ready', note: 'Ask for $500 deposit\nand photos' });
    const list = (await (await h.call(quotesRoute, '/api/desk/quotes', { cookie })).json()).list;
    assert.deepEqual(list.drafts.map((q: { id: string }) => q.id), ['q-other']);
    assert.equal(list.ready.length, 1);
    assert.equal(list.ready[0].id, 'q-big');
    assert.equal(list.ready[0].total, 2400);
    assert.equal(list.ready[0].note, 'Ask for $500 deposit');
    assert.equal(list.ready[0].deposit, 1200);
  });
});

await check('the page has the Ready for Mark button and panel, the With Mark fold and Back to drafts', () => {
  const page = readFileSync(new URL('../../src/pages/essa/quotes/index.astro', import.meta.url), 'utf8');
  assert.match(page, /Ready for Mark/);
  assert.match(page, /Deposit to ask for/);
  assert.match(page, /Note for Mark\/Hamid/);
  assert.match(page, /fold\('With Mark', list\.ready/);
  assert.match(page, /Back to drafts/);
  assert.match(page, /data-ready-toggle/);
});
