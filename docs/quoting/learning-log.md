# EYS Quoting — Learning Log

Dated feedback, corrections, price and labor observations, and estimate-versus-actual lessons. Newest entries go at the top of the "Entries" section. Keep customer contact details out of this file; put job detail in `jobs/<job-id>.md`.

## Entry template

```
### YYYY-MM-DD — <job/reference or "process">
- Observation or mistake:
- Evidence and outcome:
- Corrected future behavior:
- Scope: standing / this job only / verified actual / provisional
- User confirmation:
- Supersedes:
- Remaining uncertainty:
```

## Entries

### 2026-10-11 — Process: quoting docs live in the website repo
- Observation: Aimen clarified that the EYS repo is the website repo and quoting knowledge belongs in `docs/quoting/` inside it.
- Corrected future behavior: maintain `README.md`, `master-guide.md`, this log and per-job notes under `docs/quoting/`. Read them before every quote. Don't touch website code, routes or build config from a quoting task. `jobs/` is git-ignored so customer job notes are never committed.
- Scope: standing.
- User confirmation: EYS Quoting Guide, 2026-10-11, section 21.1 and the correction register.
- Supersedes: no prior location (`docs/quoting/` did not exist before this date).

### 2026-10-11 — Process: independent research, check both directions
- Observation: SimplyWise had been treated as close to the pricing authority.
- Corrected future behavior: research the method, materials, current supplier/rental prices, realistic labor and comparable Katy/West Houston pricing before proposing a price. Run both the underquoting and overquoting checks (master guide 13.1–13.2) and record sources with dates.
- Scope: standing.
- User confirmation: EYS Quoting Guide, 2026-10-11.
- Supersedes: any reliance on SimplyWise or generic contractor averages alone.

### 2026-10-11 — Process: one continuous pass, local working note
- Observation: switching between Jobber and SimplyWise after individual questions wasted time and caused repeated browsing.
- Corrected future behavior: Jobber intake once → local working note → every SimplyWise question in one pass → audit → full quote package prepared locally → back to Jobber once to fill, save and verify. An extra lookup needs a specific essential fact, and that fact gets recorded.
- Scope: standing.
- User confirmation: EYS Quoting Guide, 2026-10-11.
- Supersedes: any older suggestion that good internal notes alone justify skipping SimplyWise without explicit permission.

### 2026-10-11 — Process: inspect every photo and do the takeoff before SimplyWise
- Observation: Aimen reinforced that pictures, materials, lengths and dimensions must be thought through before anything goes into SimplyWise.
- Corrected future behavior: personally open every picture, separate real site from inspiration and duplicates, and finish the material/dimension takeoff (installed vs purchase quantities, waste, confidence) before the SimplyWise brief. An unopenable photo blocks SimplyWise entry until resolved.
- Scope: standing.
- User confirmation: EYS Quoting Guide, 2026-10-11.

### 2026-10-06 to 2026-10-07 — Process: confirmed standing preferences
- Corrected future behavior:
  - Start named-customer quotes in Jobber Requests.
  - Above $700 use **Large Project (contract agreement) Template** ("Big Job Quote Template" in old docs means this).
  - Select existing **Card Fee (3.0%)** in Tax / Search tax rate on every quote, once.
  - Every quote gets a saved and read-back private estimating note for Eyad in Jobber internal Notes.
  - SimplyWise defaults: paint-grade plywood casework, overlay lower doors, 12 in cabinet/shelf depth, client-supplied gold/brass hardware, EYS supplies only 4/6 in recessed and LED lights, customer supplies the fireplace unit.
  - Concurrent agents share one Chrome but each uses only its own dedicated tabs.
- Scope: standing.
- User confirmation: EYS_QUOTING_MEMORY.md (October 6–7, 2026), consolidated into the master guide.
- Supersedes: optional fee-field approach, "Big Job Quote Template" name, workflows that skipped Requests or the internal note.

## Historical case lessons (before this log existed)

Detail is in master guide section 23. Figures belong to those jobs only and are not defaults.

- **Meeka media wall (Quote #201):** audit product units (a $1.60 "drywall sheet" was a per-SF price), gross face area is not drywall purchase area, strip SimplyWise's automatic 20% markup before pricing, never save a placeholder address, and keep verified note content separate from an unverified later formatting edit. *Provisional case lesson.*
- **Kaile wallpaper (Quote #207):** a truncated request extract hid the real dimensions and an alternate-pricing request, so read the full visual request. Verify an unnamed SimplyWise draft by evidence before adopting it. The catalog $8/SF wallpaper line is install only, not substrate prep. *Provisional case lesson.*
- **Farzan repairs (#197/#199 originals, #202/#203 alternatives):** SimplyWise invented 45 h of cleanup and 850 SF of paint, so audit outliers and unsupported geometry. Price-preserving itemization produces selling allocations, not labor costs. Insurer quantities need attribution and reconciliation. A local note is not a saved Jobber note. *Provisional case lesson.*
