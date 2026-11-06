// Real duplicates for the admin: a film held more than once, or an episode a
// series has in more than one library. Seasons split across libraries (season
// 1 here, season 2 there) are merged for viewers and are no duplicate. Files
// with the same provider id but another runtime are listed as `mismatch`:
// most likely Jellyfin identified one of them as the wrong film.
import path from 'path';
import env from '../config/env.js';
import { jellyfinJson } from './jellyfin/client.js';
import { getActiveCatalogReader } from './catalog/reader.js';
import { summarizeMedia } from './browse/media-summary.js';

const FILE_FIELDS = 'Path,MediaSources,DateCreated';
const ID_BATCH = 100;

// What the admin needs to find the file: where it lies and what it is.
export function describeFile(item, copy) {
  const filePath = item.MediaSources?.[0]?.Path || item.Path || null;
  const media = summarizeMedia(item) || {};
  return {
    itemId: item.Id,
    libraryName: copy?.libraryName || null,
    path: filePath,
    fileName: filePath ? path.basename(filePath.replace(/\\/g, '/')) : null,
    folder: filePath ? path.dirname(filePath.replace(/\\/g, '/')) : null,
    size: media.size ?? null,
    container: media.container ?? null,
    resolution: media.resolution ?? null,
    dynamicRange: media.dynamicRange ?? null,
    videoCodec: media.videoCodec ?? null,
    audio: media.audio ?? null,
    audioLanguages: media.audioLanguages || [],
    subtitleLanguages: media.subtitleLanguages || [],
    runtimeMinutes: Number(item.RunTimeTicks) > 0 ? Math.round(Number(item.RunTimeTicks) / 600_000_000) : null,
    addedAt: item.DateCreated || null
  };
}

const episodeKey = (episode) => (Number.isInteger(episode.ParentIndexNumber) && Number.isInteger(episode.IndexNumber)
  ? `${episode.ParentIndexNumber}:${episode.IndexNumber}`
  : null);

// Recomputed when the catalogue changed (its title groups differ) or after
// `ttlMs`, so files moved in Jellyfin show up without a catalogue run.
export function createDuplicateFinder({
  reader = getActiveCatalogReader,
  fetchJson = jellyfinJson,
  apiKey = env.JELLYFIN_API_KEY,
  now = () => Date.now(),
  ttlMs = 30 * 60 * 1000,
  log = console
} = {}) {
  let cached = null;
  let running = null;

  const request = (pathName, query) => fetchJson(pathName, { token: apiKey, query, timeoutMs: 60 * 1000 });

  const itemsByIds = async (ids) => {
    const items = [];
    for (let i = 0; i < ids.length; i += ID_BATCH) {
      const page = await request('/Items', { Ids: ids.slice(i, i + ID_BATCH).join(','), Fields: FILE_FIELDS });
      items.push(...(page.Items || []));
    }
    return items;
  };

  const movieDuplicates = async (groups) => {
    const items = new Map((await itemsByIds(groups.flatMap(group => group.copies.map(copy => copy.id)))).map(item => [item.Id, item]));
    return groups.map(group => ({
      key: group.key,
      type: 'Movie',
      mismatch: group.mismatch === true,
      name: group.name,
      year: group.year,
      files: group.copies.filter(copy => items.has(copy.id)).map(copy => describeFile(items.get(copy.id), copy))
    })).filter(entry => entry.files.length > 1);
  };

  const seriesDuplicates = async (group) => {
    const episodesPerCopy = await Promise.all(group.copies.map(copy => request('/Items', {
      ParentId: copy.id,
      Recursive: 'true',
      IncludeItemTypes: 'Episode',
      Fields: FILE_FIELDS
    }).then(page => page.Items || [])));

    const byEpisode = new Map();
    group.copies.forEach((copy, index) => {
      for (const episode of episodesPerCopy[index]) {
        const key = episodeKey(episode);
        if (!key) continue;
        if (!byEpisode.has(key)) byEpisode.set(key, { season: episode.ParentIndexNumber, episode: episode.IndexNumber, name: episode.Name || null, files: [] });
        byEpisode.get(key).files.push(describeFile(episode, copy));
      }
    });

    const episodes = [...byEpisode.values()]
      .filter(entry => entry.files.length > 1)
      .sort((a, b) => a.season - b.season || a.episode - b.episode);
    if (episodes.length === 0) return null;
    return {
      key: group.key,
      type: 'Series',
      mismatch: false,
      name: group.name,
      year: group.year,
      seasons: [...new Set(episodes.map(entry => entry.season))],
      episodes
    };
  };

  const compute = async () => {
    const catalog = reader();
    if (!catalog) return null;
    const groups = catalog.titleGroups();
    const signature = groups.map(group => `${group.key}=${group.copies.map(copy => copy.id).join('+')}`).join('|');
    if (cached && cached.signature === signature && now() - cached.at < ttlMs) return cached.result;

    const movies = await movieDuplicates(groups.filter(group => group.type === 'Movie'));
    const series = [];
    for (const group of groups.filter(entry => entry.type === 'Series')) {
      const found = await seriesDuplicates(group).catch(error => {
        log.warn?.(`[Duplicates] could not check "${group.name}": ${error.message}`);
        return null;
      });
      if (found) series.push(found);
    }
    const result = { checkedAt: now(), items: [...movies, ...series] };
    cached = { signature, at: now(), result };
    return result;
  };

  return {
    // The full list; one check at a time, later callers share it.
    async list() {
      if (!running) running = compute().finally(() => { running = null; });
      return running;
    },

    // How many titles have duplicates, without waiting: the last check's
    // answer (null before the first), while a new check runs if one is due.
    count() {
      if (!running) this.list().catch(error => log.warn?.(`[Duplicates] check failed: ${error.message}`));
      return cached?.result?.items.length ?? null;
    }
  };
}

export const DuplicateFinder = createDuplicateFinder();
