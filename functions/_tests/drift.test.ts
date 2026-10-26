/**
 * The functions mirror a few business facts because Workers cannot import
 * src/data/business.ts. These tests fail the moment a mirror drifts from the
 * site's single source, and enforce the backlog's copy rules on every string
 * an assistant can see.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { formatUsd, smallRepairPricing, additionalTimeLabel } from '../../src/data/pricing/todoList.ts';
import {
  ASSISTANT_INSTRUCTIONS,
  BUSINESS,
  CORE_SERVICE_ZIPS,
  MCP_ASSISTANT_INSTRUCTIONS,
  REQUEST_PATHS,
  SERVICE_AREAS,
  SERVICE_GROUPS,
  serviceAreaList,
} from '../_lib/config.ts';
import { businessInfo } from '../_lib/info.ts';
import {
  MCP_SERVICE_REQUEST_INPUT_SCHEMA,
  MCP_SUBMIT_DESCRIPTION,
  openApiDocument,
  SERVICE_REQUEST_INPUT_SCHEMA,
  SERVICE_REQUEST_OUTPUT_SCHEMA,
} from '../_lib/schemas.ts';
import { validateServiceRequest } from '../_lib/validate.ts';
import { submitServiceRequest } from '../_lib/intake.ts';
import { addressFreeBody, check, harness, validBody } from './helpers.ts';

const root = new URL('../../', import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

await check('business constants match src/data/business.ts', () => {
  const source = read('src/data/business.ts');
  assert.ok(source.includes(`name: '${BUSINESS.name}'`));
  assert.ok(source.includes(`shortName: '${BUSINESS.shortName}'`));
  assert.ok(source.includes(`phone: '${BUSINESS.phone}'`));
  assert.ok(source.includes(`phoneTel: '${BUSINESS.phoneTel}'`));
  assert.ok(source.includes(`url: '${BUSINESS.website}'`));
  const areas = /areaServed: \[([^\]]+)\]/.exec(source)?.[1];
  assert.ok(areas, 'areaServed literal found');
  assert.deepEqual(
    areas.split(',').map((s) => s.trim().replace(/^'|'$/g, '')),
    [...SERVICE_AREAS],
    'service areas in the site order',
  );
});

await check('service-area wording names business.ts areaServed, in order, wherever the MCP door uses it', () => {
  const areas = /areaServed: \[([^\]]+)\]/.exec(read('src/data/business.ts'))?.[1];
  assert.ok(areas);
  const names = areas.split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  const list = (conjunction: string) => `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
  assert.equal(serviceAreaList('or'), list('or'));
  assert.equal(serviceAreaList('and'), list('and'));
  assert.ok(MCP_SERVICE_REQUEST_INPUT_SCHEMA.properties.service_area_confirmed.description.includes(`${list('or')}, TX`));
  assert.ok(MCP_ASSISTANT_INSTRUCTIONS.includes(`${list('or')}, TX`));
  const refused = validateServiceRequest(addressFreeBody({ service_area_confirmed: false }), { addressOptional: true });
  assert.ok(!refused.ok && refused.errors[0].problem.includes(`serves ${list('and')}, TX`));
  const missing = validateServiceRequest(addressFreeBody({ service_area_confirmed: undefined }), { addressOptional: true });
  assert.ok(!missing.ok && missing.errors[0].problem.includes(`${list('or')}, TX`));
});

await check('service groups match src/data/serviceCategories.ts', () => {
  const source = read('src/data/serviceCategories.ts');
  const titles = [...source.matchAll(/^ {4}title: '([^']+)',\n {4}summary:\n {6}'([^']+)',/gm)].map((m) => ({
    name: m[1],
    summary: m[2],
  }));
  assert.deepEqual(titles, SERVICE_GROUPS.map((g) => ({ ...g })));
});

await check('request paths match the homepage pathway cards', () => {
  const source = read('src/components/home/pathways/ServicePathwaysSection.astro');
  for (const id of ['todo_list_visit', 'photo_estimate', 'custom_project'] as const) {
    assert.ok(source.includes(`title: '${REQUEST_PATHS[id].name}'`), `${id} name`);
    assert.ok(source.includes(`'${REQUEST_PATHS[id].best_for}'`), `${id} best_for`);
  }
});

await check('core ZIPs are exactly the ZIPs the site names', () => {
  const zips = new Set<string>();
  for (const dir of ['src/content/service-areas', 'src/content/communities', 'src/content/city-services']) {
    for (const file of readdirSync(join(root, dir))) {
      if (!file.endsWith('.md')) continue;
      for (const m of read(`${dir}/${file}`).matchAll(/\b77\d{3}\b/g)) zips.add(m[0]);
    }
  }
  const businessZip = /zip: '(\d{5})'/.exec(read('src/data/business.ts'))?.[1];
  assert.ok(businessZip);
  zips.add(businessZip);
  assert.deepEqual([...zips].sort(), [...CORE_SERVICE_ZIPS]);
});

await check('to-do list prices come from todoList.ts as flat visit blocks', () => {
  const pricing = businessInfo().todo_list_visit_pricing;
  assert.deepEqual(
    pricing.flat_visit_blocks.map((b) => b.price),
    [smallRepairPricing.oneHour, smallRepairPricing.twoHours, smallRepairPricing.threeHours].map(formatUsd),
  );
  assert.equal(pricing.additional_time, additionalTimeLabel);
  const prices = JSON.stringify(pricing.flat_visit_blocks);
  assert.ok(!/hour(ly)?\s*rate|\/\s*h(ou)?r|per hour/i.test(prices));
});

/** Every string an assistant can read from this feature. */
async function assistantFacingText(): Promise<string> {
  const h = harness();
  const outcomes = await Promise.all([
    submitServiceRequest(validBody({ confirmed_by_customer: false, job_details: 'Replace two outlets and a breaker in the garage, please.' }), h.intakeDeps()),
    submitServiceRequest({}, h.intakeDeps()),
    submitServiceRequest(validBody({ state: 'NM', zip: '87101' }), h.intakeDeps()),
    submitServiceRequest(validBody(), h.intakeDeps()),
    submitServiceRequest(addressFreeBody({ confirmed_by_customer: false }), h.intakeDeps(), { addressOptional: true }),
    submitServiceRequest(addressFreeBody({ service_area_confirmed: false }), h.intakeDeps(), { addressOptional: true }),
    submitServiceRequest(addressFreeBody({ service_area_confirmed: undefined }), h.intakeDeps(), { addressOptional: true }),
  ]);
  return JSON.stringify([
    ASSISTANT_INSTRUCTIONS,
    MCP_ASSISTANT_INSTRUCTIONS,
    MCP_SERVICE_REQUEST_INPUT_SCHEMA,
    MCP_SUBMIT_DESCRIPTION,
    businessInfo(),
    SERVICE_REQUEST_INPUT_SCHEMA,
    SERVICE_REQUEST_OUTPUT_SCHEMA,
    openApiDocument('https://www.eyshandyman.com'),
    outcomes,
  ]);
}

