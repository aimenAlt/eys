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

### 2026-10-15 - Process: master guide condensed; full quote export analysed
- Observation: the master guide had grown to 99 KB, with superseded rules sitting before the current ones (sections 14 vs 27/28). Agents could follow the wrong one.
- Outcome:
  - Condensed it to about 38 KB (version 2026-10-15c), with every rule appearing once. The full text is archived at archive/master-guide-full-2026-10-15.md (history only).
  - An independent audit agent compared the old and new versions and found 19 gaps and 4 contradictions. All were patched before install.
  - Exported all 223 Jobber quotes via GraphQL to data/quotes-export-2026-10-15.json (git-ignored).
- Findings from the export:
  - Eyad's 205 quotes average about 2 items, with 18-word descriptions and 8-word Client messages. 22% have a discount, and 30% were won.
  - The 18 AI quotes averaged 3.7 items, 38 words and 79 words, and won 1.
  - Eyad's per-job price table is now in master-guide §9.
  - Eyad looks low on small jobs: TV about $100, fans about $125, camera installs about $75.
- Rule (Aimen): price at Eyad's level, or up to about 5–20% above it, toward normal market pricing when he's under. Never copy a severe underprice blindly. To be confirmed with Eyad.
- Provenance: "don't create a SimplyWise client record" comes from the Oct 11 agents' practice (customer personal data in a third-party form). Now standing.
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Text shortened on drafts #229, #228, #226 per Eyad's feedback
- Observation: Eyad said the AI wording was too long, repeated itself and mentioned "licensed electrician".
- Action: rewrote only the customer-facing text on unsent drafts #229 Frank N, #228 Michele Champion and #226 Jade Hawkins. Line items are now 1–3 plain sentences ending "Includes material and labor" (or "Customer supplies the panels"). Client notes keep the template header, with the pricing basis, the "Not included" list and the field-verify paragraph removed. Optional add-ons go on one line. Prices, totals, template, card fee and internal notes are unchanged ($3,193.00 / $921.85 / $1,578.99).
- Scope: standing (see master-guide (condensed; see §1, §9, §10, §12)).
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Process: quote writing standard added (master-guide (condensed; see §1, §9, §10, §12))
- Observation: the rules for structuring a quote were scattered (sections 14, 16, 26, 27), and none of them described how Eyad actually splits or combines line items.
- Corrected future behavior: master-guide (condensed; see §1, §9, §10, §12) is the single reference for combining or separating items, line-item wording, the Client message, settings, and the internal note order (summary → scope → materials → labor → other → SimplyWise breakdown → price check → price math → open items). Based on Eyad's quotes #123, #124, #129, #130, #135, #168 and #170.
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Eyad feedback on AI quotes + study of his own pre-Sept 15 quotes
- Observation or mistake (Eyad, WhatsApp, about Jade #226 and every AI quote so far):
  - too much information;
  - repeating too much: the scope sits in the line item AND again in the Client message pricing basis, and the same boilerplate appears on every quote;
  - stop telling customers "licensed electrician". EYS is a handyman, customers don't expect licensed, and licensed work costs a lot more;
  - "check my older quotes";
  - minimize, because not many people read these.
- Evidence and outcome:
  - Eyad's quotes (#130 slat wall, #170 door jamb, #168 drywall, #123 closet, #124 bath fixtures, #129 floodlight/attic lights, #119 painting, #135 kitchen/bath) are 1–3 sentences or about 6 short bullets per item, usually "Includes material and labor".
  - His Client message is usually empty, or one line (a discount note, "exact paint match cannot be guaranteed").
  - He quotes light electrical himself, with no licensed wording.
  - He raised Jade #226 from our $1,400 to $1,533 (first AI draft $1,750).
  - Longfei #227 now shows "Awaiting response", so it was sent.
- Corrected future behavior: master-guide (condensed; see §1, §9, §10, §12) (rewritten 2026-10-15): short Eyad-style text, no repetition, no "licensed", Client message empty unless something job-specific. Use Eyad's past quotes as the first price comparable.
- Scope: standing.
- User confirmation: Eyad via Aimen, 2026-10-15.
- Supersedes: the "customer terms go in Client message" rule (same day), and the always-included field-verification paragraph (master-guide section 14).

### 2026-10-15 - Process: one place for learnings, no new lists
- Observation or mistake: a separate "MISTAKES ALREADY MADE" list was written into the README even though this log and master-guide already exist for exactly that. It duplicated the lessons, so the next session could have read one and missed the other.
- Corrected future behavior: before recording any lesson, read README "How to record an update" and follow it. Dated lessons go here; confirmed standing rules go in master-guide, then re-sync the project doc. Never create a new list, file or section for lessons anywhere else.
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Process: mandatory second-pass cost recheck after every draft
- Observation: the first drafts were high (Champion $1,905, Frank $4,017, Jade $1,803). The second pass, with a market check and photos in SimplyWise, gave $922, $3,193 and $1,442, which Aimen said "makes more sense".
- Corrected future behavior: after saving any quote, recheck scope vs request, hours vs tasks, unit prices and the total vs typical homeowner pricing; fix in the same draft and read it back. README routine step 6 and master-guide (condensed; see §1, §9, §10, §12).
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Longfei Jiang #227 correction: HEIC photo, terms field, market check
- **SUPERSEDED 2026-10-15** on customer text ("terms in Client message", "licensed" partner/electrician wording): follow master-guide §1 and §10. The photo-conversion and market-check parts still stand.
- Observation or mistake: (1) the HEIC request photo was judged from a 113x150 thumbnail; (2) pricing basis, exclusions, the +$60/30 min line and field-verification wording were inside line-item descriptions; (3) no market sanity check was recorded. Coordinator correction (now master-guide (condensed; see §1, §9, §10, §12)).
- Evidence and outcome: in the Jobber photo viewer, the "Open image in new tab" link is a 1536x2048 WEBP rendition. fetch(url, {cache:'reload'}) works in-page (a plain fetch fails CORS because the cached thumbnail had no CORS headers); /rails/active_storage/blobs/... returns 404. The full photo showed the loose wires are low-voltage bell/thermostat wire next to a doorbell transformer, plus an in-use EMERGENCY FURNACE DWN/UP switch box. Item 7 moved into the visit (cap and secure unused low-voltage ends). Both photos were uploaded to SimplyWise and it was re-run: $478.68 raw, audited C $402.25. Price unchanged at $524 + $15.72 = $539.72 after the market check. Terms moved to Client message, and #227 was edited in place.
- Corrected future behavior: for any Jobber photo, use the viewer's "Open image in new tab" URL with cache:'reload' and inspect native-resolution canvas crops before the takeoff. Line items get scope bullets only; everything else goes in Client message. Record the market check in Eyad's note before saving. On a saved quote, the internal note editor accepts a synthetic paste (ClipboardEvent with DataTransfer) to replace its whole text. A device_commit_files overwrite of an existing repo file reported "written" but did not land; append with device_bash instead and re-check.
- Scope: standing (method) / this job only (scope and price).
- User confirmation: coordinator relay of Aimen's README rules, 2026-10-15.
- Supersedes: the Longfei #227 entry below where the photo was judged from the thumbnail.

### 2026-10-15 - Process: quote terms go in Client message; convert unreadable photos
- **SUPERSEDED 2026-10-15** on customer text ("terms in Client message", "licensed" partner/electrician wording): follow master-guide §1 and §10. The photo-conversion and market-check parts still stand.
- Observation or mistake: Champion #228 had pricing basis, exclusions and add-ons in a $0 line item; other drafts put exclusions inside line-item descriptions. Longfei's HEIC photo was judged from a thumbnail instead of being converted.
- Corrected future behavior: pricing basis, field-verification wording, exclusions and optional add-ons go in the quote's Client message field; line items are title + scope bullets only. Convert or screenshot any photo format before inspecting and uploading it. Standing rules: master-guide (condensed; see §1, §9, §10, §12).
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Process: upload real photos to SimplyWise + final market sanity check
- Observation or mistake: the four Oct 15 quote agents typed text briefs into SimplyWise without uploading the request photos. The Champion regrout came out at about $1,900 all-in for a one-sentence "remove old grout, put new grout" request, because the agent assumed three areas from the photos. Frank's 3 floating shelves came out at about $480 each.
- Corrected future behavior: (1) upload the actual-site request photos to SimplyWise along with the full request text and takeoff, but never AI, inspiration or product images, because SimplyWise can't tell desired look from current state. (2) Before saving, sanity-check the end price against what homeowners typically pay for that type of job and against what was actually asked. Price the asked scope as the main item; extra areas go in as optional add-ons.
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.

### 2026-10-15 - Frank N Roman clay TV wall + floating shelves (Quote #229, unsent draft)
- Observation: request asked for Roman clay on the wall behind the TV plus "floating shelves beside the tv area", no sizes. 2 photos: two-story (~18 ft) TV wall with ceiling fan in front, TV still boxed (not mounted), one narrow alcove right of the TV wall with a thermostat at ~5 ft. SimplyWise priced 22 MH wall + 14 MH shelves, added an unneeded 1/2 in ply sheet, priced 1x3x8 hardwood at $1.98 (unit error), no tax, plus its 20% markup ($4,165.20).
- Evidence and outcome: Roman clay is sold by weight, not gallon (Portola 10 kg $180, ~20-25 SF per kg for 2 coats). Audited cost $3,118.76 (30 MH, rates unverified). Proposed $2,450 wall (~$17.50/SF incl. scaffold) + $1,450 for 3 shelves = $3,900 + Card Fee $117 = $4,017. Separate line items so Eyad can drop either.
- Corrected future behavior: for Roman clay/limewash, size material by kg/coverage, add shipping/lead time (2-5 days), and price access (scaffold) on tall walls. When shelf count is not given, assume the space visible in photos, carry it in the note WARNING and in a customer bullet ("confirmed before ordering"). The Large Project template contract contains "HOA restrictions" in Site Access; removed those 2 words on this quote only (not the template) to keep HOA silence. Aimen/Eyad should edit the template once.
- Scope: provisional lesson / this job only (pricing).
- User confirmation: none yet; price not approved by Eyad.
- Supersedes: none.
- Remaining uncertainty: wall width/height/returns, colour/brand, shelf count/size/finish, scaffold ownership, real labor rate. Detail in jobs/2026-10-frank-roman-clay-shelves.md.
- REVISION (same day, coordinator): uploaded both site photos to SimplyWise (screenshot + upload_image works) and re-ran ($3,341.35 raw). Market sanity check lowered the price: simple painted floating shelves sell for ~$200-350 each installed, so 3 shelves $1,450 -> $900; Roman clay $2,450 -> $2,200 (~$8-15/SF typical plus an 18 ft scaffold premium). New total $3,100 + $93 = $3,193. Lesson: always test each line against what a normal homeowner pays per unit (per shelf, per SF) before saving, and bundle small add-ons into the main job's visits instead of pricing a separate trip. Saved-quote note editor: replace text with cmd+A, Delete, then a synthetic paste event (execCommand insertText did not stick).

### 2026-10-15 - Michele Champion bathroom regrout (Quote #228, unsent draft)
- REVISION (same day, Aimen): $1,905.50 for a one-sentence regrout request was too high. Re-priced as the tub/shower surround only, $895 + 3% = $921.85 (7.5 MH, one visit), with floor $425 / vanity $175 / wainscot $375 as priced add-ons in the text block. Also uploaded all 5 real-site photos to SimplyWise (screenshot from the Jobber viewer + upload_image) and re-ran it: 8 h, $954.78 incl. 20% markup.
- Corrected future behavior (standing per Aimen): when a request is one vague sentence, the main item is only the area the photos clearly focus on; price other visible areas as optional add-ons, not in the total. Sanity-check against typical Houston homeowner pricing (regrout: tub surround ~$500-900, small floor ~$300-500) before saving. Always upload the real-site photos to SimplyWise. In the Jobber note editor, replace text with a synthetic paste event (keeps line breaks), not execCommand insertText.
- Observation: one-line request ("old grout removed and new grout put in") with 5 photos (the request-note attachments are the same 5 files, not a 6th). Photos showed tub surround, hex floor, tiled vanity top and, in the overview only, a wainscot behind the toilet. SimplyWise priced 16 h x $75 plus $279 of materials, with no sales tax, no travel and its 20% markup ($1,775.10).
- Evidence and outcome: takeoff ~105 SF / ~485 LF of joint plus ~38 LF of caulk; audited cost $1,527.52 (17 MH x $68 unverified + $331.52 materials incl. tax + $40 travel). Proposed $1,850 split into 3 lines (tub $1,100 / floor $475 / vanity $275) + Card Fee $55.50 = $1,905.50. National benchmarks: HomeAdvisor $10-25/SF, Fixr $5-12/SF and bathtub regrout $800-1,200. No local comparables found.
- Corrected future behavior: for regrout jobs, count joint LF from tile size (about 5.6 LF/SF for 4.25 in square tile, about 3-4 LF/SF for 6-8 in hex) and price removal by LF, not by SF. Use premixed urethane-acrylic grout (no sealer) so the job needs no sealing return trip. Split the price by area so Eyad can drop one. The Jobber new-quote editor has no optional toggle (the line menu only offers Delete), so put an optional add-on in a $0 text block or mark it optional after saving; never leave it in the total.
- Scope: provisional lesson / this job only for prices.
- User confirmation: none; price not approved by Eyad.
- Supersedes: none.
- Remaining uncertainty: tub tile height, floor size, which areas the customer wants, wainscot, grout colour. Detail in jobs/2026-10-michele-regrout.md.

### 2026-10-15 - Longfei Jiang to-do list with gas and wiring items (Quote #227, unsent draft)
- **SUPERSEDED 2026-10-15** on customer text ("terms in Client message", "licensed" partner/electrician wording): follow master-guide §1 and §10. The photo-conversion and market-check parts still stand.
- Observation: 7-item to-do list mixing handyman fixes (door latch, sink drain, supply line, tub diverter, bulbs) with a gas water heater restart and loose attic wires. The only photo was a HEIC file: Jobber's viewer shows a blank grey screen for HEIC; only its 113x150 thumbnail renders (enlarged via an in-page overlay). SimplyWise priced a 20 in braided supply line at $3.14 (real ~$8-12) and omitted tax.
- Evidence and outcome: To-Do List Visit 3 Hours $399 (live catalog re-verified: $175 / $299 / $399) + Repair Parts Allowance $125 = $524 + Card Fee $15.72 = $539.72, small-job format. Gas restart and attic wiring listed under "Not included" as brought in through a licensed plumbing partner / licensed electrician, quoted separately. Fixture-level plumbing kept in scope. Modeled margin 25.2% (unverified labor rate).
- Corrected future behavior: for mixed to-do lists, price the handyman items with the visit tier plus one separate parts-allowance line, and put gas/regulated-electrical items in exclusions as trade-partner work quoted separately. When the photo is HEIC, inspect the thumbnail, say so in the WARNING, and ask the customer for a JPG. Quote # in the new-quote form shifted (226 -> 227) because of concurrent agents; record only the saved number.
- Scope: provisional lesson / this job only.
- User confirmation: none yet; price not approved by Eyad.
- Remaining uncertainty: diverter vs push-pull valve, bulb base, attic wire type, drive time to 77030. Detail in jobs/2026-10-longfei-todo-visit.md.

### 2026-10-15 - Correction: Jade Hawkins #226 repriced after market sanity check and site-photo upload
- Observation or mistake: first draft carried 13.5 MH for 16 identical customer-supplied slat panels ($1,750) and skipped uploading the site photo to SimplyWise.
- Evidence and outcome: coordinator correction. Typical install-only slat-panel labor ~$4-7/SF (~$950-1,650 for 239 SF); a 2-person crew finishes under a day. Re-ran SimplyWise with the actual-site photo only (product photo described in text): 9.5 MH, raw $1,154.03 incl. 20% markup; audited C $1,021.67. Repriced to $1,400 + $42 fee = $1,442 (~$5.86/SF).
- Corrected future behavior: (1) upload actual-site photos (never product/inspiration pictures) to SimplyWise; a clean full-size screenshot of the Jobber image + upload_image to the SimplyWise file input works. (2) Sanity-check install-only panel jobs against a $/SF band before pricing; don't let a conservative hour plan push the price above the band without evidence. (3) Saved Jobber notes are a Lexical editor: cmd+A, then a synthetic paste event (DataTransfer text/plain) replaces the text.
- Scope: provisional lesson (the $4-7/SF band is a coordinator-supplied range, not a verified local comparable).
- User confirmation: coordinator instruction relayed for Aimen, 2026-10-15.
- Supersedes: the $1,750 / 13.5 MH figures in the entry below.

### 2026-10-15 - Jade Hawkins customer-supplied acoustic slat panels, 31 ft wall (Quote #226, unsent draft)
- Observation: install-only request (customer owns the panels), one product photo plus one site photo where furniture hides the outlets. "Panels need trimming at the baseboard" implied ~94.5 in panels on an 8 ft ceiling.
- Evidence and outcome: SimplyWise asked 5 questions; raw $1,215.71 + 20% markup = $1,458.85 ($75/MH). Audit: markup removed, caulk 2 -> 1, $85/MH model rate, 8.25% tax, $40 trip/disposal -> C $1,397.46. Proposed $1,750 + Card Fee $52.50 = $1,802.50 (modeled margin 20.1%, unverified). No credible local install-price comparables found.
- Corrected future behavior: for install-only panel jobs, price by panel count and cutouts (16 panels, 3 cutouts, ~13.5 MH for a 2-person day) and list outlet count, ceiling height and panel size as WARNINGs when not visible. The new-quote form has the internal note textarea (internalNote.message) behind the "Leave an internal note" button, so the note can be saved with the first save.
- Scope: this job only / provisional pricing.
- User confirmation: none yet; price not approved by Eyad.
- Remaining uncertainty: ceiling height, panel size/count, number of outlets, end-trim color. Large Project contract text still carries an HOA phrase (template wording). Job detail in jobs/2026-10-jade-wall-panels.md.

### 2026-10-15 - Process: daily routine quotes every new request
- Observation or mistake: the morning Jobber check only reported 4 new requests (Champion, Frank N, Hawkins, Jiang) and offered to quote, instead of quoting. Aimen had asked several times for the routine to go straight into quoting.
- Corrected future behavior: after the check, spawn one subagent per unquoted request, each with its own Jobber/SimplyWise tabs, following this folder and the project guide. Estimate from photos and request text; when detail is thin, still save the draft and flag a WARNING in Eyad's note and the report. Full procedure: README "Daily request routine".
- Scope: standing.
- User confirmation: Aimen, 2026-10-15.
- Supersedes: the routine's old "check and report only, offer to quote" step.

### 2026-10-11 - George Kallolil TV stone wall with flanking built-ins (Quote #220, unsent draft)
- Observation: request asked for "a wall like the picture" (AI-style render with stone center, lit left shelves, lit right niche with slats), 65 in TV above fireplace, mantel lowered, 10 x 15 ft wall, no budget. SimplyWise priced stone at $9.65 per 6 SF case (real $53.12 at Home Depot), cement board at $1.12 per 15 SF sheet, crown at $5.50, and omitted slat stain.
- Evidence and outcome: audited cost ~$13,695 (154 MH); proposed $16,500 as 3 separate line items ($6,250 / $4,070 / $6,180) + 3% fee = $16,995. Separate items let Eyad drop a piece without re-quoting.
- Corrected future behavior: when a request points at a full inspiration picture, price each visible section as its own line item and flag scale/budget before sending. Check every SimplyWise unit price against one real retail price (per-SF vs per-case errors again). A shared Chrome tab group can be closed by another agent mid-generation; SimplyWise autosaves, so recover from its Home Recent Drafts and open a fresh own tab.
- Scope: provisional lesson / this job only.
- Remaining uncertainty: layout split of 15 ft, mantel drop, gas insert heat clearance, electrician bid, stone/stain choice. Large Project template contract text contains an HOA phrase (pre-existing template wording, left unchanged) - Aimen/Eyad to decide whether to edit the template.

### 2026-10-11 - Faisal Bhagani 100-inch TV media wall (Quote #219)
- Observation: Vague request ("100 inch TV installed and wall made from scratch"), one usable site photo, no measurements, no budget. Priced the mid tier matching his inspiration photos and carried field-verification wording in the line item.
- Evidence and outcome: Draft saved, unsent, $10,500.00 plus Card Fee $315.00 = $10,815.00. Audited cost $8,608.36 (SimplyWise raw $9,841.66 included its automatic 20% markup and over-counted backer ply, under-priced walnut ply, quartz, mount; labor rates unverified). Modeled margin 18.01%. Price is proposed, not approved by Eyad.
- Corrected future behavior: For custom feature walls, audit SimplyWise sheet counts and veneer-ply prices, add blocking, trim, disposal and sales tax, and keep customer-supplied TV, soundbar and pulls plus any wiring in the exclusions. Offer a cheaper tier (painted, smaller or no quartz top) in the private note. Setting a long textarea via the native value setter works in Jobber's line-item description and Notes.
- Scope: provisional (this job only until Eyad confirms price, quartz allowance and measurements).
- Remaining uncertainty: width and height, studs, in-wall speaker positions, quartz selection and fabricator price, stain versus paint.

### 2026-10-11 - Olamide Awoniyi fireplace wall slat panels with LED (Quote #218)
- Observation: vague "something like the picture" request; the inspiration was an AI render of a full-height stone fireplace wall with slat columns, out of the stated budget tier. Two existing switch boxes sit in the panel area.
- Evidence and outcome: SimplyWise raw total about $3,391 with its 20% markup; audit removed markup, a double pickup charge, an oversized driver and over-hours electrician labor, and added sales tax. Audited materials $921.23 incl. tax, 15.0 man-hours, $175 electrician allowance. Quoted $2,900.00 + 3% Card Fee $87.00 = $2,987.00, Large Project template. No credible local price comparables found (disclosed in the note).
- Corrected future behavior: for a render that exceeds budget, quote the stock-size version (8 ft panels), exclude the full-height version in writing and offer it later. Create quotes with /quotes/new?client_id=&property_id=&quote[work_request_id]=&template_id= so the request links. Switch boxes under panels need an electrician allowance. The Large Project contract text contains template wording (labor, delay terms) that is inherited, not written per job.
- Scope: this job only / provisional pricing.
- User confirmation: none yet; price not approved by Eyad.
- Supersedes: none.
- Remaining uncertainty: panel color/finish, fireplace clearance, switch box adjustment feasibility; job detail in jobs/2026-10-olamide-slat-wall.md.

### 2026-10-11 - Nicholas DeSouza LED accent lighting, slat wall and TV wall (Quote #217)
- Observation: no budget given; photos showed a slat wall with floating cabinet and mirror, a bookcase beside a tile TV wall, and the TV back. LF was a low-confidence photo inference, carried as a 125 LF allowance (9 strip reels, 36 channel pieces). SimplyWise omitted the wire (qty 0) and sales tax, and had no waste allowance. Other issues: the quote number in the new-quote form (216) differed from the saved number (217) because several agents were working at once; /quotes/new?request_id= did not prefill the client.
- Evidence and outcome: SimplyWise raw $3,861.00 (26 h labor, 20% markup). Audited cost about $3,034 (materials $1,208.75 + 8.25% tax, 24.5 man-hours, travel). Quoted $3,600.00 + 3% Card Fee $108.00 = $3,708.00 (about $29/LF all-in), plug-in power only, no new circuits or hardwiring. Saved as unsent Draft; internal note persisted. Labor rate used ($68/h) is unverified.
- Corrected future behavior: always add wire and tax to SimplyWise output and check for waste; create the quote from the request page via More > Convert to Quote (prefills client and property); write the quote number into the internal note only after saving and reading the real number; the saved-quote note is a contenteditable editor (edit text nodes and dispatch input, then Save); SimplyWise adds a new question after each answer and Continue stays disabled until all are answered.
- Scope: this job only / provisional pricing.
- User confirmation: none yet; price not approved by Eyad.
- Supersedes: none.
- Remaining uncertainty: LF measurements, real labor rate, whether customer wants all locations; job detail in jobs/2026-10-nicholas-led-accent-lighting.md.

### 2026-10-11 - Ben Koohza water line check + touch-up visit (Quote #216)
- Observation: request was one sentence ("check main water line", paint touch-up, general inspection) plus one photo of an aging halogen recessed light; no size, rooms, budget or colour. SimplyWise answered 10 questions and priced 3 MH at $85 + $33.88 materials + 20% markup = $346.66.
- Evidence and outcome: chose the standing To-Do List Visit tier (3 Hours, catalog $399 re-verified in editor), consumables and one LED lamp stated as included, plumbing/electrical excluded. $399 + 3% Card Fee $11.97 = $410.97, small-job format (under $700). Modeled markup 36.8%, margin 26.9% (unverified). Web search found no usable Katy handyman comparables.
- Corrected future behavior: for vague "check / fix small stuff" requests use the To-Do List Visit tier sized to the task mix. Creating a quote via /quotes/new?request_id= does NOT link the request; use /quotes/new?client_id=&property_id=&quote[work_request_id]= (as other sessions did) or the request's own create-quote action, and check the request status after saving.
- Scope: this job only / provisional lesson.
- Remaining uncertainty: what "check main water line" means to the customer, which light the photo shows, paint supply.

### 2026-10-11 - Kenneth Palmer accent wall (Quote #214)
- Observation: request gave no style, size or color, only "accent wall around 75 inch TV" and a $1,000-$2,999 budget. SimplyWise asked 9 questions, needs a client record to finalize, assumed paint was customer-supplied despite the brief, and priced a quart of primer like a gallon.
- Evidence and outcome: chose a paint-grade board-and-batten feature wall (EYS "Feature Wall" tier), priced $2,650 + 3% fee = $2,729.50, audited labor 18 h -> 21 h. Web search found no credible Houston price comparables.
- Corrected future behavior: when scope is vague and budget is stated, pick the tier that fits, say so in the note, and flag style/size confirmation before sending. State paint supply explicitly in the SimplyWise brief and re-check it in the output. For long note text, confirm the textarea content via script before saving; typing can freeze the page for ~30 s.
- Scope: provisional lesson / this job only.
- Remaining uncertainty: wall size, style and paint color unconfirmed; material prices are SimplyWise defaults.

### 2026-10-11 — Process: quoting docs live in the website repo
- Observation: Aimen clarified that the EYS repo is the website repo and quoting knowledge belongs in `docs/quoting/` inside it.
- Corrected future behavior: maintain `README.md`, `master-guide.md`, this log and per-job notes under `docs/quoting/`. Read them before every quote. Don't touch website code, routes or build config from a quoting task. `jobs/` is git-ignored so customer job notes are never committed.
- Scope: standing.
- User confirmation: EYS Quoting Guide, 2026-10-11, section 21.1 and the correction register.
- Supersedes: no prior location (`docs/quoting/` did not exist before this date).

### 2026-10-11 — Process: independent research, check both directions
- Observation: SimplyWise had been treated as close to the pricing authority.
- Corrected future behavior: research the method, materials, current supplier/rental prices, realistic labor and comparable Katy/West Houston pricing before proposing a price. Run both the underquoting and overquoting checks (master-guide §9) and record sources with dates.
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

Detail is in master-guide §16. Figures belong to those jobs only and are not defaults.

- **Meeka media wall (Quote #201):** audit product units (a $1.60 "drywall sheet" was a per-SF price), gross face area is not drywall purchase area, strip SimplyWise's automatic 20% markup before pricing, never save a placeholder address, and keep verified note content separate from an unverified later formatting edit. *Provisional case lesson.*
- **Kaile wallpaper (Quote #207):** a truncated request extract hid the real dimensions and an alternate-pricing request, so read the full visual request. Verify an unnamed SimplyWise draft by evidence before adopting it. The catalog $8/SF wallpaper line is install only, not substrate prep. *Provisional case lesson.*
- **Farzan repairs (#197/#199 originals, #202/#203 alternatives):** SimplyWise invented 45 h of cleanup and 850 SF of paint, so audit outliers and unsupported geometry. Price-preserving itemization produces selling allocations, not labor costs. Insurer quantities need attribution and reconciliation. A local note is not a saved Jobber note. *Provisional case lesson.*

## 2026-10-11 — Danyele Wilson (Quote #215, unsent draft)
- Scope: 3 picture-frame accent walls (dining, bedroom, staircase), 6 floating shelves at fireplace, TV mount. Proposed $7,400 + 3% Card Fee $222 = $7,622. Not approved by Aimen/Eyad.
- Audited cost ~$6,207 (materials $1,727.39 incl. tax; labor 46 carp h @ $68 + 26 paint h @ $52 = $4,480). Markup ~19%, modeled margin ~16%. Labor rate basis unverified.
- Lessons: SimplyWise 20% markup stripped before use; TV mounting uses Jobber catalog price ($150), not an assumed number; never put "HOA" in a SimplyWise brief; Jobber Notes textarea has no placeholder attribute, target the last textarea and set via native setter + input/change events.
- Assumptions to confirm on site: picture-frame style, shelf positions, TV size.

## 2026-10-13 - Picture-frame molding, apartment, unclear video screenshots
- Correction (Aimen): a whole-apartment worst case of $6,300 for wall molding is unrealistic; apartment jobs get a tighter allowance (about 4 walls, ~$3.8k incl. materials). Overestimate moderately, not to the theoretical max.
- Correction (Aimen): Eyad supplies paint and trim/molding by default, the customer only chooses the color. Do not assume customer-supplied molding unless the request says so.
- Method: when photos are video screenshots, infer scope from any inspiration image, state low confidence, price an allowance with a stated wall/LF count, and ask the customer for the full video.
- Jobber: edit the line-item price by triple-click + type + Tab (form_input on the price field did not stick once). Note editor accepts cmd+A then typing.
