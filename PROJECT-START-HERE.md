# EYS Website Project — Start Here

## Public direction
Use the current public brand:
- Primary public name: **Elevate Your Space Handyman**
- Short brand shorthand: **EYS**
- Domain: **eyshandyman.com**
- Treat **EYS Home Services** as an internal/future possibility only unless explicitly approved.

## Build doctrine
This is a local-service SEO and conversion website, not a React app.

The website must be:
1. Static-first.
2. Fast on mobile.
3. Crawlable without JavaScript.
4. Easy to expand with service, location, project, and blog pages.
5. Designed around trust, proof, and booking conversion.
6. Maintainable through Git-backed CMS content.

## Stack
- Astro
- Tailwind CSS
- Astro Content Collections
- Pages CMS
- GitHub
- Cloudflare
- Cloudflare Images/R2 for job photos
- Jobber embed/link for scheduling and request forms

## First objective
Convert the existing single-page HTML front page into an Astro-powered static site without destroying the current design quality.

## SEO
Local SEO is a primary growth lever for this business. Before adding pages or deploying, read **[docs/07-seo-playbook.md](docs/07-seo-playbook.md)** — GBP checklist, review strategy (150+ / 4.9★), schema map, deploy checklist, and monthly rhythm.

## Non-negotiables
- Do not create a client-side React SPA.
- Do not hide core page content behind JavaScript.
- Do not generate thin city pages.
- Do not fake locations, reviews, credentials, licenses, or addresses.
- Do not overwrite the existing homepage without first preserving it.
- Do not add libraries unless justified.
