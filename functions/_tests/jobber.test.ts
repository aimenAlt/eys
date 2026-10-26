import assert from 'node:assert/strict';
import {
  DEFAULT_PLAN,
  JobberError,
  buildPlan,
  exchangeCode,
  fetchAccount,
  getAccessToken,
  graphql,
  introspect,
  probeSchema,
  saveConnection,
} from '../_lib/jobber.ts';
import { ensureSchema, HOUR, MINUTE } from '../_lib/db.ts';
import { healthReport } from '../_lib/health.ts';
import { submitServiceRequest } from '../_lib/intake.ts';
import { check, enumType, harness, nonNull, STRING, validBody, type Harness } from './helpers.ts';

async function withTokens(expiresIn: number): Promise<{ h: Harness; access: string; refresh: string }> {
  const h = harness();
  await ensureSchema(h.db);
  const pair = h.fake.issue();
  await saveConnection(
    h.jobberDeps(),
    { access: pair.access, refresh: pair.refresh, expiresAt: h.clock.now() + expiresIn },
    { id: 'account-1', name: 'Elevate Your Space Handyman' },
  );
  return { h, ...pair };
}

await check('tokens are encrypted at rest; D1 never shows a usable token', async () => {
  const { h, access, refresh } = await withTokens(HOUR);
  const row = h.db.raw.prepare('SELECT * FROM jobber_tokens').get() as Record<string, string>;
  assert.ok(row.access_token.startsWith('v1.') && row.refresh_token.startsWith('v1.'));
  assert.ok(!JSON.stringify(row).includes(access) && !JSON.stringify(row).includes(refresh));
  assert.equal(await getAccessToken(h.jobberDeps()), access);
  // A different admin key cannot read them: treated as not connected.
  await assert.rejects(getAccessToken({ ...h.jobberDeps(), adminKey: 'another-admin-key-123456' }), (e: unknown) =>
    e instanceof JobberError && e.errorClass === 'not_connected');
});

await check('expired access token refreshes and persists the rotated refresh token', async () => {
  const { h, refresh } = await withTokens(MINUTE); // inside the 2-minute margin
  const token = await getAccessToken(h.jobberDeps());
  assert.equal(token, 'access-2');
  assert.deepEqual(h.fake.tokenCalls, ['refresh_token']);
  assert.ok(!h.fake.validRefresh.has(refresh), 'old refresh token is dead (rotation)');
  // The new pair is what D1 now holds: a second refresh later uses refresh-2.
  h.clock.advance(2 * HOUR);
  assert.equal(await getAccessToken(h.jobberDeps()), 'access-3');
  assert.deepEqual(h.fake.tokenCalls, ['refresh_token', 'refresh_token']);
});

await check('concurrent refresh: one isolate redeems, the other waits and re-reads', async () => {
  const { h } = await withTokens(-MINUTE);
  const [a, b, c] = await Promise.all([
    getAccessToken(h.jobberDeps()),
    getAccessToken(h.jobberDeps()),
    getAccessToken(h.jobberDeps()),
  ]);
  assert.equal(h.fake.tokenCalls.length, 1, 'refresh token redeemed exactly once');
  assert.equal(a, 'access-2');
  assert.equal(b, 'access-2');
  assert.equal(c, 'access-2');
  assert.ok(h.sleeps.length > 0, 'losers backed off');
  const lock = h.db.raw.prepare('SELECT lock_owner FROM jobber_tokens').get() as { lock_owner: string | null };
  assert.equal(lock.lock_owner, null, 'lock released');
});

await check('invalid_grant: re-read, retry with backoff, then mark refresh_failed', async () => {
  const { h, refresh } = await withTokens(-MINUTE);
  h.fake.validRefresh.delete(refresh);
  await assert.rejects(getAccessToken(h.jobberDeps()), (e: unknown) => e instanceof JobberError && e.errorClass === 'refresh_failed');
  assert.equal(h.fake.tokenCalls.length, 4);
  assert.deepEqual(h.sleeps, [200, 400, 800]);
  const health = await healthReport(h.env, h.clock.now());
  assert.equal(health.jobber.connected, false);
  assert.equal(health.jobber.token_status, 'refresh_failed');
  await assert.rejects(getAccessToken(h.jobberDeps()), (e: unknown) => e instanceof JobberError && e.errorClass === 'not_connected');
});

