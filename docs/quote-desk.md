# Essa's Quote Desk

A private phone page where Essa reviews draft Jobber quotes and taps **Looks
good**. The quote moves to Awaiting Response in Jobber **without Jobber
messaging the client**, and the customer gets one text from EYS's Quo number,
(346) 820-1629, with a link to a short Essa intro page. The intro page then
opens their Jobber Client Hub quote.

- Desk: `https://www.eyshandyman.com/essa/quotes/` (PIN, noindex, no analytics). Linked from the top of `/essa/`.
- Intro page: `https://www.eyshandyman.com/q/<code>` (noindex, no nav or footer, same design as `/go/`).
- Jobber webhook: `https://www.eyshandyman.com/api/jobber/webhook`.

Why it exists: Essa uses Android. Jobber's mobile app can't move a draft to
Awaiting Response without Jobber texting the customer from Jobber's own
number. Only Jobber's website can (More, then Mark as Awaiting Response).

## Owner steps

1. **Cloudflare Pages secrets** (eys project, Production):
   - `DESK_PINS`: `Essa:<pin>,Aimen:<pin>`. 4 to 12 digits each, and the two PINs must differ. The PIN alone picks the person.
   - `QUO_API_KEY`: the Quo API key.
   - `QUOTE_SEND_ENABLED`: `true` once a test quote has gone end to end. Leave it unset until then.
2. **Jobber Developer Center** → EYS Request Intake:
   - Under Scopes, add **Quotes** read and write.
   - Under Webhooks, add `QUOTE_UPDATE`, `QUOTE_SENT` and `QUOTE_APPROVED` (optionally `APP_DISCONNECT`) with URL `https://www.eyshandyman.com/api/jobber/webhook`. Save.
   - Never press "Test in GraphiQL". Never press "Regenerate secret". Either one breaks the live connection.
3. **Reconnect**: open `https://www.eyshandyman.com/api/admin/jobber/connect`, enter the admin key, and allow access. Until this is done the desk shows **Jobber needs reconnecting for quotes**. That is the expected state.
4. Open the desk. The footer names the status branch Jobber allowed (see below).

## Secrets and flags

| Name | Kind | Used for |
| --- | --- | --- |
| `DESK_PINS` | secret | Desk login. Changing someone's PIN (or removing them) ends that person's sessions. |
| `AI_ADMIN_KEY` | secret (existing) | Signs the desk session cookie and hashes IPs for the lockout, through derived sub-keys. Also decrypts the stored Jobber tokens. |
| `JOBBER_CLIENT_SECRET` | secret (existing) | Verifies `X-Jobber-Hmac-SHA256` on webhooks. |
| `QUO_API_KEY` | secret | Sends the text through Quo (`Authorization: <key>`, API version `2026-03-30`). |
| `QUOTE_SEND_ENABLED` | var, default off | Only exactly `true` sends. With it off, approving, the status move, the webhook and polling all still work. The text step shows **Texting is off**. |

How the desk session works:
- The cookie is `eys_desk`: HttpOnly, Secure, SameSite=Lax, `Path=/api/desk/`, 90 days.
- A login is allowed at most 5 wrong PINs per 15 minutes per IP (`rate_counters`, keyed IP hash).
- Every action is logged in `desk_events` with who did it and when: login, approve, the status move, text sent or failed, change, hide, unhide, and webhook.

## The status branch

The desk never moves a quote any way that messages the client. It reads the
schema the app's token can see, caches it in D1 (`desk_kv.jobber_schema`, 12
hours), and picks a branch on its own. The desk footer shows which branch is
active.

- **No-message mutation (preferred).** Jobber's schema has `quotesMarkAwaitingResponse(quoteIds: [EncodedId!]!)`, the API form of Jobber web's "Mark as Awaiting Response", which sends nothing. If the token can see it, the desk calls it right after the tap.
  - Checked on 2026-11-11 against Jobber's public introspection at API version `2026-09-25`.
  - Whether the EYS Request Intake token can see it is only known after the reconnect, so the desk decides at runtime.
- **Manual.** If no such mutation is visible, the confirm sheet says "Last step: tap More, then Mark as Awaiting Response" and opens the quote in Jobber web. The webhook or the poll notices the flip and sends the text.
- **Never used:** `workObjectSendSms`, `workObjectSendEmail`, or anything named send, email or sms. Those message the client from Jobber.

The only Jobber writes are this one status move and `quoteCreateNote` for
"Needs a change". The desk never sends via Jobber, approves, schedules,
invoices or collects money.

## What happens on "Looks good"

1. **Confirm sheet.** It shows the recipient name, the last 4 digits of the phone number, the total and the exact text.
   - The text already carries its real link, because the intro code is reserved when the quote screen opens.
2. **Send** records the approval in D1 (`desk_quotes.state = 'approved'`).
   - The first tap wins. A second tap changes nothing.
3. **The status move** (see the branch above).
4. **Noticing the flip.** Any one of these is enough:
   - the Jobber webhook;
   - the desk polling the quote every 6 seconds for 3 minutes after the tap;
   - every load of the desk list (it also refreshes "Sent, waiting").
5. **Sending.** When Jobber says `awaiting_response`, D1 has the desk approval and no text has gone out, the desk:
   - writes the `/q/<code>` row (`q_links`);
   - sends the text from inbox `PNeiWaFK2n`;
   - stores the Quo message ID and status.

