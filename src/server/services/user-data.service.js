// Per-user card data (progress, watched, next episode) for titles from the
// shared catalogue, fetched from Jellyfin in bundles.
import { jellyfinJson } from './jellyfin/client.js';
import { copiesOf } from './browse/title-copies.js';

const TTL_MS = 60 * 1000;
const MAX_IDS = 100;
const NEXT_UP_LIMIT = 200;
const MAX_CACHED_USERS = 500;

const ratio = (part, whole) => (whole > 0 ? Math.min(1, Math.max(0, part / whole)) : null);

const episodeCode = (episode) => {
  const season = episode?.ParentIndexNumber;
  const number = episode?.IndexNumber;
  return Number.isFinite(season) && Number.isFinite(number) ? `S${season} E${number}` : null;
};

// The per-user part of a card that the shared catalogue cannot know: how far
// a film or episode got, whether it was watched, and for a started series the
// next episode and how much of it was seen.
export function summarizeUserData(item, nextUpBySeries = new Map()) {
  const data = item.UserData || {};
  const summary = { played: data.Played === true, progress: null, next: null, seriesProgress: null };

  if (item.Type === 'Series') {
    const total = Number(item.RecursiveItemCount);
    const unplayed = Number(data.UnplayedItemCount);
    const watched = Number.isFinite(total) && Number.isFinite(unplayed) ? total - unplayed : 0;
    if (watched > 0) summary.seriesProgress = ratio(watched, total);
    // Jellyfin's "next up" also names the first episode of a series nobody
    // started; it counts once something of the series was watched.
    const next = nextUpBySeries.get(item.Id);
    const started = watched > 0 || Number(next?.UserData?.PlaybackPositionTicks) > 0 || Boolean(next?.UserData?.LastPlayedDate);
    if (next && started) summary.next = episodeCode(next);
    return summary;
  }

  const position = Number(data.PlaybackPositionTicks);
  const runtime = Number(item.RunTimeTicks);
  if (position > 0 && !summary.played) summary.progress = ratio(position, runtime);
  return summary;
}

// Bundled for the cards on screen; answers are kept a minute per user.
export function createUserDataService({ fetchJson = jellyfinJson, now = () => Date.now(), copies = copiesOf } = {}) {
  const cache = new Map(); // userId -> { at, byId: Map, nextUp: { at, map } }

  const userCache = (userId) => {
    let entry = cache.get(userId);
    if (!entry) {
      if (cache.size >= MAX_CACHED_USERS) cache.delete(cache.keys().next().value);
      entry = { byId: new Map(), nextUp: null };
      cache.set(userId, entry);
    }
    return entry;
  };

  const loadNextUp = async (userId, token, entry) => {
    if (entry.nextUp && now() - entry.nextUp.at < TTL_MS) return entry.nextUp.map;
    const data = await fetchJson('/Shows/NextUp', {
      token,
      query: { UserId: userId, Limit: NEXT_UP_LIMIT, EnableResumable: 'true', Fields: 'ParentId' }
    });
    const map = new Map((data.Items || []).filter(episode => episode.SeriesId).map(episode => [episode.SeriesId, episode]));
    entry.nextUp = { at: now(), map };
    return map;
  };

  // A series in several libraries counts as one: episodes and watched ones of
  // all copies add up, and the next episode is the first copy's that has one.
  const mergeSeriesCopies = async (userId, token, items, nextUp, fetchItems) => {
    const groups = new Map();
    for (const item of items) {
      if (item.Type !== 'Series') continue;
      const list = await copies(userId, token, item.Id);
      if (list.length > 1) groups.set(item.Id, list.map(copy => copy.id));
    }
    if (groups.size === 0) return items;

    const known = new Map(items.map(item => [item.Id, item]));
    const others = [...new Set([...groups.values()].flat())].filter(id => !known.has(id));
    for (const item of others.length ? await fetchItems(others) : []) known.set(item.Id, item);

    return items.map(item => {
      const ids = groups.get(item.Id);
      if (!ids) return item;
      const parts = ids.map(id => known.get(id)).filter(Boolean);
      const sum = (read) => parts.reduce((total, part) => total + (Number(read(part)) || 0), 0);
      const next = ids.map(id => nextUp.get(id)).find(Boolean);
      if (next) nextUp.set(item.Id, next);
      return {
        ...item,
        RecursiveItemCount: sum(part => part.RecursiveItemCount),
        UserData: {
          ...item.UserData,
          UnplayedItemCount: sum(part => part.UserData?.UnplayedItemCount),
          Played: parts.every(part => part.UserData?.Played === true)
        }
      };
    });
  };

  return {
    async forItems(userId, token, ids) {
      const wanted = [...new Set(ids)].filter(Boolean).slice(0, MAX_IDS);
      const entry = userCache(userId);
      const result = {};
      const missing = [];
      for (const id of wanted) {
        const cached = entry.byId.get(id);
        if (cached && now() - cached.at < TTL_MS) result[id] = cached.summary;
        else missing.push(id);
      }
      if (missing.length === 0) return result;

      const fetchItems = async (ids) => (await fetchJson(`/Users/${userId}/Items`, {
        token,
        query: { Ids: ids.join(','), Fields: 'RecursiveItemCount', EnableUserData: 'true', EnableImages: 'false' }
      })).Items || [];
      const items = await fetchItems(missing);
      const nextUp = items.some(item => item.Type === 'Series')
        ? await loadNextUp(userId, token, entry).catch(() => new Map())
        : new Map();
      const merged = await mergeSeriesCopies(userId, token, items, nextUp, fetchItems);
      for (const item of merged) {
        const summary = summarizeUserData(item, nextUp);
        entry.byId.set(item.Id, { at: now(), summary });
        result[item.Id] = summary;
      }
      return result;
    },

    // After playback the next look must not get the minute-old state.
    forget(userId) {
      cache.delete(userId);
    }
  };
}

export const UserDataService = createUserDataService();