await check('invalid_grant because another isolate already rotated: picks up its tokens', async () => {
  const { h, refresh } = await withTokens(-MINUTE);
  h.fake.validRefresh.delete(refresh);
  // While this isolate backs off, "another isolate" stores a fresh pair.
  h.onSleep = async () => {
    const pair = h.fake.issue();
    await saveConnection(h.jobberDeps(), { access: pair.access, refresh: pair.refresh, expiresAt: h.clock.now() + HOUR }, {
      id: 'account-1',
      name: 'Elevate Your Space Handyman',
    });
    h.onSleep = undefined;
  };
  assert.equal(await getAccessToken(h.jobberDeps()), 'access-2');
  assert.equal(h.fake.tokenCalls.length, 1);
});

await check('401 from the API forces one refresh and a retry', async () => {
  const { h } = await withTokens(HOUR);
  h.fake.unauthorizedNext = 1;
  const data = await graphql<{ account: { name: string } }>(h.jobberDeps(), 'query EysAccount { account { id name } }');
  assert.equal(data.account.name, 'Elevate Your Space Handyman');
  assert.deepEqual(h.fake.tokenCalls, ['refresh_token']);
});

await check('code exchange sends the PKCE verifier; account name is read with the new token', async () => {
  const h = harness();
  await ensureSchema(h.db);
  const tokens = await exchangeCode(h.jobberDeps(), 'good-code', 'verifier-abc');
  assert.equal(tokens.access, 'access-1');
  assert.equal(tokens.expiresAt, h.clock.now() + HOUR);
  assert.deepEqual(await fetchAccount(h.jobberDeps(), tokens.access), { id: 'account-1', name: 'Elevate Your Space Handyman' });
  await assert.rejects(exchangeCode(h.jobberDeps(), 'bad-code', 'v'), (e: unknown) => e instanceof JobberError && e.errorClass === 'auth');
});

await check('introspection builds the expected plan from a Jobber-shaped schema', async () => {
  const { h } = await withTokens(HOUR);
  const snapshot = await introspect(h.jobberDeps());
  assert.ok(snapshot);
  const { plan, problems, warnings } = buildPlan(snapshot);
  assert.deepEqual(problems, []);
  assert.deepEqual(warnings, []);
  assert.equal(plan.source, 'introspection');
  assert.deepEqual(plan.clientSearch, { arg: 'searchTerm', argType: 'String', first: true });
  assert.equal(plan.note?.mutation, 'requestCreateNote');
  assert.equal(plan.note?.textField, 'message');
  assert.equal(plan.propertyCreate.wrapper, 'properties');
  assert.equal(plan.requestCreate.detailsField, null);
  assert.deepEqual(plan.readback.notes, { field: 'notes', first: true, noteType: 'RequestNote', textField: 'message' });
  const { source: _a, ...introspected } = plan;
  const { source: _b, ...defaults } = DEFAULT_PLAN;
  assert.deepEqual(introspected, defaults, 'defaults match the Jobber-shaped schema');
});

await check('plan adapts: details field, connection properties, no note mutation', async () => {
  const { h } = await withTokens(HOUR);
  const schema = h.fake.schema;
  schema.mutations = schema.mutations.filter((m) => m.name !== 'requestCreateNote');
  const requestInput = schema.types.get('RequestCreateInput');
  requestInput?.inputFields?.push({ name: 'details', type: { kind: 'SCALAR', name: 'String', ofType: null } });
  const client = schema.types.get('Client');
  if (client?.fields) {
    client.fields = client.fields.map((f) =>
      f.name === 'properties'
        ? { name: 'clientProperties', args: [{ name: 'first', type: { kind: 'SCALAR', name: 'Int', ofType: null } }], type: { kind: 'OBJECT', name: 'PropertyConnection', ofType: null } }
        : f,
    );
  }
  schema.types.set('PropertyConnection', {
    name: 'PropertyConnection',
    kind: 'OBJECT',
    fields: [{ name: 'nodes', type: { kind: 'LIST', name: null, ofType: { kind: 'OBJECT', name: 'Property', ofType: null } } }],
    inputFields: null,
    possibleTypes: null,
  });
  const { plan, problems } = buildPlan(await introspect(h.jobberDeps()));
  assert.deepEqual(problems, []);
  assert.equal(plan.note, null);
  assert.equal(plan.requestCreate.detailsField, 'details');
  assert.deepEqual(plan.clientProperties, { field: 'clientProperties', connection: true, first: true });
});

