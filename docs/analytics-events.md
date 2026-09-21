# Analytics events

Every GA4 and Meta event this site sends, where it comes from, and what it
carries. Reconstructing this from source cost real time, so keep it current:
**if you add, move or re-parameterise an event, edit this file in the same
commit.**

GA4 property `G-9D5MCDT0L1`. Google Ads tag `AW-16988082106`. Both are
initialised in [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro),
behind a runtime host guard — nothing fires anywhere except
`www.eyshandyman.com`, so dev, Cloudflare previews and the GitHub Pages preview
send nothing.

## Rules that reporting depends on

- **Never rename or remove an event or a parameter.** `cta_location`,
  `booking_type`, `service_type`, `placement`, `destination_host`, `page_type`
  and `page_path` are registered GA4 custom dimensions. Renaming one silently
  empties a report. Adding a new parameter is safe.
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
  below, by design.

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
| `jobber_booking_click` | Click on any outbound `getjobber.com` link, site-wide — [`conversion-analytics.ts`](../src/scripts/conversion-analytics.ts) | `page_path`, `page_type`, `booking_type`, `service_type`, `placement`, `cta_location`, `destination_host`, `value`, `currency` | Yes | Yes |
| `phone_click` | Click on any `tel:` link, site-wide — same script | `page_path`, `page_type`, `cta_location`, `displayed_number`, `value`, `currency` | Yes | Yes |

`booking_type` is resolved from the link's `data-booking-type`, falling back to
the Jobber request ID in the href (`inferBookingType`). Known IDs: `4983259`
to-do list, `4985623` project estimate, `5201775` project estimate from
`/start/`, `4977896` TV mounting, `5067435` media wall, `5061244` high-ceiling
curtain, `5061268` regular-ceiling curtain.

## Engagement events

| Event | Fires where | Parameters | GA4 key event | Imported into Ads |
| --- | --- | --- | --- | --- |
| `email_click` | Click on any `mailto:` link, site-wide | `page_path`, `cta_location` | No | No |
| `review_link_click` | Click on a Google review link (`maps.app.goo.gl`, `g.page`, or `data-track-review`) | `page_path`, `cta_location` | No | No |
| `internal_cta_click` | Click on an internal CTA carrying an explicit `data-cta-id` (opt-in, so body and legal links stay out) | `page_path`, `page_type`, `cta_id`, `cta_location`, `cta_label`, `destination` | No | No |
| `scroll_depth` | `/start/` and `/van/` only, once per milestone per page view — [`scroll-depth.ts`](../src/scripts/scroll-depth.ts) | `percent` (25 \| 50 \| 75), `page_type` | No | No |
| `pathway_cta_click` | Homepage service-pathway cards — `ServicePathwaysSection.astro` | `page_path`, `cta_location` | No | No |
| `jobber_form_fallback_click` | Small-repair request form's fallback link — `SmallRepairRequestForm.astro` | `cta_location` | No | No |

GA4's own `scroll` event still fires at 90%. `scroll_depth` deliberately stops
at 75 so the two do not double-count.

## Landing-page events

| Event | Fires where | Parameters | GA4 key event | Imported into Ads |
| --- | --- | --- | --- | --- |
| `van_landing_view` | `/van/` on load — [`van-analytics.ts`](../src/scripts/van-analytics.ts) | `campaign`, `source`, `medium` | No | No |
| `van_route_selected` | `/van/` click on `[data-van-route]` | `route` | No | No |
| `van_project_selected` | `/van/` click on `[data-van-project]` | `project` | No | No |
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
every outbound Jobber link by
[`jobber-attribution.ts`](../src/scripts/jobber-attribution.ts).

Outbound Jobber links also carry `eys_form=<label>`, stamped by
`withJobberFormId`. It is an internal label, **not** a UTM: stamping real UTMs
on these links made GA4 record every Jobber-side `generate_lead` as
"website / referral", burying the visitor's true source. GA4 ignores
`eys_form`; it exists so a lead can be traced back to the form that produced it.
