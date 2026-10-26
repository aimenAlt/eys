/**
 * The ChatGPT plugin package in docs/ai-intake/plugin/ (Agent Plugins layout)
 * against OpenAI's submission limits and this feature's copy rules.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BUSINESS } from '../_lib/config.ts';
import { TOOLS } from '../_lib/mcp.ts';
import { check } from './helpers.ts';

const root = new URL('../../', import.meta.url).pathname;
const dir = join(root, 'docs/ai-intake/plugin');
const PLACEHOLDER = 'REPLACE_AT_UPLOAD';

type Json = Record<string, unknown>;
const readJson = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as Json;

const plugin = readJson('plugin.json');
const mcp = readJson('mcp.json');
const openai = (plugin.extensions as Json)['com.openai'] as Json;
const ui = openai.interface as Json;
const review = openai.review as Json;
const publication = openai.publication as Json;

await check('plugin.json: allowed top-level keys, kebab-case name, semver version', () => {
  assert.deepEqual(Object.keys(plugin), ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'extensions']);
  assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  const name = String(plugin.name);
  assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.match(name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/, 'the Agent Plugins schema pattern');
  assert.ok(name.length <= 64);
  assert.match(String(plugin.version), /^\d+\.\d+\.\d+$/);
  assert.ok(String(plugin.description).length > 0 && String(plugin.description).length <= 4000);
  assert.deepEqual(plugin.author, { name: BUSINESS.name, url: 'https://www.eyshandyman.com/' });
  assert.deepEqual(Object.keys(plugin.extensions as Json), ['com.openai']);
  assert.deepEqual(Object.keys(openai), ['interface', 'review', 'publication'], 'review and publication beside interface');
});

await check('listing text fits the submission limits', () => {
  assert.equal(ui.displayName, BUSINESS.name);
  assert.ok(String(ui.displayName).length <= 30);
  assert.ok(String(ui.shortDescription).length <= 30);
  assert.ok(String(ui.longDescription).length <= 4000);
  const prompts = ui.defaultPrompt as string[];
  assert.ok(Array.isArray(prompts) && prompts.length >= 1 && prompts.length <= 3);
  assert.equal(new Set(prompts).size, prompts.length, 'prompts are unique');
  for (const prompt of prompts) {
    assert.ok(prompt.length <= 128, prompt);
    assert.ok(!prompt.includes('@'), 'no @ mentions');
  }
  for (const field of ['developerName', 'category']) assert.ok(String(ui[field]).length > 0, field);
  assert.ok(String(ui.developerName).length <= 80);
});

await check('listing URLs are https, short, and pages this site builds', () => {
  for (const field of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) {
    const value = String(ui[field]);
    assert.ok(value.length <= 1024, field);
    const url = new URL(value);
    assert.equal(url.protocol, 'https:', field);
    assert.equal(url.host, 'www.eyshandyman.com', field);
    const path = url.pathname.replace(/^\/|\/$/g, '');
    const page = path === '' ? 'index' : path;
    assert.ok(
      existsSync(join(root, `src/pages/${page}.astro`)) || existsSync(join(root, `src/pages/${page}/index.astro`)),
      `${field}: no src/pages entry for ${url.pathname}`,
    );
  }
  assert.equal(plugin.homepage, ui.websiteURL);
});

await check('brand colors meet the 2:1 contrast rule', () => {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  assert.match(String(ui.brandColor), /^#[0-9a-fA-F]{6}$/);
  assert.match(String(ui.brandColorDark), /^#[0-9a-fA-F]{6}$/);
  assert.ok(contrast(String(ui.brandColor), '#ffffff') >= 2);
  assert.ok(contrast(String(ui.brandColorDark), '#212121') >= 2);
});

await check('icon: square PNG, at least 48 px, at most 5 MiB, the site favicon', () => {
  for (const field of ['logo', 'composerIcon']) assert.equal(ui[field], './assets/icon.png', field);
  const file = join(dir, 'assets/icon.png');
  const bytes = readFileSync(file);
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'PNG signature');
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert.equal(width, height, 'square');
  assert.ok(width >= 48 && width <= 4096);
  assert.ok(statSync(file).size <= 5 * 1024 * 1024);
  assert.ok(bytes.equals(readFileSync(join(root, 'public/favicon-512.png'))), 'byte-for-byte public/favicon-512.png');
});

await check('review: 5 positive and 3 negative cases naming real tools; no credentials in the package', () => {
  const cases = review.test_cases as { positive: Json[]; negative: Json[] };
  assert.equal(cases.positive.length, 5);
  assert.equal(cases.negative.length, 3);
  const toolNames = new Set(TOOLS.map((t) => t.name));
  for (const c of cases.positive) {
    for (const key of ['description', 'prompt', 'tools_triggered', 'expected_behavior']) {
      assert.equal(typeof c[key], 'string', `positive case needs ${key}`);
      assert.ok(String(c[key]).length > 0);
    }
    for (const name of String(c.tools_triggered).split(',').map((s) => s.trim())) {
      assert.ok(toolNames.has(name), `unknown tool ${name}`);
    }
  }
  for (const c of cases.negative) {
    assert.deepEqual(Object.keys(c), ['description', 'prompt']);
  }
  assert.equal(review.commerce, false);
  assert.ok(String(review.commerce_description).length > 0);
  assert.ok(String(review.demo_recording_url).length > 0);
  const text = JSON.stringify(plugin);
  assert.ok(!/test_credentials|reviewer_instructions/.test(text));
  assert.deepEqual(publication.countries, ['US']);
  assert.ok(String(publication.release_notes).length > 0);
});

await check('mcp.json: one streamable-http server at /mcp, no headers, no extensions, no auth', () => {
  assert.deepEqual(Object.keys(mcp), ['$schema', 'mcpServers']);
  assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
  const servers = Object.values(mcp.mcpServers as Json);
  assert.equal(servers.length, 1);
  assert.deepEqual(servers[0], { type: 'streamable-http', url: `${BUSINESS.website}/mcp` });
});

await check('listing text keeps the copy rules: one phone, no licensed / HOA / guarantee / insured', () => {
  const text = JSON.stringify(ui);
  for (const banned of [/\blicensed\b/i, /\bHOAs?\b/i, /guarantee/i, /\binsured\b/i, /insurance/i, /\(718\)/, /\b718\b/]) {
    assert.ok(!banned.test(text), `listing text matches ${banned}`);
  }
  const phones = new Set(text.match(/\(?\b\d{3}\)?[\s.-]\d{3}-\d{4}\b/g) ?? []);
  assert.deepEqual([...phones], [BUSINESS.phone]);
  assert.ok(!/\$\d/.test(text), 'no dollar prices in the listing');
  assert.ok(!/street|zip code/i.test(text), 'the listing never says ChatGPT collects an address');
  // The owner fills three values at upload; nothing else may be left as a placeholder.
  const fillable = [ui.developerName, ui.category, review.demo_recording_url];
  const placeholders = JSON.stringify(plugin).match(new RegExp(PLACEHOLDER, 'g')) ?? [];
  assert.equal(placeholders.length, fillable.filter((value) => value === PLACEHOLDER).length);
  if (review.demo_recording_url !== PLACEHOLDER) assert.match(String(review.demo_recording_url), /^https:\/\//);
});
