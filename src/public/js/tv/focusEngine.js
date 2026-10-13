import { getTopModal } from '../utils/modal.js';
import { isTypingTarget, normalizeKey } from './keys.js';
import { prefersReducedMotion } from '../utils/motion.js';

// Spatial navigation for TV remotes: the arrow keys move the focus to the
// nearest element in that direction. Rows ([data-tv-row]) keep left/right
// inside themselves, columns ([data-tv-column]) hold up/down; both remember
// their last focus, so one lands where one left them. Groups
// ([data-tv-group], the sidebar and the content) remember theirs too. An
// open dialog keeps the focus inside it. The focus of each page is
// remembered and comes back with "Zurück"; a page opened anew starts at
// its top.

const FOCUSABLE = 'a[href], button, input, select, textarea, [data-tv-focusable], [tabindex="0"]';
const FOCUS_CLASS = 'tv-focus';
const ROUTE_KEY = 'vanta.tv.focus';
// Marks the history entry of a page, so "Zurück" finds the focus it had.
const VISIT_KEY = 'vantaTvVisit';
const MAX_VISITS = 60;
// Rows scroll so the focused card sits this far from their left edge.
const ROW_ANCHOR_PX = 24;
const CONTAINERS = ['data-tv-row', 'data-tv-column', 'data-tv-group'];

export function isFocusable(element) {
  if (!element?.isConnected || element.disabled) return false;
  // A row or column is a container to move through, not a stop of its own.
  if (element.hasAttribute('data-tv-row') || element.hasAttribute('data-tv-column')) return false;
  if (element.closest('[hidden], [inert], .hidden, [aria-hidden="true"], [data-tv-skip]')) return false;
  if (element.getAttribute('tabindex') === '-1' && !element.hasAttribute('data-tv-focusable')) return false;
  // A card's own "gesehen" button is no extra stop; the menu key offers it.
  if (element.matches('.has-played-toggle .played-toggle')) return false;
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

// The nearest ancestor that scrolls sideways (a row of cards), if any.
function horizontalScroller(element) {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflow = window.getComputedStyle?.(node).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return node;
    }
  }
  return null;
}

