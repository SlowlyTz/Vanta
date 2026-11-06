// Titles that sit in several libraries: the copies of a series are shown as one
// series (seasons and episodes of all copies), the copies of a film as versions.
import { ItemsService } from '../jellyfin/items.service.js';
import { getActiveCatalogReader } from '../catalog/reader.js';
import { getCatalogAccess } from '../catalog/visibility.js';

// The copies of `itemId` the user can see, first copy first; one entry (the
// item itself) when there are no others or the catalogue is not ready.
export async function copiesOf(userId, token, itemId) {
  const reader = getActiveCatalogReader();
  if (!reader) return [{ id: itemId }];
  const copies = reader.copiesOf(itemId, await getCatalogAccess(userId, token));
  return copies.length ? copies : [{ id: itemId }];
}

const byIndex = (a, b) => (a.IndexNumber ?? Infinity) - (b.IndexNumber ?? Infinity);
const episodeKey = (episode) => (Number.isInteger(episode.IndexNumber)
  ? `${episode.ParentIndexNumber ?? ''}:${episode.IndexNumber}`
  : `id:${episode.Id}`);
const sortEpisodes = (episodes) => episodes.sort((a, b) =>
  (a.ParentIndexNumber ?? Infinity) - (b.ParentIndexNumber ?? Infinity) || byIndex(a, b));

// Keeps the first entry per key: the copy listed first wins a clash.
function firstPerKey(lists, keyOf) {
  const byKey = new Map();
  for (const list of lists) {
    for (const entry of list) {
      const key = keyOf(entry);
      if (!byKey.has(key)) byKey.set(key, entry);
    }
  }
  return [...byKey.values()];
}

const seasonKey = (season) => (Number.isInteger(season.IndexNumber) ? `n:${season.IndexNumber}` : `id:${season.Id}`);

async function seasonsPerCopy(userId, token, copies) {
  return Promise.all(copies.map(copy => ItemsService.getSeasons(userId, token, copy.id)));
}

// One season per number across the copies, in order.
export async function getSeasons(userId, token, seriesId) {
  const copies = await copiesOf(userId, token, seriesId);
  if (copies.length < 2) return ItemsService.getSeasons(userId, token, seriesId);
  return firstPerKey(await seasonsPerCopy(userId, token, copies), seasonKey).sort(byIndex);
}

// The episodes of a season (or of the whole series without `seasonId`); a season
// that more than one copy holds yields the episodes of all of them, each number once.
export async function getEpisodes(userId, token, seriesId, seasonId = null) {
  const copies = await copiesOf(userId, token, seriesId);
  if (copies.length < 2) return ItemsService.getEpisodes(userId, token, seriesId, seasonId);

  if (!seasonId) {
    const lists = await Promise.all(copies.map(copy => ItemsService.getEpisodes(userId, token, copy.id)));
    return sortEpisodes(firstPerKey(lists, episodeKey));
  }

  const seasonLists = await seasonsPerCopy(userId, token, copies);
  const asked = seasonLists.flat().find(season => season.Id === seasonId);
  if (!asked) return ItemsService.getEpisodes(userId, token, seriesId, seasonId);

  const sameSeason = [];
  copies.forEach((copy, index) => {
    for (const season of seasonLists[index]) {
      if (seasonKey(season) === seasonKey(asked)) sameSeason.push({ seriesId: copy.id, seasonId: season.Id });
    }
  });
  const lists = await Promise.all(sameSeason.map(entry => ItemsService.getEpisodes(userId, token, entry.seriesId, entry.seasonId)));
  return sortEpisodes(firstPerKey(lists, episodeKey));
}

// Leaves out later copies of a title (lists from Jellyfin, like "similar
// titles", know nothing of the merge), keeping each title once.
export async function firstCopiesOnly(userId, token, items) {
  const kept = [];
  for (const item of items) {
    if (!['Movie', 'Series'].includes(item?.Type)) {
      kept.push(item);
      continue;
    }
    const copies = await copiesOf(userId, token, item.Id);
    if (copies[0].id === item.Id) kept.push(item);
  }
  return kept;
}
