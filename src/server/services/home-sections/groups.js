import { LibraryService } from '../jellyfin/library.service.js';
import { shuffleArray } from './normalizers.js';

const HERO_LIMIT = 8;

export const groupMethods = {
  async getHomeCore(userId, accessToken) {
    const [resume, movies, series] = await Promise.all([
      LibraryService.getResumeItems(userId, accessToken),
      LibraryService.getMovies(userId, accessToken),
      LibraryService.getSeries(userId, accessToken)
    ]);

    return {
      hero: shuffleArray([...movies, ...series]).slice(0, HERO_LIMIT),
      resume
    };
  },

  async getHomeSections(userId, accessToken) {
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
  },

  async getHomeSectionGroup(userId, accessToken, group) {
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
  },

  _arrangeSections(standardSections, publisherSections, featuredSections) {
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
};
