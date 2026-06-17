import { MediaApi } from '../../api/media.api.js';
import { normalizeJellyfinItem } from '../../utils/normalize.js';

export async function loadDetailData(id) {
  const item = await MediaApi.getItem(id);

  const tasks = [
    MediaApi.getSimilar(id).catch(err => {
      console.warn('Failed to load similar items:', err);
      return [];
    })
  ];

  if (item.Type === 'Series') {
    tasks.push(
      MediaApi.getSeasons(id).catch(err => {
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
