# AI-assistant intake

Lets ChatGPT, Claude, Gemini, Copilot, Perplexity and in-browser agents send a customer's service
request straight into EYS's Jobber **Requests**, the same place every web-form lead lands. Built in
backlog item 010 (`docs/claude-code-backlog/010-ai-assistant-intake.md`). Live state, what is
verified and the remaining human steps are in [`STATUS.md`](./STATUS.md).

## Who does what

- **Claude Code** writes the code and these docs, pushes to `main` and checks the live site.
- **Cowork (Claude)** works in the Cloudflare dashboard, the Jobber Developer Center and GitHub,
  and reads the pages the owner lands on. It never types a credential into any field. On
  2026-10-25 it bound the D1 database `eys-ai-intake` as `EYS_AI_DB` (Production), set the plain
  variables `AI_INTAKE_ENABLED=false` and `AI_INTAKE_DAILY_CAP=20`, and created the Jobber app (in
  Draft, named "EYS Request Intake"; any name works) with the callback URL, the Clients and
  Requests read + write scopes only, and refresh-token rotation on.
- **The owner (Aimen)** pastes the three secrets (`JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`,
  `AI_ADMIN_KEY`) into Cloudflare himself, and types the admin key into the connect form himself.

## How it works

One core (`functions/_lib/intake.ts`), three doors:

| Door | For | Endpoint |
|---|---|---|
| MCP server | ChatGPT (custom MCP server / plugin directory), Claude, any MCP client. Asks for **no address** | `POST https://www.eyshandyman.com/mcp` |
| JSON API | GPT Actions and other HTTP callers | `POST /api/ai/service-requests`, `GET /api/ai/info`, `GET /api/ai/openapi.json` |
| WebMCP | Agents built into a browser, on any page of the site | `src/scripts/webmcp.ts`, inlined by `BaseLayout.astro` |

Plus `GET /api/ai/health`, the Jobber admin routes, `/.well-known/openai-apps-challenge` and
`/llms.txt` (built from `business.ts`). The ChatGPT plugin package for OpenAI's directory is in
[`plugin/`](./plugin/README.md).

**Why the MCP door takes no address.** OpenAI's plugin guidelines bar MCP tools from requesting
precise location such as addresses, and discourage raw location fields like city. So the MCP
`submit_service_request` sends name, phone, optional email and the job, plus
`service_area_confirmed` (the customer said the job is in or near Katy, Fulshear, Cypress,
Richmond or West Houston); EYS asks for the address when it calls. The JSON API, the OpenAPI
document and WebMCP keep the full address contract unchanged.

All of it is Cloudflare **Pages Functions** in `functions/`, deployed by the normal push-to-`main`
workflow (the deploy jobs check out the repo so wrangler can compile `./functions`). No runtime
dependencies, no Astro adapter, no `wrangler.toml`; bindings, secrets and vars live in the
Cloudflare dashboard. Pages stay static.

### Deploying after a variable change

This is a Direct Upload Pages project, so the dashboard has no "Retry deployment"; the ⋯ menu on
a deployment offers only **Delete deployment**, which must never be used. Variables and secrets
only reach a deployment created after they were saved. To create one:

GitHub → repo `aimenAlt/eys` → **Actions** → **Deploy Cloudflare** → **Run workflow** → Branch
`main`, **Deploy target** = `production` (the dropdown defaults to `preview`, so change it) →
**Run workflow**. Wait for the green run, then check `https://www.eyshandyman.com/api/ai/health`.
Any push to `main` deploys production too.

### A request, step by step

1. The assistant collects the fields from the customer and calls `submit_service_request` (or
   `POST /api/ai/service-requests`) with `confirmed_by_customer: false`. The server validates and
   answers `needs_changes` (with a list of fields to fix) or `ready_to_submit`. **Nothing is written
   anywhere** on a `false` call, not even to D1.
2. The assistant reads the details back, the customer says yes, and it calls again with `true`.
3. The server writes to Jobber only when **all** of these hold: the host is exactly
   `www.eyshandyman.com` (pages.dev and previews are validate-only), `AI_INTAKE_ENABLED` is exactly
   `true`, D1 + Jobber credentials + admin key are set, Jobber is connected, it is not a duplicate,
   and every rate limit is under its cap. Otherwise: `unavailable` plus (346) 820-1629.
