# Essa's Quote Desk

A private phone page where Essa reviews draft Jobber quotes and taps **Looks
good**. The quote moves to Awaiting Response in Jobber **without Jobber
messaging the client**, and the customer gets one text from EYS's Quo number,
(346) 820-1629, with a link to a short Essa intro page. The intro page then
opens the quote itself on our own page, read live from Jobber.

- Desk: `https://www.eyshandyman.com/essa/quotes/` (PIN, noindex, no analytics). Linked from the top of `/essa/`.
- Intro page: `https://www.eyshandyman.com/q/<code>` (noindex, no nav or footer, same design as `/go/`).
- Quote page: `https://www.eyshandyman.com/q/<code>/view` (the quote read from Jobber on each tap; same look, noindex, no-store).
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
- Every action is logged in `desk_events` with who did it and when: login, approve, the status move, text sent or failed, a resend (`text_resent`, with the last 4 digits), change, hide, unhide, and webhook.

## The quote screen

- **One Jobber call.** `GET /api/desk/quote` asks for the quote, its request in full and the client's earlier quotes, requests and jobs in a single nested query (`EysDeskQuoteBundle`). If Jobber refuses it (query cost, a hidden field), it falls back to separate calls. Connection pages are kept small (15 form sections, 40 items, 15 notes) so the query stays well inside Jobber's cost budget.
- **Request first.** The request's answers, notes and photos come before the quote. Long notes (call transcripts) show their start with "Show all". A quote made without a request (an email, a call) shows the client's latest request, with a note saying it isn't linked.
- **No contract.** The contract text and the "Estimate Disclaimer" boilerplate are never sent to the desk. Only the quote's own client note (what follows "Client Notes:") shows, as "Note on the quote". Photos Jobber copied from the request onto the quote show once.
- **Speed.** The schema snapshot is read once per request. After 12 hours it is served as is and refreshed after the response (`waitUntil`), so nobody waits for the walk. The page preloads the first three drafts and any quote on touch, keeps loaded quotes in memory (never in storage), and shows them at once while refreshing. Both desk routes send a `Server-Timing` header (`access`, `jobber`, `db`).

## Editing and archiving

- **Edit a line.** "Edit" under any line of a draft opens its description, Quantity and Price each, with the line total live. "Make it one price" turns a per-unit line (say 120 × $6) into quantity 1 at today's total, ready to retype (Eyad's request, 2026-11-20). Save sends only what changed to Jobber (`quoteEditLineItems`: quantity, unit price and the matching line total), then adds a note on the quote such as "Edited on the Quote Desk (Essa, Nov 12 9:14 AM): Vinyl plank install: 120 × $6.00 to 1 × $650.00". Refused for "licensed" or an HOA mention, a price outside $0 to $250,000, a quantity of 0 or less, a quote that isn't a draft, or one already approved on the desk.
- **Archive.** Shows for a draft or a quote waiting on the customer, including one Eyad already approved (Aimen, 2026-11-20). The quote always leaves the desk's send list first (`state = 'hidden'`), so no later status change in Jobber can text the customer. Then:
  - **Out of draft** (awaiting response, changes requested): Jobber's `quoteArchive`.
  - **A draft, live token:** Jobber refuses to archive drafts ("This quote cannot be archived", 2026-11-19), and the token has no way out of draft: `quotesMarkAwaitingResponse` and `quoteDelete` are hidden from it, and setting `sentAt` with `quoteEdit` saves the date but leaves the status draft (tried live on test quote #289, 2026-11-20). So Archive takes it off the desk only, writes nothing to Jobber, and the list shows "Off the desk. To archive it in Jobber too, open it there and tap More, Mark as Awaiting Response, then Archive." with an Open in Jobber button. "Bring back" undoes it.
  - **A draft, if the token ever sees `quotesMarkAwaitingResponse`:** marked Awaiting Response with no message, the status read back, then `quoteArchive`.
- **Agent check without a PIN.** `POST /api/admin/desk/test-action {quoteId, action: 'edit'|'archive', lines?}` with the admin or routine key runs these same two flows, logged as "Agent test", and refuses any quote whose title lacks "(TEST)".
- Links in request notes, answers and descriptions are tappable.

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

The only Jobber writes are this one status move, `quoteCreateNote` (for
"Needs a change", the "Quote not sent yet", "Quote texted", "Quote link re-sent" and "Edited" notes), a line's description, quantity and price (`quoteEditLineItems`, Aimen's requests 2026-11-11 and 2026-11-20) and Archive (`quoteArchive`, for quotes already out of draft). The desk never sends via Jobber, approves, schedules,
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
- **One quote, at most one text, plus resends Essa taps.** A conditional UPDATE moves `text_state` from `none` to `sending`, and only one caller can win it. Two webhooks and the poll arriving together still send one text (tested). Nothing but a tap on **Resend link** ever sends the link again (see below).
- **No desk approval, no text.** A quote that reaches Awaiting Response any other way is ignored.
- **Unknown outcomes are not retried blind.** When the network drops or Quo returns a 5xx, the state becomes `unknown`. "Retry text" first looks in the Quo conversation for a text carrying that quote's link, and marks it sent if it finds one.
- **Failures are retried only by Essa.** When Quo refuses the text (opted out, bad number, rate limit), the state becomes `failed` and the desk shows the reason. Only "Retry text" tries again; polls and webhooks never do.
- **Old approvals wait.** A text goes out on its own only within a day of the tap. An older approval waits for "Retry text", so turning `QUOTE_SEND_ENABLED` on never sends a burst of old quotes.
- **"Quote not sent yet" in Jobber.** A pinned note goes on the quote, once, whenever the desk leaves it in Awaiting Response without a text: Mark only, texting off, no phone, or a refused text. The reason goes in brackets. If the text goes out later, a second note says "Quote texted to the customer from the Quote Desk (<time>)."
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

