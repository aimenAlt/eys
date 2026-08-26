import assert from 'node:assert/strict';
import {
  readAttributionParams,
  withAttributionParams,
  withJobberUtm,
} from './utm.ts';

const JOBBER =
  'https://clienthub.getjobber.com/hubs/abc/public/requests/123/new';

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

  // Build-time UTMs are applied first, then runtime attribution is layered on
  // (src/scripts/curtain-attribution.ts). The real origin must win.
  const built = withJobberUtm(JOBBER, 'high_ceiling');
  const final = new URL(withAttributionParams(built, attribution));

  for (const [k, v] of Object.entries(c.expect)) {
    assert.equal(
      final.searchParams.get(k),
      v,
      `${c.name}: ${k} must survive onto the Jobber URL`,
    );
  }

  // The default website/jobber UTMs must not shadow the true campaign source.
  assert.equal(
    final.searchParams.get('utm_source'),
    'google',
    `${c.name}: inbound utm_source must overwrite the default "website"`,
  );
  assert.equal(
    final.searchParams.get('utm_campaign'),
    c.expect.utm_campaign,
    `${c.name}: inbound utm_campaign must overwrite the default "jobber"`,
  );

  // utm_content is set at build time and only overridden when inbound supplies one.
  if (!('utm_content' in c.expect)) {
    assert.equal(
      final.searchParams.get('utm_content'),
      'high_ceiling',
      `${c.name}: build-time utm_content is preserved when inbound has none`,
    );
  }
}

// Paid click IDs ride along with the UTMs.
{
  const attribution = readAttributionParams(
    '?utm_source=google&utm_medium=cpc&gclid=TEST123&wbraid=WB456',
  );
  const final = new URL(
    withAttributionParams(withJobberUtm(JOBBER, 'high_ceiling'), attribution),
  );
  assert.equal(final.searchParams.get('gclid'), 'TEST123');
  assert.equal(final.searchParams.get('wbraid'), 'WB456');
}

// No inbound attribution: the Jobber link is returned untouched.
{
  const built = withJobberUtm(JOBBER, 'high_ceiling');
  assert.equal(withAttributionParams(built, readAttributionParams('')), built);
}

console.log('utm.test.ts: all assertions passed');
