# EYS Quoting Docs — start here

> **ONE PLACE FOR LEARNINGS. Never create another list, file or section for lessons or mistakes.**
> - Dated lessons and mistakes → `learning-log.md`.
> - Confirmed standing rules → `master-guide.md`. Bump the version, then re-sync the project doc `quoting/EYS-Quoting-Guide.md`.
> - Follow "How to record an update" below before writing anything.

Internal estimating and quoting knowledge for Elevate Your Space Handyman. These are working docs, not website content: no routes, no pages, never attached to a customer quote.

## Read before every quote (in this order)

1. **This README.**
2. **`master-guide.md`**: the current rules, condensed 2026-10-15. Key sections: §1 non-negotiables, §9 pricing (with Eyad's price table), §10 writing the quote, §12 internal note and recheck. The `archive/` folder is history only. Read all of it before the first quote in any session.
3. **`learning-log.md`** — dated corrections and lessons. Read every entry marked *standing*, plus any entry for comparable work (same trade, size or access conditions).
4. **`jobs/<job-id>.md`** — only when continuing a job or when a comparable past job helps. Check the date and comparability before reusing anything; old prices need fresh verification.

Read the files explicitly with your file tools. Their existence does not load them into a session.

## EYS-wide rules that also bind every quote

These come from the EYS project instructions and apply to quote text, notes and emails:

- **HOA: total silence.** Never mention HOAs in scope, exclusions, notes or messages: no offer to help, no "check with your association", no "we don't work with HOAs". Permits are fine to mention.
- **Never write "licensed" anywhere in a quote**: not about EYS, and not "a brought-in licensed electrician" either. EYS is a handyman, and customers don't expect licensed. If a customer explicitly wants licensed work, it costs a lot more and Eyad prices it himself (Eyad, 2026-10-15). The website's electrical-page wording is a separate rule.
- **Phone:** (346) 820-1629 only. The old (718) number must never appear.
- **To-Do List Visit pricing:** re-check the live Jobber catalog before using any price, and never present it as an hourly rate.
- **Never invent** licenses, insurance details, guarantees, review counts, superlatives or hours.
- **Never link or use the retired legacy Jobber forms** (including 2019189).
- **Eyad owns every price** sent to a customer. Drafts only. Never send, approve, schedule, invoice or collect without Aimen's explicit instruction for that quote.

## Past mistakes

Past mistakes and their fixes are not repeated here. They live in two places:
- **`learning-log.md`**: one dated entry per mistake.
- **`master-guide.md`.

Read both before every quote and every routine run.

## New-request routine (scheduled task "EYS new requests: quote or call")

Since 2026-10-25 the routine lives in two account skills:

- **`eys-new-requests`** (the coordinator) adds texted photos to requests (master-guide §6.2), finds new requests, decides quote, call or wait (master-guide §6.3), creates Hamid's Quo call tasks, launches one quoting agent per ready request, checks the drafts and reports.
- **`eys-quote`** quotes one request through a verified, unsent draft.

The scheduled task runs the coordinator at 8:34 am, 12:34 pm and 4:34 pm Central. The old task "Morning Jobber request check" is retired; it had no Jobber or Quo connector attached.

**Short version, for a session without those skills:**

1. Mac, Jobber and Quo connectors, and Chrome reachable? If not, report it and stop.
2. Find requests with `search_requests` (new, assessment_completed, overdue, unscheduled; last 21 days). Skip test or self requests and requests that already have a quote (except those on `waiting` in `jobs/_routine-state.json`). A note such as "I'm handling it" or "don't contact" is for Hamid: no call task for that customer, but still quote the request when it's ready.
3. For each one, read the web request page, every photo, the notes, and the customer's Quo calls and texts (`fetch-call-transcripts` / `fetch-messages` with their phone). Every transcribed Quo call becomes a `Quo Request` with only the transcript (Aimen, 2026-11-11): read the transcript and the caller's texts, which may carry photos and scope, and scan the Quo inbox for texters or missed callers with no request (master-guide §4.1).
3b. **Texted photos, every run (Aimen, 2026-11-10 and 2026-11-11).** Scan each Quo inbox's messages since `last_inbox_scan` in `jobs/_routine-state.json` (`fetch-messages` with only `inboxPhoneNumber` and `createdAfter`). Add every texted photo (`media:` lines) to that customer's Jobber request: upload the images through the browser, or save a note listing the links if the upload fails (master-guide §6.2). The Jobber connector can't write notes or files.
4. Decide with master-guide §6.3 (2026-11-11): **no quote without an actual-site photo and the key measurement** (the size or count the price scales with; a guess like an assumed 175 SF doesn't count).
   - Ready: quote it (master-guide §5), one subagent per request, with labeled assumptions and WARNINGs for anything else. When the draft still rests on a big assumption, also one Quo confirm task for Hamid.
   - The customer said they'll send the photos or numbers: WAIT. Add the request to `waiting` in `_routine-state.json`, no task. After 3 days, or the day they named if later, it becomes CALL FIRST.
   - Otherwise CALL FIRST: one Quo task for Hamid whose title ends `(req <number>)`, listing which photos and which measurement to get.
   - Aimen can override for one request ("quote it anyway").
   - Check `list-tasks` first so you never create a duplicate.
4b. Follow up every request with a routine task or on `waiting`: new texts, photos or a real call since then means attach the photos, decide again, and quote when ready.
5. Report once.

**Browser fallback** (only when the Jobber connector still won't load after RefreshMcpTools, ListConnectors and one retry about 30 s later): read https://secure.getjobber.com/requests sorted by newest first; check each request page's "Used for Quote #" line for an existing quote; read the Quotes list rows with JS over `a[href*="/quotes/"]` (text extraction can't read that table; master-guide §4.2). If Jobber is logged out, push "Jobber logged out, log in and reply go" and stop. Never type a password, and never report "connector disabled" when the task lists the connector.

Never send, email, text, call, approve, schedule, invoice, archive or collect in this routine.

## Where things go

| What | Where | Committed to git? |
|---|---|---|
| Current rules | `master-guide.md` | Yes |
| Dated lessons, corrections, price/labor observations | `learning-log.md` (identifiers only, no customer contact details) | Yes |
| Per-job working note, takeoff, SimplyWise log, audit, actuals | `jobs/<stable-job-id>.md` (e.g. `jobs/2026-10-meeka-media-wall.md`) | **No.** `jobs/` is git-ignored so customer details never get committed |

One file per job, so concurrent quoting agents never overwrite each other.

## How to record an update

When Aimen or Eyad gives a correction, a new confirmed preference, a field measurement, a receipt, a labor result, a trade bid or a won/lost outcome:

1. Update the job note first. Keep the original values next to the corrected ones and the reason.
2. Add an entry to `learning-log.md` using the template at the top of that file. Classify it as *standing*, *this job only*, *verified actual* or *provisional*.
3. If it changes a standing rule, edit `master-guide.md`, bump the version line at its top, mark the old rule superseded in the log, and re-sync the claude.ai project doc `quoting/EYS-Quoting-Guide.md`.
4. Re-read your edits and check the other files for contradictions. Before editing a shared file, re-read its latest contents so you don't overwrite another session's changes.
5. Tell Aimen in one or two lines what was learned and where it went.

Never promote one job's rate, dimensions, address, price or materials into a global default. Never put credentials in these files.