Guarantees:
- **One quote, at most one text, ever.** A conditional UPDATE moves `text_state` from `none` to `sending`, and only one caller can win it. Two webhooks and the poll arriving together still send one text (tested).
- **No desk approval, no text.** A quote that reaches Awaiting Response any other way is ignored.
- **Unknown outcomes are not retried blind.** When the network drops or Quo returns a 5xx, the state becomes `unknown`. "Retry text" first looks in the Quo conversation for a text carrying that quote's link, and marks it sent if it finds one.
- **Failures are retried only by Essa.** When Quo refuses the text (opted out, bad number, rate limit), the state becomes `failed` and the desk shows the reason. Only "Retry text" tries again; polls and webhooks never do.
- **Old approvals wait.** A text goes out on its own only within a day of the tap. An older approval waits for "Retry text", so turning `QUOTE_SEND_ENABLED` on never sends a burst of old quotes.
- **Blocks before anything is claimed:**
  - texting off, or no `QUO_API_KEY`;
  - no US phone number;
  - the customer stopped texts in Jobber (`smsStopped`);
  - Jobber has no Client Hub link yet.

### The text

Aimen's rule for every text and page line a customer sees: short and plain,
like Essa texting from the truck. No em or en dashes, no emoji, no sign-off,
no lists, no "Reply STOP" line, and as few words as possible.

```
Hi {first}, it's Essa with EYS Handyman. Your quote for the {title} is ready https://www.eyshandyman.com/q/{code}
Any questions just text me here.
```

How the title is written:
- Lower case, with acronyms kept (`TV Mounting` becomes `TV mounting`). Names with inner capitals (iPhone, McKenzie) keep their case.
- A leading "the/a/an" and a trailing "quote/estimate" are dropped.
- Dashes and emoji are removed.

When the title is empty or generic ("Project Quote", "Quote", "Estimate",
"Quote #212"), the first line reads `... Your quote is ready https://...`. The
second line stays.

Source: `functions/_lib/quote-text.ts`.

### Other buttons

- **Needs a change** saves the note to `desk_changes` and adds it to the quote's internal notes in Jobber (`quoteCreateNote`) as "Needs a change (Essa, <time>, Quote Desk): …". The quote's status is not touched.
- **Not sending** hides the draft. It can be undone from the "Hidden" fold with **Bring back**.

## The intro page

`/q/<code>` is served by `functions/q/[[code]].ts`. The page itself is built by
Astro and filled in per request:

- **Codes.** 8 characters from a 55-symbol alphabet with no look-alikes, about 46 bits.
- **Template.** The Function reads `q_links` and fills a template Astro built: `src/pages/q/intro/[review].astro`, through the same `HandoffPage` component as `/go/`, one template per review. A curtain quote gets the curtain review and a repair quote gets the repair review; anything else gets `GO_DEFAULT_REVIEW`.
- **Fallback.** An unknown, expired (over a year) or malformed code gets the static phone-number page (`src/pages/q/index.astro`) with a 404.
- **Guessing limit.** Lookups stop for an IP after 30 misses in an hour.
- **Opens and clicks.** The page's script reports a real open and a "View your quote" press to `/api/q/event`, so link previews don't count as opens. It also sends GA4 `quote_intro_view` and `quote_intro_click` (see `docs/analytics-events.md`).

## D1 tables (eys-ai-intake, binding `EYS_AI_DB`)

All tables are created lazily (`CREATE TABLE IF NOT EXISTS`) in `functions/_lib/desk-db.ts`.

| Table | Holds |
| --- | --- |
| `q_links` | One row per texted quote: code, quote and client IDs, first name, title, Client Hub link, review, created, served/opened/clicked counts and first times. |
| `desk_quotes` | One row per quote the desk has looked at or acted on: state (`open`, `approved` or `hidden`), who approved or hid it and when, the status move (branch, state, error), the last Jobber status, Client Hub view and approval times, and the text (`text_state`, claim, number, body, Quo message ID and status, error, sent time, `q_code`). |
| `desk_events` | Who did what, when. |
| `desk_changes` | "Needs a change" notes and whether Jobber took them. |
| `webhook_deliveries` | Delivery IDs already handled (Jobber: a hash of the body; Quo: `webhook-id`). |
| `desk_kv` | The cached Jobber schema and status branch. |

`rate_counters` (existing) also counts wrong PINs and `/q/` misses.

## Sent, waiting

This read-only list on the desk shows quotes sent through the desk, oldest
first. Each one shows:

- **Sent**: the Quo text went out.
- **Opened intro**: `/q/` ran its script.
- **Opened quote**: Jobber's `clientHubViewedAt`.
- **Approved**: Jobber's `lastTransitioned.approvedAt`, or the quote's approved or converted status.

## Working on it locally

`functions/_tests/desk-dev.ts` serves `dist/` with the real desk and `/q/`
Functions, running against an in-memory D1, a fake Jobber (whose schema
comes from `functions/_tests/fixtures/jobber-quote-schema.json`) and a fake
Quo. Nothing reaches Jobber, Quo or Cloudflare.

```bash
npm run build && node --experimental-strip-types --no-warnings functions/_tests/desk-dev.ts
```

Then open `http://localhost:8790/essa/quotes/`. The test PINs are `4826` and
`7391`, and `SEND=off` shows the "Texting is off" state. The same server is the
`desk-fake` entry in `.claude/launch.json`.

Tests: `functions/_tests/intro.test.ts`, `desk.test.ts`, `desk-flow.test.ts` (`npm test`).
