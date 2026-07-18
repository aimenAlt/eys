# Our Work — adding a project

Gallery URL: `/our-work/`  
Detail pages: `/our-work/{slug}/`

## Steps

1. **Create image folder**  
   `public/images/projects/{slug}/`  
   Use descriptive filenames (e.g. `eys-kitchen-island-after.jpg`). Prefer strong completed “after” photos for the lead image.

2. **Add approved images**  
   3–6 photos max for most projects. Include before/during only when they help the story. Do not upload privacy-risk photos (faces, house numbers, screens, documents).

3. **Add metadata**  
   Create `src/content/projects/{slug}.md` with frontmatter. Required fields:

   - `title`, `slug`, `category` (one of six — see below)
   - `summary`, `leadImage`, `leadAlt`
   - `images[]` with `src`, `alt`, `stage` (`before` | `during` | `after` | `detail` | `team`)
   - `publishable: true`, `privacyReviewed: true`, `published: true`

4. **Pick a category** (customer-facing filters)

   | Slug | Label |
   |---|---|
   | `tv-media-walls` | TV & Media Walls |
   | `kitchens-cabinetry` | Kitchens & Cabinetry |
   | `carpentry-built-ins` | Carpentry & Built-Ins |
   | `fixtures-installations` | Fixtures & Installations |
   | `repairs-improvements` | Repairs & Improvements |
   | `outdoor-projects` | Outdoor Projects |

5. **Write accurate alt text**  
   Describe what is visible. No keyword stuffing. Omit city unless verified (`city` + `dateVerified`).

6. **Featured (optional)**  
   Set `featured: true` and `featuredRank` (1–6). Featured projects appear in the Featured Work section.

7. **Validate**  
   From `eys/`:

   ```bash
   npm run check
   npm run build
   ```

8. **Preview**

   ```bash
   npm run preview
   ```

   Open `/our-work/` and `/our-work/{slug}/`.

## Optional fields

- `tags[]` — internal (related projects, SEO context); not filter chips
- `city`, `neighborhood` — only when verified
- `date`, `dateVerified`
- `scope[]` — bullet list on detail page
- `serviceUrl` — e.g. `/services/custom-carpentry/`
- `beforeAfter` — labeled before/after pair
- `seoTitle`, `metaDescription`

## Design notes

- Cards use 4:3 covers; full images show in the detail page / dialog.
- Empty categories are hidden from filters automatically.
- Progressive enhancement: cards link to static pages; JS opens a native `<dialog>` when available.

## Design deviations from the original gallery brief

Documented for maintainers:

1. Images live under `public/images/projects/` with string paths (site-wide pattern), not Astro `ImageMetadata` colocated assets.
2. Content files are flat `src/content/projects/*.md`, consistent with other collections.
3. Public URL is `/our-work/` (with redirects from `/gallery/` and `/projects/`).

## QA notes (initial ship)

- `npm run check` / `npm run build`: pass (gallery pages + 8 project detail routes).
- Progressive enhancement: index cards are `<a href="/our-work/{slug}/">`; JS opens native `<dialog>` for same-tab clicks.
- Empty categories (currently `repairs-improvements`) are omitted from filter chips.
- Manual checks recommended after deploy: keyboard Esc/arrows in dialog, no-JS detail pages, `prefers-reduced-motion`, ~320px width, Safari `<dialog>`.
- Lighthouse: spot-check on preview when convenient; record scores here when available.
