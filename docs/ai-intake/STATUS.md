# AI-assistant intake — status

Last updated 2026-10-25 by Claude Code. How it works and how to operate it: [`README.md`](./README.md).

**State right now:** everything is deployed and answering on www.eyshandyman.com in
**validate-only** mode. Jobber is not connected and `AI_INTAKE_ENABLED` is not set, so no request
can reach Jobber yet. No Jobber record was created during the build. Steps 1–6 under NEEDS HUMAN
switch it on.

## DONE

| Push | Commit | Deploy run |
|---|---|---|
| 1. Deploy path (checkout in both deploy jobs) + `GET /api/ai/health` | fb1ed2a | [40238078128](https://github.com/aimenAlt/eys/actions/runs/40238078128) |
| 2. Core library, JSON API, OpenAPI, Jobber admin routes, unit tests | 7d040a8 | [40239634538](https://github.com/aimenAlt/eys/actions/runs/40239634538) |
| 3. MCP server `/mcp` + `/.well-known/openai-apps-challenge` | e3f70c0 | [40240118332](https://github.com/aimenAlt/eys/actions/runs/40240118332) |
| 4. `/llms.txt` + AI-assistant paragraph on `/privacy/` | 82a41b9 | [40240375023](https://github.com/aimenAlt/eys/actions/runs/40240375023) |
| Fix: keep `functions/` out of Tailwind's scan | 7f76116 | [40240602553](https://github.com/aimenAlt/eys/actions/runs/40240602553) |
| 5. WebMCP tools in `BaseLayout` | cfd5b78 | [40240967387](https://github.com/aimenAlt/eys/actions/runs/40240967387) |
| Fix: keep the intake docs out of Tailwind's scan | 1abdd26 | [40241283820](https://github.com/aimenAlt/eys/actions/runs/40241283820) |

Every production deploy log shows `✨ Compiled Worker successfully` and
`✨ Uploading Functions bundle`. `npm run check`, `npm run build` and `npm test` (65 functions
tests) were clean before each push.

## LIVE URLS

- MCP: `https://www.eyshandyman.com/mcp` (POST only)
- JSON API: `https://www.eyshandyman.com/api/ai/service-requests` (POST),
  `https://www.eyshandyman.com/api/ai/info`, `https://www.eyshandyman.com/api/ai/openapi.json`
- Health: `https://www.eyshandyman.com/api/ai/health`
- Admin: `https://www.eyshandyman.com/api/admin/jobber/connect`, `/api/admin/jobber/callback`
  (Jobber redirects here), `/api/admin/jobber/probe` (Bearer `AI_ADMIN_KEY`)
- OpenAI domain check: `https://www.eyshandyman.com/.well-known/openai-apps-challenge` (404 until set)
- `https://www.eyshandyman.com/llms.txt`

## VERIFIED (live, 2026-10-25, curl unless noted)

- `GET /api/ai/health` → 200
  `{"ok":true,"intake_enabled":false,"configured":{"d1":true,"jobber_client":false,"jobber_secret":false,"admin_key":false},"jobber":{"connected":false,"account_name":null,"token_status":"not_connected"},"today_count":0}`.
  `POST` → 405. Headers on every API response: `cache-control: no-store`, `x-robots-tag: noindex`,
  no `access-control-*`.
- `GET /api/ai/info` → 200: phone (346) 820-1629; areas Katy, Fulshear, Cypress, Richmond, West
  Houston; the three service groups; flat visit blocks $175 / $299 / $399 and "$60 per additional
  30 minutes".
- `GET /api/ai/openapi.json` → OpenAPI 3.1.0, server `https://www.eyshandyman.com`, operationIds
  `getBusinessInfo` / `submitServiceRequest`, `x-openai-isConsequential: true`.
- `POST /api/ai/service-requests` (test details, `confirmed_by_customer: false`) → `ready_to_submit`,
  reference null; same with `true` → `unavailable` + phone (kill switch off); `{"state":"LA"}` →
  `needs_changes` listing every missing field; `text/plain` → 415; GET → 405.
- `/mcp` with `initialize` (2025-06-18) → negotiated `2025-06-18`, `serverInfo.name`
  `eys-handyman`, the assistant instructions, no `Mcp-Session-Id`; `notifications/initialized` →
  202, empty body; `tools/list` → `get_business_info` (readOnlyHint true) and
  `submit_service_request` (readOnlyHint false, destructiveHint false, idempotentHint true,
  openWorldHint true); `tools/call get_business_info` → isError false + the facts above;
  `tools/call submit_service_request` (confirmed false) → `ready_to_submit`; modern
  `server/discover` (2026-07-28 headers + `_meta`) → `supportedVersions ["2026-07-28"]` +
  instructions; GET → 405 `allow: POST`. `/mcp` answers directly (no redirect).
- `/.well-known/openai-apps-challenge` → 404 (token unset). `/llms.txt` → 200 `text/plain`, not in
  the sitemap. `/privacy/` carries the AI-assistant paragraph.
- Admin: `/api/admin/jobber/connect` → 200 password form; probe and callback → 503 "not configured"
  (no admin key yet).
- WebMCP (built-in browser, live homepage): this browser has no native `modelContext`, so a stand-in
  was installed and the page's own inline script re-run. Both tools registered (`readOnlyHint` /
  `consequentialHint`); `get_business_info` returned the phone; the submit tool (confirmed false)
  returned `ready_to_submit`. A normal page load makes no `/api/` request and logs no console error.
  Script size 2,205 bytes raw, 1,102 gzipped.
- Nothing else on the site changed: live `/`, `/book/` and `/start/` are byte-identical to the
  pre-intake versions except for the added WebMCP script (compared ignoring build timestamps and
  Cloudflare's per-request email-obfuscation keys). GA4 `G-9D5MCDT0L1` and Ads `AW-16988082106`
  tags unchanged; the analytics bundle hash is unchanged.

## NEEDS HUMAN (in order)

1. **Create the Jobber app.** https://developer.getjobber.com → sign in to the Developer Center →
   **Apps** → **New**:
   - App name: `EYS AI Intake`
   - Developer name: `Elevate Your Space Handyman`
   - App description: `Private integration: lets AI assistants file service requests for Elevate Your Space Handyman customers.`
   - Scopes: **Clients** read + write, **Requests** read + write. Nothing else.
   - OAuth Callback URL: `https://www.eyshandyman.com/api/admin/jobber/callback`
   - Refresh Token Rotation: leave **ON** (the default).
   - Save and leave the app in **Draft**: a custom integration on EYS's own account needs no review
     (Jobber allows Draft apps on up to 5 paying accounts).
   - Copy the **Client ID** and **Client Secret** from the app's page in Manage Apps.
   - **Never press "Test in GraphiQL" on this app** (it invalidates the refresh token).
2. **Cloudflare variables.** Workers & Pages → **eys** → **Settings** → **Variables and Secrets**
   (Production) → **Add**:
   - `JOBBER_CLIENT_ID` — type Secret — the Client ID from step 1
   - `JOBBER_CLIENT_SECRET` — type Secret — the Client Secret from step 1
   - `AI_ADMIN_KEY` — type Secret — 40+ random characters (e.g. the output of
     `openssl rand -base64 36`); keep it in the password manager. Under 16 characters counts as unset.
   - `AI_INTAKE_ENABLED` — type Text — `false` for now
   - `AI_INTAKE_DAILY_CAP` — type Text — `20`
   - Leave `OPENAI_APPS_CHALLENGE_TOKEN` and `JOBBER_EXPECTED_ACCOUNT` unset.
   - D1 binding `EYS_AI_DB` is already bound (Settings → **Bindings**); health shows `d1: true`.
   - Then **Deployments** → latest Production deployment → **⋯** → **Retry deployment**
     (variables only reach new deployments). Check `https://www.eyshandyman.com/api/ai/health`:
     all four `configured` values `true`, `intake_enabled` `false`.
3. **Connect Jobber.** Open `https://www.eyshandyman.com/api/admin/jobber/connect`, enter
   `AI_ADMIN_KEY`, sign in to Jobber as the EYS admin and press **Allow Access**. The page must say
   "Jobber is connected to Elevate Your Space Handyman". Health then shows
   `"jobber":{"connected":true,"account_name":"Elevate Your Space Handyman","token_status":"valid"}`.
4. **Probe the schema** (read-only):
   ```bash
   read -rs AI_ADMIN_KEY && curl -s -H "Authorization: Bearer $AI_ADMIN_KEY" https://www.eyshandyman.com/api/admin/jobber/probe
   ```
   Expect `"introspection":"enabled"` and `"plan_problems":[]`. If `plan_problems` is not empty,
   stop here with the kill switch off and give the probe output to Claude Code (it contains no
   tokens or customer data).
5. **Keep assistants from being bot-challenged.** Cloudflare → the eyshandyman.com zone →
   **Security**:
   - **Bots**: if **Bot Fight Mode** is on, turn it off — it cannot be skipped per path and can
     challenge ChatGPT's servers. (On Pro or higher, Super Bot Fight Mode is fine with the rule below.)
   - **WAF → Custom rules → Create rule**, name `AI intake: no challenges`, expression
     `(http.host eq "www.eyshandyman.com" and (http.request.uri.path eq "/mcp" or starts_with(http.request.uri.path, "/api/ai/") or http.request.uri.path eq "/.well-known/openai-apps-challenge"))`,
     action **Skip**: all remaining custom rules, all Super Bot Fight Mode rules, and (under More
     components) Browser Integrity Check and Security Level. Order: first. Do **not** include
     `/api/admin/`.
   - Today (2026-10-25) curl reaches every route without a challenge, so this is preventive.
6. **Turn it on.** Set `AI_INTAKE_ENABLED` to `true` → Retry deployment → health shows
   `"intake_enabled":true`.
7. **One live test** with a phone number the tester owns (replace the three `<…>` values):
   ```bash
   curl -s -X POST https://www.eyshandyman.com/api/ai/service-requests -H 'Content-Type: application/json' -d "{\"customer_name\":\"<First Last>\",\"phone\":\"<your phone>\",\"street_address\":\"<your street>\",\"city\":\"Katy\",\"state\":\"TX\",\"zip\":\"77494\",\"service_summary\":\"TEST - please archive\",\"job_details\":\"Test request from the AI intake set-up. Please archive.\",\"service_path\":\"not_sure\",\"consent_to_contact\":true,\"confirmed_by_customer\":true,\"source\":\"other\",\"request_id\":\"$(uuidgen | tr A-Z a-z)\"}"
   ```
   Expect `"status":"submitted"` with an `EYS-AI-…` reference. In Jobber → **Requests**, find
   `[AI assistant] TEST - please archive - Katy` with the note on it, then archive it. Note whether
   Jobber sent its usual new-request notification (see OPEN RISKS).
8. **ChatGPT developer mode.** ChatGPT (web) → **Settings** → **Apps & Connectors** (labelled
   **Apps** in newer builds) → **Advanced settings** → **Developer mode** on → back → **Create**:
   - Name: `Elevate Your Space Handyman`
   - Description: `Send a service request to EYS in Katy, TX`
   - MCP Server URL: `https://www.eyshandyman.com/mcp`
   - Authentication: **No authentication**
   - Tick "I trust this application" → **Create**. In a new chat, pick it under **+** → Developer
     mode and ask for help with a handyman job in Katy.
9. **Optional, later — ChatGPT app directory.** When submitting the app in OpenAI's developer
   dashboard, put the domain-verification token in Cloudflare as `OPENAI_APPS_CHALLENGE_TOKEN`
   (Text) → Retry deployment → confirm
   `https://www.eyshandyman.com/.well-known/openai-apps-challenge` shows it. Listing URLs: website
   `https://www.eyshandyman.com/`, privacy `https://www.eyshandyman.com/privacy/`, terms
   `https://www.eyshandyman.com/terms/`.

## OPEN RISKS

1. **requestCreate and note shapes are unconfirmed.** Jobber does not publish its mutation
   reference. The write path reads the real schema by introspection and refuses to write if
   anything it needs is missing, but only the probe (step 4) proves the shapes, and only the live
   test (step 7) proves Jobber accepts them (for example, an extra required input field would
   surface there as `jobber_graphql@request`).
2. **Jobber notifications.** Requests created through the API may not trigger the "new request"
   email/push that Client Hub form submissions do. Until step 7 says otherwise, assume EYS has to
   look for them: search Requests for `[ChatGPT]` (or `[AI`), or rely on the new-requests routine.
3. **Bot protection on `/mcp` and `/api/ai/*`.** Unchallenged for curl today, but Bot Fight Mode or
   Browser Integrity Check could challenge an assistant's servers (step 5).
4. **No photos.** Requests arrive without photos (the note says so); quoting may need a call.
5. **Client matching depends on Jobber's search.** If Jobber's client search does not find a stored
   phone format, a returning customer gets a second client record instead of the existing one.
6. **Partial writes.** If Jobber fails after creating a client or property but before the request,
   that client/property stays in Jobber without a request (logged as `…@client` / `…@property`).
   Failures after the request exists are stored as `unverified` and never resent.
7. **Rotating `AI_ADMIN_KEY`** makes the stored tokens unreadable (reconnect, step 3) and resets
   the duplicate and rate-limit history.
8. **Abuse.** The endpoints are public with no auth. Limits cap the damage (5/hour/IP, 3/day/phone,
   20/day overall) but a determined sender rotating IPs and phone numbers could still file up to the
   daily cap of junk; the kill switch stops it. `today_count` counts attempts that passed the IP and
   phone limits, not only successes.
9. **Protocol churn.** MCP 2026-07-28 and WebMCP (a draft) are new. ChatGPT was not tested
   directly (step 8 is the first real client); WebMCP was tested with a stand-in because no browser
   here supports it natively.
