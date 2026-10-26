/**
 * Redesign copy rule: words the design wrote with non-breaking hyphens (U+2011:
 * "To‑Do", "two‑story", "built‑ins") use normal hyphens kept together in a
 * nowrap span. Returns escaped HTML for `set:html`.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function nowrapHyphens(text: string): string {
  return escapeHtml(text).replace(/(\S*\w-\w\S*)/g, '<span class="whitespace-nowrap">$1</span>');
}

/** Non-breaking spaces around "&" and inside fixed phrases ("Katy & Fulshear", "West Houston"). */
export function keepTogether(text: string): string {
  return text.replace(/ & /g, ' & ').replace(/West Houston/g, 'West Houston');
}
