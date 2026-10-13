// Less motion: asked for by the system, or switched on in the settings
// ("Weniger Bewegung", html.reduce-motion, set by intro-gate.js and the
// preferences store).
export function prefersReducedMotion() {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) return true;
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

// How long a panel slides in or out (the admin area's layers and the
// settings' areas move alike: 420 ms on --abyss-ease).
export const SLIDE_MS = 420;

// Swaps two panels of one container with a slide: `forward` brings `to` in
// from the right while `from` moves a little to the left, `back` the other
// way round. Both are visible while they move; `from` ends hidden. With less
// motion they just swap. Returns a function that finishes at once (for a
// second swap before the first one ended).
export function slidePanels({ from, to, direction = 'forward', win = window }) {
  const finish = () => {
    if (from) {
      from.hidden = true;
      from.classList.remove('is-slide-out', 'slide-forward', 'slide-back', 'is-sliding');
    }
    if (to) to.classList.remove('is-slide-in', 'slide-forward', 'slide-back', 'is-sliding');
  };
  if (!to) return () => {};
  to.hidden = false;
  if (!from || from === to || prefersReducedMotion()) {
    if (from && from !== to) from.hidden = true;
    return () => {};
  }
  from.hidden = false;
  from.classList.add('is-slide-out', `slide-${direction}`);
  to.classList.add('is-slide-in', `slide-${direction}`);
  let timer = null;
  // Two frames: the start position is laid out before the transition begins.
  win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
    from.classList.add('is-sliding');
    to.classList.add('is-sliding');
    timer = win.setTimeout(finish, SLIDE_MS);
  }));
  return () => {
    win.clearTimeout(timer);
    finish();
  };
}
