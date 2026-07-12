# QA Audit Matrix — 71 Pages

Status key: **PASS** = verified in Jul 2026 full-site Playwright audit | **WARN** = needs owner assets | **OPEN** = tracked in AUDIT-FINDINGS.md

Full findings + verify loop: [`AUDIT-FINDINGS.md`](./AUDIT-FINDINGS.md)

## Page groups (re-audited Jul 2026)

| Group | Count | Layout/spacing | Grids | SEO crawl | Notes |
|-------|------:|----------------|-------|-----------|-------|
| Homepage | 1 | PASS | PASS | PASS | Map iframe may blank in headless; OK in browsers |
| Core pages | 9 | PASS | PASS | PASS | Indexes end with full-bleed CTA |
| Service detail | 14 | PASS | PASS | PASS | Curtain in Installation category |
| Service category | 3 | PASS | PASS | PASS | |
| City area | 5 | PASS | PASS | PASS | Metas trimmed |
| Community | 12 | PASS | PASS | PASS | |
| City-service legacy | 18 | PASS | PASS | PASS | |
| Projects | 4 | PASS | PASS | PASS | Placeholders until real photos |
| Blog | 3 | PASS | PASS | PASS | BlogPosting schema OK |
| Indexes | 2 | PASS | PASS | PASS | |
| Legal | 2 | PASS | N/A | PASS | WebPage + breadcrumbs added |
| 404 | 1 | PASS | N/A | noindex | |

## Asset blockers (owner)

- Real hero/project JPGs — see `IMAGE-ASSET-GUIDE.md`
- `business.ts`: paste GBP `profileUrl`, Jobber URLs

## Capture commands

```bash
npm run build && npm run preview   # terminal 1
npm run screenshot && npm run seo:crawl   # terminal 2
```
