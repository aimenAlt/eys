/**
 * The Quote Desk's text state machine (functions/_lib/desk-text.ts): one
 * writer, one decision function, and a Retry button that only shows when a
 * tap could send.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_TEXT_STATES,
  AUTO_SEND_WINDOW,
  MAX_APPROVAL_AGE,
  SEND_CLAIM_TTL,
  TEXT_TRANSITIONS,
  retryCanSend,
  sendDecision,
  textBlockReason,
  textLabel,
  type AdvanceSource,
  type SendDecision,
} from '../_lib/desk-text.ts';
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

await check('only desk-text.ts writes desk_quotes.text_state (and its claim columns)', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(functionsDir)) {
    if (file.endsWith('/_lib/desk-text.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const statement of text.match(/UPDATE\s+desk_quotes\s+SET[\s\S]*?WHERE/gi) ?? []) {
      if (/\b(?:text_state|text_owner|text_claimed_at)\s*=/.test(statement)) offenders.push(`${file}: ${statement.slice(0, 60)}`);
    }
    for (const call of text.match(/touch\([^;]*?\);/g) ?? []) {
      if (/\b(?:text_state|text_owner|text_claimed_at)\s*:/.test(call)) offenders.push(`${file}: touch(${call.slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, []);
});

await check('the text_state table is the intended one', () => {
  assert.deepEqual(TEXT_TRANSITIONS.claim, { from: ['none'], to: ['sending'] });
  assert.deepEqual([...TEXT_TRANSITIONS.retryClaim.from].sort(), ['failed', 'none', 'sending', 'unknown']);
  assert.deepEqual(TEXT_TRANSITIONS.settle.from, ['sending']);
  for (const to of ['sent', 'failed', 'unknown']) assert.ok(TEXT_TRANSITIONS.settle.to.includes(to as never));
});

await check('textLabel: one label per state', () => {
  assert.deepEqual(
    ALL_TEXT_STATES.map((text_state) => textLabel({ text_state })),
    ['Text not sent', 'Sending text', 'Text sent', 'Text failed', 'Text may have gone out, check Quo'],
  );
});

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);

function expected(state: string, textState: string, age: number, status: string, source: AdvanceSource, claimAge: number | null): SendDecision {
  // Written out longhand from the rules as they stood in advance(), not from sendDecision.
  if (state !== 'approved') return { kind: 'skip', reason: 'not_approved' };
  if (textState === 'sent') return { kind: 'skip', reason: 'already_sent' };
  if (age > MAX_APPROVAL_AGE) return { kind: 'skip', reason: 'too_old' };
  if (status !== 'awaiting_response') return { kind: 'skip', reason: 'not_awaiting' };
  if (textState !== 'none' && source !== 'retry') return { kind: 'skip', reason: 'already_started' };
  if (source !== 'retry' && age > AUTO_SEND_WINDOW) return { kind: 'needs_retry_tap' };
  if (textState === 'sending' && claimAge !== null && claimAge < SEND_CLAIM_TTL) return { kind: 'skip', reason: 'claim_live' };
  return { kind: 'claim' };
}

await check('sendDecision matches advance() over state x text_state x age x Jobber status x source', () => {
  let cases = 0;
  for (const state of ['open', 'approved', 'marked', 'hidden']) {
    for (const textState of ALL_TEXT_STATES) {
      for (const age of [1000, AUTO_SEND_WINDOW + 1, MAX_APPROVAL_AGE + 1]) {
        for (const status of ['draft', 'awaiting_response', 'approved', 'archived']) {
          for (const source of ['approve', 'poll', 'webhook', 'retry', 'list'] as AdvanceSource[]) {
            for (const claimAge of textState === 'sending' ? [1000, SEND_CLAIM_TTL, SEND_CLAIM_TTL + 1] : [null]) {
              const row = { state, text_state: textState, approved_at: NOW - age, text_claimed_at: claimAge === null ? null : NOW - claimAge, text_error: null } as DeskQuoteRow;
              assert.deepEqual(sendDecision(row, status, source, NOW), expected(state, textState, age, status, source, claimAge), `${state}/${textState}/${age}/${status}/${source}/${claimAge}`);
              // Before asking Jobber the same first gates apply.
              const early = sendDecision(row, undefined, source, NOW);
              const first = expected(state, textState, age, 'awaiting_response', 'retry', null);
              if (first.kind === 'skip' && ['not_approved', 'already_sent', 'too_old'].includes(first.reason)) assert.deepEqual(early, first);
              else assert.deepEqual(early, { kind: 'check_jobber' });
              cases++;
            }
          }
        }
      }
    }
  }
  assert.ok(cases > 1000);
  assert.equal(sendDecision(null, 'awaiting_response', 'retry', NOW).kind, 'skip');
});

await check('availableActions.retry is true only when a Retry tap could send (and the 60-day reason shows otherwise)', () => {
  for (const state of ['open', 'approved', 'marked', 'hidden']) {
    for (const textState of ALL_TEXT_STATES) {
      for (const textError of [null, 'Texting is off']) {
        for (const age of [1000, AUTO_SEND_WINDOW + 1, MAX_APPROVAL_AGE + 1]) {
          for (const status of ['draft', 'awaiting_response', 'archived', null]) {
            for (const claimAge of textState === 'sending' ? [1000, SEND_CLAIM_TTL + 1] : [null]) {
              const row = { quote_id: 'q', state, text_state: textState, move_state: 'none', text_error: textError, approved_at: NOW - age, text_claimed_at: claimAge === null ? null : NOW - claimAge } as DeskQuoteRow;
              const offered = availableActions(row, status, null, NOW).retry;
              if (offered) {
                assert.equal(sendDecision(row, status, 'retry', NOW).kind, 'claim', `Retry offered but cannot send: ${state}/${textState}/${age}/${status}`);
                assert.equal(textBlockReason(row, NOW), null);
              }
              assert.equal(offered, retryCanSend(row, status, NOW));
              if (state === 'approved' && textState !== 'sent' && age > MAX_APPROVAL_AGE) assert.ok(textBlockReason(row, NOW), 'old approval says why');
            }
          }
        }
      }
    }
  }
});
