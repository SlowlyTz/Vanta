import { MediaApi } from '../../api/media.api.js';
import { normalizeJellyfinItem } from '../../utils/normalize.js';
import { takePrefetchedDetail } from '../../utils/prefetch.js';

// Everything the page needs before its first paint: the item, the similar
// titles and, for a series, its seasons.
// `signal` is the page's (a prefetch has none: it may serve a later visit).
export async function fetchDetailData(id, { signal } = {}) {
  const item = await MediaApi.getItem(id, { signal });

  const tasks = [
    MediaApi.getSimilar(id, { signal }).catch(err => {
      console.warn('Failed to load similar items:', err);
      return [];
    })
  ];

  if (item.Type === 'Series') {
    tasks.push(
      MediaApi.getSeasons(id, { signal }).catch(err => {
        console.warn('Failed to load seasons:', err);
        return [];
      })
    );
  }

  const results = await Promise.all(tasks);
  const similar = results[0];
  const seasons = item.Type === 'Series' ? results[1] : [];
  const normalized = normalizeJellyfinItem(item);

  return { item, similar, seasons, normalized };
}

// Uses the bundle a hover or touch already requested; a failed prefetch
// falls back to the regular request.
export function loadDetailData(id, { signal } = {}) {
  const prefetched = takePrefetchedDetail(id);
  if (prefetched) {
    return prefetched.catch(() => fetchDetailData(id, { signal }));
  }
  return fetchDetailData(id, { signal });
}
