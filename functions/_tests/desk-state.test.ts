/**
 * The Quote Desk state machine (functions/_lib/desk-state.ts): the table, the
 * one writer, and that the phone's buttons never offer what the server refuses.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_STATES, APPROVE_FROM, ARCHIVE_FROM, HIDE_FROM, MARK_FROM, TRANSITIONS, UNHIDE_FROM, canTransition, type DeskState } from '../_lib/desk-state.ts';
import { availableActions } from '../_lib/desk-flow.ts';
import type { DeskQuoteRow } from '../_lib/desk-db.ts';
import { check } from './helpers.ts';

const functionsDir = new URL('../', import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '_tests' ? [] : sourceFiles(path);
    return /\.(ts|js)$/.test(name) ? [path] : [];
  });
}

await check('only desk-state.ts writes desk_quotes.state', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(functionsDir)) {
    if (file.endsWith('/_lib/desk-state.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const statement of text.match(/UPDATE\s+desk_quotes\s+SET[\s\S]*?WHERE/gi) ?? []) {
      if (/\bstate\s*=/.test(statement.replace(/\b(?:text|move)_state\s*=/gi, ''))) offenders.push(`${file}: ${statement.slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, []);
});

await check('the transition table is the intended one', () => {
  assert.deepEqual(TRANSITIONS.approve, { from: ['open', 'marked', 'ready'], to: 'approved' });
  assert.deepEqual(TRANSITIONS.ready, { from: ['open'], to: 'ready' });
  assert.deepEqual(TRANSITIONS.unready, { from: ['ready'], to: 'open' });
  assert.deepEqual(TRANSITIONS.mark, { from: ['open'], to: 'marked' });
  assert.deepEqual(TRANSITIONS.hide, { from: ['open'], to: 'hidden' });
  assert.deepEqual(TRANSITIONS.unhide, { from: ['hidden'], to: 'open' });
  assert.deepEqual([...TRANSITIONS.archive.from].sort(), ['approved', 'hidden', 'marked', 'open', 'ready']);
  assert.equal(TRANSITIONS.archive.to, 'hidden');
  assert.deepEqual([APPROVE_FROM, MARK_FROM, HIDE_FROM, UNHIDE_FROM, ARCHIVE_FROM].map((f) => f.length), [3, 1, 1, 1, 5]);
  assert.equal(canTransition(null, 'approve'), true, 'a missing row is open');
  assert.equal(canTransition('hidden', 'approve'), false);
  assert.equal(canTransition('hidden', 'mark'), false);
  assert.equal(canTransition('hidden', 'ready'), false);
  assert.equal(canTransition('ready', 'ready'), false);
  assert.equal(canTransition('ready', 'hide'), false, 'a ready quote goes back to drafts before it is hidden');
  assert.equal(canTransition('ready', 'approve'), true);
  assert.equal(canTransition('ready', 'unready'), true);
  assert.equal(canTransition('open', 'unready'), false);
  assert.equal(canTransition('approved', 'approve'), false);
});

await check('availableActions never offers an action the server would refuse (every state x status)', () => {
  const now = Date.now();
  const checks = { approve: 'approve', mark: 'mark', hide: 'hide', unhide: 'unhide', ready: 'ready', unready: 'unready' } as const;
  for (const state of [null, ...ALL_STATES] as (DeskState | null)[]) {
    for (const status of ['draft', 'awaiting_response', 'approved', 'archived', null]) {
      const row = state ? ({ quote_id: 'q', state, text_state: 'none', move_state: 'none', text_error: null, text_claimed_at: null }) as DeskQuoteRow : null;
      const offered = availableActions(row, status, null, now);
      for (const [key, action] of Object.entries(checks)) {
        if (offered[key as keyof typeof checks]) assert.ok(canTransition(state, action), `${key} offered in ${state}/${status}`);
      }
    }
  }
});
