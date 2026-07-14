export const STATUS_MAP = {
  pending: { label: 'ausstehend', cls: 'pending' },
  approved: { label: 'genehmigt', cls: 'approved' },
  imported: { label: 'genehmigt', cls: 'approved' },
  rejected: { label: 'abgelehnt', cls: 'rejected' }
};

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const REQUEST_SEARCH_STATE_KEY = 'vanta.requests.searchState';

export function loadRequestSearchState() {
  try {
    const raw = sessionStorage.getItem(REQUEST_SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : { query: '', results: [] };
  } catch {
    return { query: '', results: [] };
  }
}

export function saveRequestSearchState(query, results = []) {
  try {
    sessionStorage.setItem(REQUEST_SEARCH_STATE_KEY, JSON.stringify({ query, results }));
  } catch {
    // Ignore unavailable storage; search still works without restoration.
  }
}

export function clearRequestSearchState() {
  try {
    sessionStorage.removeItem(REQUEST_SEARCH_STATE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export function getTmdbImageUrl(path, size = 'w500') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
