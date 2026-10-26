import assert from 'node:assert/strict';
import { submitServiceRequest, type IntakeResult } from '../_lib/intake.ts';
import { saveConnection } from '../_lib/jobber.ts';
import { ensureSchema, DAY, HOUR } from '../_lib/db.ts';
import { NO_ADDRESS_LINE, NOTE_HEADER } from '../_lib/note.ts';
import { healthReport } from '../_lib/health.ts';
import { addressFreeBody, check, harness, ID, nonNull, STRING, validBody, type Harness } from './helpers.ts';

/** A harness with a connected Jobber account (fresh tokens in D1). */
async function connected(envOverrides = {}): Promise<Harness> {
  const h = harness(envOverrides);
  await ensureSchema(h.db);
  const pair = h.fake.issue();
  await saveConnection(
    h.jobberDeps(),
    { access: pair.access, refresh: pair.refresh, expiresAt: h.clock.now() + HOUR },
    { id: 'account-1', name: 'Elevate Your Space Handyman' },
  );
  return h;
}

function assertNoPii(result: IntakeResult) {
  const text = JSON.stringify(result);
  for (const secret of ['Dana', 'Whitfield', '2368', 'Cane Field', 'example.com', 'client-', 'request-', 'property-']) {
    assert.ok(!text.includes(secret), `response leaks ${secret}`);
  }
  assert.ok(text.includes('(346) 820-1629'), 'response always carries the EYS phone');
}

