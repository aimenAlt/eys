# Curtain Installation Landing — Jobber + GA4 Setup

Landing page: `/curtain-installation/`

CTA clicks on the EYS site are **secondary** funnel events only. The **primary** Google Ads conversion is a completed Jobber online booking (`purchase`).

## Code configuration

Paste live Client Hub booking URLs in:

`src/data/curtainLanding.ts`

- `highCeilingJobberUrl` — **one** form for high-ceiling work (rod **or** track chosen inside Jobber)
- `regularCeilingJobberUrl` — **separate** form for standard / ≤11 ft ceiling installs

There are not separate rod vs track Jobber forms.

Outbound links are plain `<a href>` anchors (no redirect layer, no JS navigation) so GA4 cross-domain linker parameters are not stripped.

## Attribution forwarding (UTM / click IDs → Jobber)

`src/scripts/curtain-attribution.ts` copies inbound landing-page params onto every
`[data-curtain-cta]` Jobber link, including:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id`
- `gclid`, `gbraid`, `wbraid` (Google Ads / often LSA-related click IDs)
- `fbclid` (Meta)
- `msclkid` (Microsoft)
- `ttclid`, `li_fat_id`, `twclid`

Values are also stored in `sessionStorage` for the visit. Ads should land on
`/curtain-installation/` with distinct UTMs per channel, e.g.:

- Google Search Ads: `?utm_source=google&utm_medium=cpc&utm_campaign=high_ceiling_curtains`
- Google LSA: `?utm_source=google&utm_medium=lsa&utm_campaign=high_ceiling_curtains`
- Meta Ads: `?utm_source=facebook&utm_medium=paid&utm_campaign=...`
- Meta organic: `?utm_source=facebook&utm_medium=organic&utm_campaign=...`

Jobber must be able to record query params on the booking request for this to show
inside Jobber reports — confirm in a test booking after deploy.

## Manual GA4 / Jobber checklist

1. Add the site GA4 Measurement ID (`G-9D5MCDT0L1`) to the High-Ceiling Jobber booking form.
2. Add the same GA4 Measurement ID to the Regular-Ceiling Jobber form.
3. Configure GA4 cross-domain measurement for `clienthub.getjobber.com`.
4. Verify that completed Jobber **online bookings** emit a `purchase` event to GA4.
5. Mark/import the completed booking `purchase` event as the primary Google Ads conversion.
6. Keep site CTA events as secondary diagnostic conversions only:
   - `jobber_booking_click` (`service_type`, `placement`)
   - `regular_ceiling_booking_click` (`placement`)
7. Do **not** treat outbound CTA clicks as completed bookings.

## Notes

- Submitted Jobber **request** forms emit `generate_lead`; this campaign is intended to use **online booking** (`purchase`).
- Do not hard-code campaign UTMs into the landing-page components; preserve inbound `gclid` / Ads UTMs on the page URL.
