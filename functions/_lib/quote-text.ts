import { LIVE_ORIGIN } from './env.ts';
import { displayFirstName } from './intro.ts';

/**
 * The one text a customer gets when Essa taps "Looks good". Aimen's style
 * rule for anything a customer reads: short and plain, like Essa texting from
 * the truck. No em or en dashes, no emoji, no sign-off, no lists, no
 * "Reply STOP" line, as few words as possible. The wording is owner-approved
 * and fixed; only the name, the job and the link change.
 */

export function introUrl(code: string): string {
  return `${LIVE_ORIGIN}/q/${code}`;
}

const GENERIC_TITLE = /^(?:(?:project|new|your|job|work|service|draft)\s+)?(?:quote|estimate|proposal)s?(?:\s*#?\s*\d+)?$/i;

/** Anything a customer must never see in a text: dashes, emoji and other pictographs. */
function plain(value: string): string {
  return value
    .replace(/[‒-―−]/g, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "TV Mounting" → "TV mounting", "High Ceiling Curtain Installation" →
 * "high ceiling curtain installation". Acronyms (TV, LED, HVAC) and names
 * with inner capitals keep their case; a leading article and a trailing
 * "quote" or "estimate" are dropped so the sentence reads "for the TV
 * mounting", not "for the the TV mounting quote".
 */
export function titlePhrase(title: string | null | undefined): string | null {
  let text = plain(title ?? '').replace(/[.!?,;:]+$/, '').trim();
  if (!text || GENERIC_TITLE.test(text) || /^untitled/i.test(text)) return null;
  text = text.replace(/^(?:the|a|an)\s+/i, '').replace(/\s+(?:quote|estimate|proposal)$/i, '').trim();
  if (!text || GENERIC_TITLE.test(text)) return null;
  return text
    .split(' ')
    .map((word) => {
      const letters = word.replace(/[^\p{L}]/gu, '');
      if (letters.length >= 2 && letters === letters.toUpperCase()) return word; // TV, HVAC, LED
      if (/\p{Lu}/u.test(word.slice(1))) return word; // iPhone, McKenzie
      return word.toLowerCase();
    })
    .join(' ');
}

/** Exactly the message, ready for Quo. */
export function quoteTextMessage(firstName: string | null | undefined, title: string | null | undefined, code: string): string {
  const first = plain(displayFirstName(firstName));
  const hi = first ? `Hi ${first}, it's Essa with EYS Handyman.` : "Hi, it's Essa with EYS Handyman.";
  const phrase = titlePhrase(title);
  const ready = phrase ? `Your quote for the ${phrase} is ready` : 'Your quote is ready';
  return `${hi} ${ready} ${introUrl(code)}\nAny questions just text me here.`;
}