function rowCount(h: Harness, table: string): number {
  return (h.db.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

await check('validate-only (confirmed false) writes nothing anywhere', async () => {
  const h = harness();
  const result = await submitServiceRequest(validBody({ confirmed_by_customer: false }), h.intakeDeps());
  assert.equal(result.status, 'ready_to_submit');
  assert.equal(result.reference, null);
  assert.deepEqual(h.db.tables(), [], 'no table was even created');
  assert.deepEqual(h.fake.operations, []);
  assert.deepEqual(h.fake.tokenCalls, []);
  assert.ok(result.next_steps.some((s) => s.includes('confirmed_by_customer true')));
  assertNoPii(result);
});

await check('needs_changes lists fields; out-of-state gets the polite refusal', async () => {
  const h = harness();
  const missing = await submitServiceRequest({ source: 'claude' }, h.intakeDeps());
  assert.equal(missing.status, 'needs_changes');
  assert.ok(missing.errors.length > 5);
  const outside = await submitServiceRequest(validBody({ state: 'OK', zip: '73301' }), h.intakeDeps());
  assert.equal(outside.status, 'needs_changes');
  assert.match(outside.message_for_customer, /only takes requests for Texas addresses.*\(346\) 820-1629/);
  assert.equal(h.logs.at(-1)?.error_class, 'out_of_state');
  assert.deepEqual(h.db.tables(), []);
});

await check('non-live hosts are validate-only even when confirmed', async () => {
  const h = await connected();
  const result = await submitServiceRequest(validBody(), h.intakeDeps('https://eys-48z.pages.dev/api/ai/service-requests'));
  assert.equal(result.status, 'ready_to_submit');
  assert.deepEqual(h.fake.operations, []);
  assert.equal(rowCount(h, 'ai_requests'), 0);
});

await check('kill switch: AI_INTAKE_ENABLED not exactly "true" → unavailable, no writes', async () => {
  for (const value of ['false', 'TRUE', '1', ' true', 'true\n', undefined]) {
    const h = await connected({ AI_INTAKE_ENABLED: value });
    const result = await submitServiceRequest(validBody(), h.intakeDeps());
    assert.equal(result.status, 'unavailable');
    assert.equal(h.logs.at(-1)?.error_class, 'disabled');
    assert.deepEqual(h.fake.operations, []);
  }
});

await check('unconfigured or disconnected degrades to unavailable + phone', async () => {
  const noDb = harness({ EYS_AI_DB: undefined });
  noDb.env.EYS_AI_DB = undefined;
  const a = await submitServiceRequest(validBody(), noDb.intakeDeps());
  assert.equal(a.status, 'unavailable');
  assert.equal(noDb.logs.at(-1)?.error_class, 'not_configured');

  const noTokens = harness();
  const b = await submitServiceRequest(validBody(), noTokens.intakeDeps());
  assert.equal(b.status, 'unavailable');
  assert.equal(noTokens.logs.at(-1)?.error_class, 'not_connected');
  assert.match(b.message_for_customer, /\(346\) 820-1629/);
});

await check('new client: client, property, request, note, read-back', async () => {
  const h = await connected();
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'submitted', JSON.stringify(h.logs));
  assert.match(result.reference ?? '', /^EYS-AI-[2-9A-HJKMNP-TV-Z]{5}$/);
  assertNoPii(result);
  assert.deepEqual(
    h.fake.operations.filter((op) => !op.startsWith('EysSchema')),
    ['EysFindClients', 'EysFindClients', 'EysCreateClient', 'EysCreateProperty', 'EysCreateRequest', 'EysAddNote', 'EysVerifyRequest'],
  );
  const [client] = h.fake.clients;
  assert.equal(client.firstName, 'Dana');
  assert.equal(client.lastName, 'Whitfield');
  assert.deepEqual(client.phones, [{ number: '(281) 555-2368', description: 'MAIN', primary: true, smsAllowed: true }]);
  assert.equal(client.emails[0].address, 'dana.whitfield@example.com');
  assert.deepEqual(client.properties[0].address, {
    street1: '2418 Cane Field Drive',
    city: 'Katy',
    province: 'TX',
    postalCode: '77494',
  });
  const [request] = h.fake.requests;
  assert.equal(request.title, '[ChatGPT] Mount a 65-inch TV and hide the wires - Katy');
  assert.ok(request.notes[0].startsWith(NOTE_HEADER));
  assert.ok(request.notes[0].includes(`Reference: ${result.reference}`));
  // D1 keeps only metadata.
  const row = h.db.raw.prepare('SELECT * FROM ai_requests').get() as Record<string, unknown>;
  assert.equal(row.status, 'submitted');
  assert.equal(row.zip, '77494');
  assert.equal(row.source, 'chatgpt');
  const dump = JSON.stringify(h.db.raw.prepare('SELECT * FROM ai_requests').all());
  assert.ok(!dump.includes('2815552368') && !dump.includes('Dana') && !dump.includes('Cane'));
  assert.deepEqual(h.logs.at(-1), { evt: 'ai_intake', status: 'submitted', source: 'chatgpt', error_class: null, reference: result.reference });
});

await check('smsAllowed is set only when the customer prefers text', async () => {
  const h = await connected();
  await submitServiceRequest(validBody({ contact_preference: 'call', email: undefined }), h.intakeDeps());
  assert.equal(h.fake.clients[0].phones[0].smsAllowed, false);
  assert.deepEqual(h.fake.clients[0].emails, []);
});

await check('existing client (verified by digits) is reused and never edited', async () => {
  const h = await connected();
  // A fuzzy-search decoy that shares the last seven digits but not the area code.
  h.fake.addClient({ firstName: 'Other', lastName: 'Person', phones: [{ number: '713-555-2368' }], properties: [] });
  const existing = h.fake.addClient({
    firstName: 'Dana',
    lastName: 'W',
    phones: [{ number: '281.555.2368' }],
    properties: [
      { id: 'property-old', address: { street1: '2418 Cane Field Dr.', city: 'Katy', province: 'TX', postalCode: '77494' } },
    ],
  });
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'submitted');
  assert.ok(!h.fake.operations.includes('EysCreateClient'));
  assert.ok(!h.fake.operations.includes('EysCreateProperty'), 'same street, abbreviated, reuses the property');
  assert.equal(h.fake.requests[0].clientId, existing.id);
  assert.equal(h.fake.requests[0].propertyId, 'property-old');
  assert.equal(existing.lastName, 'W', 'existing client untouched');
});

await check('existing client at a new street gets a new property only', async () => {
  const h = await connected();
  const existing = h.fake.addClient({
    firstName: 'Dana',
    lastName: 'Whitfield',
    phones: [{ number: '(281) 555-2368' }],
    properties: [{ id: 'property-old', address: { street1: '1 Other Rd', city: 'Katy', province: 'TX', postalCode: '77494' } }],
  });
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'submitted');
  assert.ok(!h.fake.operations.includes('EysCreateClient'));
  assert.ok(h.fake.operations.includes('EysCreateProperty'));
  assert.equal(existing.properties.length, 2);
  assert.equal(h.fake.requests[0].propertyId, existing.properties[1].id);
});

