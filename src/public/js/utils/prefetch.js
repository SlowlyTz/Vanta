// Warms the detail route before a media card is opened: the page chunk is
// imported and the detail data is fetched while the pointer still rests on
// the card, so the click lands on an already loaded page. Everything here is
// invisible; the detail page only consults the cache and otherwise behaves
// exactly as without it.

const HOVER_DELAY_MS = 80;
const THROTTLE_MS = 150;
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 20;

const cache = new Map();

let pageChunkPromise = null;
let lastPrefetchAt = -Infinity;
let pendingTimer = null;
let pendingCard = null;
let initialised = false;

function now() {
  return Date.now();
}

function isExpired(entry, at = now()) {
  return at - entry.createdAt >= CACHE_TTL_MS;
}

function sweepExpired() {
  const at = now();
  for (const [id, entry] of cache) {
    if (isExpired(entry, at)) cache.delete(id);
  }
}

function isSaveDataEnabled() {
  return Boolean(navigator.connection?.saveData);
}

// The opening scene keeps its cover in the document until it has finished;
// intro-gate.js marks the html element when it never plays.
function isIntroActive() {
  const overlay = document.getElementById('intro');
  return Boolean(overlay) && !document.documentElement.classList.contains('intro-off');
}

function canPrefetch() {
  return !isSaveDataEnabled() && !isIntroActive();
}

function loadPageChunk() {
  if (!pageChunkPromise) {
    pageChunkPromise = import('../pages/detail.page.js').catch(error => {
      pageChunkPromise = null;
      throw error;
    });
    pageChunkPromise.catch(() => {});
  }
  return pageChunkPromise;
}

// Fetches the detail bundle for one item and keeps the promise so a click
// during the request reuses it. Failed requests leave the cache so the page
// falls back to its own request.
export function prefetchDetail(id) {
  if (!id) return null;

  sweepExpired();

  const existing = cache.get(id);
  if (existing) return existing.promise;

  const promise = import('../pages/detail/detailData.js')
    .then(module => module.fetchDetailData(id));
  promise.catch(() => {
    if (cache.get(id)?.promise === promise) cache.delete(id);
  });

  cache.set(id, { promise, createdAt: now() });
  while (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }

  return promise;
}

// Hands a fresh prefetched bundle to the detail page and drops it from the
// cache: the page must not reuse it again later, its user data may change.
export function takePrefetchedDetail(id) {
  const entry = cache.get(id);
  if (!entry) return null;

  cache.delete(id);
  if (isExpired(entry)) return null;

  return entry.promise;
}

function clearPending() {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  pendingCard = null;
}

function triggerPrefetch(card) {
  pendingTimer = null;
  pendingCard = null;

  if (!card.isConnected || !canPrefetch()) return;

  lastPrefetchAt = now();
  loadPageChunk();
  prefetchDetail(card.dataset.itemId);
}

// Delays the request by the hover delay and, when a prefetch has just run,
// by whatever is left of the throttle window.
function schedulePrefetch(card, delay) {
  clearPending();
  if (!canPrefetch()) return;

  const wait = Math.max(delay, lastPrefetchAt + THROTTLE_MS - now());
  pendingCard = card;
  pendingTimer = setTimeout(() => triggerPrefetch(card), wait);
}

function findCard(target) {
  return target instanceof Element ? target.closest('[data-item-id]') : null;
}

function onPointerOver(event) {
  // Touch devices fire pointerover on tap; touchstart handles those.
  if (event.pointerType === 'touch') return;

  const card = findCard(event.target);
  if (card === pendingCard) return;

  if (card) {
    schedulePrefetch(card, HOVER_DELAY_MS);
  } else {
    clearPending();
  }
}

function onPointerOut(event) {
  if (event.pointerType === 'touch') return;

  const card = findCard(event.target);
  if (!card || card !== pendingCard) return;
  if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;

  clearPending();
}

function onTouchStart(event) {
  const card = findCard(event.target);
  if (!card) return;

  schedulePrefetch(card, 0);
}

// A click opens the page itself; a still pending prefetch would only
// duplicate the request the page is about to make.
function onClick() {
  clearPending();
}

export function initDetailPrefetch() {
  if (initialised) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof window.PointerEvent === 'undefined') return;

  initialised = true;
  document.addEventListener('pointerover', onPointerOver);
  document.addEventListener('pointerout', onPointerOut);
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('click', onClick, true);
}

// Test helper: removes listeners and forgets every cached entry.
export function resetDetailPrefetch() {
  if (initialised) {
    document.removeEventListener('pointerover', onPointerOver);
    document.removeEventListener('pointerout', onPointerOut);
    document.removeEventListener('touchstart', onTouchStart, { passive: true });
    document.removeEventListener('click', onClick, true);
  }
  initialised = false;
  clearPending();
  cache.clear();
  pageChunkPromise = null;
  lastPrefetchAt = -Infinity;
}
