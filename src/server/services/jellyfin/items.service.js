import { jellyfinJson } from './client.js';
import { COMMON_ITEM_FIELDS, DETAIL_ITEM_FIELDS } from './fields.js';

export class ItemsService {
  static async getItemDetails(userId, token, itemId) {
    return jellyfinJson(`/Users/${userId}/Items/${itemId}`, {
      token,
      query: { Fields: DETAIL_ITEM_FIELDS }
    });
  }

  static async getSimilarItems(userId, token, itemId) {
    const data = await jellyfinJson(`/Items/${itemId}/Similar`, {
      token,
      query: { userId, limit: 12, fields: COMMON_ITEM_FIELDS }
    });
    return data.Items || [];
  }

  static async getSeasons(userId, token, seriesId) {
    const data = await jellyfinJson(`/Shows/${seriesId}/Seasons`, {
      token,
      query: { userId, fields: COMMON_ITEM_FIELDS }
    });
    return data.Items || [];
  }

  static async getEpisodes(userId, token, seriesId, seasonId) {
    const query = { userId, fields: COMMON_ITEM_FIELDS };
    if (seasonId) query.seasonId = seasonId;

    const data = await jellyfinJson(`/Shows/${seriesId}/Episodes`, { token, query });
    return data.Items || [];
  }
}