await check('duplicates: same phone + ZIP within 48 h, or same request_id within 24 h', async () => {
  const h = await connected();
  const first = await submitServiceRequest(validBody(), h.intakeDeps());
  h.clock.advance(47 * HOUR);
  const again = await submitServiceRequest(validBody({ service_summary: 'Different words, same customer' }), h.intakeDeps());
  assert.equal(again.status, 'submitted');
  assert.equal(again.reference, first.reference);
  assert.match(again.message_for_customer, /already sent/);
  assert.equal(h.fake.requests.length, 1);

  const id = '6f1c2a1e-8d4b-4c7a-9f2e-1b3d5e7f9a0c';
  const h2 = await connected();
  const a = await submitServiceRequest(validBody({ request_id: id }), h2.intakeDeps());
  const b = await submitServiceRequest(validBody({ request_id: id, phone: '832-555-7788', zip: '77450' }), h2.intakeDeps());
  assert.equal(b.reference, a.reference);
  assert.equal(h2.fake.requests.length, 1);

  // Past the window the same phone + ZIP is a new request.
  h.clock.advance(2 * HOUR);
  const later = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.notEqual(later.reference, first.reference);
  assert.equal(h.fake.requests.length, 2);
});

await check('rate limits: 5/hour per IP, 3/day per phone, global daily cap', async () => {
  const h = await connected();
  const phones = ['832-555-7701', '832-555-7702', '832-555-7703', '832-555-7704', '832-555-7705', '832-555-7706'];
  const results = [];
  for (const phone of phones) results.push(await submitServiceRequest(validBody({ phone }), h.intakeDeps()));
  assert.deepEqual(results.map((r) => r.status), ['submitted', 'submitted', 'submitted', 'submitted', 'submitted', 'unavailable']);
  assert.equal(h.logs.at(-1)?.error_class, 'rate_ip');

  const p = await connected();
  const zips = ['77494', '77450', '77449', '77493'];
  const byPhone = [];
  for (const [i, zip] of zips.entries()) byPhone.push(await submitServiceRequest(validBody({ zip }), p.intakeDeps(undefined, `198.51.100.${i}`)));
  assert.deepEqual(byPhone.map((r) => r.status), ['submitted', 'submitted', 'submitted', 'unavailable']);
  assert.equal(p.logs.at(-1)?.error_class, 'rate_phone');

  const g = await connected({ AI_INTAKE_DAILY_CAP: '2' });
  const capped = [];
  for (const [i, phone] of phones.slice(0, 3).entries()) {
    capped.push(await submitServiceRequest(validBody({ phone }), g.intakeDeps(undefined, `192.0.2.${i}`)));
  }
  assert.deepEqual(capped.map((r) => r.status), ['submitted', 'submitted', 'unavailable']);
  assert.equal(g.logs.at(-1)?.error_class, 'daily_cap');
  assert.equal((await healthReport(g.env, g.clock.now())).today_count, 3);
});

await check('THROTTLED: one short retry, then unavailable', async () => {
  const h = await connected();
  h.fake.throttleNext = 1;
  const ok = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(ok.status, 'submitted');
  assert.deepEqual(h.sleeps, [1500]);

  const t = await connected();
  t.fake.throttleNext = 2;
  const failed = await submitServiceRequest(validBody(), t.intakeDeps());
  assert.equal(failed.status, 'unavailable');
  assert.equal(t.logs.at(-1)?.error_class, 'jobber_throttled@plan');
  assert.equal(failed.reference, null);
  assert.equal(t.fake.requests.length, 0);
  // Nothing reached Jobber, so the customer may try again.
  t.clock.advance(HOUR);
  assert.equal((await submitServiceRequest(validBody(), t.intakeDeps())).status, 'submitted');
});

await check('failure after the request exists → unverified, never resent', async () => {
  const h = await connected();
  h.fake.tamperTitle = true;
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'unavailable');
  assert.match(result.reference ?? '', /^EYS-AI-/);
  assert.equal(h.logs.at(-1)?.error_class, 'jobber_verify@verify');
  const row = h.db.raw.prepare('SELECT status FROM ai_requests').get() as { status: string };
  assert.equal(row.status, 'unverified');
  h.fake.tamperTitle = false;
  const retry = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(retry.status, 'submitted');
  assert.equal(retry.reference, result.reference);
  assert.equal(h.fake.requests.length, 1);
});

