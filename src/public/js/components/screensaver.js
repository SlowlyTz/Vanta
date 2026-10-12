import { createElement } from '../utils/dom.js';
import { openModal } from '../utils/modal.js';
import { getBackdropUrlFor, getItemImageUrl } from '../utils/image.js';
import { formatYear } from '../utils/format.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { MediaApi } from '../api/media.api.js';
import { ensurePageStyles } from '../utils/pageStyles.js';

export const SLIDE_MS = 12_000;
const CONTROLS_IDLE_MS = 5_000;
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];

// Counts idle time on a page: any mouse, touch, key or scroll input starts
// over, a hidden tab holds the count. Calls `onIdle` once per idle stretch.
export function createIdleWatch({ timeoutMs, onIdle, target = window, doc = document }) {
  let timer = null;
  let stopped = true;

  const arm = () => {
    if (stopped) return;
    window.clearTimeout(timer);
    timer = doc.visibilityState === 'hidden' ? null : window.setTimeout(() => {
      timer = null;
      if (!stopped) onIdle();
    }, timeoutMs);
  };

  const onVisibility = () => arm();

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      ACTIVITY_EVENTS.forEach(type => target.addEventListener(type, arm, { passive: true, capture: true }));
      doc.addEventListener('visibilitychange', onVisibility);
      arm();
    },
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      timer = null;
      ACTIVITY_EVENTS.forEach(type => target.removeEventListener(type, arm, { capture: true }));
      doc.removeEventListener('visibilitychange', onVisibility);
    },
    reset: arm
  };
}

const clockParts = (date) => ({
  time: new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date),
  date: new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
});

// Full screen: backdrops of the library slowly moving (Ken Burns), one every
// 12 s, with title, year, rating, genres and two lines of description, and
// the time in a corner. Input first shows the controls ("Ansehen",
// "Bildschirmschoner beenden"); Escape or Back ends it.
export function openScreensaver({ items, onClose = null, pageScope = null, now = () => new Date() }) {
  const reduced = prefersReducedMotion();
  const slides = createElement('div', { className: 'screensaver-slides', 'aria-hidden': 'true' });
  const clockTime = createElement('span', { className: 'screensaver-time' });
  const clockDate = createElement('span', { className: 'screensaver-date' });
  const title = createElement('div', { className: 'screensaver-title' });
  const meta = createElement('div', { className: 'screensaver-meta' });
  const overview = createElement('p', { className: 'screensaver-overview' });
  let index = -1;
  let handle = null;

  const watchButton = createElement('button', {
    type: 'button',
    className: 'screensaver-watch',
    onClick: () => {
      const item = items[index];
      handle?.close();
      if (item) window.location.hash = `#/item/${item.Id}`;
    }
  }, 'Zum Titel');
  const closeButton = createElement('button', {
    type: 'button',
    className: 'screensaver-close',
    onClick: () => handle?.close()
  }, 'Bildschirmschoner beenden');

  const dialog = createElement('div', { className: `screensaver${reduced ? ' is-still' : ''}`, 'aria-label': 'Bildschirmschoner' },
    slides,
    createElement('div', { className: 'screensaver-shade', 'aria-hidden': 'true' }),
    createElement('div', { className: 'screensaver-clock' }, clockTime, clockDate),
    createElement('div', { className: 'screensaver-info' }, title, meta, overview, createElement('div', { className: 'screensaver-actions' }, watchButton)),
    closeButton
  );

  const updateClock = () => {
    const parts = clockParts(now());
    clockTime.textContent = parts.time;
    clockDate.textContent = parts.date;
  };

  const preload = (item) => {
    if (!item) return;
    const image = new Image();
    image.src = getBackdropUrlFor(item);
  };

  const show = () => {
    index = (index + 1) % items.length;
    const item = items[index];
    const slide = createElement('div', { className: 'screensaver-slide' });
    slide.style.backgroundImage = `url("${getBackdropUrlFor(item).replaceAll('"', '%22')}")`;
    // Each picture moves its own way.
    slide.style.setProperty('--pan-x', `${(index % 3) - 1}%`);
    slides.appendChild(slide);
    requestAnimationFrame(() => slide.classList.add('is-visible'));
    const previous = [...slides.children].slice(0, -1);
    window.setTimeout(() => previous.forEach(old => old.remove()), 1600);

    const logo = item.ImageTags?.Logo ? getItemImageUrl(item, 'Logo') : null;
    title.replaceChildren(logo ? createElement('img', { src: logo, alt: item.Name, className: 'screensaver-logo' }) : createElement('h2', {}, item.Name));
    meta.replaceChildren(...[
      formatYear(item.PremiereDate || item.ProductionYear),
      item.OfficialRating,
      (item.Genres || []).slice(0, 3).join(' · ')
    ].filter(Boolean).map(text => createElement('span', {}, String(text))));
    overview.textContent = item.Overview || '';
    preload(items[(index + 1) % items.length]);
  };

  // Input shows the controls for a few seconds instead of ending at once.
  let controlsTimer = null;
  const showControls = () => {
    dialog.classList.add('show-controls');
    window.clearTimeout(controlsTimer);
    controlsTimer = window.setTimeout(() => dialog.classList.remove('show-controls'), CONTROLS_IDLE_MS);
  };
  dialog.addEventListener('pointermove', showControls);
  dialog.addEventListener('pointerdown', event => {
    if (!event.target.closest('button')) showControls();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Escape') showControls();
  });

  const overlay = createElement('div', { className: 'screensaver-backdrop' }, dialog);
  updateClock();
  show();
  const slideTimer = window.setInterval(show, SLIDE_MS);
  const clockTimer = window.setInterval(updateClock, 15_000);

  handle = openModal({
    overlay,
    dialog,
    // The dialog itself: a focused button would keep the controls on screen.
    initialFocus: dialog,
    lockScroll: false,
    closeOnBackdrop: false,
    pageScope,
    onClose: () => {
      window.clearInterval(slideTimer);
      window.clearInterval(clockTimer);
      window.clearTimeout(controlsTimer);
      onClose?.();
    }
  });
  showControls();
  return handle;
}

// The titles and stylesheet are fetched once per visit; one screensaver at
// a time, whether the idle watch or the button starts it.
let cachedItems = null;
let current = null;

export function isScreensaverOpen() {
  return Boolean(current);
}

// Loads what the screensaver needs and opens it. Resolves to its handle, or
// null when there is nothing to show (no titles, or one is already open).
export async function startScreensaver({ onClose = null, pageScope = null, api = MediaApi } = {}) {
  if (current) return null;
  const pending = {};
  current = pending;
  try {
    if (!cachedItems?.length) cachedItems = (await api.getScreensaverItems(30))?.items || [];
    await ensurePageStyles(['screensaver']);
  } catch {
    cachedItems = null;
  }
  if (current !== pending) return null;
  if (!cachedItems?.length) {
    current = null;
    return null;
  }
  const handle = openScreensaver({
    items: cachedItems,
    pageScope,
    onClose: () => {
      current = null;
      onClose?.();
    }
  });
  current = handle;
  return handle;
}

export function resetScreensaverCache() {
  cachedItems = null;
  current = null;
}
