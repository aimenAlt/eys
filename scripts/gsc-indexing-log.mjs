#!/usr/bin/env node
/**
 * GSC indexing-request tracking log.
 *
 * Keeps docs/gsc-indexing-log.json in sync with the site's actual live pages
 * (read from dist/sitemap-0.xml, i.e. the last build) and tracks which URLs
 * have already been submitted to Google Search Console's "Request Indexing"
 * tool, so the daily indexing-request automation (see
 * docs/gsc-indexing-automation.md) always knows what's left to do without
 * needing to be re-briefed each run.
 *
 * Policy: the daily automation works through the full backlog of known
 * pages (priority: service-areas > services > pricing/reviews > our-work >
 * everything else) before it starts requesting indexing for newly
 * discovered pages. `sync` still records new URLs immediately (so nothing
 * is lost) — it just marks them pending like everything else; `next` won't
 * surface them ahead of older pending pages unless the backlog is clear.
 *
 * Content-change re-requeue: `sync` also hashes the <main id="main-content">
 * region of each already-requested page's built HTML (dist/<path>index.html)
 * and compares it to the hash captured when that page was last marked
 * requested. If the content has genuinely changed AND it's been at least
 * COOLDOWN_DAYS since the last request, the page is requeued to 'pending'
 * so it gets re-submitted. If it's changed but still within the cooldown
 * window, it's left alone and reported as "cooling down" — it'll get
 * picked up on a later sync once the cooldown clears. Hashing is scoped to
 * <main> specifically so that shared header/footer/nav template edits don't
 * falsely mark every page on the site as "changed."
 *
 * Cooldown rule: a page is never surfaced by `next` (or auto-requeued) if
 * it was last requested less than COOLDOWN_DAYS ago, regardless of content
 * changes.
 *
 * Usage:
 *   node scripts/gsc-indexing-log.mjs sync          # add new sitemap URLs as pending; requeue changed pages past cooldown
 *   node scripts/gsc-indexing-log.mjs next [N]      # next N pending URLs in priority order (default 10)
 *   node scripts/gsc-indexing-log.mjs mark <url>    # mark a URL as requested (updates timestamps/count/content baseline)
 *   node scripts/gsc-indexing-log.mjs status        # summary counts
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = join(import.meta.dirname, '..');
const LOG_PATH = join(ROOT, 'docs/gsc-indexing-log.json');
const SITEMAP_PATH = join(ROOT, 'dist/sitemap-0.xml');
const COOLDOWN_DAYS = 7;

function priorityTier(pathname) {
  if (pathname.startsWith('/service-areas/')) return 1;
  if (pathname.startsWith('/services/')) return 2;
  if (pathname === '/pricing/' || pathname === '/reviews/') return 3;
  if (pathname.startsWith('/our-work/') || pathname.startsWith('/projects/')) return 4;
  return 5;
}

async function loadSitemapPaths() {
  await access(SITEMAP_PATH);
  const xml = await readFile(SITEMAP_PATH, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
}

async function loadLog() {
  try {
    return JSON.parse(await readFile(LOG_PATH, 'utf8'));
  } catch {
    return { note: 'Tracks GSC "Request Indexing" submissions for eyshandyman.com. See docs/gsc-indexing-automation.md.', pages: [] };
  }
}

async function saveLog(log) {
  log.updated_at = new Date().toISOString();
  await writeFile(LOG_PATH, JSON.stringify(log, null, 2) + '\n');
}

/** Hash of the <main id="main-content"> region of a built page's HTML, so shared
 * header/footer/nav edits don't count as a content change for every page. Returns
 * null if the file doesn't exist (page removed) or has no <main> tag. */