### Resend link

Shown under the status chips (secondary style) when the text went out
(`text_state` is `sent`) and Jobber still says `awaiting_response`.

- **Tap** opens the same confirm sheet as Looks good: the name, the last 4 digits of the phone, when it was last texted and how many times it was re-sent, and the exact text. It is the same `quoteTextMessage` with the same `/q/` code, built from the quote's `q_links` row.
- **Send** texts it from inbox `PNeiWaFK2n`, updates `text_message_id`, `text_status` and `text_sent_at`, logs `text_resent` in `desk_events` with who tapped and the last 4 digits, and adds a note on the quote in Jobber (`quoteCreateNote`): "Quote link re-sent to the customer from the Quote Desk (<name>, <time>)."
- **An expired code works again.** If the `/q/` link has expired, or would within 30 days, its `created_at` is moved to now, so it lasts another year.
- **Only on a tap.** `POST /api/desk/action` with `resend`. Polls, the desk list, Retry text and webhooks never resend.
- **One Quo call per tap.** The claim is a conditional UPDATE that moves `text_sent_at` to now only when the last text is at least 10 minutes old, so two taps at once send one text (tested).
- **Refused, with a plain message, when:**
  - texting is off, or no `QUO_API_KEY`;
  - no text went out yet (use Looks good or Retry text);
  - no US phone number, or the customer stopped texts in Jobber (`smsStopped`);
  - the quote is no longer `awaiting_response` in Jobber;
  - a text (the first one or a resend) went out in the last 10 minutes;
  - 5 resends have already gone out.
- **A refused send doesn't count.** When Quo says no (opted out, bad number), the 10-minute gap is given back and it isn't counted. An unknown outcome (network, 5xx) counts, because it may have gone out: check Quo before trying again.

Source: `resendLink` in `functions/_lib/desk-flow.ts`.

### Other buttons

- **Mark Awaiting Response, don't text** moves the quote to Awaiting Response
  the same no-message way, but records no desk approval, so nothing ever
  texts this customer on its own. It also adds a **pinned** internal note on
  the quote in Jobber: "Quote not sent yet. Set to Awaiting Response from the
  Quote Desk (Essa, <time>). The customer has not been texted or emailed."
  - The quote moves to the desk's "Marked, not texted" fold.
  - **Send to {first} now** texts it later. That tap is a normal approval.

- **Needs a change** saves the note to `desk_changes` and adds it to the quote's internal notes in Jobber (`quoteCreateNote`) as "Needs a change (Essa, <time>, Quote Desk): …". The quote's status is not touched.
- **Archive** takes the quote off the desk (see "Editing and archiving"); a draft archived on the desk only can be undone from the "Hidden" fold with **Bring back**. The old Not sending button is gone. Every desk state and its transitions: `docs/state-machines.md`.

## The intro page

`/q/<code>` is served by `functions/q/[[code]].ts`. The page itself is built by
Astro and filled in per request:

- **Codes.** 8 characters from a 55-symbol alphabet with no look-alikes, about 46 bits.
- **Template.** The Function reads `q_links` and fills a template Astro built: `src/pages/q/intro/[review].astro`, through the same `HandoffPage` component as `/go/`, one template per review. A curtain quote gets the curtain review and a repair quote gets the repair review; anything else gets `GO_DEFAULT_REVIEW`.
- **Fallback.** An unknown, expired (over a year) or malformed code gets the static phone-number page (`src/pages/q/index.astro`) with a 404.
- **Guessing limit.** Lookups stop for an IP after 30 misses in an hour.
- **Opens and clicks.** The page's script reports a real open and a "View your quote" press to `/api/q/event`, so link previews don't count as opens. It also sends GA4 `quote_intro_view` and `quote_intro_click` (see `docs/analytics-events.md`).
- **"View your quote" opens our quote page.** The button and the 10-second auto-open go to `/q/<code>/view` (below), not Client Hub. `/q/<code>` itself never calls Jobber: texting apps fetch it to draw link previews.

