# EYS Quoting Docs — start here

Internal estimating and quoting knowledge for Elevate Your Space Handyman. These are working docs, not website content: no routes, no pages, never attached to a customer quote.

## Read before every quote (in this order)

1. **This README.**
2. **`master-guide.md`** — the current rules (version 2026-10-11). Read all of it before the first quote in any session.
3. **`learning-log.md`** — dated corrections and lessons. Read every entry marked *standing*, plus any entry for comparable work (same trade, size or access conditions).
4. **`jobs/<job-id>.md`** — only when continuing a job or when a comparable past job helps. Check the date and comparability before reusing anything; old prices need fresh verification.

Read the files explicitly with your file tools. Their existence does not load them into a session.

## EYS-wide rules that also bind every quote

These come from the EYS project instructions and apply to quote text, notes and emails:

- **HOA: total silence.** Never mention HOAs in scope, exclusions, notes or messages: no offer to help, no "check with your association", no "we don't work with HOAs". Permits are fine to mention.
- **Never write "licensed" about EYS.** EYS is not a licensed electrician or electrical contractor; licensed electricians are brought in for regulated work. Reuse the electrical-services page wording verbatim.
- **Phone:** (346) 820-1629 only. The old (718) number must never appear.
- **To-Do List Visit pricing:** re-check the live Jobber catalog before using any price, and never present it as an hourly rate.
- **Never invent** licenses, insurance details, guarantees, review counts, superlatives or hours.
- **Never link or use the retired legacy Jobber forms** (including 2019189).
- **Eyad owns every price** sent to a customer. Drafts only. Never send, approve, schedule, invoice or collect without Aimen's explicit instruction for that quote.

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