await check('missing pieces are reported as problems, not guessed', async () => {
  const { h } = await withTokens(HOUR);
  h.fake.schema.mutations = h.fake.schema.mutations.filter((m) => m.name !== 'requestCreateNote' && m.name !== 'propertyCreate');
  const { problems } = buildPlan(await introspect(h.jobberDeps()));
  assert.ok(problems.includes('mutation propertyCreate not found'));
  assert.ok(problems.some((p) => p.startsWith('no request note mutation and no details field')));
});

await check('introspection disabled: probe says so plainly, plan falls back to defaults', async () => {
  const { h } = await withTokens(HOUR);
  h.fake.introspection = false;
  assert.equal(await introspect(h.jobberDeps()), null);
  const probe = await probeSchema(h.jobberDeps());
  assert.equal(probe.introspection, 'disabled');
  assert.match(String((probe as { message: string }).message), /could not be read/);
});

await check('probe lists requestCreate, client/property inputs and every Request/Note mutation', async () => {
  const { h } = await withTokens(HOUR);
  const probe = (await probeSchema(h.jobberDeps())) as Record<string, unknown>;
  assert.equal(probe.introspection, 'enabled');
  const requestCreate = probe.request_create as { args: { name: string; input_fields: { name: string }[] }[] };
  assert.deepEqual(requestCreate.args[0].input_fields.map((f) => f.name), ['clientId', 'propertyId', 'title']);
  const property = probe.property_create as { args: { name: string; input_fields?: { name: string; input_fields?: unknown }[] }[] };
  assert.deepEqual(property.args.map((a) => a.name), ['clientId', 'input']);
  assert.ok(property.args[1].input_fields?.[0].input_fields, 'nested PropertyAttributes expanded');
  const related = (probe.request_and_note_mutations as { name: string }[]).map((m) => m.name);
  assert.deepEqual(related, ['jobCreateNote', 'requestCreate', 'requestCreateNote']);
  assert.deepEqual(probe.plan_problems, []);
  assert.ok(!JSON.stringify(probe).includes('access-'), 'no token in probe output');
});

await check('contact labels: MAIN when listed, else MOBILE / PERSONAL, else OTHER, else the first; omitted when absent', async () => {
  const { h } = await withTokens(HOUR);
  const types = h.fake.schema.types;
  types.set('PhoneNumberDescription', enumType('PhoneNumberDescription', ['WORK', 'MOBILE', 'HOME']));
  types.set('EmailDescription', enumType('EmailDescription', ['WORK', 'PERSONAL']));
  let { plan } = buildPlan(await introspect(h.jobberDeps()));
  assert.equal(plan.clientCreate.phoneDescription, 'MOBILE');
  assert.equal(plan.clientCreate.emailDescription, 'PERSONAL');

  types.set('PhoneNumberDescription', enumType('PhoneNumberDescription', ['WORK', 'OTHER']));
  types.set('EmailDescription', enumType('EmailDescription', ['BUSINESS', 'HOME']));
  ({ plan } = buildPlan(await introspect(h.jobberDeps())));
  assert.equal(plan.clientCreate.phoneDescription, 'OTHER');
  assert.equal(plan.clientCreate.emailDescription, 'BUSINESS', 'first value as the last resort');

  const phone = types.get('PhoneNumberCreateAttributes');
  if (phone?.inputFields) phone.inputFields = phone.inputFields.filter((f) => f.name !== 'description' && f.name !== 'primary');
  ({ plan } = buildPlan(await introspect(h.jobberDeps())));
  assert.equal(plan.clientCreate.phoneDescription, null);
  assert.equal(plan.clientCreate.phonePrimary, false);
});

