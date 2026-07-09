const STATE_PREFIX = 'vantaRouteState:';
const RETURN_MARKER_KEY = 'vantaReturnMarker';

export function normalizeRouteKey(hash = window.location.hash || '#/home') {
  const [path] = hash.split('?');
  return path || '#/home';
}

function safeGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function safeRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function saveRouteState(hash, state) {
  safeSet(STATE_PREFIX + normalizeRouteKey(hash), state);
}

export function getRouteState(hash) {
  return safeGet(STATE_PREFIX + normalizeRouteKey(hash));
}

export function clearRouteState(hash) {
  safeRemove(STATE_PREFIX + normalizeRouteKey(hash));
}

export function markReturnFromDetail({ scrollY, itemId, sourceType } = {}) {
  safeSet(RETURN_MARKER_KEY, {
    fromRoute: normalizeRouteKey(window.location.hash),
    scrollY: Number.isFinite(scrollY) ? scrollY : window.scrollY,
    itemId: itemId || null,
    sourceType: sourceType || null
  });
}

export function consumeReturnMarker(hash) {
  const marker = safeGet(RETURN_MARKER_KEY);
  if (!marker) return null;

  safeRemove(RETURN_MARKER_KEY);

  if (marker.fromRoute !== normalizeRouteKey(hash)) return null;

  return marker;
}