await check('userErrors from Jobber → unavailable before any request exists', async () => {
  const h = await connected();
  h.fake.userErrorsOn.add('EysCreateClient');
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'unavailable');
  assert.equal(h.logs.at(-1)?.error_class, 'jobber_user_errors@client');
  assert.equal(h.fake.requests.length, 0);
});

await check('schema gaps stop the write before anything is created', async () => {
  const h = await connected();
  h.fake.schema.mutations = h.fake.schema.mutations.filter((m) => m.name !== 'requestCreate');
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'unavailable');
  assert.equal(h.logs.at(-1)?.error_class, 'jobber_schema@plan');
  assert.equal(h.fake.clients.length, 0);
});

await check('rows older than 30 days are purged', async () => {
  const h = await connected();
  await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(rowCount(h, 'ai_requests'), 1);
  h.clock.advance(31 * DAY);
  await submitServiceRequest(validBody({ phone: '832-555-9901' }), h.intakeDeps());
  const refs = h.db.raw.prepare('SELECT COUNT(*) AS n FROM ai_requests').get() as { n: number };
  assert.equal(refs.n, 1);
});

await check('pre-flight: an unknown required Jobber input blocks the write and creates nothing', async () => {
  const h = await connected();
  h.fake.schema.types.get('RequestCreateInput')?.inputFields?.push({ name: 'foo', type: nonNull(STRING) });
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'unavailable');
  assert.equal(h.logs.at(-1)?.error_class, 'jobber_schema@plan');
  assert.equal(h.fake.clients.length, 0, 'no client');
  assert.equal(h.fake.requests.length, 0, 'no request');
  assert.ok(!h.fake.operations.some((op) => op.startsWith('EysCreate')), 'no create call at all');
  const row = h.db.raw.prepare('SELECT status FROM ai_requests').get() as { status: string };
  assert.equal(row.status, 'failed', 'free to retry once Jobber is fixed');
});

await check('padded Jobber credentials still refresh tokens and write', async () => {
  const h = await connected({ JOBBER_CLIENT_ID: ' client-id ', JOBBER_CLIENT_SECRET: 'client-secret\n' });
  h.clock.advance(2 * HOUR); // force a refresh with the padded credentials
  const result = await submitServiceRequest(validBody(), h.intakeDeps());
  assert.equal(result.status, 'submitted');
  assert.deepEqual(h.fake.tokenCalls, ['refresh_token']);
});

const MCP = { addressOptional: true } as const;

await check('address-free, propertyId nullable: client and request only, no propertyId sent', async () => {
  const h = await connected();
  const result = await submitServiceRequest(addressFreeBody(), h.intakeDeps(), MCP);
  assert.equal(result.status, 'submitted', JSON.stringify(h.logs));
  assertNoPii(result);
  assert.match(result.message_for_customer, /ask for the service address when they call you/);
  assert.ok(result.next_steps.some((s) => s.includes('will ask for the service address when it calls')));
  assert.deepEqual(
    h.fake.operations.filter((op) => !op.startsWith('EysSchema')),
    ['EysFindClients', 'EysFindClients', 'EysCreateClient', 'EysCreateRequest', 'EysAddNote', 'EysVerifyRequest'],
  );
  const input = h.fake.variablesOf('EysCreateRequest')?.input as Record<string, unknown>;
  assert.ok(!('propertyId' in input), 'propertyId left out');
  assert.deepEqual(h.fake.clients[0].properties, []);
  const [request] = h.fake.requests;
  assert.equal(request.title, '[ChatGPT] Mount a 65-inch TV and hide the wires');
  assert.ok(request.notes[0].includes(NO_ADDRESS_LINE));
  // D1: the duplicate key is a keyed hash of the job text, never the text itself.
  const row = h.db.raw.prepare('SELECT zip FROM ai_requests').get() as { zip: string };
  assert.match(row.zip, /^[A-Za-z0-9_-]{43}$/);
  const dump = JSON.stringify(h.db.raw.prepare('SELECT * FROM ai_requests').all()).toLowerCase();
  assert.ok(!dump.includes('mount') && !dump.includes('drywall') && !dump.includes('2815552368'));
});

