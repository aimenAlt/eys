# New Mac Setup Commands

## Install command line tools

```bash
xcode-select --install
```

## Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow Homebrew's post-install shell instructions.

## Install baseline tools

```bash
brew install git gh fnm
brew install --cask google-chrome
```

## Install Node 22 through fnm

```bash
fnm install 22
fnm use 22
fnm default 22
node -v
npm -v
```

## Enable package manager support

```bash
corepack enable
```

## Authenticate GitHub

```bash
gh auth login
git config --global user.name "Aimen Altaiyeb"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

## Repo safety branch

```bash
git status
git checkout -b phase-0-astro-foundation
```

## Install Claude Code if using terminal agent

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude --version
claude doctor
claude
```

## Astro setup in existing repo

If the repo is not empty, do not run a destructive setup command blindly.

Safer method:

```bash
cd ..
npm create astro@latest eys-astro-scratch
```

Then copy useful Astro structure/config into the existing repo manually.

## Expected scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  }
}
```

## Local workflow

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Cloudflare Pages deploy (GitHub Actions)

Deploys are driven by [`.github/workflows/deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml) — **not** Cloudflare “Connect to Git” (avoid double deploys).

| Trigger | Result |
|---------|--------|
| Push to `main` | Preview at `https://dev.<project>.pages.dev` (`noindex`) |
| Actions → **Deploy Cloudflare** → **Run workflow** (type `deploy`) | Production (`www` when domain attached) |

### One-time Cloudflare + GitHub setup

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Upload assets** (Direct Upload). Project name: `eys` (or set GitHub variable `CLOUDFLARE_PAGES_PROJECT`).
2. In the Pages project → **Settings** → production branch = `main`.
3. Cloudflare → profile → **API Tokens** → create token with **Account → Cloudflare Pages → Edit** (Workers Edit template is fine).
4. GitHub repo `aimenAlt/eys` → **Settings → Secrets and variables → Actions**
   - Secret `CLOUDFLARE_API_TOKEN`
   - Secret `CLOUDFLARE_ACCOUNT_ID` (Account home → right sidebar)
   - Optional variable `CLOUDFLARE_PAGES_PROJECT` = `eys`
5. GitHub → **Settings → Environments**
   - Create `preview` (optional)
   - Create `production` and enable **Required reviewers** (you) so prod needs approval
6. Push to `main` → check Actions for the preview URL. QA on `dev.*.pages.dev`.
7. When ready for live: Actions → **Deploy Cloudflare** → **Run workflow** → confirm with `deploy`.
8. Attach custom domain `www.eyshandyman.com` under Pages → **Custom domains** only after a successful prod deploy. Apex → www 301 in Cloudflare DNS/rules.

Preview URL pattern: `https://dev.eys.pages.dev` (exact host depends on project name).  
Production URL: `https://eys.pages.dev` then `https://www.eyshandyman.com`.