export function createFocusEngine({ doc = document, storage = globalThis.sessionStorage, scrollSmooth = () => !prefersReducedMotion() } = {}) {
  const remembered = new WeakMap(); // row, column or group element -> last focused element
  let current = null;

  const scope = () => getTopModal()?.dialog || doc.body;
  const candidates = (root = scope()) => [...root.querySelectorAll(FOCUSABLE)].filter(isFocusable);

  const containerOf = (element, attribute) => element?.closest?.(`[${attribute}]`) || null;

  const remember = element => {
    for (const attribute of CONTAINERS) {
      const container = containerOf(element, attribute);
      if (container) remembered.set(container, element);
    }
  };

  // Rows bring the card to a fixed place at their left edge; the page
  // scrolls so the focus sits a bit above the middle; inside a dialog only
  // as far as needed.
  const reveal = element => {
    const behavior = scrollSmooth() ? 'smooth' : 'auto';
    const win = doc.defaultView;
    try {
      const row = horizontalScroller(element);
      if (row) {
        const anchor = parseFloat(win?.getComputedStyle?.(row).paddingLeft) || ROW_ANCHOR_PX;
        const delta = element.getBoundingClientRect().left - row.getBoundingClientRect().left - anchor;
        if (Math.abs(delta) > 1) row.scrollTo({ left: row.scrollLeft + delta, behavior });
      }
      const modal = getTopModal();
      if (modal?.dialog?.contains(element) || element.closest('.tv-sidebar') || !win) {
        if (!element.closest('.tv-sidebar')) element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
        return;
      }
      const rect = element.getBoundingClientRect();
      const pageTop = win.scrollY + rect.top;
      // What fits on the first screen keeps the page at its top (the hero
      // stays whole); further down the focus sits a bit above the middle.
      const target = pageTop + rect.height <= win.innerHeight * 0.9 ? 0 : pageTop - win.innerHeight * 0.38;
      win.scrollTo({ top: Math.max(0, target), behavior });
    } catch {
      element.scrollIntoView?.();
    }
  };

  // The focus ring follows the real focus, however it got there (the
  // engine, a dialog, a page focusing something, a pointer remote).
  const mark = element => {
    if (current && current !== element) current.classList.remove(FOCUS_CLASS);
    current = element;
    element.classList.add(FOCUS_CLASS);
  };
  const onFocusIn = event => {
    const element = event.target;
    if (!(element instanceof doc.defaultView.Element) || element === doc.body) return;
    mark(element);
    remember(element);
    saveRouteFocus(element);
  };
  const onFocusOut = event => {
    if (!event.relatedTarget && current === event.target) {
      current.classList.remove(FOCUS_CLASS);
      current = null;
    }
  };
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);

  const focus = (element, { scroll = true } = {}) => {
    if (!element) return false;
    mark(element);
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

  // Where the sidebar marks the page one is on; the way out of an empty page.
  const sidebarEntry = () => {
    const sidebar = doc.querySelector('.tv-sidebar');
    if (!sidebar) return null;
    const pick = sidebar.querySelector('.tv-sidebar-link.active');
    return pick && isFocusable(pick) ? pick : candidates(sidebar)[0] || null;
  };

  function move(direction) {
    const from = active();
    if (!from) return focus(startElement() || sidebarEntry());
    const fromRect = from.getBoundingClientRect();
    let pool = candidates().filter(element => element !== from);
    // The sidebar is entered with left only; up/down at the end of the
    // content stop there instead of jumping into it.
    const sidebar = doc.querySelector('.tv-sidebar');
    if (sidebar && direction !== 'left' && !sidebar.contains(from)) {
      pool = pool.filter(element => !sidebar.contains(element));
    }
    // Left and right stay in a row while it has more; up and down never
    // leave a column (it is left sideways).
    const binding = direction === 'left' || direction === 'right' ? 'data-tv-row' : 'data-tv-column';
    const bound = containerOf(from, binding);
    if (bound) {
      const inside = pool.filter(element => bound.contains(element));
      const best = bestOf(inside, fromRect, direction);
      if (best) return focus(best);
      if (binding === 'data-tv-column') return false;
      // The end of a row of cards is the end: right does not jump into
      // another row (left still leads out, to the sidebar).
      if (direction === 'right' && rememberedRow(bound)) return false;
      pool = pool.filter(element => !bound.contains(element));
    }
    let best = bestOf(pool, fromRect, direction);
    if (!best) return false;
    // Into another row of cards, column or group: where one last was there.
    // A row that is a grid of keys (the on-screen keyboard) or buttons stays
    // spatial: down from "w" is "s", whatever was pressed there before.
    for (const attribute of CONTAINERS) {
      const target = containerOf(best, attribute);
      if (target && target !== containerOf(from, attribute)) {
        if (attribute === 'data-tv-row' && !rememberedRow(target)) continue;
        const back = remembered.get(target);
        if (back && back !== from && isFocusable(back) && target.contains(back)) {
          best = back;
          break;
        }
      }
    }
    return focus(best);
  }

  // Rows of cards (carousels) bring one back to the card one last had there.
  const rememberedRow = row => row.matches('.carousel-track, .media-carousel, .featured-carousel, [data-tv-remember]');

  // Up and down go to the next line first, however few elements it holds,
  // then to the element of that line nearest sideways: a short row (one or
  // three titles) under the fourth card is never skipped.
  function bestOfVertical(pool, fromRect, direction) {
    const along = rect => (direction === 'down' ? rect.top - fromRect.bottom : fromRect.top - rect.bottom);
    const entries = pool
      .map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => along(rect) >= -Math.min(fromRect.height, rect.height) / 2);
    if (!entries.length) return null;
    const nearest = Math.min(...entries.map(({ rect }) => Math.max(0, along(rect))));
    const tolerance = Math.max(8, fromRect.height / 2);
    const fromCenter = (fromRect.left + fromRect.right) / 2;
    let best = null;
    let bestGap = Infinity;
    for (const { element, rect } of entries) {
      if (Math.max(0, along(rect)) > nearest + tolerance) continue;
      const gap = rect.right < fromRect.left ? fromRect.left - rect.right
        : rect.left > fromRect.right ? rect.left - fromRect.right
          : Math.abs((rect.left + rect.right) / 2 - fromCenter) * 0.01;
      if (gap < bestGap) {
        best = element;
        bestGap = gap;
      }
    }
    return best;
  }

  function bestOf(pool, fromRect, direction) {
    if (direction === 'up' || direction === 'down') return bestOfVertical(pool, fromRect, direction);
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
  // Each visit of a page is an entry in the browser history; its focus is
  // kept under that entry, not under the page's address.
  const visitOf = (hash = doc.defaultView?.location.hash || '') => doc.defaultView?.history?.state?.[VISIT_KEY] || hash;
  function saveRouteFocus(element) {
    const key = focusKeyOf(element);
    // Only the page's own content is remembered, not the sidebar.
    if (!key || getTopModal() || !doc.getElementById('main-content')?.contains(element)) return;
    try {
      const map = { ...routeMap(), [visitOf()]: key };
      const visits = Object.keys(map);
      for (const old of visits.slice(0, Math.max(0, visits.length - MAX_VISITS))) delete map[old];
      storage?.setItem(ROUTE_KEY, JSON.stringify(map));
    } catch { /* not kept */ }
  }

  // A page was shown: true when it is one returned to ("Zurück" or the
  // player's end), whose history entry knows its visit; a page opened anew
  // (and the first page after starting the app) gets a visit of its own.
  let visits = 0;
  function enterPage() {
    const history = doc.defaultView?.history;
    const state = history?.state;
    visits += 1;
    if (visits > 1 && state?.[VISIT_KEY]) return true;
    try {
      history?.replaceState({ ...(state && typeof state === 'object' ? state : {}), [VISIT_KEY]: `${Date.now().toString(36)}.${visits}` }, '');
    } catch { /* stays keyed by its address */ }
    return false;
  }

  // Puts the focus on the page: where it was, else its start. While the
  // remembered element may still be loading (`waitForKey`), and while the
  // content has nothing to focus, it does nothing and says so (the caller
  // tries again). `fallback` lets an empty page hand the focus to the sidebar;
  // a `fresh` page starts at its top whatever was focused there before.
  function restore(hash = doc.defaultView?.location.hash || '', { waitForKey = false, fallback = false, fresh = false } = {}) {
    const key = fresh ? null : routeMap()[visitOf(hash)];
    const content = doc.getElementById('main-content');
    const pool = content ? candidates(content) : candidates();
    const match = key ? pool.find(element => focusKeyOf(element) === key) : null;
    if (match) return focus(match);
    if (key && waitForKey) return false;
    const target = content ? startElement(content) : startElement();
    if (target && (!content || content.contains(target))) return focus(target);
    if (fallback) {
      const entry = sidebarEntry();
      if (entry) return focus(entry);
    }
    return false;
  }

  // Back from the sidebar: to the content where one left it.
  function focusContent() {
    const content = doc.getElementById('main-content');
    if (!content) return false;
    const back = remembered.get(content);
    if (back && isFocusable(back) && content.contains(back)) return focus(back);
    return restore(doc.defaultView?.location.hash || '');
  }

  return {
    move,
    focus,
    restore,
    enterPage,
    focusContent,
    candidates,
    active: () => active(),
    start: () => focus(startElement() || sidebarEntry()),
    destroy() {
      doc.removeEventListener('focusin', onFocusIn);
      doc.removeEventListener('focusout', onFocusOut);
    }
  };
}

