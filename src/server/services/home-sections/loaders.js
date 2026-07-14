import { LibraryService } from '../jellyfin/library.service.js';
import { TmdbService } from '../tmdb.service.js';
import { getFeaturedPublishersFromStudios } from '../../../public/js/constants/featuredPublishers.js';
import { normalizeGenre, normalizeTitle, getItemYear, shuffleArray, sortByNewest, buildGenreHref } from './normalizers.js';

const SECTION_LIMIT = 20;

const FEATURED_SECTIONS = [
  { type: 'featured', title: 'Top 5 Filme & Serien der letzten 20 Tage', source: 'trending', cardSize: 'large' },
  { type: 'featured', title: 'Aktuell beliebt', source: 'popular', cardSize: 'large' }
];

export const loaderMethods = {
  _buildItemIndexes(items) {
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
  },

  async _buildGenreSections(userId, accessToken, items) {
    const movieGenres = await this._getGenresSafe(userId, accessToken, 'Movie');
    const seriesGenres = await this._getGenresSafe(userId, accessToken, 'Series');

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

      if (genreItems.length === 0) continue;

      const sortedItems = sortByNewest(genreItems).slice(0, SECTION_LIMIT);

      sections.push({
        type: 'standard',
        title: genre.label,
        href: buildGenreHref(genre),
        items: sortedItems
      });
    }

    return shuffleArray(sections);
  },

  async _getGenresSafe(userId, accessToken, type) {
    try {
      return await LibraryService.getGenres(userId, accessToken, type);
    } catch (error) {
      console.error(`[HomeSectionsService] Failed to load ${type} genres:`, error.message);
      return [];
    }
  },

  async _buildPublisherSections(userId, accessToken) {
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
  },

  async _buildNowPlayingSection(items) {
    const indexes = this._buildItemIndexes(items);

    try {
      const tmdbItems = await TmdbService.getNowPlaying(60, process.env.TMDB_REGION || 'DE');
      const matchedItems = this._matchTmdbItems(tmdbItems, indexes, SECTION_LIMIT);

      return {
        type: 'standard',
        title: 'Jetzt im Kino',
        href: '#/movies',
        items: matchedItems,
        emptyMessage: 'Keine aktuellen Kinofilme in deiner Mediathek.'
      };
    } catch (error) {
      console.error('[HomeSectionsService] Failed to build now playing section:', error.message);
      return {
        type: 'standard',
        title: 'Jetzt im Kino',
        href: '#/movies',
        items: [],
        emptyMessage: 'Aktuelle Kinofilme konnten gerade nicht geprüft werden.'
      };
    }
  },

  async _buildFeaturedSections(items) {
    const indexes = this._buildItemIndexes(items);
    const sections = [];

    for (const featuredDef of FEATURED_SECTIONS) {
      try {
        let tmdbItems = [];
        if (featuredDef.source === 'trending') {
          tmdbItems = await TmdbService.getTrending('week', 20);
        } else if (featuredDef.source === 'popular') {
          tmdbItems = await TmdbService.getPopular(20);
        }

        const matchedItems = this._matchTmdbItems(tmdbItems, indexes, 5);

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
  },

  _matchTmdbItems(tmdbItems, indexes, limit) {
    const matched = [];
    const seenIds = new Set();

    for (const tmdbItem of tmdbItems) {
      if (matched.length >= limit) break;

      const item = this._findJellyfinMatch(tmdbItem, indexes);
      if (item && !seenIds.has(item.Id)) {
        seenIds.add(item.Id);
        matched.push(item);
      }
    }

    return matched;
  },

  _findJellyfinMatch(tmdbItem, indexes) {
    const { byTmdbId, byImdbId, byTitleYear } = indexes;

    if (tmdbItem.id) {
      const tmdbMatch = byTmdbId.get(String(tmdbItem.id));
      if (tmdbMatch) return tmdbMatch;
    }

    if (tmdbItem.imdbId) {
      const imdbMatch = byImdbId.get(String(tmdbItem.imdbId).toLowerCase());
      if (imdbMatch) return imdbMatch;
    }

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
};
