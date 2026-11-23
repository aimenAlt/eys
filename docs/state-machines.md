# State machines in the EYS app

Every place where something moves through named states, what the states are,
what moves them, and what is known to be fragile. Read this before changing
any of these flows. A known risk links to its open issue in `aimenAlt/eys`.

Audited 2026-11-20. Ranked by what a wrong transition can cost: texting a
customer or writing to Jobber first.

## 1. Quote Desk review state (`desk_quotes.state`)

- **States:** `open` (default when a quote is first looked at), `approved` (Essa tapped Looks good), `marked` (Mark Awaiting Response, don't text), `hidden` (archived on the desk, or the old Not sending).
- **Where:** the transition table and its only writer live in `functions/_lib/desk-state.ts`. `functions/_lib/desk-flow.ts` flows call it; `availableActions` takes its state rules from the same table, so the phone never offers what the server would refuse. `functions/_tests/desk-state.test.ts` fails the build if anything else writes `state`.
- **Transitions:** approve from open or marked; mark from open; hide from open; unhide (Bring back) from hidden; archive from any state to hidden.
- **Rule that protects customers:** only an `approved` row is ever texted (`advance` in desk-flow.ts). Archive moves a quote to `hidden` before anything changes in Jobber, and a hidden quote can't be approved again without Bring back, so finishing an archive in Jobber never texts anyone.
- **Open:** Bring back leaves approval and text fields on the row (#31); marked and approved rows never leave their lists once Jobber says approved or converted (#32); two screens read Jobber's status from two sources (#33).

## 2. Customer text (`desk_quotes.text_state`)

- **States:** `none` → `sending` (claimed by one caller) → `sent`, `failed` or `unknown` (Quo may have sent it). A resend claims again on `text_sent_at`.
- **Where:** `functions/_lib/desk-text.ts` holds the table, the pure `sendDecision` (the gates below, in order), the only writers (`claimText`, `settleText`, `claimResend`, `releaseResend`), the desk label (`textLabel`) and the event names that act as state. `advance` and `resendLink` in desk-flow.ts call it; the Retry button is `retryCanSend`, the same predicate `advance` uses. `functions/_tests/desk-text.test.ts` fails the build on any other write.
- **Entry points:** approve, the 3-minute poll and Retry (`functions/api/desk/action.ts`), the Jobber webhook (`functions/api/jobber/webhook.ts`), the Sent list refresh.
- **Gates, in order:** approved row, not already sent, approval under 60 days, Jobber says awaiting response, within a day of the tap (else a Retry tap), no live claim, no send problem (texting off, no US mobile, texts stopped).
- **Fixed 2026-11-20:** Retry is offered only when a tap can send, and past 60 days the screen says why (#26); the pinned "not sent yet" and "texted" notes are claimed atomically, so a race writes one (#27); a webhook whose work fails is forgotten and logged (`webhook_failed`), so a redelivery is processed, while the reply to Jobber still never waits on the work, because Jobber may disable webhooks that keep taking over 1 second (#28); `unknown` reads "Text may have gone out, check Quo" and stops the poll (#29).
- **Open:** re-approving a failed or unknown text never auto-sends (#30).

## 3. Status move and Jobber's quote status

- **States:** `move_state` = done, failed, manual (the token can't mark Awaiting Response, so Essa does it in Jobber). Jobber's `quoteStatus`: draft, awaiting_response, changes_requested, approved, converted, archived.
- **Where:** `moveStatus`, `recordStatus`, `pickStatusBranch` (desk-flow.ts, desk-jobber.ts). The live token has no `quotesMarkAwaitingResponse` and no `quoteDelete`; setting `sentAt` with `quoteEdit` does not take a quote out of draft (tried on #289). So the desk can't move a draft or archive one in Jobber; Archive on a draft is desk-only and tells Essa the Jobber step.
- **Open:** see #33.

## 4. Hang-up text (`functions/_lib/hangup.ts`)

- **States, per number:** nothing → queued for 8:00 (`hangup_queue`) → claimed (`hangup_sent`) → sent; a definite failure releases the claim, an unknown outcome or an opt-out keeps it. Each call is decided once.
- **Open:** a queued text is dropped if Quo is down or texting is off at flush time, unknown is logged as failed, and the queue is never purged (#34). Doc: `docs/quo-hangup-text.md`.

## 4b. Auto follow-up text (`functions/_lib/info-ask.ts`, `info_asks.state`)

- **States, per Jobber request:** nothing → `sending` (the claim: one sweep only) → `sent` → `answered` (name, address and a photo all in) or `expired` (7 days). A definite Quo refusal is `failed`, an unclear one `unknown`; neither is retried. A request decided against is `skipped` with its reason. The number is kept only while `sent`.
- **Moved by** the 10-minute sweep (`POST /api/quo/flush`) after the name fix and the duplicate merge. Mode in `desk_kv.info_ask_mode`: `dry` (default, logs `info_ask_would_send`), `live`, `off`; set and previewed at `POST /api/admin/info-ask`.
- **Rules:** new callers only (placeholder client, or a client made within 2 days of the request), 30 minutes to 3 days after the call, 8:00 to 20:00 Central, nobody texting with them in the last 30 minutes, one ask per client per 14 days, at most 20 a day, never `HANGUP_SKIP_NUMBERS` or a non-US number. Claude (`ANTHROPIC_API_KEY`, `functions/_lib/claude.ts`) writes the text and reads the replies; its text must pass `textProblem` (the customer text rules) or the fixed `templateAsk` text goes instead.
- **Open:** replies are read by polling Quo every 10 minutes (no Quo webhook is registered), so a reply lands within about 10 minutes, not at once.

## 5. AI intake request (`ai_requests.status`)

- **States:** pending → submitted, unverified or failed (`functions/_lib/intake.ts`, `functions/_lib/db.ts`).
- **Open:** a row stuck in pending counts as submitted for 48 hours, and a second submission sharing a request id says submitted even if the first fails (#35). Docs: `docs/ai-intake/`.

## 6. `/q/` link lifetime (`q_links`)

- **Windows from `created_at`:** intro 365 days, quote page 30 days; a resend renews only near the year-end expiry.
- **Open:** a resend between day 30 and 335 sends a link whose quote page has expired (#36).

## 7. Jobber connection

- **States:** `token_status` valid or refresh_failed, plus a refresh lock lease (`functions/_lib/jobber.ts`); the desk derives not_connected, needs_reconnect or ok (`quotesAccess` in desk-jobber.ts).
- **Open:** APP_DISCONNECT is only logged, and stored tokens are trusted without a decrypt check (#37).

## 8. Request photos (`functions/_lib/request-photos.ts`)

- **State lives in Jobber:** each photo note ends with a "Quo message times" line; a time on any note counts as added.
- **Open:** a note whose files never arrived still counts as covering those photos (#38).

## 9. Quote Desk page (`src/pages/essa/quotes/index.astro`)

- **State:** `state` = {me, home, quote, poll, notice}; hash routes (`#/`, `#/q/<id>`); one sheet at a time; a 3-minute poll after a tap; a 15-second screen cache with prefetch. It acts on the `actions` the server sends, so its buttons follow machine 1.
- **Check by hand:** `functions/_tests/desk-dev.ts` (launch config `desk-fake`, or `desk-fake-manual` for the live token's no-status-move case), PIN 4826. Live, without a PIN: `POST /api/admin/desk/test-action` runs Edit and Archive on quotes titled "(TEST)" only.

## 10. Marketing UI (low risk)

Mobile nav open/closed (`SiteHeader.astro`), the before/after slider mode (`BeforeAfter.astro`), the scroll-triggered sticky bars (`SiteBottomBar.astro`, `VanStickyBar.astro`), and the `/q/` intro's 10-second countdown that opens the quote page once per tab (`HandoffPage.astro`, sessionStorage). None writes anywhere.