async function hashPageContent(pathname) {
  const filePath = join(ROOT, 'dist', pathname, 'index.html');
  let html;
  try {
    html = await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const start = html.indexOf('<main');
  const openEnd = start === -1 ? -1 : html.indexOf('>', start);
  const closeTag = openEnd === -1 ? -1 : html.indexOf('</main>', openEnd);
  if (start === -1 || openEnd === -1 || closeTag === -1) return null;
  const main = html.slice(openEnd + 1, closeTag);
  return createHash('sha256').update(main).digest('hex').slice(0, 16);
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const then = new Date(dateStr + 'T00:00:00Z').getTime();
  const now = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.floor((now - then) / 86400000);
}

function cooldownOk(entry) {
  return entry.last_requested_at == null || daysSince(entry.last_requested_at) >= COOLDOWN_DAYS;
}

async function cmdSync() {
  const paths = await loadSitemapPaths();
  const log = await loadLog();
  const known = new Set(log.pages.map((p) => p.path));
  const newOnes = paths.filter((p) => !known.has(p));
  for (const p of newOnes) {
    log.pages.push({
      path: p,
      status: 'pending',
      priority_tier: priorityTier(p),
      first_seen_at: new Date().toISOString().slice(0, 10),
      first_requested_at: null,
      last_requested_at: null,
      times_requested: 0,
      content_hash: null,
    });
  }

  const requeued = [];
  const coolingDown = [];
  const baselined = [];
  for (const entry of log.pages) {
    if (entry.status !== 'requested') continue;
    const currentHash = await hashPageContent(entry.path);
    if (currentHash === null) continue; // page missing from this build; leave as-is
    if (entry.content_hash == null) {
      // No prior baseline (first run after this feature was added, or never hashed). Capture one now.
      entry.content_hash = currentHash;
      baselined.push(entry.path);
      continue;
    }
    if (currentHash !== entry.content_hash) {
      if (cooldownOk(entry)) {
        entry.status = 'pending';
        entry.last_content_change_detected_at = new Date().toISOString().slice(0, 10);
        requeued.push(entry.path);
      } else {
        const daysLeft = COOLDOWN_DAYS - daysSince(entry.last_requested_at);
        coolingDown.push(`${entry.path} (${daysLeft}d left)`);
      }
    }
  }

  await saveLog(log);
  console.log(`Synced. ${newOnes.length} new URL(s) added from sitemap. Total tracked: ${log.pages.length}.`);
  if (newOnes.length > 0) console.log('New URLs:', newOnes.join(', '));
  if (requeued.length > 0) console.log('Requeued (content changed, cooldown clear):', requeued.join(', '));
  if (coolingDown.length > 0) console.log('Content changed but still in cooldown (will requeue automatically once clear):', coolingDown.join(', '));
  if (baselined.length > 0) console.log(`Captured content baseline for ${baselined.length} already-requested page(s) (no prior hash on record).`);
}

async function cmdNext(limit) {
  const log = await loadLog();
  const pending = log.pages
    .filter((p) => p.status === 'pending' && cooldownOk(p))
    .sort((a, b) => a.priority_tier - b.priority_tier || a.path.localeCompare(b.path));
  const heldByCooldown = log.pages.filter((p) => p.status === 'pending' && !cooldownOk(p));
  console.log(JSON.stringify({
    all_existing_pages_done: pending.length === 0,
    next: pending.slice(0, limit).map((p) => ({
      path: p.path,
      reason: p.times_requested > 0 ? 'content changed since last request' : 'never requested',
    })),
    held_by_cooldown: heldByCooldown.map((p) => p.path),
  }, null, 2));
}

async function cmdMark(url) {
  const log = await loadLog();
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  const entry = log.pages.find((p) => p.path === path);
  if (!entry) {
    console.error(`Not tracked: ${path}. Run "sync" first if this is a real site URL.`);
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  entry.status = 'requested';
  entry.first_requested_at ??= today;
  entry.last_requested_at = today;
  entry.times_requested = (entry.times_requested ?? 0) + 1;
  entry.content_hash = await hashPageContent(path); // baseline as of this request
  delete entry.last_content_change_detected_at;
  await saveLog(log);
  console.log(`Marked requested: ${path} (${entry.times_requested}x)`);
}

async function cmdStatus() {
  const log = await loadLog();
  const total = log.pages.length;
  const requested = log.pages.filter((p) => p.status === 'requested').length;
  const pendingCooldown = log.pages.filter((p) => p.status === 'pending' && !cooldownOk(p)).length;
  console.log(JSON.stringify({ total, requested, pending: total - requested, pending_in_cooldown: pendingCooldown }, null, 2));
}

const [, , cmd, arg] = process.argv;
if (cmd === 'sync') await cmdSync();
else if (cmd === 'next') await cmdNext(arg ? Number(arg) : 10);
else if (cmd === 'mark') await cmdMark(arg);
else if (cmd === 'status') await cmdStatus();
else {
  console.log('Usage: node scripts/gsc-indexing-log.mjs <sync|next [N]|mark <url>|status>');
  process.exit(1);
}
