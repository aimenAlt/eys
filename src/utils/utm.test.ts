import assert from 'node:assert/strict';
import {
  readAttributionParams,
  withAttributionParams,
  withJobberFormId,
  withLandingPage,
} from './utm.ts';

const JOBBER =
  'https://clienthub.getjobber.com/hubs/abc/public/requests/123/new';

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
] as const;

/**
 * The three GBP profile links, per docs/09-gbp-alignment-brief.md Task 7b.
 * Each must survive the full path: inbound landing URL → outbound Jobber link.
 */
const GBP_CAMPAIGNS = [
  {
    name: 'gbp-profile → /',
    search:
      '?utm_source=google&utm_medium=organic&utm_campaign=gbp-profile',
    expect: {
      utm_source: 'google',
      utm_medium: 'organic',
      utm_campaign: 'gbp-profile',
    },
  },
  {
    name: 'gbp-booking → /book/',
    search:
      '?utm_source=google&utm_medium=organic&utm_campaign=gbp-booking',
    expect: {
      utm_source: 'google',
      utm_medium: 'organic',
      utm_campaign: 'gbp-booking',
    },
  },
  {
    name: 'gbp-post with content topic',
    search:
      '?utm_source=google&utm_medium=organic&utm_campaign=gbp-post&utm_content=curtains-202608',
    expect: {
      utm_source: 'google',
      utm_medium: 'organic',
      utm_campaign: 'gbp-post',
      utm_content: 'curtains-202608',
    },
  },
];

for (const c of GBP_CAMPAIGNS) {
  const attribution = readAttributionParams(c.search);
  for (const [k, v] of Object.entries(c.expect)) {
    assert.equal(
      attribution[k as keyof typeof attribution],
      v,
      `${c.name}: ${k} should be read off the inbound URL`,
    );
  }

  // The build-time link carries only the internal form label; runtime
  // attribution (src/scripts/jobber-attribution.ts) layers the real origin on.
  const built = withJobberFormId(JOBBER, 'high_ceiling');
  const final = new URL(withAttributionParams(built, attribution));

  for (const [k, v] of Object.entries(c.expect)) {
    assert.equal(
      final.searchParams.get(k),
      v,
      `${c.name}: ${k} must survive onto the Jobber URL`,
    );
  }

  // Nothing the build stamps on may shadow the true campaign source.
  assert.equal(
    final.searchParams.get('utm_source'),
    'google',
    `${c.name}: inbound utm_source reaches Jobber intact`,
  );
  assert.equal(
    final.searchParams.get('utm_campaign'),
    c.expect.utm_campaign,
    `${c.name}: inbound utm_campaign reaches Jobber intact`,
  );

  // The form label rides along and never becomes a UTM.
  assert.equal(
    final.searchParams.get('eys_form'),
    'high_ceiling',
    `${c.name}: eys_form identifies which form produced the lead`,
  );
  if (!('utm_content' in c.expect)) {
    assert.equal(
      final.searchParams.get('utm_content'),
      null,
      `${c.name}: no utm_content is invented when inbound supplies none`,
    );
  }
}

// Paid click IDs ride along with the UTMs.
{
  const attribution = readAttributionParams(
    '?utm_source=google&utm_medium=cpc&gclid=TEST123&wbraid=WB456',
  );
  const final = new URL(
    withAttributionParams(withJobberFormId(JOBBER, 'high_ceiling'), attribution),
  );
  assert.equal(final.searchParams.get('gclid'), 'TEST123');
  assert.equal(final.searchParams.get('wbraid'), 'WB456');
  assert.equal(final.searchParams.get('utm_source'), 'google');
  assert.equal(final.searchParams.get('utm_medium'), 'cpc');
}

/**
 * The regression this file exists to prevent: an organic, Google Business
 * Profile or direct visitor must not have a UTM invented for them. Jobber
 * passes whatever it receives to GA4, so a default `utm_source=website&
 * utm_medium=referral&utm_campaign=jobber` relabelled every such lead as
 * site referral traffic and destroyed the real channel report.
 */
{
  const built = withJobberFormId(JOBBER, 'project-estimate');
  const noInbound = withAttributionParams(built, readAttributionParams(''));

  // No inbound attribution: the Jobber link is returned untouched.
  assert.equal(noInbound, built);

  const parsed = new URL(noInbound);
  for (const key of UTM_KEYS) {
    assert.equal(
      parsed.searchParams.get(key),
      null,
      `an unattributed visit must not carry ${key} into Jobber`,
    );
  }
  assert.equal(parsed.searchParams.get('eys_form'), 'project-estimate');
}

// `eys_lp` rides alongside `eys_form` and real UTMs without colliding with either.
{
  const attribution = readAttributionParams('?utm_source=google&utm_medium=cpc');
  const built = withLandingPage(withJobberFormId(JOBBER, 'high_ceiling'), '/services/tv-mounting/');
  const final = new URL(withAttributionParams(built, attribution));

  assert.equal(final.searchParams.get('eys_lp'), '/services/tv-mounting/');
  assert.equal(final.searchParams.get('eys_form'), 'high_ceiling');
  assert.equal(final.searchParams.get('utm_source'), 'google');

  // An empty path is a no-op, not a query param with an empty value.
  assert.equal(new URL(withLandingPage(JOBBER, '')).searchParams.has('eys_lp'), false);
}

console.log('utm.test.ts: all assertions passed');
