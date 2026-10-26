# ChatGPT plugin package — Elevate Your Space Handyman

This folder is the plugin package for OpenAI's plugin directory (ChatGPT and Codex), in the Agent
Plugins layout:

- `plugin.json` — identity, listing text, review test cases and publication settings
  (`extensions["com.openai"]`).
- `mcp.json` — the one MCP server, `https://www.eyshandyman.com/mcp`, no authentication.
- `assets/icon.png` — a byte-for-byte copy of `public/favicon-512.png` (512 × 512 PNG).

`functions/_tests/plugin.test.ts` checks these files against OpenAI's limits on every `npm test`.
How the server behind it works: [`../README.md`](../README.md). Status and the human steps:
[`../STATUS.md`](../STATUS.md).

## 1. Fill the placeholders

Three values in `plugin.json` read `REPLACE_AT_UPLOAD`. Fill them before zipping: values in the
ZIP are re-applied when the draft is submitted, so a dashboard edit would be overwritten.

- `interface.developerName` — the name of the verified developer identity you upload under.
- `interface.category` — the category title exactly as the dashboard lists it.
- `review.demo_recording_url` — a link to the walkthrough video that reviewers can open.

## 2. Zip it

Zip from **inside** this folder so `plugin.json` sits at the root of the ZIP, and leave this
README out:

```bash
cd docs/ai-intake/plugin && zip -r -X ~/Downloads/eys-handyman-plugin.zip plugin.json mcp.json assets -x '*.DS_Store'
```

Check the layout (expect `plugin.json`, `mcp.json`, `assets/icon.png` and nothing under a folder
name):

```bash
unzip -l ~/Downloads/eys-handyman-plugin.zip
```

Never commit the ZIP.

## 3. Upload and check

1. [platform.openai.com/plugins](https://platform.openai.com/plugins) → **Upload new or existing
   plugin** → choose the verified **Developer identity** → **Upload plugin** → the ZIP.
2. **Metadata & Skills**: wait for the checks and read **Issues**. To fix one, change the package
   here, zip again and use **Upload plugin to fix issues**.
3. **MCPs** → the `eys` server → **Connect**. Authentication: **No authentication**. The portal
   shows a domain-verification token: put it in Cloudflare as `OPENAI_APPS_CHALLENGE_TOKEN` (type
   **Text**), deploy through GitHub Actions (STATUS.md, "How to deploy"), confirm
   `https://www.eyshandyman.com/.well-known/openai-apps-challenge` shows exactly the token, then
   finish **Connect**. Wait for the tool scan and read its **Issues**.
4. **Review information → Review details**: the test cases, demo link and release notes come from
   the ZIP. The MCP server has no sign-in, so there are no reviewer credentials; anything a reviewer
   needs to know goes into this dashboard form only. Never put credentials or reviewer
   instructions in the ZIP (the importer rejects `test_credentials` and `reviewer_instructions`).

Positive test case 5 sends a real request into Jobber when a reviewer runs it: its title starts
`[ChatGPT] TEST - please archive`; archive it.

## 4. Submit and publish

**Submit for review** only with the owner's go-ahead. Once approved, **Publish plugin** on the
approved version. Later tool changes on the server are rescanned by OpenAI and need no new ZIP;
listing text, test cases or the icon do (bump `version`).