await check('address-free, existing client: reused and untouched, no property lookup or creation', async () => {
  const h = await connected();
  const existing = h.fake.addClient({
    firstName: 'Dana',
    lastName: 'W',
    phones: [{ number: '281.555.2368' }],
    properties: [{ id: 'property-old', address: { street1: '1 Other Rd', city: 'Katy', province: 'TX', postalCode: '77494' } }],
  });
  const result = await submitServiceRequest(addressFreeBody(), h.intakeDeps(), MCP);
  assert.equal(result.status, 'submitted');
  for (const op of ['EysCreateClient', 'EysClientProperties', 'EysCreateProperty']) {
    assert.ok(!h.fake.operations.includes(op), `${op} not called`);
  }
  assert.equal(h.fake.requests[0].clientId, existing.id);
  assert.equal(h.fake.requests[0].propertyId, undefined);
  assert.equal(existing.lastName, 'W');
  assert.equal(existing.properties.length, 1);
});

await check('address-free, propertyId non-null: one placeholder property, never a real-looking address', async () => {
  const h = await connected();
  const field = h.fake.schema.types.get('RequestCreateInput')?.inputFields?.find((f) => f.name === 'propertyId');
  assert.ok(field);
  field.type = nonNull(ID);
  const result = await submitServiceRequest(addressFreeBody(), h.intakeDeps(), MCP);
  assert.equal(result.status, 'submitted', JSON.stringify(h.logs));
  const [client] = h.fake.clients;
  assert.deepEqual(client.properties.map((p) => p.address), [{ street1: 'Address needed - ask on the call', province: 'TX' }]);
  assert.equal(h.fake.requests[0].propertyId, client.properties[0].id);

  // A request with an address still gets its real property.
  const full = await submitServiceRequest(validBody({ phone: '832-555-4410' }), h.intakeDeps(), MCP);
  assert.equal(full.status, 'submitted');
  assert.equal(h.fake.clients[1].properties[0].address.street1, '2418 Cane Field Drive');
});

await check('address-free, propertyId non-null and no placeholder possible: refused before anything exists', async () => {
  const h = await connected();
  const types = h.fake.schema.types;
  const field = types.get('RequestCreateInput')?.inputFields?.find((f) => f.name === 'propertyId');
  const city = types.get('AddressAttributes')?.inputFields?.find((f) => f.name === 'city');
  assert.ok(field && city);
  field.type = nonNull(ID);
  city.type = nonNull(STRING);
  const result = await submitServiceRequest(addressFreeBody(), h.intakeDeps(), MCP);
  assert.equal(result.status, 'unavailable');
  assert.equal(h.logs.at(-1)?.error_class, 'jobber_schema@plan');
  assert.ok(!h.fake.operations.some((op) => op.startsWith('EysCreate') || op === 'EysFindClients'));
  // Requests that carry an address are not blocked.
  assert.equal((await submitServiceRequest(validBody(), h.intakeDeps(), MCP)).status, 'submitted');
});

await check('address-free duplicates: same phone + same job within 48 h; a different job goes through', async () => {
  const h = await connected();
  const first = await submitServiceRequest(addressFreeBody(), h.intakeDeps(), MCP);
  h.clock.advance(47 * HOUR);
  const body = addressFreeBody();
  const same = await submitServiceRequest(
    { ...body, service_summary: String(body.service_summary).toUpperCase(), job_details: `  ${String(body.job_details).replace(/ /g, '   ')}  ` },
    h.intakeDeps(),
    MCP,
  );
  assert.equal(same.status, 'submitted');
  assert.equal(same.reference, first.reference);
  assert.match(same.message_for_customer, /already sent/);
  assert.equal(h.logs.at(-1)?.error_class, 'duplicate_phone_job');
  assert.equal(h.fake.requests.length, 1);

  const other = await submitServiceRequest(
    addressFreeBody({
      service_summary: 'Fix a squeaky bedroom door',
      job_details: 'The bedroom door squeaks every time it opens; the hinges may need oil or replacing.',
    }),
    h.intakeDeps(),
    MCP,
  );
  assert.equal(other.status, 'submitted');
  assert.notEqual(other.reference, first.reference);
  assert.equal(h.fake.requests.length, 2);

  // The same phone with an address is keyed by its ZIP, not the job text.
  const withAddress = await submitServiceRequest(validBody(), h.intakeDeps(undefined, '198.51.100.9'), MCP);
  assert.equal(withAddress.status, 'submitted');
  assert.notEqual(withAddress.reference, first.reference);
});
