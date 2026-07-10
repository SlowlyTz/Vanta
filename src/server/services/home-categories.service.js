import { LibraryService } from './jellyfin/library.service.js';
import { getFeaturedPublishersFromStudios } from '../../public/js/constants/featuredPublishers.js';

const CATEGORY_LIMIT = 15;
const MAX_GENRES = 12;

export class HomeCategoriesService {
  static async getHomeCategories(userId, accessToken) {
    const [movieGenresRaw, seriesGenresRaw, studios] = await Promise.all([
      LibraryService.getGenres(userId, accessToken, 'Movie'),
      LibraryService.getGenres(userId, accessToken, 'Series'),
      LibraryService.getStudios(userId, accessToken)
    ]);

    const movieGenreCategories = await this._buildGenreCategories(
      userId,
      accessToken,
      'Movie',
      movieGenresRaw
    );

    const seriesGenreCategories = await this._buildGenreCategories(
      userId,
      accessToken,
      'Series',
      seriesGenresRaw
    );

    const publisherCategories = await this._buildPublisherCategories(
      userId,
      accessToken,
      studios
    );

    return {
      movieGenres: movieGenreCategories,
      seriesGenres: seriesGenreCategories,
      publishers: publisherCategories
    };
  }

  static async _buildGenreCategories(userId, accessToken, type, genres) {
    const categories = [];
    const selectedGenres = genres.slice(0, MAX_GENRES);

    for (const genre of selectedGenres) {
      try {
        const result = await LibraryService.getLibrary(
          userId,
          accessToken,
          type,
          genre.Name,
          null,
          1,
          CATEGORY_LIMIT
        );

        if (!result.items || result.items.length === 0) {
          continue;
        }

        categories.push({
          name: genre.Name,
          href: `#/genre/${type}/${encodeURIComponent(genre.Name)}`,
          items: result.items
        });
      } catch (error) {
        console.error(`[Home Categories] Failed to load ${type} genre "${genre.Name}":`, error.message);
      }
    }

    return categories;
  }

  static async _buildPublisherCategories(userId, accessToken, studios) {
    const featuredPublishers = getFeaturedPublishersFromStudios(studios);
    const categories = [];

    for (const publisher of featuredPublishers) {
      try {
        const result = await LibraryService.getLibraryByPublisher(
          userId,
          accessToken,
          'Movie,Series',
          publisher.id,
          null,
          1,
          CATEGORY_LIMIT
        );

        if (!result.items || result.items.length === 0) {
          continue;
        }

        categories.push({
          name: publisher.label,
          publisherId: publisher.id,
          href: `#/publisher-group/${encodeURIComponent(publisher.id)}`,
          items: result.items
        });
      } catch (error) {
        console.error(`[Home Categories] Failed to load publisher "${publisher.label}":`, error.message);
      }
    }

    return categories;
  }
}
