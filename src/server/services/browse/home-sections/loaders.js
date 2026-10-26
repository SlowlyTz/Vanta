// Builders for the home page rows: genres, publishers, now playing and TMDB-featured titles.
import env from '../../../config/env.js';
import { LibraryService } from '../library.service.js';
import { TmdbService } from '../../tmdb.service.js';
import { getFeaturedPublishersFromStudios } from '../../../../public/js/shared/featuredPublishers.js';
import { normalizeGenre, normalizeTitle, getItemYear, shuffleArray, sortByNewest, buildGenreHref } from './normalizers.js';
import { genreLabel } from '../../../../public/js/shared/genreLabels.js';

const MIN_GENRE_ROW_ITEMS = 4;

const SECTION_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

// "Jetzt im Kino": TMDB's now-playing list includes re-releases of old films, so only
// recent or upcoming releases count (four months leaves room for a later German start),
// matched by TMDB/IMDb id only and never to a library entry years older than the release.
export const NOW_PLAYING_MAX_AGE_DAYS = 120;
export const NOW_PLAYING_MAX_AHEAD_DAYS = 60;

export function isCurrentRelease(releaseDate, now = Date.now()) {
  const released = Date.parse(String(releaseDate || ''));
  if (!Number.isFinite(released)) return false;
  return released >= now - NOW_PLAYING_MAX_AGE_DAYS * DAY_MS && released <= now + NOW_PLAYING_MAX_AHEAD_DAYS * DAY_MS;
}

const FEATURED_SECTIONS = [
  { type: 'featured', title: 'Top 5 Filme & Serien der letzten 20 Tage', source: 'trending', cardSize: 'large' },
  { type: 'featured', title: 'Aktuell beliebt', source: 'popular', cardSize: 'large' }
];

export function buildItemIndexes(items) {
  const byTmdbId = new Map();
  const byImdbId = new Map();
  const byTitleYear = new Map();

  for (const item of items) {
    const providerIds = item.ProviderIds || {};
    const tmdbId = providerIds.Tmdb;
    const imdbId = providerIds.Imdb;

    if (tmdbId) {
      const key = String(tmdbId);
      if (!byTmdbId.has(key)) byTmdbId.set(key, item);
    }

    if (imdbId) {
      const key = String(imdbId).toLowerCase();
      if (!byImdbId.has(key)) byImdbId.set(key, item);
    }

    const normalizedTitle = normalizeTitle(item.Name || '');
    const year = getItemYear(item);
    const titleYearKey = year ? `${normalizedTitle}|${year}` : normalizedTitle;
    if (!byTitleYear.has(titleYearKey)) byTitleYear.set(titleYearKey, item);
  }

  return { byTmdbId, byImdbId, byTitleYear };
}

export async function buildGenreSections(userId, accessToken, items) {
  const movieGenres = await getGenresSafe(userId, accessToken, 'Movie');
  const seriesGenres = await getGenresSafe(userId, accessToken, 'Series');

  const genreMap = new Map();

  for (const genre of movieGenres) {
    const key = normalizeGenre(genre.Name);
    genreMap.set(key, { key, label: genre.Name, movieName: genre.Name, seriesName: null });
  }

  for (const genre of seriesGenres) {
    const key = normalizeGenre(genre.Name);
    const existing = genreMap.get(key);
    if (existing) {
      existing.seriesName = genre.Name;
    } else {
      genreMap.set(key, { key, label: genre.Name, movieName: null, seriesName: genre.Name });
    }
  }

  const sections = [];

  for (const genre of genreMap.values()) {
    const genreItems = items.filter(item => {
      const itemGenres = (item.Genres || []).map(g => normalizeGenre(g));
      return itemGenres.includes(genre.key);
    });

    // A row of one or two titles looks broken on the home page.
    if (genreItems.length < MIN_GENRE_ROW_ITEMS) continue;

    const sortedItems = sortByNewest(genreItems).slice(0, SECTION_LIMIT);

    sections.push({
      type: 'standard',
      title: genreLabel(genre.label),
      href: buildGenreHref(genre),
      items: sortedItems
    });
  }

  return shuffleArray(sections);
}

export async function getGenresSafe(userId, accessToken, type) {
  try {
    return await LibraryService.getGenres(userId, accessToken, type);
  } catch (error) {
    console.error(`[HomeSectionsService] Failed to load ${type} genres:`, error.message);
    return [];
  }
}

