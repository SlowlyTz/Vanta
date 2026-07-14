import { ItemsService } from '../jellyfin/items.service.js';
import { LibraryService } from '../jellyfin/library.service.js';
import { badRequest } from './errors.js';
import { shuffle } from './helpers.js';

export const publicApiMethods = {
  async resolvePlayableItemId({ userId, accessToken, item }) {
    if (item.Type === 'Movie' || item.Type === 'Episode') {
      return item.Id;
    }

    if (item.Type === 'Series') {
      const seasons = await ItemsService.getSeasons(userId, accessToken, item.Id);
      if (!seasons?.length) throw badRequest('Keine Staffeln für diese Serie gefunden.');
      const episodes = await ItemsService.getEpisodes(userId, accessToken, item.Id, seasons[0].Id);
      if (!episodes?.length) throw badRequest('Keine Episoden in der ersten Staffel gefunden.');
      const nextEpisode = episodes.find(episode => episode.UserData && !episode.UserData.Played);
      return (nextEpisode || episodes[0]).Id;
    }

    if (item.Type === 'Season') {
      if (!item.SeriesId) throw badRequest('Hauptserien-ID konnte nicht ermittelt werden.');
      const episodes = await ItemsService.getEpisodes(userId, accessToken, item.SeriesId, item.Id);
      if (!episodes?.length) throw badRequest('Keine Episoden in dieser Staffel gefunden.');
      const nextEpisode = episodes.find(episode => episode.UserData && !episode.UserData.Played);
      return (nextEpisode || episodes[0]).Id;
    }

    throw badRequest(`Medientyp "${item.Type}" kann nicht in einer Watch Party abgespielt werden.`);
  },

  async assertCanAccessItem({ userId, accessToken, itemId }) {
    try {
      await ItemsService.getItemDetails(userId, accessToken, itemId);
    } catch (error) {
      const wrapped = new Error('Du hast keinen Zugriff auf diesen Inhalt');
      wrapped.status = 403;
      wrapped.cause = error;
      throw wrapped;
    }
  },

  serializeSelectableItem(item) {
    return {
      Id: item.Id,
      Name: item.Name,
      Type: item.Type,
      ProductionYear: item.ProductionYear || null,
      ImageTags: item.ImageTags || {},
      PrimaryImageTag: item.ImageTags?.Primary || null
    };
  },

  async getSuggestions({ userId, accessToken, limit = 18 }) {
    const [movies, series] = await Promise.all([
      LibraryService.getMovies(userId, accessToken),
      LibraryService.getSeries(userId, accessToken)
    ]);

    return shuffle([...(movies || []), ...(series || [])])
      .slice(0, limit)
      .map(item => this.serializeSelectableItem(item));
  }
};
