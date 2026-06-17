import { LibraryService } from './jellyfin/library.service.js';
import { ItemsService } from './jellyfin/items.service.js';

class JellyfinCrossCheck {
  static async checkMediaExists(userId, token, tmdbMedia) {
    const title = tmdbMedia.title || tmdbMedia.name;
    if (!title) return { exists: false, jellyfinItems: [] };

    try {
      const items = await LibraryService.search(userId, token, title);
      const exact = items.filter(item =>
        (item.Name || '').toLowerCase() === title.toLowerCase()
      );

      if (exact.length > 0) {
        return { exists: true, jellyfinItems: exact };
      }

      return { exists: false, jellyfinItems: [] };
    } catch {
      return { exists: false, jellyfinItems: [] };
    }
  }

  static async checkSeriesSeasons(userId, token, jellyfinSeriesId, tmdbSeasons) {
    try {
      const jellyfinSeasons = await ItemsService.getSeasons(userId, token, jellyfinSeriesId);
      const existingSeasons = new Map();
      for (const s of jellyfinSeasons) {
        existingSeasons.set(s.IndexNumber, s);
      }

      const results = [];
      for (const tmdbS of tmdbSeasons) {
        const seasonNumber = tmdbS.season_number;
        if (seasonNumber === 0) {
          results.push({
            season_number,
            name: tmdbS.name,
            exists: false,
            reason: 'special',
            episode_count: tmdbS.episode_count,
          });
          continue;
        }
        const exists = existingSeasons.has(seasonNumber);
        results.push({
          season_number,
          name: tmdbS.name,
          exists,
          jellyfin_season_id: exists ? existingSeasons.get(seasonNumber).Id : null,
          episode_count: tmdbS.episode_count,
        });
      }

      return results;
    } catch {
      return [];
    }
  }
}

export { JellyfinCrossCheck };