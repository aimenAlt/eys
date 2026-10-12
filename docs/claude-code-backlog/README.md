# Claude Code backlog — EYS site work from the Oct 11 2026 performance digest

This folder is the queue. ONE Claude Code session works it, top to bottom, one item at a time.
Created 2026-10-11 by Claude (Cowork) from the 43-day Ads/GA4/GSC/Jobber digest. Raw data:
`~/Downloads/eys-data-2026-10-11/` on Aimen's Mac (not in the repo; a cloud session works from the numbers quoted in each item). This folder IS tracked (so cloud clones see it); `Claude outputs/` stays untracked — never commit that one.

## How to work this queue
1. Items are `NNN-<slug>.md`, lowest number first. Open the item, do exactly what it says.
2. Each item = ONE logical change = one commit = one push to `main`. You have full standing
   authority to commit and push to `main` without asking (standing rule since Sep 13 2026).
3. Before every push: `npm run check` and `npm run build` must be clean. After the push wait
   ~60s for the Cloudflare Pages deploy, then verify on the LIVE site (https://www.eyshandyman.com)
   with curl, not the build output. If live verification fails, fix forward or revert, then continue.
4. When an item is done, add a `## DONE <date> <commit sha>` line at the bottom of that item file
   with 2–3 lines of what shipped and what you verified. Do not rename or delete item files.
5. Decide anything unforeseen yourself and note the decision in the item file. Do not stop to ask.
   Do not reply in chat unless something is genuinely broken that you cannot fix or revert.
6. Hard rules that apply to every item (non-negotiable):
   - Never write "licensed" about EYS. Electrical wording is copied verbatim from
     /services/electrical-services/ only.
   - HOA: total silence everywhere (never mention HOAs at all; permits are fine).
   - Phone is (346) 820-1629 and nothing else. The old (718) number must never appear.
   - Town naming: Katy always first, Fulshear its default partner — "Katy & Fulshear",
     "Katy, Fulshear & Cinco Ranch", "Katy, Fulshear, Cypress, Richmond & West Houston".
   - Prices come only from `src/data/pricing/todoList.ts` ($175 / $299 / $399 / +$60 per 30 min),
     never written as an hourly rate. Review count/rating only via `src/data/business.ts`.
   - Never invent licenses, insurance details, guarantees, superlatives or hours.
   - No site-wide changes when one page is asked for. No churn in shared components unless the
     item says so. Tracking must survive: gtag/GA4 (G-9D5MCDT0L1, AW-16988082106), the Jobber
     cross-domain linker, `eys_form`/`eys_lp` params, `data-cta-location` / jobber_booking_click.
   - Never link the retired Jobber forms (2019189, 4372609, 4975089, 5025076).
   - Never commit `Claude outputs/`.
7. One Claude Code session on this repo at a time. If another session is active, stop and say so.

## Queue
| # | Item | Status |
|---|------|--------|
| 001 | Apex-host "Redirect error" (37 URLs in Search Console) | blocked: needs Aimen in Cloudflare (rule written in item) |
| 002 | Paid landing page for built-ins, shelving & storage | done 3d7b132 |
| 003 | `/start/` paid landing page: phone-first, measured against the homepage | done a22319c |
| 004 | Zero-CTA Ads landing pages: repairs-and-maintenance + handyman-to-do-list | done 71c1c23 |
| 005 | `/services/` hub and `/services/tv-mounting/` are not on Google | done 248a414 |
| 006 | Refresh the data section of `eys-seo-dominance-stage1-prompt.md` | open: run from the Mac (file is untracked) |