## The quote page

`/q/<code>/view` (same Function, `functions/_lib/quote-view.ts`, template `src/pages/q/view-template.astro`) shows the customer's quote on our own page.

**Why this path shipped (2026-11-15).** Client Hub's bare link (`Quote.clientHubUri`) lands on Client Hub's email login, so a customer with no email on file can never get in, and Jobber's own texts carry a login token the API never returns. Jobber's public schema (`2026-09-25`) has two logged-in links, and the site's token can read neither:
- `Client.clientHubDelegateLoginUrl`: `undefinedField`; the token's view of `Client` has no `clientHub*` field at all, despite every client, request and quote scope.
- `Quote.previewUrl` ("quote preview in client hub with an embedded auth token"): `undefinedField` too, asked twice for test quote #272 through a temporary probe (locked to a one-off token and the test client, removed in the next push).

So the planned redirect (`/q/<code>/open` to a fresh `previewUrl` per tap) couldn't be built, and the quote is drawn here instead.

- **Fresh on every tap.** Each tap reads the quote from Jobber (`EysCustomerQuote`, pruned against the desk's schema snapshot). Nothing from Jobber is stored.
- **What it shows.** Title and quote number; each line's name, description, quantity when more than 1, and line total ($0 reads "Included", text-only lines have no price); subtotal, any discount, the card fee as "Card processing fee" (it's Jobber's tax rate, never called tax), total, and the deposit if any; and only the quote's client note (what follows "Client Notes:", the desk's `clientNoteOf`), as "Note from Essa". Never internal notes, costs, hours, margin, the Estimate Disclaimer or the contract.
- **Buttons.** "Text Essa to approve" opens a text to (346) 820-1629: `Hi Essa, I approve quote #<number> for the <title>.`, the title written the way the quote text writes it (`titlePhrase`). Only when the client has an email on file, "Approve and sign online" opens the bare Client Hub link, with "Jobber will email you a sign-in link." under it. An approved or converted quote shows "You approved this quote. Thank you." instead of both buttons.
- **Phone-number page instead** (the static `/q/` page, 404) when the link is more than 30 days past its text (a resend renews it), the code has had more than 20 taps in the hour, Jobber errors or is disconnected or hides quotes, the quote is archived or gone, or it belongs to a different client than the link.
- **Email check.** `Client.emails` needs Jobber's `Email` type in the schema snapshot; a snapshot taken before this shipped gets it added on the first tap (`ensureDeskTypes`). If the token can't read emails, the online button never shows and the text button still works. On 2026-11-15 it could: #272's test client got the online button.
- **Checked on live (2026-11-15).** A cookie-less headless phone opened `/q/unzwTDvh` (texted before this shipped), tapped "View your quote" and landed on quote #272 with its line, card fee, total and note, both buttons, and no login form.
- **Already-sent links work.** It needs only the `q_links` row, so texts sent before this shipped (unzwTDvh included) open the quote with no resend.
- **Desk signal.** Customers mostly stay on our page now, so "Opened quote" (Jobber's `clientHubViewedAt`) fills only when someone picks the online button. A press of "View your quote" (`clicked_at`) is the open of this page.

## D1 tables (eys-ai-intake, binding `EYS_AI_DB`)

All tables are created lazily (`CREATE TABLE IF NOT EXISTS`) in `functions/_lib/desk-db.ts`.

| Table | Holds |
| --- | --- |
| `q_links` | One row per texted quote: code, quote and client IDs, first name, title, Client Hub link, review, created, served/opened/clicked counts and first times. |
| `desk_quotes` | One row per quote the desk has looked at or acted on: state (`open`, `approved`, `marked` or `hidden`), who approved or hid it and when, the status move (branch, state, error), the last Jobber status, Client Hub view and approval times, and the text (`text_state`, claim, number, body, Quo message ID and status, error, sent time, `q_code`). |
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
`7391`, and `SEND=off` shows the "Texting is off" state. Two texted quotes are
seeded for the customer side: `/q/DevViewA` (intro, then its quote page) and
`/q/DevViewB/view` (a client with an email, so "Approve and sign online" shows). The same server is the
`desk-fake` entry in `.claude/launch.json`.

Tests: `functions/_tests/intro.test.ts`, `quote-view.test.ts`, `desk.test.ts`, `desk-flow.test.ts` (`npm test`).
