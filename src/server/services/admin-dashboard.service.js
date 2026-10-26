// Everything the admin dashboard shows, in one answer: server and Jellyfin
// status, streams, open work, catalogue, storage and recent activity.
import fs from 'fs';
import { join } from 'path';
import env from '../config/env.js';
import db from '../db/database.js';
import { jellyfinJson, jellyfinRawFetch } from './jellyfin/client.js';
import { APP_VERSION } from '../../public/js/shared/version.js';
import { getCatalog } from './catalog/index.js';
import { getImageCache } from './images/image-cache.js';
import { WatchPartyService } from './watch-party.service.js';
import { UserBanService } from './user-ban.service.js';
import { loginThrottle } from './login-throttle.service.js';
import { DB_DIR } from '../config/paths.js';

const DB_FILES = ['requests.db', 'catalog.db', 'sessions.db'];

const recentRequests = db.prepare("SELECT id, title, username, status, created_at, updated_at FROM requests ORDER BY created_at DESC LIMIT 6");
const recentReports = db.prepare("SELECT id, title, username, status, problem, created_at FROM reports ORDER BY created_at DESC LIMIT 6");
const openRequests = db.prepare("SELECT COUNT(*) AS n FROM requests WHERE status = 'pending'");
const openReports = db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'");

const settle = async (promise, fallback = null) => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};

// One active stream as the dashboard shows it, from a Jellyfin session.
export function describeStream(session) {
  const item = session.NowPlayingItem;
  const play = session.PlayState || {};
  const transcoding = session.TranscodingInfo || null;
  const runtime = Number(item?.RunTimeTicks) || 0;
  const position = Number(play.PositionTicks) || 0;
  const method = play.PlayMethod || (transcoding ? 'Transcode' : 'DirectPlay');
  const height = transcoding?.Height || item?.Height || null;
  return {
    user: session.UserName || '?',
    title: item?.SeriesName ? `${item.SeriesName} · ${item.Name}` : item?.Name || '?',
    itemId: item?.Id || null,
    device: [session.Client, session.DeviceName].filter(Boolean).join(' · '),
    progress: runtime > 0 ? Math.min(1, position / runtime) : null,
    paused: play.IsPaused === true,
    transcoding: method === 'Transcode',
    quality: height ? `${height}p` : null,
    bitrate: transcoding?.Bitrate || null
  };
}

// A part that cannot be read (Jellyfin down) comes back empty instead of
// failing the rest.
export function createAdminDashboard({
  fetchJson = jellyfinJson,
  ping = () => jellyfinRawFetch('/System/Ping', { timeoutMs: 3000 }),
  catalog = getCatalog,
  images = getImageCache,
  parties = () => [...WatchPartyService.parties.values()],
  bans = () => UserBanService.getAll(),
  logins = () => loginThrottle.stats(),
  apiKey = env.JELLYFIN_API_KEY,
  now = () => Date.now(),
  startedAt = Date.now()
} = {}) {
  const jellyfinStatus = async () => {
    const begun = now();
    const response = await settle(ping(), null);
    return { ok: Boolean(response?.ok), latencyMs: response?.ok ? now() - begun : null };
  };

  const streams = async () => {
    const sessions = await settle(fetchJson('/Sessions', { token: apiKey, query: { ActiveWithinSeconds: 120 } }), null);
    if (!Array.isArray(sessions)) return { available: false, list: [], direct: 0, transcoding: 0 };
    const list = sessions.filter(session => session.NowPlayingItem).map(describeStream);
    return {
      available: true,
      list,
      direct: list.filter(stream => !stream.transcoding).length,
      transcoding: list.filter(stream => stream.transcoding).length
    };
  };

  const catalogStatus = async () => {
    const instance = await settle(catalog(), null);
    if (!instance) return null;
    const status = instance.sync.getStatus();
    const plan = instance.scheduler.getPlan();
    return {
      library: status.library,
      running: status.running,
      lastRun: status.lastRun ? { type: status.lastRun.type, finishedAt: status.lastRun.finishedAt, error: status.lastRun.error || null } : null,
      nextUpdateAt: plan.nextUpdateAt || null
    };
  };

  const storage = () => {
    const cache = settle(Promise.resolve().then(() => images().stats()), null);
    const files = DB_FILES.map(name => {
      try {
        return { name, bytes: fs.statSync(join(DB_DIR, name)).size };
      } catch {
        return { name, bytes: null };
      }
    });
    return cache.then(imageCache => ({ imageCache, databases: files }));
  };

  return {
    async read() {
      const [jellyfin, active, catalogInfo, storageInfo] = await Promise.all([jellyfinStatus(), streams(), catalogStatus(), storage()]);
      const partyList = parties().filter(party => !party.endedAt).map(party => ({
        id: party.id,
        title: party.itemSnapshot?.name || '?',
        owner: party.ownerName,
        status: party.status,
        members: party.members?.size || 0
      }));
      return {
        server: { version: APP_VERSION, uptimeSeconds: Math.round((now() - startedAt) / 1000), jellyfin },
        streams: active,
        work: { requests: openRequests.get().n, reports: openReports.get().n },
        catalog: catalogInfo,
        storage: storageInfo,
        parties: partyList,
        activity: {
          requests: recentRequests.all(),
          reports: recentReports.all(),
          logins: logins(),
          bans: bans().slice(-5).reverse().map(ban => ({ username: ban.username, reason: ban.reason, bannedAt: ban.bannedAt || ban.createdAt || null }))
        }
      };
    }
  };
}

export const AdminDashboard = createAdminDashboard();
