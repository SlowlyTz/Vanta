// "Meine Liste": a user's saved movies and series (watchlist table).
import db from '../db/database.js';
import { jellyfinJson } from './jellyfin/client.js';
import { COMMON_ITEM_FIELDS } from './jellyfin/fields.js';
import { httpError } from '../utils/httpError.js';

const LISTABLE_TYPES = new Set(['Movie', 'Series']);
export const MAX_ENTRIES = 500;
// Ids per Jellyfin query; the list goes in several, so the URL stays short.
const IDS_PER_REQUEST = 100;

const listRows = db.prepare('SELECT item_id, item_type, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC LIMIT ?');
const insertRow = db.prepare(`
  INSERT INTO watchlist (user_id, item_id, item_type, added_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id, item_id) DO NOTHING
`);
const hasRow = db.prepare('SELECT 1 AS found FROM watchlist WHERE user_id = ? AND item_id = ?');
const countRows = db.prepare('SELECT COUNT(*) AS n FROM watchlist WHERE user_id = ?');
const deleteRow = db.prepare('DELETE FROM watchlist WHERE user_id = ? AND item_id = ?');
const deleteAllRows = db.prepare('DELETE FROM watchlist WHERE user_id = ?');


// A film comes off the list once it was watched to the end after it was
// added (a film added for a rewatch stays until then). Series stay until the
// user removes them.
export function isFinishedSinceAdded(item, addedAt) {
  if (item?.Type !== 'Movie' || item.UserData?.Played !== true) return false;
  const lastPlayed = Date.parse(item.UserData.LastPlayedDate || '');
  return Number.isFinite(lastPlayed) && lastPlayed > addedAt;
}

// Items come from Jellyfin with the user's own token, so progress is current;
// anything Jellyfin no longer shows the user comes off the list.
export function createWatchlistService({ fetchJson = jellyfinJson, now = () => Date.now() } = {}) {
  return {
    ids(userId) {
      return listRows.all(userId, MAX_ENTRIES).map(row => row.item_id);
    },

    async list(userId, token) {
      const rows = listRows.all(userId, MAX_ENTRIES);
      if (rows.length === 0) return [];
      const chunks = [];
      for (let i = 0; i < rows.length; i += IDS_PER_REQUEST) chunks.push(rows.slice(i, i + IDS_PER_REQUEST));
      const answers = await Promise.all(chunks.map(chunk => fetchJson(`/Users/${userId}/Items`, {
        token,
        query: { Ids: chunk.map(row => row.item_id).join(','), Fields: COMMON_ITEM_FIELDS, EnableUserData: 'true' }
      })));
      const byId = new Map(answers.flatMap(data => data?.Items || []).map(item => [item.Id, item]));
      const items = [];
      for (const row of rows) {
        const item = byId.get(row.item_id);
        if (!item) {
          deleteRow.run(userId, row.item_id);
          continue;
        }
        if (isFinishedSinceAdded(item, row.added_at)) {
          deleteRow.run(userId, row.item_id);
          continue;
        }
        items.push(item);
      }
      return items;
    },

    // Only movies and series the user can open may be added.
    async add(userId, token, itemId) {
      let item;
      try {
        item = await fetchJson(`/Users/${userId}/Items/${itemId}`, { token });
      } catch (error) {
        if (error.status === 404 || error.status === 400) throw httpError(404, 'Titel nicht gefunden');
        throw error;
      }
      if (!LISTABLE_TYPES.has(item?.Type)) throw httpError(400, 'Nur Filme und Serien passen auf die Liste');
      // Already on it: nothing to add, even on a full list.
      if (hasRow.get(userId, item.Id)) return { id: item.Id, type: item.Type };
      if (countRows.get(userId).n >= MAX_ENTRIES) throw httpError(409, 'Deine Liste ist voll');
      insertRow.run(userId, item.Id, item.Type, now());
      return { id: item.Id, type: item.Type };
    },

    remove(userId, itemId) {
      return deleteRow.run(userId, itemId).changes > 0;
    },

    clear(userId) {
      deleteAllRows.run(userId);
    }
  };
}

export const WatchlistService = createWatchlistService();