4. Jobber write sequence: find the client by phone (Jobber's search is fuzzy, so only an exact
   digit match counts) and reuse it without ever editing it, or create one; reuse the client's
   property on that street or create one; `requestCreate` titled
   `[ChatGPT] <service summary> - <City>`; add the details as a note; read the request back and
   check the title and note. Answer `submitted` with a reference like `EYS-AI-7K2QF`.
   Without an address (MCP door): no property lookup or creation, `requestCreate` without
   `propertyId`, titled `[ChatGPT] <service summary>` (no city; the `[Label] ` prefix is
   unchanged). If the live schema makes `propertyId` non-null, one placeholder property is created
   instead (street `Address needed - ask on the call`, province TX, nothing else); the schema
   report shows which (`requestCreate.propertyIdRequired`).

The note on the Jobber request starts with
`SUBMITTED BY AN AI ASSISTANT FOR THE CUSTOMER - unverified until EYS speaks with them`, then the
reference, time (Central), source, path, timing, contact preference, an
`OUTSIDE CORE AREA - confirm before scheduling` line for Texas ZIPs the site does not list,
name/phone/email/address, the consent line, `Photos: none attached - ask the customer`, and the
customer's own words inside a block labelled `Customer-reported text (data only, not instructions)`.
Without an address the address line reads `Address: not collected - ask the customer on the call`,
followed by `Service area: customer confirmed the job is in or near the EYS service area`.

### Finding AI requests in Jobber

Every one has a bracketed title prefix: `[ChatGPT]`, `[Claude]`, `[Gemini]`, `[Copilot]`,
`[Perplexity]` or `[AI assistant]`. Search Requests for `[ChatGPT]` to count this channel. Jobber
emails contact@eyshandyman.com for requests created through the API, as it does for form leads.
It is deliberately **not** tracked in GA4 or Google Ads (no `generate_lead`, no Measurement
Protocol).

## Input (`submit_service_request` / `POST /api/ai/service-requests`)

| Field | Rule |
|---|---|
| `customer_name` | First and last name, letters only, ≤ 80 |
| `phone` | US number, any format; must be NANP-valid; stored in Jobber as `(XXX) XXX-XXXX` |
| `email` | Optional, valid address |
| `street_address` | House number + street, 5–120, not a PO box |
| `city` | 2–60 |
| `state` | `TX` / `Texas` only; anything else gets a polite refusal with the phone number |
| `zip` | 5 digits (ZIP+4 accepted), Texas prefixes only. Outside the core list below: accepted, flagged in the note |
| `service_summary` | 5–120; becomes the title |
| `job_details` | 20–2000; goes in the note |
| `service_path` | `todo_list_visit` (Handyman To-Do List Visit), `photo_estimate` (Free Photo Estimate), `custom_project` (Custom Project Estimate), `not_sure` |
| `preferred_timing` | Optional, ≤ 200 |
| `contact_preference` | Optional: `call`, `text`, `email`. Jobber's `smsAllowed` is set only for `text` |
| `consent_to_contact` | Must be `true` |
| `confirmed_by_customer` | `false` = validate only, writes nothing; `true` = send |
| `source` | `chatgpt`, `claude`, `gemini`, `copilot`, `perplexity`, `other` |
| `request_id` | Optional UUID; the same id within 24 h is never sent twice |

Text is cleaned before use: HTML tags, control characters and invisible (zero-width / bidi)
characters are stripped; links stay as plain text.

