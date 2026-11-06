// What the detail page shows beyond the title itself: the film series it
// belongs to (as far as the library has the films) and its trailers and
// extras stored in Jellyfin.
import { ItemsService, queryUserItems } from '../jellyfin/items.service.js';
import { jellyfinJson } from '../jellyfin/client.js';
import { COMMON_ITEM_FIELDS } from '../jellyfin/fields.js';
import { TmdbService } from '../tmdb.service.js';
import { getActiveCatalogReader } from '../catalog/reader.js';
import { getCatalogAccess } from '../catalog/visibility.js';
import { copiesOf } from './title-copies.js';

const byRelease = (a, b) => String(a.releaseDate || '9999').localeCompare(String(b.releaseDate || '9999'));

// Null when the film belongs to no series, TMDB does not know it, or the
// library holds fewer than two of its films.
export async function getCollection(userId, token, itemId) {
  const reader = getActiveCatalogReader();
  if (!reader) return null;
  const item = await ItemsService.getItemDetails(userId, token, itemId);
  const tmdbId = item?.Type === 'Movie' ? item.ProviderIds?.Tmdb : null;
  if (!tmdbId) return null;

  const movie = await TmdbService.getMovieDetails(tmdbId).catch(() => null);
  const collectionId = movie?.belongs_to_collection?.id;
  if (!collectionId) return null;
  const collection = await TmdbService.getCollection(collectionId);

  const access = await getCatalogAccess(userId, token);
  const items = [];
  let missing = 0;
  for (const part of [...collection.parts].sort(byRelease)) {
    const matches = reader.byProviderId({ tmdbId: part.id, type: 'Movie', ...access });
    if (matches.length === 0) {
      missing += 1;
      continue;
    }
    // A film held twice shows as its first copy.
    const first = (await copiesOf(userId, token, matches[0].Id))[0].id;
    items.push(matches.find(match => match.Id === first) || matches[0]);
  }
  if (items.length < 2) return null;
  return { name: collection.name, items, missing };
}

// Trailers and extras Jellyfin holds as files (featurettes, interviews …).
export async function getExtras(userId, token, itemId) {
  const query = { userId, fields: COMMON_ITEM_FIELDS };
  const [trailers, features] = await Promise.all([
    jellyfinJson(`/Items/${itemId}/LocalTrailers`, { token, query }).catch(() => []),
    jellyfinJson(`/Items/${itemId}/SpecialFeatures`, { token, query }).catch(() => [])
  ]);
  const list = (value) => (Array.isArray(value) ? value : value?.Items || []);
  return [...list(trailers), ...list(features)];
}

// The title the user finished last (a film, or the series of an episode).
export async function lastWatchedTitle(userId, token) {
  const data = await queryUserItems(userId, token, {
    SortBy: 'DatePlayed',
    SortOrder: 'Descending',
    Filters: 'IsPlayed',
    IncludeItemTypes: 'Movie,Episode',
    Recursive: 'true',
    Limit: 1
  });
  const last = data.Items?.[0];
  if (!last) return null;
  if (last.Type === 'Episode') return last.SeriesId ? { id: last.SeriesId, name: last.SeriesName || last.Name } : null;
  return { id: last.Id, name: last.Name };
}
