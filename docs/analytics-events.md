# Analytics events

Every GA4 and Meta event this site sends, where it comes from, and what it
carries. Reconstructing this from source cost real time, so keep it current:
**if you add, move or re-parameterise an event, edit this file in the same
commit.**

GA4 property `G-9D5MCDT0L1`. Google Ads tag `AW-16988082106`. Microsoft
Clarity project `ywlsbg76a7`. All three are initialised in
[`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro), behind a
runtime host guard — nothing fires anywhere except `www.eyshandyman.com`, so
dev, Cloudflare previews and the GitHub Pages preview send nothing.

## Rules that reporting depends on

- **Never rename or remove an event or a parameter.** Exactly these 13 are
  registered GA4 custom dimensions (event scope, checked 12 Oct 2026):
  `booking_type`, `cta_id`, `cta_location`, `filter_category`, `image_name`,
  `jobber_request_form_name`, `section_id`, `page_type`, `placement`,
  `project_slug`, `project_category`, `percent`, `service_type`. Renaming one
  silently empties a report. `page_path` and `destination_host` are sent but
  are **not** registered (this file wrongly said they were until 12 Oct 2026).
  Adding a new parameter is safe.
- **An event must be a GA4 key event BEFORE it can be imported into Google
  Ads.** The Ads import dialog lists key events only — an ordinary event simply
  does not appear there, which is why `jobber_booking_click` could not be found
  for import until 21 Sep 2026. The cost of marking one is that it joins GA4's
  own aggregate "key events" total, so that headline number mixes real leads
  with outbound clicks: **read key events by event name, never the total.**
- **Ads config stays before GA4 config** in BaseLayout. Jobber's work-request
  form reads the *last* `gtag('config', …)` in `dataLayer` to pick up
  `client_id`/`session_id`; with the Ads ID last, Jobber-side events arrive
  unattributed.
- **Values are bidding weights, not revenue.** They live in one place,
  [`src/data/conversionValues.ts`](../src/data/conversionValues.ts), with the
  Jobber export they were derived from. Never repeat a figure at a call site.
- **Privacy opt-out.** A visitor who has opted out at
  `/privacy/#your-privacy-choices`, or whose browser sends Global Privacy
  Control, has advertising consent denied and no Meta Pixel; an explicit opt-out
  denies `analytics_storage` too. Those visitors are absent from everything
  below, by design. Clarity follows the GA4 rule: an explicit opt-out never
  loads it; GPC still loads it (it is measurement) but with
  `clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })`.

## Conversion values

| Event | Value | Currency |
| --- | --- | --- |
| `lead_submit` | 200 | USD |
| `booking_complete` | 200 | USD |
| `phone_click` | 45 | USD |
| `jobber_booking_click` | 45 | USD |
| `generate_lead` | *(none — Jobber fires it, we do not control the payload)* | — |

## Conversion events

| Event | Fires where | Parameters | GA4 key event | Imported into Ads |
| --- | --- | --- | --- | --- |
| `lead_submit` | `/request-confirmed/<slug>/` on load, once per slug per session — [`jobber-confirmation-tracking.ts`](../src/scripts/jobber-confirmation-tracking.ts) | `content_name`, `content_category`, `service`, `value`, `currency` | Yes | Yes |
| `booking_complete` | `/booking-confirmed/<slug>/` on load, once per slug per session — same script | `content_name`, `content_category`, `service`, `value`, `currency` | Yes | Yes |
| `generate_lead` | Jobber's own hosted form, after submit. Not our code. | Jobber's | Yes | Yes (unvalued Primary count) |
| `jobber_booking_click` | Click on any outbound `getjobber.com` **booking-request** link (`/hubs/…/public/requests/…`), site-wide — [`conversion-analytics.ts`](../src/scripts/conversion-analytics.ts) | `page_path`, `page_type`, `booking_type`, `service_type`, `placement`, `cta_location`, `destination_host`, `value`, `currency`, `auto_redirect` (present only when `true`) | Yes, **since 21 Sep 2026** | Yes — **Secondary**, see below |
| `phone_click` | Click on any `tel:` link, site-wide — same script | `page_path`, `page_type`, `cta_location`, `displayed_number`, `value`, `currency` | Yes | Yes |

### `jobber_booking_click` in Google Ads

This row was wrong until 21 Sep 2026: the file claimed the event was a GA4 key
event and was imported into Ads, and neither was true. It could not have been —
the Ads import dialog lists key events only, and the event was not marked as
one, so it never appeared there.

The true state as of **21 Sep 2026**:

- Marked a **GA4 key event** on 21 Sep 2026, and only then could be imported.
- Imported as the Ads conversion action **"EYSHandyman (web)
  jobber_booking_click"**, category **Outbound click**.
- **Secondary**, deliberately. It therefore reports in **"All conv." only,
  never in "Conversions"**, and **never touches bidding** — it is a volume
  signal about which CTAs get pressed, not a lead.
- Value from GA4 with a **$45 fallback**, count **One**, **90-day** conversion
  window.

A click is not a lead. `lead_submit` and `booking_complete` are the events that
mean someone actually reached us; keep those primary and keep this one out of
the number anyone optimises against.

### `booking_type`

Resolved from the link's `data-booking-type`, falling back to the Jobber
request ID in the href (`inferBookingType`). Known IDs: `4983259` to-do list,
`4985623` project estimate, `5201775` project estimate from `/start/`,
`4977896` TV mounting, `5067435` media wall, `5061244` high-ceiling curtain,
`5061268` regular-ceiling curtain.

`/van/` sets `data-booking-type` explicitly on its shortcut tiles. Since
21 Sep 2026 the two curtain tiles send `high_ceiling_curtain` and
`regular_ceiling_curtain` (with matching `service_type`) instead of both
collapsing into `project_estimate`, so a curtain enquiry off the van is
finally distinguishable from any other project.

## Engagement events

| Event | Fires where | Parameters | GA4 key event | Imported into Ads |
| --- | --- | --- | --- | --- |
| `email_click` | Click on any `mailto:` link, site-wide | `page_path`, `cta_location` | No | No |
| `review_link_click` | Click on a Google review link (`maps.app.goo.gl`, `g.page`, or `data-track-review`) | `page_path`, `cta_location` | No | No |
| `internal_cta_click` | Click on an internal CTA carrying an explicit `data-cta-id` (opt-in, so body and legal links stay out) | `page_path`, `page_type`, `cta_id`, `cta_location`, `cta_label`, `destination` | No | No |
| `scroll_depth` | Every page (site-wide from BaseLayout since 12 Oct 2026; five landing pages only before that), once per milestone per page view — [`scroll-depth.ts`](../src/scripts/scroll-depth.ts) | `percent` (25 \| 50 \| 75), `page_type` | No | No |
| `section_view` | Every page: each top-level `<section>` (not nested, not in header/footer/nav, ≥120px tall), once per page view, after 1s continuously in view — [`attention-analytics.ts`](../src/scripts/attention-analytics.ts) | `section_id`, `section_index`, `page_type` | No | No |
| `image_click` | Every page: click inside an `<img>`/`<picture>` rendered ≥48px wide — same script. Sent **in addition to** any event the click already fires (`jobber_booking_click`, gallery events) | `image_name`, `page_type`, `cta_location`, `in_link` (`"true"`/`"false"`) | No | No |
| `pathway_cta_click` | Homepage service-pathway cards — `ServicePathwaysSection.astro` | `page_path`, `cta_location` | No | No |
| `jobber_form_fallback_click` | Small-repair request form's fallback link — `SmallRepairRequestForm.astro` | `cta_location` | No | No |

GA4's own `scroll` event still fires at 90%. `scroll_depth` deliberately stops
at 75 so the two do not double-count. On a page shorter than the viewport all
three milestones fire on load — filter by `page_type` before reading drop-off.

`section_view` counts a section as seen when 40% of it is visible, or — for a
section taller than the viewport — when it fills half the viewport, for one
continuous second. `section_id` is the section's `data-analytics-section`, else
its `id`, else a slug of its first `h2`/`h3` (lowercase, `a-z0-9_`, max 40
chars), else `section_<n>`. Hand-set ids exist only where the fallback was vague:
`hero` (homepage, `/start/`, `/van/`, `/lp/built-ins-shelving-storage/`, the
service template), `trust_bar` and `service_areas` (homepage),
`included_services` and `body_content` (service template), and `van_band`
(backlog 011, since 26 Oct 2026: the Eyad-and-the-van photo band that is the
first section in `<main>` on the old homepage and on every Google Ads landing
page listed in `src/data/adsLandingPages.ts` — /start/, /services/media-walls/,
/lp/built-ins-shelving-storage/, /services/repairs-and-maintenance/,
/services/limewash-walls/, /services/handyman-to-do-list/, /our-work/,
/services/tv-mounting/ and /services/custom-carpentry/). On those pages every
other section's `section_index` moved up by one on 26 Oct 2026, so compare
across that date by `section_id`. Heading-derived ids
change when the heading copy changes — compare across a copy edit by
`section_index` too. `section_index` is the 1-based position among the page's
top-level sections, counting short ones that never fire.

`image_name` is the file basename with the extension, any `-480w`/`-1200w`
width or `WxH` suffix, `@2x` and Astro content hash removed — e.g.
`/images/services/media-walls/marble-wood-slat.jpg` → `marble-wood-slat`.

`internal_cta_click` is opt-in: a link sends nothing unless it carries
`data-cta-id`. `cta_id` values in use:

| `cta_id` | Where |
| --- | --- |
| `start_choose_project` | `/start/` — every "Choose a Project" placement |
| `start_path_detail_*` | `/start/` path cards (general, media wall, high-ceiling curtains, to-do list) |
| `start_general_contracting_*` | `/start/` remodeling / kitchen / bathroom links |
| `start_services_strip_all`, `start_reviews_page`, `start_footer_nav` | `/start/` secondary navigation |
| `van_choose_project` | `/van/` — the red "Choose My Project" button, in both the hero (`van_hero`) and the sticky bar (`van_sticky`) |
| `nav_book` | Primary nav "Book" link — desktop header, mobile menu — [`src/data/navigation.ts`](../src/data/navigation.ts) |
| `nav_contact` | Primary nav "Contact" link — desktop header, mobile menu, and the footer "Quick Links" Contact link — same source |

`van_choose_project` was added on 21 Sep 2026. Both /van/ buttons rendered as
bare anchors with no tracking attributes before that, so the most-pressed
control on the page was invisible in GA4 — /van/ converts at 10.53% per
session against paid search's 1.80%, and none of it was attributable to the
button that drives it.

`nav_book`, `nav_contact` and `our_work_empty_state_contact` were added on
26 Sep 2026. The primary nav's Book/Contact links and the gallery's empty-state
fallback link all pointed at `/contact/` (or `/book/`) with no `data-cta-id`,
so none of them fired `internal_cta_click` — `cta_location` alone (`header`,
`header_mobile`, `footer`, resolved automatically by `resolveCtaLocation`)
still distinguishes desktop nav from mobile nav from footer for the shared
`nav_book`/`nav_contact` ids, the same pattern `van_choose_project` uses.

`home_reviews_contact` was briefly added the same day as a `data-cta-id` on
the homepage reviews section's "Contact Us About Your Project" link, which
pointed at `/contact/`. It is **not** a `cta_id` any more: that link now goes
straight to the project-estimate Jobber form (`HomeReviewsSection.astro`), so
it is outbound-Jobber traffic and fires `jobber_booking_click` (see below)
with `booking_type: project_estimate` and `cta_location: home_reviews_contact`
instead of `internal_cta_click`. The `cta_location` string was kept the same
so the placement stays identifiable across the change; only the event that
fires there changed.

`our_work_empty_state_contact` was briefly a `data-cta-id` on the `/our-work/`
gallery's "Request an Estimate" link in the empty-filter-results fallback
(`ProjectGrid.astro`), which pointed at `/contact/`. It is **not** a `cta_id`
any more, for the same reason as `home_reviews_contact` above: that link now
goes straight to the project-estimate Jobber form, so it fires
`jobber_booking_click` with `booking_type: project_estimate` and
`cta_location: our_work_empty_state` instead of `internal_cta_click`. The link
had no explicit `cta_location` before (it fell back to the generic `page`
value), so `our_work_empty_state` is a new, more specific placement rather
than a preserved one.

## Redesigned homepage and site chrome (backlog 013)

Built on 26 Oct 2026 and rendered only on `/home2/` until backlog 014 flipped
"/" to it the same day; backlog 015 then puts the chrome on every ContentLayout
page.

**Since the 014 flip (26 Oct 2026), "/" carries the redesign's placements.**
- "/" no longer fires `pathway_cta_click`, `media_wall_cross_sell_view` or
  `media_wall_request_click`: those sections are not on "/" any more. The events
  still exist wherever their components are used.
- These placements are no longer on "/": `home_hero_custom_project`,
  `home_hero_card`, `home_midpage_1`, `home_reviews_contact`.
- Kept on purpose, same strings: `home_hero_primary`, `home_hero_secondary`,
  `home_hero_trust`, `home_reviews`, `trust_bar`, `home_final_cta`.
- `section_view` ids on "/" are now the redesign's (below); compare across
  26 Oct 2026 by `section_id`, not `section_index`.
- /home2/ now previews the previous homepage (HomeSmallRepairPage with the
  legacy chrome), noindex. No event or parameter was renamed: these are new
`cta_location` values and section ids on the existing events.

New `cta_location` values (`phone_click` for `tel:`, `jobber_booking_click` for Jobber links):

| `cta_location` | Element | Action |
|---|---|---|
| `header_call` | Phone/tablet header, gold "Call" | `tel:` |
| `header_quote` | Desktop header, gold "Get a Free Quote" | Jobber `project_estimate` |
| `home_hero_call` | Hero "Call (346) 820-1629" | `tel:` |
| `home_card_todo` | "Start with one visit" card, "Book a Visit" | Jobber `handyman_to_do_list` |
| `home_card_tv` | Card, "Book TV Mounting" | Jobber `tv_mounting` |
| `home_card_curtains` | Card, "See Times & Book" | Jobber `high_ceiling_curtain` |
| `home_cards_project` | "Bigger project? Send photos" link | Jobber `project_estimate` |
| `home_reviews_all` | "Read all 160+ reviews on Google →" | `review_link_click` |
| `home_owner` | Owner band, "Get a Free Quote" and Call | Jobber `project_estimate` / `tel:` |

Kept from the live homepage with the same meaning: `header` (desktop header
phone number), `header_mobile` (mobile menu quote and call), `sticky_mobile`
(bottom bar "Call" and "Free Quote"), `home_hero_primary` ("Send Photos for a
Free Estimate"), `home_hero_secondary` (to-do list link), `home_hero_trust`
(hero rating link), `trust_bar` (trust-strip review link), `home_reviews`
(reviews-section rating link), `home_final_cta` (closing buttons), `footer`
(fallback for footer links). `nav_book` / `nav_contact` keep their `data-cta-id`
in the new mobile menu and footer.

New `section_view` ids (`data-analytics-section`): `hero`, `trust_bar`,
`start_visit`, `our_work`, `reviews`, `owner`, `services`, `about`, `faq`,
`how_it_works`, `service_areas`, `closing_cta`. `trust_bar` is under 120px
tall, so it never fires `section_view`.

## Microsoft Clarity

Project **"EYS Handyman website"**, id `ywlsbg76a7`, linked to GA4 and Google
Ads in Clarity's settings. Masking is **Balanced** (anything typed is masked in
the browser). Loaded async in BaseLayout after the GA4 config, live host only.

- **Records** heatmaps and session replays: scrolling, clicks, page layout.
- **Mirrored events.** `trackEvent()` ([`src/utils/analytics.ts`](../src/utils/analytics.ts))
  sends every GA4 event NAME to Clarity as `clarity('event', name)`, so
  recordings can be filtered by `phone_click`, `section_view` and the rest.
  Parameters are never forwarded (they carry paths and phone digits), and
  `clarity('identify')` is never called.
- **Kept recordings.** `phone_click`, `jobber_booking_click`, `lead_submit` and
  `booking_complete` also call `clarity('upgrade', name)`, so those sessions are
  never dropped by Clarity's sampling.
- **Tags**, set once per page by [`clarity-tags.ts`](../src/scripts/clarity-tags.ts):
  `page_type` (same values as GA4), `landing_path` (the session's first landing
  path, the same value as `eys_lp`), and `traffic` — `google_ads` (gclid,
  gbraid, wbraid), `meta` (fbclid), `qr` (`utm_medium` containing "qr"), else
  the `utm_source` value, else `none`. Read from the `eys_attribution_v1`
  session, so the tag survives navigation inside the visit.
- **Opt-out.** See the privacy rule at the top: opted-out visitors never load
  Clarity; GPC visitors load it with ad storage denied. Disclosed on `/privacy/`.

## Landing-page events

| Event | Fires where | Parameters | GA4 key event | Imported into Ads |
| --- | --- | --- | --- | --- |
| `van_landing_view` | `/van/` on load — [`van-analytics.ts`](../src/scripts/van-analytics.ts) | `campaign`, `source`, `medium` | No | No |
| `van_route_selected` | `/van/` click on `[data-van-route]` | `route` | No | No |
| `van_project_selected` | `/van/` click on `[data-van-project]` | `project` — `tv_mounting`, `high_ceiling_curtains`, `curtains_tracks`, `lighting_fans`, `drywall_painting`, `doors_cabinets`, `media_walls` | No | No |
| `van_phone_clicked` | `/van/` click on `[data-van-phone]` | `placement` | No | No |
| `van_reviews_clicked` | `/van/` click on the reviews link | — | No | No |
| `regular_ceiling_booking_click` | Outbound Jobber click for regular-ceiling curtains (secondary funnel) | `page_path`, `service_type`, `placement` | No | No |
| `media_wall_cross_sell_view` | Media Wall cross-sell section enters the viewport — `HomeMediaWallShowcase.astro` | `page_path`, `placement` | No | No |
| `media_wall_request_click` | Outbound Jobber click from the Media Wall cross-sell CTA | `page_path`, `source_page`, `cross_sell`, `placement`, `destination`, `cta_location` | No | No |

## Project gallery events

All from [`project-gallery.ts`](../src/scripts/project-gallery.ts), on
`/our-work/`. None are key events and none reach Ads.

| Event | Parameters |
| --- | --- |
| `gallery_filter_selected` | `filter_category` |
| `project_card_opened` | project identifiers |
| `project_photo_navigated` | project + photo identifiers |
| `project_service_link_clicked` | `cta_location` |
| `gallery_estimate_clicked` | `cta_location` |
| `gallery_phone_clicked` | `cta_location` |

## Meta Pixel events

| Event | Fires where | Parameters |
| --- | --- | --- |
| `PageView` | Every page, on load (BaseLayout) | — |
| `Lead` | `/request-confirmed/<slug>/`, alongside `lead_submit` | `content_name`, `content_category`, `service` |
| `Schedule` | `/booking-confirmed/<slug>/`, alongside `booking_complete` | `content_name`, `content_category`, `service` |
| `InitiateCheckout` | High-ceiling curtain CTA click — [`curtain-attribution.ts`](../src/scripts/curtain-attribution.ts) | `content_name`, `content_category`, `service` |

Meta events carry no `value`. The conversion values above are GA4/Ads bidding
weights only.

## Attribution

Inbound UTMs and paid click IDs (`gclid`, `gbraid`, `wbraid`, `fbclid`) are read
on arrival, held in `sessionStorage` under `eys_attribution_v1`, and appended to
every outbound Jobber **booking-request** link (`/hubs/…/public/requests/…`) by
[`jobber-attribution.ts`](../src/scripts/jobber-attribution.ts). Non-booking
`getjobber.com` links — e.g. `/privacy/`'s link to Jobber's own privacy policy —
are not matched, so they get no attribution params and fire no `jobber_booking_click`.

Outbound Jobber links also carry `eys_form=<label>`, stamped by
`withJobberFormId`. It is an internal label, **not** a UTM: stamping real UTMs
on these links made GA4 record every Jobber-side `generate_lead` as
"website / referral", burying the visitor's true source. GA4 ignores
`eys_form`; it exists so a lead can be traced back to the form that produced it.

Outbound Jobber links also carry `eys_lp=<path>`, stamped by `withLandingPage`.
Same idea as `eys_form`, and also **not** a UTM: it is the path this browser
session first landed on (recorded once in `sessionStorage`, alongside the
attribution above, and left unchanged for the rest of the session), so a lead
that came from a deep page can be traced back to the page the visit actually
started on. GA4 ignores it.
