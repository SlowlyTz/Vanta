import { LibraryService } from './jellyfin/library.service.js';
import { TmdbService } from './tmdb.service.js';
import { getFeaturedPublishersFromStudios } from '../../public/js/constants/featuredPublishers.js';

const SECTION_LIMIT = 20;
const HERO_LIMIT = 8;
const INDEX_LIMIT = 2000;
const INDEX_CACHE_TTL = 30 * 1000;

const FEATURED_SECTIONS = [
  { type: 'featured', title: 'Top 5 Filme & Serien der letzten 20 Tage', source: 'trending', cardSize: 'large' },
  { type: 'featured', title: 'Aktuell beliebt', source: 'popular', cardSize: 'large' }
];

const indexCache = new Map();

function normalizeGenre(name) {
  return name
    .toLowerCase()
    .replace(/[\s\-_.]+/g, ' ')
    .trim();
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[\s\-_.!?,:;]+/g, ' ')
    .trim();
}

function getItemYear(item) {
  const date = item.PremiereDate || item.ProductionYear || item.DateCreated;
  if (!date) return null;
  const year = String(date).slice(0, 4);
  return /^\d{4}$/.test(year) ? parseInt(year, 10) : null;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sortByNewest(items) {
  return [...items].sort((a, b) => {
    const yearA = getItemYear(a) || 0;
    const yearB = getItemYear(b) || 0;
    if (yearB !== yearA) return yearB - yearA;
    return (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || '');
  });
}

export class HomeSectionsService {
  static async getHomeCore(userId, accessToken) {
    const [resume, movies, series] = await Promise.all([
      LibraryService.getResumeItems(userId, accessToken),
      LibraryService.getMovies(userId, accessToken),
      LibraryService.getSeries(userId, accessToken)
    ]);

    return {
      hero: shuffleArray([...movies, ...series]).slice(0, HERO_LIMIT),
      resume
    };
  }

  static async getHomeSections(userId, accessToken) {
    try {
      const [core, allIndexItems] = await Promise.all([
        this.getHomeCore(userId, accessToken),
        this._buildIndex(userId, accessToken)
      ]);

      const [standardSections, publisherSections, featuredSections, nowPlayingSection] = await Promise.all([
        this._buildGenreSections(userId, accessToken, allIndexItems),
        this._buildPublisherSections(userId, accessToken),
        this._buildFeaturedSections(allIndexItems),
        this._buildNowPlayingSection(allIndexItems)
      ]);

      const sections = [
        nowPlayingSection,
        ...this._arrangeSections(standardSections, publisherSections, featuredSections)
      ];

      return {
        hero: core.hero,
        resume: core.resume,
        sections
      };
    } catch (error) {
      console.error('[HomeSectionsService] Failed to build home sections:', error);
      throw error;
    }
  }

  static async getHomeSectionGroup(userId, accessToken, group) {
    if (group === 'now-playing') {
      const items = await this._buildIndex(userId, accessToken);
      return [await this._buildNowPlayingSection(items)];
    }

    if (group === 'genres') {
      const items = await this._buildIndex(userId, accessToken);
      return this._buildGenreSections(userId, accessToken, items);
    }

    if (group === 'featured') {
      const items = await this._buildIndex(userId, accessToken);
      return this._buildFeaturedSections(items);
    }

    if (group === 'publishers') {
      return this._buildPublisherSections(userId, accessToken);
    }

    const error = new Error(`Unknown home section group: ${group}`);
    error.status = 400;
    throw error;
  }

  static async _buildIndex(userId, accessToken) {
    const cacheKey = String(userId);
    const cached = indexCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < INDEX_CACHE_TTL) {
      return cached.promise;
    }

    const promise = LibraryService.getAllMoviesAndSeries(userId, accessToken, INDEX_LIMIT)
      .catch(error => {
        indexCache.delete(cacheKey);
        throw error;
      });

    indexCache.set(cacheKey, { timestamp: Date.now(), promise });
    return promise;
  }

  static _buildItemIndexes(items) {
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

  static async _buildGenreSections(userId, accessToken, items) {
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
        href: `#/genre/${encodeURIComponent(genre.label)}`,
        items: sortedItems
      });
    }

    return shuffleArray(sections);
  }

  static async _getGenresSafe(userId, accessToken, type) {
    try {
      return await LibraryService.getGenres(userId, accessToken, type);
    } catch (error) {
      console.error(`[HomeSectionsService] Failed to load ${type} genres:`, error.message);
      return [];
    }
  }

  static async _buildPublisherSections(userId, accessToken) {
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

  static async _buildNowPlayingSection(items) {
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
  }

  static async _buildFeaturedSections(items) {
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
  }

  static _matchTmdbItems(tmdbItems, indexes, limit) {
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
  }

  static _findJellyfinMatch(tmdbItem, indexes) {
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

  static _arrangeSections(standardSections, publisherSections, featuredSections) {
    const allNormal = shuffleArray([...standardSections, ...publisherSections]);
    const featured = shuffleArray([...featuredSections]);

    const result = [];
    let normalIndex = 0;
    let featuredIndex = 0;

    while (normalIndex < allNormal.length || featuredIndex < featured.length) {
      const blockSize = 2 + Math.floor(Math.random() * 2);

      for (let i = 0; i < blockSize && normalIndex < allNormal.length; i++) {
        result.push(allNormal[normalIndex++]);
      }

      if (featuredIndex < featured.length) {
        result.push(featured[featuredIndex++]);
      }
    }

    while (normalIndex < allNormal.length) {
      result.push(allNormal[normalIndex++]);
    }

    return result;
  }
}
