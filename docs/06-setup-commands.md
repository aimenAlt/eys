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

## Cloudflare Pages deploy

1. Sign in to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select GitHub repo `aimenAlt/eys`, branch `main`
3. Build settings:
   - **Framework preset:** Astro (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `22` (matches [`.nvmrc`](../.nvmrc))
4. Save and deploy. First build should produce 10 static pages + `sitemap-index.xml` + `robots.txt`
5. Optional: add custom domain `www.elevateyourspacehandyman.com` under **Custom domains**
6. After deploy: run Lighthouse on `/`, `/services/tv-mounting/`, and `/contact/`

Preview URL pattern: `https://<project-name>.pages.dev`