// Wires the engine to the keyboard and the router.
export function bindFocusEngine(engine, { win = window, openKeyboard = null, openActions = null } = {}) {
  // One step per frame: a held arrow key repeats faster than a TV can lay out.
  let stepPending = false;
  const step = direction => {
    if (stepPending) return;
    stepPending = true;
    engine.move(direction);
    win.requestAnimationFrame(() => { stepPending = false; });
  };

  const onKey = event => {
    if ((event.key === 'Enter' || event.keyCode === 13) && !event.defaultPrevented) {
      const target = event.target;
      // OK on a text field opens the on-screen keyboard (unless the page has
      // one of its own next to it).
      if (openKeyboard && isTypingTarget(target) && target.tagName === 'INPUT' && !target.closest('[data-osk-inline]') && !target.closest('.osk-dialog')) {
        event.preventDefault();
        openKeyboard(target);
        return;
      }
      if (target?.matches?.('input[type="checkbox"], input[type="radio"], [data-tv-focusable]')) {
        event.preventDefault();
        target.click();
        return;
      }
    }
    // The menu key opens the actions of the focused card (Meine Liste, gesehen …).
    if (openActions && !event.defaultPrevented && normalizeKey(event) === 'menu') {
      const card = event.target?.closest?.('[data-item-id]');
      if (card) {
        event.preventDefault();
        openActions(card);
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
    step(direction);
  };
  // A page fills in after its data arrived: until something of it can take
  // the focus (and as long as the viewer has not moved), try again. The
  // remembered element gets a few tries to appear before the page's start.
  let retry = null;
  const onPage = event => {
    win.clearTimeout(retry);
    const hash = event.detail?.hash;
    // The player has its own remote control (player/tvControls.js).
    if (/^#\/player\//.test(hash || '')) return;
    if (/^#\/watch-party\//.test(hash || '')) {
      // The lobby: its first control, once there; the party's player runs its own.
      let lobbyTries = 0;
      const lobby = () => {
        if (win.document.querySelector('media-player')) return;
        if (!engine.active() && !engine.start() && ++lobbyTries < 20) retry = win.setTimeout(lobby, 200);
      };
      win.requestAnimationFrame(lobby);
      return;
    }
    const fresh = !engine.enterPage();
    let tries = 0;
    const attempt = () => {
      tries += 1;
      const done = engine.restore(hash, { waitForKey: tries < 8, fallback: tries >= 6, fresh });
      if (!done && tries < 20) retry = win.setTimeout(attempt, 200);
    };
    win.requestAnimationFrame(attempt);
  };
  const onFocusContent = () => engine.focusContent();
  const stopRetry = () => win.clearTimeout(retry);
  win.addEventListener('keydown', stopRetry, true);
  win.addEventListener('keydown', onKey);
  win.addEventListener('vanta:page-shown', onPage);
  win.addEventListener('vanta:tv-focus-content', onFocusContent);
  return () => {
    win.removeEventListener('keydown', stopRetry, true);
    win.removeEventListener('keydown', onKey);
    win.removeEventListener('vanta:page-shown', onPage);
    win.removeEventListener('vanta:tv-focus-content', onFocusContent);
  };
}
