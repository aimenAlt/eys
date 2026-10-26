# AI-assistant intake — status

Last updated 2026-10-26 by Claude Code. How it works and how to operate it: [`README.md`](./README.md).

**State right now:** everything is deployed and answering on www.eyshandyman.com in
**validate-only** mode. The D1 database and the two plain variables are set, and the Jobber app
exists, but the three secrets are not in Cloudflare yet and Jobber is not connected, so no request
can reach Jobber. No Jobber record was created during the build. Steps 2–6 under NEEDS HUMAN
switch it on.

## Who does what

- **Claude Code**: code, tests and these docs; pushes to `main` and checks the live site.
- **Cowork (Claude)**: the Cloudflare dashboard, the Jobber Developer Center and GitHub Actions; it
  reads the pages the owner lands on and never types a credential into any field. Done so far
  (2026-10-25): D1 database `eys-ai-intake` bound as `EYS_AI_DB` (Production); plain variables
  `AI_INTAKE_ENABLED=false` and `AI_INTAKE_DAILY_CAP=20`; the Jobber app "EYS Request Intake" in
  Draft, with the callback URL, the Clients and Requests read + write scopes only, and
  refresh-token rotation on.
- **The owner (Aimen)**: pastes `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET` and `AI_ADMIN_KEY` into
  Cloudflare, and types the admin key into the connect form.

## How to deploy after changing a variable or secret

This Pages project is Direct Upload: there is no "Retry deployment", and the ⋯ menu on a
deployment offers only **Delete deployment** — never use it. Variables and secrets only reach a
deployment created after they were saved. Create one with:

