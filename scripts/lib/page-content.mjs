/**
 * Shared helpers for reading a built page's own content, used by
 * scripts/gsc-indexing-log.mjs and scripts/indexnow.mjs. Node built-ins only.
 *
 * The <main id="main-content"> region is the page's own content: shared
 * header, footer and nav edits live outside it, so they never count as a
 * content change for every page.
 */
import { createHash } from 'node:crypto';

/** Inner HTML of the first <main> element, or null when the page has none. */
export function extractMain(html) {
  const start = html.indexOf('<main');
  const openEnd = start === -1 ? -1 : html.indexOf('>', start);
  const closeTag = openEnd === -1 ? -1 : html.indexOf('</main>', openEnd);
  if (start === -1 || openEnd === -1 || closeTag === -1) return null;
  return html.slice(openEnd + 1, closeTag);
}

/** First 16 hex characters of a SHA-256 digest. */
export function shortHash(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}
