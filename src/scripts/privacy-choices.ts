/**
 * First-party privacy opt-out for the analytics and advertising tags in
 * BaseLayout.astro.
 *
 * The state is one localStorage key, `eys_privacy_optout`, set to '1' when the
 * visitor has opted out. BaseLayout reads the same key inline in <head>, because
 * the consent calls have to run before gtag.js processes the queue and long
 * before a module script like this one executes. If you change the key or the
 * meaning of its value, change it in both places.
 *
 * Storage can throw outright in private modes and locked-down browsers. A throw
 * is treated as "not opted out" so a visitor who never made a choice is not
 * silently opted out of measurement by a storage quirk.
 */
export const PRIVACY_OPTOUT_KEY = 'eys_privacy_optout';

export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(PRIVACY_OPTOUT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns false when the choice could not be persisted (storage blocked). */
export function setOptedOut(optedOut: boolean): boolean {
  try {
    if (optedOut) {
      localStorage.setItem(PRIVACY_OPTOUT_KEY, '1');
    } else {
      localStorage.removeItem(PRIVACY_OPTOUT_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Global Privacy Control — a browser/extension signal that the visitor opts out
 * of the sale and sharing of their data. We honor it as an advertising opt-out.
 */
export function hasGlobalPrivacyControl(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/**
 * Wire the toggle on /privacy/#your-privacy-choices. No-ops on every other page.
 * Nothing about this is a banner: the control only exists where the visitor went
 * looking for it.
 */
function initToggle(): void {
  const toggle = document.querySelector<HTMLInputElement>('[data-privacy-optout]');
  if (!toggle) return;

  const status = document.querySelector<HTMLElement>('[data-privacy-status]');
  const gpcNote = document.querySelector<HTMLElement>('[data-privacy-gpc]');

  function render(message?: string): void {
    toggle!.checked = isOptedOut();
    if (!status) return;
    status.textContent =
      message ??
      (toggle!.checked
        ? 'Analytics and advertising are off in this browser. The change takes effect the next time a page loads.'
        : 'Analytics and advertising are on in this browser.');
  }

  if (gpcNote && hasGlobalPrivacyControl()) {
    gpcNote.hidden = false;
  }

  toggle.addEventListener('change', () => {
    const saved = setOptedOut(toggle.checked);
    if (!saved) {
      render(
        'We could not save that choice — this browser is blocking site storage. Blocking cookies in your browser settings has the same effect.',
      );
      return;
    }
    render(
      toggle.checked
        ? 'Saved. Analytics and advertising are off in this browser, starting with the next page you load.'
        : 'Saved. Analytics and advertising are on again, starting with the next page you load.',
    );
  });

  render();
}

initToggle();