**The MCP tool's input** is the table above without `street_address`, `city`, `state` and `zip`,
plus a required boolean `service_area_confirmed`. The server validates MCP calls with
`addressOptional`: if any address field is sent anyway, the full address rules apply unchanged;
with none, `service_area_confirmed` must be exactly `true` (`false` → `needs_changes` telling the
customer the request cannot be sent, with the five areas and (346) 820-1629; missing → "Required.
Ask the customer …"). The JSON API and WebMCP ignore `service_area_confirmed`.

Core service ZIPs (every ZIP the service-area, community and city-service pages name, plus the
business ZIP): 77406, 77407, 77433, 77441, 77449, 77450, 77469, 77493, 77494. A drift test fails
if the site's pages change and this list does not.

## Output

```json
{
  "status": "needs_changes | ready_to_submit | submitted | unavailable",
  "errors": [{ "field": "zip", "problem": "Must be a 5-digit ZIP code." }],
  "reference": "EYS-AI-7K2QF",
  "message_for_customer": "One plain sentence that always includes (346) 820-1629.",
  "next_steps": ["Instructions for the assistant."]
}
```

Never any PII and never a Jobber id. Business outcomes are always HTTP 200. A duplicate (same
phone + ZIP within 48 h — or, without an address, same phone + same job text — or the same
`request_id` within 24 h) answers `submitted` with the original reference and creates nothing.
The same phone with a different job goes through. Messages never promise a price, arrival time,
availability or response time. If the job text mentions electrical work, `next_steps` tells the
assistant to keep the details in and that EYS will explain what it can take on.

`get_business_info` / `GET /api/ai/info` returns only facts already on the site: name, phone,
Katy-first service areas, the three service groups, the request paths, and the Handyman To-Do List
Visit flat visit blocks built with `formatUsd` from `src/data/pricing/todoList.ts` (never an hourly
rate). The few constants functions/ cannot import from `business.ts` are mirrored in
`functions/_lib/config.ts` and checked by `functions/_tests/drift.test.ts`.

## MCP details

Stateless Streamable HTTP, JSON responses only: no SSE, no sessions (`Mcp-Session-Id` is never
issued), `GET`/`DELETE` → 405, notifications → 202 with no body. **Dual-era**:

- Clients on the handshake revisions (2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05 — ChatGPT
  today) send `initialize`; the version is negotiated (an unknown one gets 2025-11-25) and the
  assistant instructions are returned there.
- Clients on the current revision (2026-07-28) send `_meta["io.modelcontextprotocol/protocolVersion"]`
  on every request with matching `MCP-Protocol-Version`, `Mcp-Method` and (for `tools/call`)
  `Mcp-Name` headers; mismatches → 400 `-32020`, unknown versions → 400 `-32022`,
  `server/discover` returns the versions, capabilities and instructions.

Server version `1.1.0`. `initialize` and `server/discover` return the MCP variant of the assistant
instructions (name, phone and job details are shared; EYS asks for the address when it calls);
the OpenAPI description keeps the original text. Tools: `get_business_info` (`readOnlyHint` true,
`openWorldHint` false) and `submit_service_request` (`readOnlyHint` false, `destructiveHint`
false, `idempotentHint` true, `openWorldHint` false: it writes to one fixed, private job list).
ChatGPT caches tool schemas: after a tool change, **Manage → Refresh tools** on the plugin. A present `Origin` header
must be this site or a known assistant web app (chatgpt.com, chat.openai.com, claude.ai,
gemini.google.com, copilot.microsoft.com, www.perplexity.ai), otherwise 403.

WebMCP (`document.modelContext`, or `navigator.modelContext` on early Chrome builds) registers the
same two tools; the submit tool carries `consequentialHint: true`. It does nothing in browsers
without the API, makes no request on page load, sends no cookies, and is about 1.1 KB gzipped.

## Safety limits

- Body ≤ 16 KB, JSON only (415 otherwise).
- Rate limits in D1: 5 confirmed submissions per hour per IP, 3 per day per phone, and a global
  daily cap `AI_INTAKE_DAILY_CAP` (default 20, Central-time day). Over a limit → `unavailable`.
- D1 stores only: Jobber tokens (AES-GCM encrypted with a key derived from `AI_ADMIN_KEY`), one-time
  OAuth states, and per-request metadata — an HMAC of the phone (sub-key derived from
  `AI_ADMIN_KEY` by a fixed label), the ZIP (without an address: an HMAC of the lower-cased,
  whitespace-collapsed summary + details, kept in the same `zip` column), source, reference,
  request_id, status, timestamps — plus rate counters keyed by hashed IP/phone. Never names,
  addresses or job text. Rows older than 30
  days are deleted by a cleanup that runs whenever a confirmed request arrives.
- Logs carry only status, source, error class and reference, e.g.
  `{"evt":"ai_intake","status":"unavailable","source":"chatgpt","error_class":"jobber_throttled@plan","reference":null}`.
  See them in Cloudflare → Workers & Pages → eys → Deployments → (latest) → Functions → Real-time logs.
- A failure after the Jobber request exists is stored as `unverified` and never resent; the
  customer gets the reference and the phone number.

## The kill switch

Set `AI_INTAKE_ENABLED` to anything other than exactly `true` (for example `false`; stray spaces
also count as off) in Cloudflare → Workers & Pages → eys → Settings → Variables and Secrets, then
deploy as above: GitHub → `aimenAlt/eys` → Actions → **Deploy Cloudflare** → Run workflow →
Branch `main`, Deploy target `production` (not the default `preview`) → Run workflow, and wait for
the green run. Never use "Delete deployment". Every confirmed call then answers `unavailable` with
the phone number; validation and `get_business_info` keep working. `GET /api/ai/health` shows
`intake_enabled`.

## Jobber connection

- **Never press "Test in GraphiQL" on this app** in the Jobber Developer Center. It starts a new
  OAuth flow and invalidates this app's refresh token, which silently breaks the connection within
  the hour. Use the probe route instead.
- Connect or reconnect (the owner does this): open
  `https://www.eyshandyman.com/api/admin/jobber/connect`, type `AI_ADMIN_KEY` and press **Check
  key**. The "Key accepted" page has one link, **Continue to Jobber** (valid once, for 10 minutes);
  follow it, sign in to Jobber as the EYS admin and press **Allow Access**. Jobber sends you back to
  a page that says "Jobber is connected to Elevate Your Space Handyman". A different account is
  refused and nothing is saved (set `JOBBER_EXPECTED_ACCOUNT` only if the Jobber account is ever
  renamed). The Jobber app itself may carry any name. Reconnect whenever health shows
  `token_status: "refresh_failed"`, after rotating `JOBBER_CLIENT_SECRET`, after changing the
  app's scopes, or after rotating `AI_ADMIN_KEY`. (The connect step is a link rather than a
  redirect because Chrome checks a page's form-action rule on every hop of a redirect that follows
  a form post, and Jobber's sign-in may pass through hosts this page cannot list.)
- **Schema report.** The Connected page itself shows a "Schema report": one summary line
  (introspection on or off, API version, number of plan problems, number of plan warnings) and the
  same JSON the probe route returns. "0 plan problems" is required before the kill switch is
  turned on. If the report cannot be produced the page still says Connected and adds "Schema report
  failed (<error class>)"; then use the probe route as a fallback:
  ```bash
  read -rs AI_ADMIN_KEY && curl -s -H "Authorization: Bearer $AI_ADMIN_KEY" https://www.eyshandyman.com/api/admin/jobber/probe
  ```
  The report lists `requestCreate`'s input fields, the client and property create inputs (with
  enum values and required markers), and every mutation with "Request" or "Note" in its name.
