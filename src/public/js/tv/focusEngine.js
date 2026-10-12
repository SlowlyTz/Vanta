import { getTopModal } from '../utils/modal.js';
import { isTypingTarget } from './keys.js';
import { prefersReducedMotion } from '../utils/motion.js';

// Spatial navigation for TV remotes: the arrow keys move the focus to the
// nearest element in that direction. Rows ([data-tv-row]) keep left/right
// inside themselves and remember their last focus, so up/down lands where
// one left a row; groups ([data-tv-group], the sidebar and the content)
// remember theirs too. An open dialog keeps the focus inside it. The focus
// of each page is remembered and comes back with "Zurück".

const FOCUSABLE = 'a[href], button, input, select, textarea, [data-tv-focusable], [tabindex="0"]';
const FOCUS_CLASS = 'tv-focus';
const ROUTE_KEY = 'vanta.tv.focus';

export function isFocusable(element) {
  if (!element?.isConnected || element.disabled) return false;
  // A row is a container to move through, not a stop of its own.
  if (element.hasAttribute('data-tv-row')) return false;
  if (element.closest('[hidden], [inert], .hidden, [aria-hidden="true"]')) return false;
  if (element.getAttribute('tabindex') === '-1' && !element.hasAttribute('data-tv-focusable')) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle?.(element);
  return !style || (style.visibility !== 'hidden' && style.display !== 'none');
}

export const focusKeyOf = element => element?.dataset?.tvKey || element?.dataset?.itemId || element?.id || null;

// How far `to` lies from `from` in the direction; Infinity when not that way.
// Measured from the edges, the offset across counts double, and overlapping
// on the cross axis wins over sitting diagonally.
export function directionalScore(from, to, direction) {
  let along;
  let crossGap;
  if (direction === 'left' || direction === 'right') {
    along = direction === 'right' ? to.left - from.right : from.left - to.right;
    crossGap = Math.max(0, Math.max(from.top, to.top) - Math.min(from.bottom, to.bottom));
    if (along < -Math.min(from.width, to.width) / 2) return Infinity;
  } else {
    along = direction === 'down' ? to.top - from.bottom : from.top - to.bottom;
    crossGap = Math.max(0, Math.max(from.left, to.left) - Math.min(from.right, to.right));
    if (along < -Math.min(from.height, to.height) / 2) return Infinity;
  }
  const fromCenter = direction === 'left' || direction === 'right' ? (from.top + from.bottom) / 2 : (from.left + from.right) / 2;
  const toCenter = direction === 'left' || direction === 'right' ? (to.top + to.bottom) / 2 : (to.left + to.right) / 2;
  const overlapBonus = crossGap === 0 ? 0 : 1000;
  return Math.max(0, along) + 2 * crossGap + overlapBonus + Math.abs(fromCenter - toCenter) * 0.1;
}

