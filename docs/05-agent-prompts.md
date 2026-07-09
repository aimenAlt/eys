# Agent Prompts

## First prompt to Claude/Cursor
Read `CLAUDE.md`, `PROJECT-START-HERE.md`, and everything in `/docs`.

Then inspect the current repository. Do not edit files yet.

Produce:
1. Current repo summary.
2. Existing homepage structure.
3. Recommended Astro migration plan.
4. Files you intend to create or modify.
5. Risks and questions.

Wait for approval before coding.

## Convert existing homepage to Astro
Convert the existing static HTML homepage into an Astro page without changing the visual design more than necessary.

Rules:
- Preserve current layout and copy as much as possible.
- Move repeated styles into global CSS/tokens only where safe.
- Do not add React.
- Do not add animation libraries.
- Keep the page static and SEO crawlable.
- Run the build after changes.

## Create content collections
Create Astro content collections for services, service-areas, projects, blog, and reviews.

Rules:
- Use TypeScript/Zod schemas.
- Include SEO title/meta fields.
- Include image URL objects with alt/caption fields.
- Include booking type fields for services.
- Add one sample entry per collection.
