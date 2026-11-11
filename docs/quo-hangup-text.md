# Hang-up text for callers who leave Sona

Sona (Quo's AI agent) answers (346) 820-1629 after a 25-second ring, and it can't do anything once a call ends. On 11 Nov 2026, 5 of 7 Sona calls hung up right after the greeting and got no text. This sends them one, from the EYS inbox:

```
Hey, it's EYS Handyman. Looks like we got cut off. Feel free to text us some pics of what you need done.
```

The text follows Aimen's customer text rule: short and plain, no em or en dashes, no emoji, no sign-off, no lists, no "Reply STOP" line. It is behind **`HANGUP_TEXT_ENABLED`**, default off. When the flag is off, every call is still decided and logged as `disabled (would send)` or `disabled (would queue for 8:00)`, so the log shows what turning it on would do.

Code: `functions/_lib/hangup.ts`, `functions/api/quo/webhook.ts`, `functions/api/quo/flush.ts`, `workers/hangup-flush/`. Tests: `functions/_tests/hangup.test.ts`.

## Owner steps

1. Set the Cloudflare Pages secret `QUO_API_KEY` (the same key the Quote Desk uses).
2. **Register the webhook.** Open `https://www.eyshandyman.com/api/admin/quo/webhook`, enter the admin key, and press Register. This calls Quo's API once (`POST https://api.quo.com/webhooks`):
   - URL: `https://www.eyshandyman.com/api/quo/webhook`
   - Events: `call.completed`
   - Resource IDs: `PNeiWaFK2n`, the (346) 820-1629 inbox only
   - Label: "EYS hang-up text (eyshandyman.com)"

   Quo returns a signing key (`whsec_…`). It is stored encrypted in D1 (`desk_kv.quo_webhook`) and never shown. Nothing else in Quo is changed.

   To register it in the Quo app instead, use the same URL, event and number, then put its signing secret in the Cloudflare secret `QUO_WEBHOOK_SECRET`. That secret takes priority over the saved key.
3. Optional: set `HANGUP_SKIP_NUMBERS` to comma-separated E.164 numbers that must never get the text (family, vendors, your own cells).
4. Let it run with the flag off for a few days and read the log (below). Then set `HANGUP_TEXT_ENABLED` to `true`.

## When the text goes out

The text is decided on Quo's `call.completed` webhook. It goes out only when every one of these holds:

1. **The call is on the EYS inbox.** `context.phoneNumberId` is `PNeiWaFK2n` and `direction` is `incoming`.
2. **Sona answered and no team member did.** The desk fetches the call (`GET /calls/{id}`, API `2026-03-30`) and reads three signals:
   - `answeredBy`: a person is `US…`; Sona, as a system actor, is `SYU…`.
   - `aiHandled: "ai-agent"`.
   - Any `US…` actor in `participants`, which also catches a transfer to a person.

   The webhook's own `status: "ai-handled"` backs this up. A person anywhere on the call means no text. If the call can't be fetched and the webhook says `answered`, it is treated as a person (no text). A missed, unanswered or forwarded call is left to Quo's own missed-call auto-reply.

   This is the most reliable signal Quo's docs give: there is no Sona-specific webhook event.
3. **No text from the inbox to that number in the last 7 days.** The desk checks `GET /messages?phoneNumberId=PNeiWaFK2n&to=<caller>&direction=outgoing&createdAt[gt]=<7 days ago>`. Sona's own "Send SMS" during the call shows up here and is logged as `sona_texted`. Any other text is logged as `recent_outbound_7d`. If Quo can't be reached for this check, no text is sent (`quo_unavailable`).
4. **One per number per 7 days.** This is guarded in D1 (`hangup_sent`), and only one webhook can claim a number.
5. **A US number** (`+1` and a valid area code), and not in `HANGUP_SKIP_NUMBERS`.
6. **Not opted out.** Quo has no contact field for opt-outs or blocks. A send refused with Quo's `User Opted Out` error is logged as `opted_out`, and the number is not tried again for 7 days.

Each call is decided once, however many deliveries report it. Deliveries are deduplicated on `webhook-id` (`webhook_deliveries`) and calls on the call ID (`hangup_calls`).

### Sending hours

Texts go out between 8:00 and 20:00 America/Chicago. A call outside those hours is queued in D1 (`hangup_queue`) for the next 8:00. At that point every rule is checked again: if someone texted or called them back in the morning, the queued text is skipped.

The queue is flushed in three places:
- on every Quo webhook;
- on `POST /api/quo/flush`;
- by the scheduled Worker **`eys-hangup-flush`** (`workers/hangup-flush`), which pings that endpoint every 15 minutes.

The Worker is needed because Pages has no cron. Calls are sparse on a Sunday, so waiting for the next webhook could leave an overnight text unsent until the afternoon, well over the 12-hour limit. The Worker holds no secret or data. The flush endpoint needs no key, because it only sends what is already queued and due, after the same checks, at most 6 runs a minute.

## Signature

Quo's current webhooks use Standard Webhooks headers: `webhook-id`, `webhook-timestamp` (seconds) and `webhook-signature: v1,<base64>`. The receiver:

1. Builds the signed string `${webhook-id}.${webhook-timestamp}.${rawBody}`.
2. Computes HMAC-SHA256 with the signing key, after removing `whsec_` and base64-decoding the rest.
3. Compares the result in base64 against every `v1` entry.

Timestamps more than 5 minutes off are refused. Legacy `openphone-signature: hmac;1;<ms>;<base64>` (over `${ms}.${rawBody}`) is accepted too. Sources: <https://www.quo.com/docs/2026-03-30/webhooks-signature-validation.md> and the legacy page.

## The log

Every decision is written to `hangup_log` in the eys-ai-intake D1:

- `at`, `call_id`
- a keyed hash of the number, plus its last four digits
- `decision`: `sent`, `skipped`, `queued` or `failed`
- `reason`
- the Quo message ID for a sent text

Full numbers are kept only while a text waits in the queue. Log rows go after 90 days.

Reasons: `sona_hangup` (sent), `quiet_hours` (queued), `team_answered`, `not_answered_by_sona`, `sona_texted`, `recent_outbound_7d`, `already_texted_7d`, `already_queued`, `skip_list`, `non_us`, `opted_out`, `quo_unavailable`, `other_inbox`, `outbound_call`, `no_quo_key`, `disabled (would send)`, `disabled (would queue for 8:00)`.

To see the last day:

```sql
SELECT datetime(at/1000, 'unixepoch', '-6 hours') AS cst, last4, decision, reason
FROM hangup_log ORDER BY id DESC LIMIT 50;
```