export function createFocusEngine({ doc = document, storage = globalThis.sessionStorage, scrollSmooth = () => !prefersReducedMotion() } = {}) {
  const remembered = new WeakMap(); // row or group element -> last focused element
  let current = null;

  const scope = () => getTopModal()?.dialog || doc.body;
  const candidates = (root = scope()) => [...root.querySelectorAll(FOCUSABLE)].filter(isFocusable);

  const containerOf = (element, attribute) => element?.closest?.(`[${attribute}]`) || null;

  const remember = element => {
    for (const attribute of ['data-tv-row', 'data-tv-group']) {
      const container = containerOf(element, attribute);
      if (container) remembered.set(container, element);
    }
  };

  const reveal = element => {
    const behavior = scrollSmooth() ? 'smooth' : 'auto';
    try {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior });
    } catch {
      element.scrollIntoView?.();
    }
  };

  const focus = (element, { scroll = true } = {}) => {
    if (!element) return false;
    current?.classList.remove(FOCUS_CLASS);
    current = element;
    element.classList.add(FOCUS_CLASS);
    element.focus({ preventScroll: true });
    if (scroll) reveal(element);
    remember(element);
    saveRouteFocus(element);
    return true;
  };

  const active = () => {
    const element = doc.activeElement;
    return element && element !== doc.body && scope().contains(element) && isFocusable(element) ? element : null;
  };

  const startElement = (root = scope()) => {
    const pick = root.querySelector('[data-tv-autofocus]');
    if (pick && isFocusable(pick)) return pick;
    const content = root.querySelector?.('#main-content') || root;
    return candidates(content)[0] || candidates(root)[0] || null;
  };

  function move(direction) {
    const from = active();
    if (!from) return focus(startElement());
    const fromRect = from.getBoundingClientRect();
    const row = containerOf(from, 'data-tv-row');
    let pool = candidates().filter(element => element !== from);
    // Left and right stay in a row while it has more.
    if (row && (direction === 'left' || direction === 'right')) {
      const inRow = pool.filter(element => row.contains(element));
      const best = bestOf(inRow, fromRect, direction);
      if (best) return focus(best);
      pool = pool.filter(element => !row.contains(element));
    }
    let best = bestOf(pool, fromRect, direction);
    if (!best) return false;
    // Into another row or group: where one last was there.
    for (const attribute of ['data-tv-row', 'data-tv-group']) {
      const target = containerOf(best, attribute);
      if (target && target !== containerOf(from, attribute)) {
        const back = remembered.get(target);
        if (back && back !== from && isFocusable(back) && target.contains(back)) {
          best = back;
          break;
        }
      }
    }
    return focus(best);
  }

  function bestOf(pool, fromRect, direction) {
    let best = null;
    let bestScore = Infinity;
    for (const element of pool) {
      const score = directionalScore(fromRect, element.getBoundingClientRect(), direction);
      if (score < bestScore) {
        best = element;
        bestScore = score;
      }
    }
    return best;
  }

  // The focus of each page, kept for "Zurück".
  const routeMap = () => {
    try { return JSON.parse(storage?.getItem(ROUTE_KEY) || '{}'); } catch { return {}; }
  };
  function saveRouteFocus(element) {
    const key = focusKeyOf(element);
    if (!key || getTopModal()) return;
    try {
      storage?.setItem(ROUTE_KEY, JSON.stringify({ ...routeMap(), [doc.defaultView?.location.hash || '']: key }));
    } catch { /* not kept */ }
  }

  function restore(hash = doc.defaultView?.location.hash || '') {
    const key = routeMap()[hash];
    const match = key ? candidates().find(element => focusKeyOf(element) === key) : null;
    return focus(match || startElement());
  }

  return { move, focus, restore, candidates, active: () => active(), start: () => focus(startElement()) };
}

// Wires the engine to the keyboard and the router.
export function bindFocusEngine(engine, { win = window } = {}) {
  const onKey = event => {
    if ((event.key === 'Enter' || event.keyCode === 13) && !event.defaultPrevented) {
      const target = event.target;
      if (target?.matches?.('input[type="checkbox"], input[type="radio"], [data-tv-focusable]')) {
        event.preventDefault();
        target.click();
        return;
      }
    }
    const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key]
      || { 37: 'left', 38: 'up', 39: 'right', 40: 'down' }[event.keyCode];
    if (!direction || event.defaultPrevented) return;
    // In a text field left/right move the cursor; up/down leave the field.
    if (isTypingTarget(event.target) && (direction === 'left' || direction === 'right')) return;
    if (event.target?.closest?.('media-player, .vanta-player-root')) return;
    event.preventDefault();
    engine.move(direction);
  };
  // A page fills in after its data arrived: until something of it can take
  // the focus (and as long as the viewer has not moved), try again.
  let retry = null;
  const onPage = event => {
    win.clearTimeout(retry);
    const hash = event.detail?.hash;
    let tries = 0;
    const attempt = () => {
      engine.restore(hash);
      const content = win.document.getElementById('main-content');
      const landed = content?.contains(win.document.activeElement) || win.document.activeElement?.closest?.('[data-tv-focus-root]');
      if (!landed && ++tries < 20) retry = win.setTimeout(attempt, 200);
    };
    win.requestAnimationFrame(attempt);
  };
  const stopRetry = () => win.clearTimeout(retry);
  win.addEventListener('keydown', stopRetry, true);
  win.addEventListener('keydown', onKey);
  win.addEventListener('vanta:page-shown', onPage);
  return () => {
    win.removeEventListener('keydown', stopRetry, true);
    win.removeEventListener('keydown', onKey);
    win.removeEventListener('vanta:page-shown', onPage);
  };
}
