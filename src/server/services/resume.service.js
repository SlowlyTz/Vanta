import db from '../db/database.js';
import { jellyfinJson } from './jellyfin/client.js';
import { COMMON_ITEM_FIELDS } from './jellyfin/fields.js';
import { setResumeFilter } from './resume-visibility.js';

const listHidden = db.prepare('SELECT series_id, hidden_at FROM resume_hidden WHERE user_id = ?');
const hideSeries = db.prepare(`
  INSERT INTO resume_hidden (user_id, series_id, hidden_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id, series_id) DO UPDATE SET hidden_at = excluded.hidden_at
`);
const unhideSeries = db.prepare('DELETE FROM resume_hidden WHERE user_id = ? AND series_id = ?');

const fail = (status, message) => Object.assign(new Error(message), { status });

const seriesIdOf = (item) => (item?.Type === 'Series' ? item.Id : item?.SeriesId || null);

// "Weiter schauen" beyond what Jellyfin offers: the episode to continue a
// series with, and taking a title out of the row (with undo).
export function createResumeService({ fetchJson = jellyfinJson, now = () => Date.now() } = {}) {
  const setPosition = (userId, token, itemId, positionTicks) => fetchJson(`/UserItems/${itemId}/UserData`, {
    token,
    method: 'POST',
    query: { userId },
    body: { PlaybackPositionTicks: positionTicks }
  });

  return {
    // The started or next episode of a series (Jellyfin's "next up").
    async nextUp(userId, token, seriesId) {
      const data = await fetchJson('/Shows/NextUp', {
        token,
        query: { SeriesId: seriesId, UserId: userId, Limit: 1, EnableResumable: 'true', Fields: COMMON_ITEM_FIELDS }
      });
      return data.Items?.[0] || null;
    },

    // A film loses its position; a series (or an episode of one) is hidden
    // until it is watched again. Answers what undo needs.
    async remove(userId, token, itemId) {
      let item;
      try {
        item = await fetchJson(`/Users/${userId}/Items/${itemId}`, { token });
      } catch (error) {
        if (error.status === 404 || error.status === 400) throw fail(404, 'Titel nicht gefunden');
        throw error;
      }
      const seriesId = seriesIdOf(item);
      if (seriesId) {
        hideSeries.run(userId, seriesId, now());
        return { kind: 'series', seriesId };
      }
      const positionTicks = Number(item.UserData?.PlaybackPositionTicks) || 0;
      await setPosition(userId, token, item.Id, 0);
      return { kind: 'position', itemId: item.Id, positionTicks };
    },

    async restore(userId, token, undo) {
      if (undo?.kind === 'series' && undo.seriesId) {
        unhideSeries.run(userId, String(undo.seriesId));
        return;
      }
      const ticks = Number(undo?.positionTicks);
      if (undo?.kind === 'position' && undo.itemId && Number.isFinite(ticks) && ticks > 0) {
        await setPosition(userId, token, String(undo.itemId), Math.round(ticks));
        return;
      }
      throw fail(400, 'Nichts rückgängig zu machen');
    },

    // Drops episodes of hidden series that were last played before they were
    // hidden; anything played since brings the series back.
    visible(userId, items) {
      const hidden = new Map(listHidden.all(userId).map(row => [row.series_id, row.hidden_at]));
      if (hidden.size === 0) return items;
      return items.filter(item => {
        const seriesId = seriesIdOf(item);
        if (!seriesId || !hidden.has(seriesId)) return true;
        const lastPlayed = Date.parse(item.UserData?.LastPlayedDate || '');
        return Number.isFinite(lastPlayed) && lastPlayed > hidden.get(seriesId);
      });
    }
  };
}

export const ResumeService = createResumeService();
setResumeFilter((userId, items) => ResumeService.visible(userId, items));