GitHub → repo `aimenAlt/eys` → **Actions** → **Deploy Cloudflare** → **Run workflow** → Branch
`main`, **Deploy target** = `production` (the dropdown defaults to `preview`, so change it) →
**Run workflow**. Wait for the green run, then check `https://www.eyshandyman.com/api/ai/health`.
Any push to `main` deploys production too.

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
| Docs: README, STATUS, close backlog 010 | e0b824d | [40241783013](https://github.com/aimenAlt/eys/actions/runs/40241783013) |
| A. Link-based connect, schema report on connect, write pre-flight, trimmed secrets | 0ad96df | [40335591918](https://github.com/aimenAlt/eys/actions/runs/40335591918) |
| B. Docs (roles, GitHub deploy path, connect steps) + privacy "after 30 days" | 26ed0ef | [40336382351](https://github.com/aimenAlt/eys/actions/runs/40336382351) |

Every production deploy log shows `✨ Compiled Worker successfully` and
`✨ Uploading Functions bundle`. `npm run check`, `npm run build` and `npm test` (73 functions
tests after Push A) were clean before each push.

## LIVE URLS

- MCP: `https://www.eyshandyman.com/mcp` (POST only)
- JSON API: `https://www.eyshandyman.com/api/ai/service-requests` (POST),
  `https://www.eyshandyman.com/api/ai/info`, `https://www.eyshandyman.com/api/ai/openapi.json`
- Health: `https://www.eyshandyman.com/api/ai/health`
- Admin: `https://www.eyshandyman.com/api/admin/jobber/connect`, `/api/admin/jobber/callback`
  (Jobber redirects here), `/api/admin/jobber/probe` (Bearer `AI_ADMIN_KEY`, fallback only)
- OpenAI domain check: `https://www.eyshandyman.com/.well-known/openai-apps-challenge` (404 until set)
- `https://www.eyshandyman.com/llms.txt`

## VERIFIED (live, curl unless noted)

### Pushes 1–5 and the docs commit (2026-10-25)

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
- WebMCP (built-in browser, live homepage): no browser here supports `modelContext` natively, so a
  stand-in was installed and the page's own inline script re-run. Both tools registered
  (`readOnlyHint` / `consequentialHint`); `get_business_info` returned the phone; the submit tool
  (confirmed false) returned `ready_to_submit`. A normal page load makes no `/api/` request and logs
  no console error. Script size 2,205 bytes raw, 1,102 gzipped.
- Nothing else on the site changed: live `/`, `/book/` and `/start/` are byte-identical to the
  pre-intake versions except for the added WebMCP script (compared ignoring build timestamps and
  Cloudflare's per-request email-obfuscation keys). GA4 `G-9D5MCDT0L1` and Ads `AW-16988082106`
  tags unchanged; the analytics bundle hash is unchanged.

### Push A (0ad96df, 2026-10-26)

- `GET /api/ai/health` unchanged: `d1` true, `jobber_client` / `jobber_secret` / `admin_key` false,
  `intake_enabled` false.
- `GET /api/admin/jobber/connect` → 200 with the password form ("Check key"); CSP now
  `default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`.
  `POST` → 503 "missing its D1 database or admin key" with no `Location` header (no redirect).
- `/api/admin/jobber/probe` → 503; `/api/admin/jobber/callback` → 503 (not configured).
- `/mcp` `initialize` and `tools/list` unchanged (same version, server name, instructions and
  annotations).
- `/`, `/book/`, `/start/` = pre-intake HTML + the WebMCP script, nothing else.
- The OAuth flow itself cannot run until the secrets exist. The unit tests cover it: the Key
  accepted page and its single link (state, S256 challenge, redirect_uri), the Connected page with
  the schema report, the report-failure page, the unchanged wrong-account page, a mocked unknown
  required field blocking the write with nothing created, enum label choice, and trimmed secrets.

### Push B (26ed0ef, 2026-10-26)

- `/privacy/` now reads "and deletes them after 30 days"; compared with the page fetched just
  before the push, that one word is the only change. GA4 and Ads tags still present.
- `/`, `/book/`, `/start/` = pre-intake HTML + the WebMCP script; a clean-checkout build of
  26ed0ef had CSS identical to live for `/`, `/book/`, `/start/` and `/privacy/`.
- `GET /api/ai/health` unchanged; `/api/admin/jobber/connect` → 200.

## NEEDS HUMAN (in order)

1. **Jobber app — done by Cowork (2026-10-25).** Draft app "EYS Request Intake" (any name works),
   OAuth Callback URL `https://www.eyshandyman.com/api/admin/jobber/callback`, scopes **Clients**
   read + write and **Requests** read + write only, Refresh Token Rotation **ON**. It stays in Draft
   (a custom integration on EYS's own account needs no review). **Never press "Test in GraphiQL"
   on this app** (it invalidates the refresh token).
2. **Secrets — the owner.** Cloudflare → Workers & Pages → **eys** → **Settings** → **Variables and
   Secrets** (Production) → **Add**, type **Secret** for each:
   - `JOBBER_CLIENT_ID` — from the Jobber app's page in the Developer Center (Manage Apps)
   - `JOBBER_CLIENT_SECRET` — same page
   - `AI_ADMIN_KEY` — 40+ random characters (e.g. the output of `openssl rand -base64 36`), kept in
     the password manager. Under 16 characters (after trimming) counts as unset.
   - Already set by Cowork: D1 binding `EYS_AI_DB`, `AI_INTAKE_ENABLED=false`,
     `AI_INTAKE_DAILY_CAP=20`. Leave `OPENAI_APPS_CHALLENGE_TOKEN` and `JOBBER_EXPECTED_ACCOUNT` unset.
   - Then deploy (Cowork can do this): GitHub → `aimenAlt/eys` → **Actions** → **Deploy Cloudflare**
     → **Run workflow** → Branch `main`, **Deploy target** `production` (not the default `preview`)
     → **Run workflow**; wait for the green run. Check
     `https://www.eyshandyman.com/api/ai/health`: all four `configured` values `true`,
     `intake_enabled` `false`.
3. **Connect Jobber — the owner; Cowork reads the pages.** Open
   `https://www.eyshandyman.com/api/admin/jobber/connect`, type `AI_ADMIN_KEY`, press **Check key**.
   On "Key accepted", click **Continue to Jobber** (works once, for 10 minutes), sign in to Jobber
   as the EYS admin and press **Allow Access**. Jobber returns to a page that says "Jobber is
   connected to Elevate Your Space Handyman". Health then shows
   `"jobber":{"connected":true,"account_name":"Elevate Your Space Handyman","token_status":"valid"}`.
4. **Read the schema report — Cowork, on the Connected page itself.** Its summary line must read
   `Introspection enabled · API version 2026-09-25 · 0 plan problems · …`. If plan problems is not
   0, stop here with the kill switch off and hand the report to Claude Code (it holds schema names
   only: no tokens, ids or customer data). Only if the page says "Schema report failed (…)", use
   the fallback:
   ```bash
   read -rs AI_ADMIN_KEY && curl -s -H "Authorization: Bearer $AI_ADMIN_KEY" https://www.eyshandyman.com/api/admin/jobber/probe
   ```
5. **Keep assistants from being bot-challenged — Cowork.** Cloudflare → the eyshandyman.com zone →
   **Security**:
   - **Bots**: if **Bot Fight Mode** is on, turn it off — it cannot be skipped per path and can
     challenge ChatGPT's servers. (On Pro or higher, Super Bot Fight Mode is fine with the rule below.)
   - **WAF → Custom rules → Create rule**, name `AI intake: no challenges`, expression
     `(http.host eq "www.eyshandyman.com" and (http.request.uri.path eq "/mcp" or starts_with(http.request.uri.path, "/api/ai/") or http.request.uri.path eq "/.well-known/openai-apps-challenge"))`,
     action **Skip**: all remaining custom rules, all Super Bot Fight Mode rules, and (under More
     components) Browser Integrity Check and Security Level. Order: first. Do **not** include
     `/api/admin/`.
   - On 2026-10-25/26 curl reached every route without a challenge, so this is preventive.
6. **Turn it on — Cowork, after step 4 shows 0 plan problems.** Set `AI_INTAKE_ENABLED` to exactly
   `true` (no spaces) → deploy via GitHub Actions as in step 2 (Deploy target `production`) → health
   shows `"intake_enabled":true`.
7. **One live test — the owner, or Cowork with the owner's go-ahead and a phone number the owner
   owns** (replace the three `<…>` values):
   ```bash
   curl -s -X POST https://www.eyshandyman.com/api/ai/service-requests -H 'Content-Type: application/json' -d "{\"customer_name\":\"<First Last>\",\"phone\":\"<your phone>\",\"street_address\":\"<your street>\",\"city\":\"Katy\",\"state\":\"TX\",\"zip\":\"77494\",\"service_summary\":\"TEST - please archive\",\"job_details\":\"Test request from the AI intake set-up. Please archive.\",\"service_path\":\"not_sure\",\"consent_to_contact\":true,\"confirmed_by_customer\":true,\"source\":\"other\",\"request_id\":\"$(uuidgen | tr A-Z a-z)\"}"
   ```
   Expect `"status":"submitted"` with an `EYS-AI-…` reference. In Jobber → **Requests**, find
   `[AI assistant] TEST - please archive - Katy` with the note on it, then archive it. Note whether
   Jobber sent its usual new-request notification (see OPEN RISKS).
8. **ChatGPT developer mode — the owner (it is his ChatGPT account).** ChatGPT (web) → **Settings**
   → **Apps & Connectors** (labelled **Apps** in newer builds) → **Advanced settings** →
   **Developer mode** on → back → **Create**:
   - Name: `Elevate Your Space Handyman`
   - Description: `Send a service request to EYS in Katy, TX`
   - MCP Server URL: `https://www.eyshandyman.com/mcp`
   - Authentication: **No authentication**
   - Tick "I trust this application" → **Create**. In a new chat, pick it under **+** → Developer
     mode and ask for help with a handyman job in Katy.
9. **Optional, later — ChatGPT app directory.** When submitting the app in OpenAI's developer
   dashboard, put the domain-verification token in Cloudflare as `OPENAI_APPS_CHALLENGE_TOKEN`
   (plain Text) → deploy via GitHub Actions as in step 2 (Deploy target `production`) → confirm
   `https://www.eyshandyman.com/.well-known/openai-apps-challenge` shows it. Listing URLs: website
   `https://www.eyshandyman.com/`, privacy `https://www.eyshandyman.com/privacy/`, terms
   `https://www.eyshandyman.com/terms/`.

## OPEN RISKS

1. **Jobber input shapes.** Jobber does not publish its mutation reference. They are now checked
   twice before any write: the pre-flight refuses (nothing created) if a required input the code
   does not fill exists or a needed field is missing, and the schema report on the Connected page
   (step 4) shows the real shapes on first connect. Only the live test (step 7) proves Jobber
   accepts the values themselves.
2. **Jobber notifications.** Requests created through the API may not trigger the "new request"
   email/push that Client Hub form submissions do. Until step 7 says otherwise, assume EYS has to
   look for them: search Requests for `[ChatGPT]` (or `[AI`), or rely on the new-requests routine.
3. **Bot protection on `/mcp` and `/api/ai/*`.** Unchallenged for curl today, but Bot Fight Mode or
   Browser Integrity Check could challenge an assistant's servers (step 5).
4. **No photos.** Requests arrive without photos (the note says so); quoting may need a call.
5. **Client matching depends on Jobber's search.** If Jobber's client search does not find a stored
   phone format, a returning customer gets a second client record instead of the existing one.
6. **Partial writes.** The pre-flight removes the schema causes; a Jobber outage between creating a
   client/property and the request can still leave that client/property without a request (logged
   as `…@client` / `…@property`). Failures after the request exists are stored as `unverified` and
   never resent.
7. **Rotating `AI_ADMIN_KEY`** makes the stored tokens unreadable (reconnect, step 3) and resets
   the duplicate and rate-limit history.
8. **Abuse.** The endpoints are public with no auth. Limits cap the damage (5/hour/IP, 3/day/phone,
   20/day overall) but a determined sender rotating IPs and phone numbers could still file up to the
   daily cap of junk; the kill switch stops it. `today_count` counts attempts that passed the IP and
   phone limits, not only successes.
9. **Protocol churn.** MCP 2026-07-28 and WebMCP (a draft) are new. ChatGPT was not tested
   directly (step 8 is the first real client); WebMCP was tested with a stand-in because no browser
   here supports it natively.
10. **Cleanup timing.** Rows older than 30 days are deleted when a confirmed request arrives, so on
    a quiet month they can sit a little past 30 days (the privacy policy says "after 30 days").