await check('hard rules: no "licensed", no HOA, one phone number, no hours or reviews', async () => {
  const text = await assistantFacingText();
  assert.ok(!/\blicensed\b/i.test(text), 'never "licensed"');
  assert.ok(!/\bHOAs?\b|homeowners'? association/i.test(text), 'HOA silence');
  const phones = new Set(text.match(/\(?\b\d{3}\)?[\s.-]\d{3}-\d{4}\b/g) ?? []);
  assert.deepEqual([...phones], ['(346) 820-1629'], 'only the EYS phone');
  assert.ok(!text.includes('718'), 'old number never appears');
  assert.ok(!/\b\d{1,2}(:\d{2})?\s*(AM|PM)\b|7 days|open until/i.test(text), 'no opening hours');
  assert.ok(!/\b\d+\+?\s*(Google )?reviews\b|\b5\.0\b|stars?\b/i.test(text), 'no review counts or ratings');
  assert.ok(text.includes('explain what it can take on'), 'electrical guidance appears when relevant');
});

await check('no hosted Jobber form URL or retired form id anywhere in functions/', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (entry.isDirectory()) walk(`${dir}/${entry.name}`);
      else if (entry.name.endsWith('.ts') && entry.name !== 'drift.test.ts') files.push(`${dir}/${entry.name}`);
    }
  };
  walk('functions');
  for (const file of files) {
    const source = read(file);
    assert.ok(!source.includes('clienthub.getjobber.com'), `${file} links a hosted form`);
    assert.ok(!/2019189|4372609|4975089|5025076/.test(source), `${file} names a retired form`);
    assert.ok(!/gtag|G-9D5MCDT0L1|AW-16988082106|generate_lead|measurement_protocol|google-analytics/i.test(source), `${file} touches analytics`);
  }
});
