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

## Daily request routine (scheduled task "Morning Jobber check + auto-quote new requests")

Standing instruction from Aimen, 2026-10-15: the morning check does not stop at a report. It finds every new request without a quote and quotes each one.

1. **Mac online?** `get_device_info` + list this repo. If unreachable, push "Mac offline, check skipped" and stop.
2. **Read the rules and the learnings BEFORE any quoting:** this README, ALL of `learning-log.md` (every *standing* entry and every entry for comparable work), `master-guide.md`  or the identical project doc `quoting/EYS-Quoting-Guide.md`. Every quoting subagent must read the same files itself before touching Jobber or SimplyWise, and its brief must tell it to. Applying past lessons is the point of the system: quotes get more accurate over time.
2b. **Learn from past quotes' outcomes.** Open https://secure.getjobber.com/quotes and check the drafts listed in the learning log since the last run. Note any that Eyad or Aimen changed (price, scope, line items), sent, approved, or that were lost or archived. For each change, add a dated learning-log entry with the original price vs the final one, what changed and the lesson. Confirmed standing rules also go into master-guide, then re-sync the project doc.
3. **Find requests** at https://secure.getjobber.com/requests in your own Chrome tab. Logged out: push "Jobber logged out, log in and reply go" and stop (never type passwords). Take every request without a quote that is **up to 7 days old**: status New, plus Assessment complete / Overdue / Unscheduled (`?status=assessment_completed`, `overdue`, `unscheduled`). Older requests are ignored (Aimen, 2026-10-15). Skip test/self requests.
4. **Check for existing quotes:** `https://secure.getjobber.com/quotes?q=<name>`, read by screenshot (text extraction can't read that table), plus the request page. Same surname, different client does not count.
5. **Quote each one with its own subagent**, all launched in parallel. Each agent:
   - reads this folder and the project guide first;
   - opens its OWN Jobber and SimplyWise tabs, records the tab IDs in its job note, never touches another agent's tabs, stops typing if focus jumps, never creates a duplicate quote;
   - personally inspects every photo and does its own takeoff (materials, dimensions, installed vs purchase quantities, waste, confidence) before SimplyWise, estimating sizes from photo references (doors ~80 in, outlets, ceiling height, TV and tile sizes) and the request text;
   - **thin detail is not a reason to stop:** makes labeled assumptions, carries allowances, still saves the draft, and puts a clear WARNING in Eyad's internal note and the report listing what to confirm with the customer;
   - **uploads the actual-site request photos to SimplyWise** (open each Jobber photo full size, screenshot it, attach it with the Chrome upload_image tool, or upload the original file). Never upload AI-generated, inspiration or product images: SimplyWise can't tell "make it look like this" from "this is the current state". Describe those in the brief as inspiration instead. A photo that can't be uploaded (HEIC, broken) gets noted in the job note;
   - gives SimplyWise all the necessary info: the full request text, the takeoff numbers, what's customer-supplied, and which areas are in or out of scope;
   - runs SimplyWise in one pass, audits it (units, quantities, hours, duplicates, strip the 20% markup), researches prices independently;
   - prices to-do lists with the live To-Do List Visit tiers. Handyman-level electrical and plumbing (fixtures, switches, floodlights, mirror wiring, faucets, supply lines) is priced as normal EYS work, the way Eyad quotes it. Work beyond that (panels, new circuits, gas) is left out in a few plain words or flagged in Eyad's internal note, never with "licensed" wording;
   - **runs a final market sanity check on the end price before saving:** would a normal Katy/Houston homeowner pay this for this type of job? Compare it with typical installed prices for the same scope (per SF, per item, per visit), and compare it with what the customer actually asked for. Don't inflate a one-line request into extra areas or premium scope; price what was asked as the main item and offer anything else as an optional add-on. If the price lands above the typical range, cut hours or scope or justify it in Eyad's note;
   - saves a linked, unsent Draft (Large Project template above $700, Card Fee 3.0% once, **customer text short in Eyad's style; see master-guide §10**, full internal note read back), writes `jobs/<job-id>.md` and a learning-log entry, closes its tabs.
6. **Recheck every draft (mandatory second pass).** Each saved quote gets a second-pass review before the run counts it as done, by a fresh reviewer agent or the same agent after saving. Re-read the request and the photos, then check: is the main item only what was asked? Do the hours fit the task count? Are unit prices right (per SF vs per case)? Does the total match what Katy/Houston homeowners typically pay for this type of job (per unit and overall)? Is the customer text short, in Eyad's style, with no repetition and no "licensed"? Fix anything off in the same draft (never a new quote), reload and read back. On Oct 15 this second pass took Champion from $1,905 to $922, Frank from $4,017 to $3,193 and Jade from $1,803 to $1,442.
7. **Record learnings (mandatory, every run).** Each agent writes its job note and a learning-log entry covering what was hard, what SimplyWise got wrong, what the recheck changed and why. The coordinator then re-reads the learning log, merges duplicates, and promotes any repeated or confirmed lesson to master-guide (bump the version, re-sync the project doc). Follow "How to record an update". Never start another lessons list.
8. **Report:** one push notification (`<routine_summary>`) with count of new requests and drafts saved, then per request: name, one-line scope, quote # and all-in total, warnings and blockers. Nothing new: end quietly.

Never send, email, text, approve, schedule, invoice, archive or collect in this routine.

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
