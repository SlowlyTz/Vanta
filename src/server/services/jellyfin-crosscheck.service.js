import { LibraryService } from './jellyfin/library.service.js';
import { ItemsService } from './jellyfin/items.service.js';

const JELLYFIN_TYPE_BY_TMDB_TYPE = { movie: 'Movie', tv: 'Series' };
// Regional premiere dates routinely differ from TMDB's release date by a year.
const YEAR_TOLERANCE = 1;

const noMatch = () => ({ exists: false, jellyfinItems: [], jellyfinItemId: null });

const normalizeTitle = (title) => String(title ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const getYear = (value) => {
  const year = String(value ?? '').slice(0, 4);
  return /^\d{4}$/.test(year) ? Number(year) : null;
};

const getTmdbTitle = (tmdbMedia) => tmdbMedia.title || tmdbMedia.name;

const getTmdbYear = (tmdbMedia) => getYear(tmdbMedia.release_date || tmdbMedia.first_air_date);

const getItemYear = (item) => getYear(item.PremiereDate) ?? getYear(item.ProductionYear);

const toJellyfinType = (value) => JELLYFIN_TYPE_BY_TMDB_TYPE[String(value ?? '').toLowerCase()] || null;

// Each candidate is looked up on its own: a truthy but unmapped type must fall
// through to the next source rather than resolving to "no type known".
const getJellyfinType = (tmdbMedia, tmdbType) =>
  toJellyfinType(tmdbType) || toJellyfinType(tmdbMedia.media_type) || toJellyfinType(tmdbMedia.tmdb_type);

// Provider ids beat titles: a Jellyfin search hits on the title alone, so "Dune" the movie
// and "Dune" the series look identical without them. Falls back to title plus release year;
// a same-title item with a known, conflicting year is a different work and is rejected.
const findBestMatch = (items, tmdbMedia) => {
  const tmdbId = tmdbMedia.id ?? tmdbMedia.tmdb_id;
  if (tmdbId) {
    const byTmdbId = items.find(
      item => item.ProviderIds?.Tmdb && String(item.ProviderIds.Tmdb) === String(tmdbId)
    );
    if (byTmdbId) return byTmdbId;
  }

  const imdbId = tmdbMedia.imdb_id || tmdbMedia.external_ids?.imdb_id;
  if (imdbId) {
    const byImdbId = items.find(
      item => item.ProviderIds?.Imdb
        && String(item.ProviderIds.Imdb).toLowerCase() === String(imdbId).toLowerCase()
    );
    if (byImdbId) return byImdbId;
  }

  const title = normalizeTitle(getTmdbTitle(tmdbMedia));
  if (!title) return null;

  const byTitle = items.filter(item => normalizeTitle(item.Name) === title);
  if (byTitle.length === 0) return null;

  const tmdbYear = getTmdbYear(tmdbMedia);
  if (!tmdbYear) return byTitle[0];

  const exact = byTitle.find(item => getItemYear(item) === tmdbYear);
  if (exact) return exact;

  const near = byTitle.find(item => {
    const year = getItemYear(item);
    return year !== null && Math.abs(year - tmdbYear) <= YEAR_TOLERANCE;
  });
  if (near) return near;

  return byTitle.find(item => getItemYear(item) === null) || null;
};

class JellyfinCrossCheck {
  static async checkMediaExists(userId, token, tmdbMedia, tmdbType) {
    const title = getTmdbTitle(tmdbMedia);
    if (!title) return noMatch();

    try {
      const jellyfinType = getJellyfinType(tmdbMedia, tmdbType);
      // Without a type a movie and a series of the same name are indistinguishable,
      // which is the bug this filter exists to prevent — so fail closed.
      if (!jellyfinType) return noMatch();

      const items = await LibraryService.search(userId, token, title);
      const match = findBestMatch(items.filter(item => item.Type === jellyfinType), tmdbMedia);

      if (!match) return noMatch();

      return { exists: true, jellyfinItems: [match], jellyfinItemId: match.Id ?? null };
    } catch (error) {
      console.error(`[JellyfinCrossCheck] Failed to check "${title}":`, error.message);
      return noMatch();
    }
  }

  static async checkSeriesSeasons(userId, token, jellyfinSeriesId, tmdbSeasons) {
    try {
      const jellyfinSeasons = await ItemsService.getSeasons(userId, token, jellyfinSeriesId);
      const existingSeasons = new Map();
      for (const s of jellyfinSeasons) {
        existingSeasons.set(s.IndexNumber, s);
      }

      // One shape for every season, specials included: reporting them as missing
      // would put them on the "can be requested" pile. `requestable` carries that
      // policy so callers do not have to re-derive it.
      return tmdbSeasons.map(tmdbS => {
        const seasonNumber = tmdbS.season_number;
        const exists = existingSeasons.has(seasonNumber);
        const isSpecial = seasonNumber === 0;

        return {
          season_number: seasonNumber,
          name: tmdbS.name,
          exists,
          jellyfin_season_id: exists ? existingSeasons.get(seasonNumber).Id : null,
          episode_count: tmdbS.episode_count,
          requestable: !isSpecial && !exists,
          ...(isSpecial ? { reason: 'special' } : {})
        };
      });
    } catch (error) {
      console.error(`[JellyfinCrossCheck] Failed to check seasons of ${jellyfinSeriesId}:`, error.message);
      return [];
    }
  }
}

export { JellyfinCrossCheck };