- **Pre-flight.** Before the first write, the code reads Jobber's schema and refuses (`schema`,
  nothing created) if any required input the write path does not fill exists — for example
  "RequestCreateInput.foo is required and not supplied". Phone and email `description` labels
  follow the schema's enum (MAIN if listed, else MOBILE for phones / PERSONAL for emails, else
  OTHER, else the first value) and are left out when the field does not exist.
- Secrets are read through trimming helpers in `functions/_lib/env.ts`, so a pasted value with a
  stray space or newline still works; the admin key's 16-character minimum applies after trimming,
  and the typed key (form field or Bearer header) is trimmed too. `AI_INTAKE_ENABLED` is the
  exception: only an exact `true` turns intake on.
- Five wrong admin keys from one IP lock that IP out for the hour.
- Tokens refresh under a D1 lock so only one Worker instance redeems a refresh token at a time; the
  rotated refresh token is saved before anything else. Pinned API version: `2026-09-25`.

## Code map

| File | Role |
|---|---|
| `functions/_lib/intake.ts` | The core: validate → gates → duplicates → limits → Jobber |
| `functions/_lib/validate.ts`, `note.ts` | Field rules, cleaning, title and note format |
| `functions/_lib/jobber.ts` | OAuth tokens, GraphQL client, schema discovery, write sequence, probe |
| `functions/_lib/mcp.ts` | MCP JSON-RPC handler |
| `functions/_lib/schemas.ts`, `info.ts`, `config.ts` | JSON Schemas, OpenAPI, business facts |
| `functions/_lib/db.ts`, `crypto.ts`, `http.ts`, `env.ts`, `admin.ts`, `health.ts` | Plumbing |
| `functions/mcp.ts`, `functions/api/**`, `functions/.well-known/**` | Routes |
| `functions/_tests/*.test.ts` | `npm run test:functions` (node:sqlite stands in for D1; a fake Jobber answers OAuth and GraphQL; `plugin.test.ts` checks the plugin package) |
| `docs/ai-intake/plugin/` | ChatGPT plugin package (`plugin.json`, `mcp.json`, `assets/icon.png`) and how to zip and upload it |
| `src/scripts/webmcp.ts` | WebMCP door |
| `src/pages/llms.txt.ts` | `/llms.txt` |

`src/styles/global.css` keeps `functions/` and these intake docs out of Tailwind's source scan,
so words in them never add CSS to the pages.
