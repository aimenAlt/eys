# Image asset guide — what to upload and how to name files

Drop files in the folders below. Use **exact filenames** so the site picks them up automatically.

---

## Logos (done — you uploaded these)

| File | What it should look like | Used where |
|------|--------------------------|------------|
| `public/logos/logo-mark.png` | Red EYS house icon only, transparent background, ~500×500px min | Mobile header, favicon, apple touch icon |
| `public/logos/logo-lockup.png` | Mark + "ELEVATE YOUR SPACE" + "HANDYMAN" horizontal, **white text** on transparent (for dark header/footer) | Desktop header, footer |

Optional later:
- `logo-lockup-dark.png` — same lockup but **dark text** for light backgrounds (print, invoices)

---

## Social / SEO default

| File | What it should look like | Size |
|------|--------------------------|------|
| `public/images/og-default.jpg` | Branded share image: your logo + one real job photo + "Katy Handyman" text | **1200 × 630** |

---

## City hero photos (one per city)

**Folder:** `public/images/heroes/`

Each photo: exterior of a home or job site **in that area**, landscape, well-lit, no heavy filters.

| Filename | City page | What to shoot / find |
|----------|-----------|----------------------|
| `katy.jpg` | `/service-areas/katy/` | Katy-area suburban home exterior or street scene |
| `cypress.jpg` | `/service-areas/cypress/` | Cypress/Bridgeland-style home or neighborhood |
| `fulshear.jpg` | `/service-areas/fulshear/` | New-build Fulshear home (Cross Creek, Fulbrook vibe) |
| `richmond.jpg` | `/service-areas/richmond/` | Richmond/Fort Bend home exterior |
| `west-houston.jpg` | `/service-areas/west-houston/` | Energy Corridor / West Houston home or professional interior |

**Size:** 800 × 600 minimum (4:3). JPG or WebP.

Communities reuse their city hero unless you add a community-specific file later.

---

## Service photos (optional but high impact)

**Folder:** `public/images/services/`

| Filename | Service | What to shoot |
|----------|---------|---------------|
| `tv-mounting.jpg` | TV mounting | Finished TV above fireplace or on wall, clean wires |
| `ceiling-fan.jpg` | Ceiling fans | Installed fan in a living room or bedroom |
| `drywall-repair.jpg` | Drywall | Smooth patched wall or before/after |
| `kitchen-remodel.jpg` | Kitchen | Backsplash, cabinets, or vanity close-up |
| `bathroom-remodel.jpg` | Bathroom | Updated vanity, fixtures, or tile |
| `general-handyman.jpg` | General | Punch-list scene — tools, multiple small fixes |
| `painting.jpg` | Painting | Freshly painted room or trim detail |
| `custom-carpentry.jpg` | Carpentry | Shelving, trim, or built-in |
| `door-install.jpg` | Doors | New interior/exterior door installed |
| `electrical.jpg` | Electrical | Fan, fixture, or outlet work (safe staged shot) |
| `flooring.jpg` | Flooring | New floor or transition detail |
| `furniture-assembly.jpg` | Furniture | Assembled piece in room |
| `cabinet-install.jpg` | Cabinets | Installed cabinets or hardware |
| `curtain-install.jpg` | Curtains | Hung rods/curtains, finished look |

**Size:** 1200 × 600 (2:1) for service hero/OG. JPG or WebP.

After upload, add to the service CMS frontmatter:
```yaml
heroImage: "/images/services/tv-mounting.jpg"
heroImageAlt: "TV mounted above stone fireplace in Katy home"
```

---

## Homepage & marketing backgrounds

**Folder:** `public/images/home/`

| Filename | What to shoot | Size |
|----------|---------------|------|
| `hero-primary.jpg` | Branded van/trailer at job site OR owner at work — main trust shot | 800 × 1000 (portrait) |
| `who-we-are-1.jpg` | Finished job — living room, fireplace, or feature wall | 600 × 750 |
| `who-we-are-2.jpg` | Second job — kitchen, bath, or carpentry detail | 600 × 750 |
| `why-choose-us-bg.jpg` | Dark/moody wide shot — blueprint, tools, or job site | 1920 × 1080 |
| `cta-bg.jpg` | Same vibe for bottom CTA section | 1920 × 1080 |

---

## Service category cards (homepage grid)

**Folder:** `public/images/categories/`

| Filename | Category | What to shoot |
|----------|----------|---------------|
| `repairs-installs.jpg` | Repairs & installs | Fan, TV, door, or mixed install |
| `remodeling.jpg` | Remodeling | Kitchen or bath upgrade |
| `finishing.jpg` | Finishing & decor | Paint, trim, flooring, or decor |

**Size:** 600 × 400 (3:2).

---

## Project gallery (real job proof)

**Folder:** `public/images/projects/{project-slug}/`

For each project (e.g. `cinco-ranch-fireplace-tv-mount`):

| Filename | What to shoot |
|----------|---------------|
| `after-1.jpg` | Main finished shot (used as card thumbnail) |
| `after-2.jpg` | Alternate angle |
| `before-1.jpg` | Before shot (optional) |
| `detail-1.jpg` | Close-up — wires hidden, hardware, etc. |

**Sizes:**
- Card thumbnail: 400 × 300 (4:3)
- Gallery slide: 1200 × 800 (3:2)

Update project CMS `gallery` entries to point at your files instead of Unsplash URLs.

---

## Minimum 12-shot list (if budget is tight)

1. `home/hero-primary.jpg` — van/trailer at job site
2. `services/tv-mounting.jpg` — finished living room TV
3. `services/ceiling-fan.jpg` — installed fan
4. `services/kitchen-remodel.jpg` — backsplash close-up
5. `services/bathroom-remodel.jpg` — vanity upgrade
6. `projects/{slug}/before-1.jpg` + `after-1.jpg` — drywall repair
7. `services/custom-carpentry.jpg` — shelving/carpentry
8. `services/door-install.jpg` — door/hardware
9. `heroes/katy.jpg` — Katy-area exterior
10. `home/who-we-are-1.jpg` — team/owner at work
11. `services/general-handyman.jpg` — punch-list / multi-tool
12. `heroes/richmond.jpg` — Fort Bend exterior

Plus `images/og-default.jpg` for social sharing.

---

## Cloudflare R2 (optional)

When you host on R2 instead of `public/`, set in `.env`:
```
PUBLIC_ASSETS_BASE_URL=https://assets.eyshandyman.com
```
Keep the **same paths** (`/images/heroes/katy.jpg`, etc.) — only the domain changes.

---

## Quick checklist

- [x] `logos/logo-mark.png`
- [x] `logos/logo-lockup.png`
- [ ] `images/og-default.jpg`
- [ ] `images/heroes/*.jpg` (5 cities)
- [ ] `images/services/*.jpg` (as you shoot them)
- [ ] `images/projects/{slug}/*.jpg` (replace Unsplash in CMS)
- [ ] `images/home/*.jpg` (homepage)
