// Per-viewer progress on media cards: cards that scroll into view fetch it in
// batches (GET /api/media/userdata) and show a progress bar, the "gesehen"
// check and a series' next episode. Answers are kept a minute.
import { MediaApi } from '../api/media.api.js';
import { createElement } from './dom.js';
import { createPlayedBadge } from '../components/playedBadge.js';
import { PLAYED_CHANGED_EVENT } from '../components/playedToggle.js';
import { getCurrentPageScope } from './pageScope.js';

const TTL_MS = 60 * 1000;
const BATCH_SIZE = 100;
const FLUSH_DELAY_MS = 60;

const cache = new Map(); // id -> { at, summary }
const queued = new Set();
let observer = null;
let flushTimer = null;
// Page scope -> the cards it still waits on; leaving the page stops watching
// them, so the observer does not hold cards of pages long gone.
const observedByScope = new WeakMap();

function setBar(card, fraction, { series = false } = {}) {
  const container = card.querySelector('.media-card-image-container');
  if (!container) return;
  let bar = container.querySelector('.media-progress-bar');
  if (!(fraction > 0)) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = createElement('div', { className: 'media-progress-bar' }, createElement('div', { className: 'media-progress-fill' }));
    container.appendChild(bar);
  }
  bar.classList.toggle('is-series', series);
  bar.firstElementChild.style.width = `${Math.round(fraction * 1000) / 10}%`;
}

export function applyCardUserData(card, summary) {
  if (!summary) return;
  const isSeries = card.dataset.itemType === 'Series';

  if (isSeries) {
    setBar(card, summary.seriesProgress, { series: true });
    const subtitle = card.querySelector('.media-card-subtitle');
    if (subtitle) {
      if (card.dataset.subtitle === undefined) card.dataset.subtitle = subtitle.textContent;
      subtitle.textContent = summary.next ? `${summary.next} als Nächstes` : card.dataset.subtitle;
      subtitle.classList.toggle('is-next-up', Boolean(summary.next));
    }
  } else {
    setBar(card, summary.played ? 0 : summary.progress);
  }

  // A card with its own played toggle keeps that toggle in charge.
  if (card.querySelector('.played-toggle')) return;
  card.classList.toggle('is-played', summary.played === true);
  const container = card.querySelector('.media-card-image-container');
  const badge = container?.querySelector('.media-card-played');
  if (summary.played && !badge) container?.appendChild(createPlayedBadge());
  if (!summary.played) badge?.remove();
}

function applyEverywhere(id, summary) {
  document.querySelectorAll('.media-card[data-item-id]').forEach(card => {
    if (card.dataset.itemId === id) applyCardUserData(card, summary);
  });
}

async function flush() {
  flushTimer = null;
  const ids = [...queued].slice(0, BATCH_SIZE);
  ids.forEach(id => queued.delete(id));
  if (queued.size > 0) flushTimer = window.setTimeout(flush, FLUSH_DELAY_MS);
  if (ids.length === 0) return;
  try {
    const answer = await MediaApi.getUserData(ids);
    const at = Date.now();
    for (const [id, summary] of Object.entries(answer || {})) {
      cache.set(id, { at, summary });
      applyEverywhere(id, summary);
    }
  } catch {
    // Without it the cards just show what they had.
  }
}

function request(id) {
  const cached = cache.get(id);
  if (cached && Date.now() - cached.at < TTL_MS) {
    applyEverywhere(id, cached.summary);
    return;
  }
  queued.add(id);
  if (flushTimer === null) flushTimer = window.setTimeout(flush, FLUSH_DELAY_MS);
}

// What the server would answer, from an item that already carries the
// viewer's own UserData (e.g. "Weiter schauen"). Not for a series: its next
// episode only comes from the server.
export function summaryFromUserData(item) {
  const data = item?.UserData;
  if (!data || item.Type === 'Series' || typeof data.Played !== 'boolean') return null;
  const played = data.Played === true;
  const position = Number(data.PlaybackPositionTicks);
  const runtime = Number(item.RunTimeTicks);
  const progress = !played && position > 0 && runtime > 0 ? Math.min(1, position / runtime) : null;
  return { played, progress, next: null, seriesProgress: null };
}

const isFresh = entry => Boolean(entry) && Date.now() - entry.at < TTL_MS;

function watchForPage(card) {
  const scope = getCurrentPageScope();
  if (!scope) return;
  let cards = observedByScope.get(scope);
  if (!cards) {
    cards = new Set();
    observedByScope.set(scope, cards);
    scope.onLeave(() => {
      cards.forEach(entry => observer?.unobserve(entry));
      cards.clear();
    });
  }
  cards.add(card);
}

// `item` (optional) fills the cache when it brings the viewer's UserData.
export function observeCardUserData(card, item = null) {
  const id = card?.dataset?.itemId;
  if (!id) return;
  if (!isFresh(cache.get(id)) && Date.now() - playerLeftAt >= TTL_MS) {
    const known = summaryFromUserData(item);
    if (known) cache.set(id, { at: Date.now(), summary: known });
  }
  const cached = cache.get(id);
  if (isFresh(cached)) {
    applyCardUserData(card, cached.summary);
    return;
  }
  if (typeof window.IntersectionObserver !== 'function') return;
  if (!observer) {
    observer = new window.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        request(entry.target.dataset.itemId);
      }
    }, { rootMargin: '200px' });
  }
  observer.observe(card);
  watchForPage(card);
}

// A change made here (context menu, detail page): the cache and every card
// of the title on the page follow at once. `played` also settles progress:
// watched means no bar on a film and a full one on a series, unwatched none.
export function updateCardUserData(itemId, patch = {}) {
  if (!itemId) return null;
  const id = String(itemId);
  const base = cache.get(id)?.summary || { played: false, progress: null, next: null, seriesProgress: null };
  const summary = { ...base, ...patch };
  if (typeof patch.played === 'boolean') {
    summary.progress = null;
    summary.next = null;
    summary.seriesProgress = patch.played ? 1 : null;
  }
  cache.set(id, { at: Date.now(), summary });
  applyEverywhere(id, summary);
  return summary;
}

// When the player was last left: pages shown again from their saved state
// (home) hold the progress of before and reload what changes with watching.
let playerLeftAt = 0;
export const lastPlayerLeftAt = () => playerLeftAt;

// After watching, every card shows fresh progress again: for a minute the
// cards ask the server, instead of taking the UserData that saved pages
// still carry from before.
export function forgetCardUserData({ server = true } = {}) {
  cache.clear();
  playerLeftAt = Date.now();
  if (server) MediaApi.refreshUserData?.().catch?.(() => {});
}

let lastHash = typeof window !== 'undefined' ? window.location.hash : '';
if (typeof window !== 'undefined') {
  // Marked (un)watched by the played toggle, the context menu or a series.
  window.addEventListener(PLAYED_CHANGED_EVENT, event => {
    const { id, played } = event.detail || {};
    if (id && typeof played === 'boolean') updateCardUserData(id, { played });
  });
  window.addEventListener('hashchange', () => {
    const previous = lastHash;
    lastHash = window.location.hash;
    if (previous.startsWith('#/player/') && !lastHash.startsWith('#/player/')) forgetCardUserData();
  });
}

export const __test = {
  cache,
  resetPlayerLeft: () => { playerLeftAt = 0; },
  queued,
  flush,
  resetObserver: () => {
    observer?.disconnect?.();
    observer = null;
  }
};
