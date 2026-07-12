# Image assets

Upload production photos here (or to Cloudflare R2 and set `PUBLIC_ASSETS_BASE_URL`).

## Required files

| File | Size | Purpose |
|------|------|---------|
| `og-default.jpg` | 1200×630 | Default Open Graph / social share |
| `heroes/katy.jpg` | 800×600 | Katy city hero |
| `heroes/cypress.jpg` | 800×600 | Cypress city hero |
| `heroes/fulshear.jpg` | 800×600 | Fulshear city hero |
| `heroes/richmond.jpg` | 800×600 | Richmond city hero |
| `heroes/west-houston.jpg` | 800×600 | West Houston city hero |
Until real photos are added, heroes fall back via `resolveCityHero()` in `src/data/images.ts` (stock placeholder).

**Full naming guide:** `docs/IMAGE-ASSET-GUIDE.md`

## Folders

| Folder | Contents |
|--------|----------|
| `heroes/` | 5 city hero JPGs |
| `services/` | 14 service hero JPGs |
| `home/` | Homepage who-we-are, CTA, why-choose-us backgrounds |
| `categories/` | Service category card images |
| `projects/{slug}/` | Per-project gallery (`after-1.jpg`, etc.) |