await check('the chosen label is what createClient sends; a missing field is left out', async () => {
  const h = harness();
  await ensureSchema(h.db);
  const pair = h.fake.issue();
  await saveConnection(h.jobberDeps(), { access: pair.access, refresh: pair.refresh, expiresAt: h.clock.now() + HOUR }, {
    id: 'account-1',
    name: 'Elevate Your Space Handyman',
  });
  h.fake.schema.types.set('PhoneNumberDescription', enumType('PhoneNumberDescription', ['MOBILE', 'WORK']));
  const email = h.fake.schema.types.get('EmailCreateAttributes');
  if (email?.inputFields) email.inputFields = email.inputFields.filter((f) => f.name !== 'description');
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'submitted');
  assert.deepEqual(h.fake.clients[0].phones, [{ number: '(281) 555-2368', description: 'MOBILE', primary: true, smsAllowed: true }]);
  assert.deepEqual(h.fake.clients[0].emails, [{ address: 'dana.whitfield@example.com', primary: true }]);
});

await check('pre-flight: an unknown required input or argument blocks the plan with a named problem', async () => {
  const { h } = await withTokens(HOUR);
  const request = h.fake.schema.types.get('RequestCreateInput');
  request?.inputFields?.push({ name: 'foo', type: nonNull(STRING) });
  request?.inputFields?.push({ name: 'withDefault', type: nonNull(STRING), defaultValue: '"x"' });
  const address = h.fake.schema.types.get('AddressAttributes');
  address?.inputFields?.push({ name: 'country', type: nonNull(STRING) });
  const create = h.fake.schema.mutations.find((m) => m.name === 'clientCreate');
  create?.args?.push({ name: 'dryRun', type: nonNull(STRING) });
  const { problems } = buildPlan(await introspect(h.jobberDeps()));
  assert.ok(problems.includes('RequestCreateInput.foo is required and not supplied'));
  assert.ok(!problems.some((p) => p.includes('withDefault')), 'a default counts as supplied');
  assert.ok(problems.includes('clientCreate(dryRun) is required and not supplied'));
  assert.ok(problems.some((p) => p.startsWith('AddressAttributes.country')), JSON.stringify(problems));
});

await check('pre-flight: a note mutation needing unknown inputs is skipped for the details field', async () => {
  const { h } = await withTokens(HOUR);
  h.fake.schema.types.get('RequestCreateNoteInput')?.inputFields?.push({ name: 'visibility', type: nonNull(STRING) });
  let { plan, problems } = buildPlan(await introspect(h.jobberDeps()));
  assert.ok(problems.includes('no request note mutation and no details field: the job text could not be attached'));
  assert.ok(problems.includes('RequestCreateNoteInput.visibility is required and not supplied'));
  h.fake.schema.types.get('RequestCreateInput')?.inputFields?.push({ name: 'details', type: STRING });
  let warnings: string[];
  ({ plan, problems, warnings } = buildPlan(await introspect(h.jobberDeps())));
  assert.deepEqual(problems, []);
  assert.equal(plan.note, null);
  assert.equal(plan.requestCreate.detailsField, 'details');
  assert.ok(warnings.some((w) => w.startsWith('note mutation skipped')));
});

await check('probe shows enum values and marks required inputs', async () => {
  const { h } = await withTokens(HOUR);
  const probe = (await probeSchema(h.jobberDeps())) as Record<string, unknown>;
  const client = probe.client_create as { args: { input_fields: { name: string; input_fields?: { name: string; enum_values?: string[]; required?: boolean }[] }[] }[] };
  const phones = client.args[0].input_fields.find((f) => f.name === 'phones');
  const description = phones?.input_fields?.find((f) => f.name === 'description');
  assert.deepEqual(description?.enum_values, ['MAIN', 'MOBILE', 'WORK', 'HOME', 'FAX', 'OTHER']);
  assert.equal(phones?.input_fields?.find((f) => f.name === 'number')?.required, true);
});
