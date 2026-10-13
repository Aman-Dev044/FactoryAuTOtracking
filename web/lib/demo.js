/**
 * Opening the demo dialog from anywhere.
 *
 * The dialog is mounted once in the layout and listens for this event, so a
 * button in the nav, the hero, a band or the footer can open it without a
 * context provider wrapping the whole tree or props threaded through every
 * section.
 */
export const DEMO_EVENT = 'trackbells:open-demo';

export function openDemo() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DEMO_EVENT));
}

/* --------------------------------------------------------------- toasts --- */

export const TOAST_EVENT = 'trackbells:toast';

/** kind: 'ok' | 'err' */
export function toast(message, kind = 'ok') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, kind } }));
}