export async function buildPublisherSections(userId, accessToken) {
  try {
    const studios = await LibraryService.getStudios(userId, accessToken);
    const featured = getFeaturedPublishersFromStudios(studios);

    const sections = await Promise.all(featured.map(async publisher => {
      const result = await LibraryService.getLibraryByStudioNames(
        userId,
        accessToken,
        'Movie,Series',
        publisher.studioNames,
        null,
        1,
        SECTION_LIMIT
      );

      if (!result.items || result.items.length === 0) return null;

      return {
        type: 'standard',
        title: publisher.label,
        href: `#/publisher-group/${encodeURIComponent(publisher.id)}`,
        items: sortByNewest(result.items)
      };
    }));

    return shuffleArray(sections.filter(Boolean));
  } catch (error) {
    console.error('[HomeSectionsService] Failed to build publisher sections:', error.message);
    return [];
  }
}

// Without a current film in the library the section comes back empty and
// without a message, so the home page leaves it out.
export async function buildNowPlayingSection(items, { now = Date.now() } = {}) {
  const indexes = buildItemIndexes(items);
  const section = { type: 'standard', title: 'Jetzt im Kino', href: '#/movies', items: [] };

  try {
    const tmdbItems = await TmdbService.getNowPlaying(60, env.TMDB_REGION);
    const seen = new Set();
    for (const tmdbItem of tmdbItems) {
      if (section.items.length >= SECTION_LIMIT) break;
      if (!isCurrentRelease(tmdbItem.releaseDate, now)) continue;
      const item = findJellyfinMatch(tmdbItem, indexes, { byIdOnly: true });
      if (!item || seen.has(item.Id)) continue;
      const year = getItemYear(item);
      if (year !== null && year < new Date(tmdbItem.releaseDate).getFullYear() - 1) continue;
      seen.add(item.Id);
      section.items.push(item);
    }
  } catch (error) {
    console.error('[HomeSectionsService] Failed to build now playing section:', error.message);
  }

  return section;
}

export async function buildFeaturedSections(items) {
  const indexes = buildItemIndexes(items);
  const sections = [];

  for (const featuredDef of FEATURED_SECTIONS) {
    try {
      let tmdbItems = [];
      if (featuredDef.source === 'trending') {
        tmdbItems = await TmdbService.getTrending('week', 20);
      } else if (featuredDef.source === 'popular') {
        tmdbItems = await TmdbService.getPopular(20);
      }

      const matchedItems = matchTmdbItems(tmdbItems, indexes, 5);

      if (matchedItems.length === 0) continue;

      sections.push({
        type: 'featured',
        title: featuredDef.title,
        items: matchedItems,
        cardSize: featuredDef.cardSize
      });
    } catch (error) {
      console.error(`[HomeSectionsService] Failed to build featured section "${featuredDef.title}":`, error.message);
    }
  }

  return sections;
}

export function matchTmdbItems(tmdbItems, indexes, limit) {
  const matched = [];
  const seenIds = new Set();

  for (const tmdbItem of tmdbItems) {
    if (matched.length >= limit) break;

    const item = findJellyfinMatch(tmdbItem, indexes);
    if (item && !seenIds.has(item.Id)) {
      seenIds.add(item.Id);
      matched.push(item);
    }
  }

  return matched;
}

export function findJellyfinMatch(tmdbItem, indexes, { byIdOnly = false } = {}) {
  const { byTmdbId, byImdbId, byTitleYear } = indexes;

  if (tmdbItem.id) {
    const tmdbMatch = byTmdbId.get(String(tmdbItem.id));
    if (tmdbMatch) return tmdbMatch;
  }

  if (tmdbItem.imdbId) {
    const imdbMatch = byImdbId.get(String(tmdbItem.imdbId).toLowerCase());
    if (imdbMatch) return imdbMatch;
  }

  if (byIdOnly) return null;

  const normalizedTitle = normalizeTitle(tmdbItem.title || tmdbItem.originalTitle || '');
  if (!normalizedTitle) return null;

  if (tmdbItem.releaseDate) {
    const year = parseInt(String(tmdbItem.releaseDate).slice(0, 4), 10);
    if (!isNaN(year)) {
      const titleYearMatch = byTitleYear.get(`${normalizedTitle}|${year}`);
      if (titleYearMatch) return titleYearMatch;
    }
  }

  const titleMatch = byTitleYear.get(normalizedTitle);
  if (titleMatch) return titleMatch;

  return null;
}
