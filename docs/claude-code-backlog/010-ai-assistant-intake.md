# 010 — AI-assistant intake: let ChatGPT (and other assistants) submit a service request straight into Jobber

## Decision already made
ChatGPT already sends EYS real customers (Aug 29–Oct 10: chatgpt.com 58 sessions, 13 key events;
Jobber lead source "ChatGPT": 6 of 77 requests, 3 became jobs). Today the last step is a
Jobber-hosted form on clienthub.getjobber.com. When an assistant already holds the customer's
details it should submit the request in one call and have it land in Jobber Requests like any
other lead. One core, three doors, on Cloudflare Pages Functions, zero runtime dependencies.
Rejected: scripting Jobber's hosted form, new embeds, GA4/Ads events for this channel, any CRM.
AGENTS.md's "static output, minimal JavaScript" gets one approved exception: server code that
lives only in `functions/`. No Astro adapter; no existing page changes how it is built.

The full brief (doors, input/output contract, Jobber OAuth + write sequence, safety limits, push
order, docs) was relayed on 2026-10-25. The operating manual is `docs/ai-intake/README.md`; live
state and the human steps are in `docs/ai-intake/STATUS.md`.

## Plan (five pushes, one logical change each)
1. Deploy path: `actions/checkout@v4` in both deploy jobs so wrangler finds `./functions`;
   `GET /api/ai/health`. Live check: health 200; `/`, `/book/`, `/start/`, `/sitemap-index.xml`
   unchanged apart from build timestamps.
2. Core lib (`functions/_lib/`), `POST /api/ai/service-requests`, `GET /api/ai/info`,
   `GET /api/ai/openapi.json`, admin connect/callback/probe, unit tests (`npm test`). Live check
   in validate-only mode; no Jobber record created.
3. `POST /mcp` (stateless JSON) + `/.well-known/openai-apps-challenge`.
4. `public/llms.txt` + one paragraph on `/privacy/`.
5. Page-level WebMCP tool, only if the registration shape can be confirmed from official docs.

## Decisions made along the way
- MCP: the current spec revision is 2026-07-28, which removed `initialize` and sessions in favour
  of per-request `_meta` and a mandatory `server/discover`. ChatGPT and most clients still speak
  the handshake revisions, so `/mcp` is dual-era: `initialize` (2025-11-25 and earlier,
  negotiated) returns the instructions; modern requests are validated and served statelessly.
- Jobber OAuth uses PKCE (S256) on top of the client secret, as Jobber's docs now recommend.
- Jobber tokens are encrypted at rest in D1 (AES-GCM, key derived from `AI_ADMIN_KEY`), so a
  D1 console query can never print a usable token. Rotating `AI_ADMIN_KEY` therefore means
  reconnecting Jobber.
- API version pinned to `2026-09-25`, the newest active version in Jobber's changelog on
  2026-10-25 (the brief's 2025-04-16 was the newest it knew of).

## DONE 2026-10-25 fb1ed2a (push 1/5: deploy path + health)
Both deploy jobs now check out the repo; the production log of run 40238078128 shows
"✨ Compiled Worker successfully" and "✨ Uploading Functions bundle". Live `GET /api/ai/health` → 200
(D1 already bound, everything else unset); `/`, `/book/`, `/start/`, `/sitemap-index.xml` identical
to before apart from Cloudflare's per-request email-obfuscation keys.
