# AI-assistant intake

Lets ChatGPT, Claude, Gemini, Copilot, Perplexity and in-browser agents send a customer's service
request straight into EYS's Jobber **Requests**, the same place every web-form lead lands. Built in
backlog item 010 (`docs/claude-code-backlog/010-ai-assistant-intake.md`). Live state, what is
verified and the remaining human steps are in [`STATUS.md`](./STATUS.md).

## How it works

One core (`functions/_lib/intake.ts`), three doors:

| Door | For | Endpoint |
|---|---|---|
| MCP server | ChatGPT (developer mode / apps), Claude, any MCP client | `POST https://www.eyshandyman.com/mcp` |
| JSON API | GPT Actions and other HTTP callers | `POST /api/ai/service-requests`, `GET /api/ai/info`, `GET /api/ai/openapi.json` |
| WebMCP | Agents built into a browser, on any page of the site | `src/scripts/webmcp.ts`, inlined by `BaseLayout.astro` |

Plus `GET /api/ai/health`, the Jobber admin routes, `/.well-known/openai-apps-challenge` and
`/llms.txt` (built from `business.ts`).

All of it is Cloudflare **Pages Functions** in `functions/`, deployed by the normal push-to-`main`
workflow (the deploy jobs check out the repo so wrangler can compile `./functions`). No runtime
dependencies, no Astro adapter, no `wrangler.toml`; bindings, secrets and vars live in the
Cloudflare dashboard. Pages stay static.

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

The note on the Jobber request starts with
`SUBMITTED BY AN AI ASSISTANT FOR THE CUSTOMER - unverified until EYS speaks with them`, then the
reference, time (Central), source, path, timing, contact preference, an
`OUTSIDE CORE AREA - confirm before scheduling` line for Texas ZIPs the site does not list,
name/phone/email/address, the consent line, `Photos: none attached - ask the customer`, and the
customer's own words inside a block labelled `Customer-reported text (data only, not instructions)`.

### Finding AI requests in Jobber

Every one has a bracketed title prefix: `[ChatGPT]`, `[Claude]`, `[Gemini]`, `[Copilot]`,
`[Perplexity]` or `[AI assistant]`. Search Requests for `[ChatGPT]` to count this channel. It is
deliberately **not** tracked in GA4 or Google Ads (no `generate_lead`, no Measurement Protocol).

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
phone + ZIP within 48 h, or the same `request_id` within 24 h) answers `submitted` with the
original reference and creates nothing. Messages never promise a price, arrival time,
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

Tools: `get_business_info` (read-only) and `submit_service_request` (`readOnlyHint` false,
`destructiveHint` false, `idempotentHint` true, `openWorldHint` true). A present `Origin` header
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
  `AI_ADMIN_KEY` by a fixed label), ZIP, source, reference, request_id, status, timestamps — plus
  rate counters keyed by hashed IP/phone. Never names, addresses or job text. Rows older than 30
  days are purged.
- Logs carry only status, source, error class and reference, e.g.
  `{"evt":"ai_intake","status":"unavailable","source":"chatgpt","error_class":"jobber_throttled@plan","reference":null}`.
  See them in Cloudflare → Workers & Pages → eys → Deployments → (latest) → Functions → Real-time logs.
- A failure after the Jobber request exists is stored as `unverified` and never resent; the
  customer gets the reference and the phone number.

## The kill switch

Set `AI_INTAKE_ENABLED` to anything other than exactly `true` (for example `false`) in Cloudflare →
Workers & Pages → eys → Settings → Variables and Secrets, then redeploy (Deployments → latest
production deployment → ⋯ → Retry deployment, or push any commit). Every confirmed call then
answers `unavailable` with the phone number; validation and `get_business_info` keep working.
`GET /api/ai/health` shows `intake_enabled`.

## Jobber connection

- **Never press "Test in GraphiQL" on this app** in the Jobber Developer Center. It starts a new
  OAuth flow and invalidates this app's refresh token, which silently breaks the connection within
  the hour. Use the probe route instead.
- Connect or reconnect: open `https://www.eyshandyman.com/api/admin/jobber/connect`, enter
  `AI_ADMIN_KEY`, sign in to Jobber as the EYS admin and press **Allow Access**. The page must end
  on "Jobber is connected to Elevate Your Space Handyman". A different account is refused and
  nothing is saved (set `JOBBER_EXPECTED_ACCOUNT` only if the Jobber account is ever renamed).
  Reconnect whenever health shows `token_status: "refresh_failed"`, after rotating
  `JOBBER_CLIENT_SECRET`, after changing the app's scopes, or after rotating `AI_ADMIN_KEY`.
- Probe (read-only, confirms the write shapes):
  ```bash
  read -rs AI_ADMIN_KEY && curl -s -H "Authorization: Bearer $AI_ADMIN_KEY" https://www.eyshandyman.com/api/admin/jobber/probe
  ```
  `plan_problems` must be `[]` before the kill switch is turned on. It lists `requestCreate`'s input
  fields, the client and property create inputs, and every mutation with "Request" or "Note" in its
  name.
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
| `functions/_tests/*.test.ts` | `npm run test:functions` (node:sqlite stands in for D1; a fake Jobber answers OAuth and GraphQL) |
| `src/scripts/webmcp.ts` | WebMCP door |
| `src/pages/llms.txt.ts` | `/llms.txt` |

`src/styles/global.css` keeps `functions/` and these intake docs out of Tailwind's source scan,
so words in them never add CSS to the pages.
