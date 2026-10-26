import db from '../db/database.js';
import env from '../config/env.js';
import { jellyfinJson } from './jellyfin/client.js';
import { NotifyService } from './notify.service.js';
import { UserDirectory } from './user-directory.service.js';
import { AppSettingsService } from './app-settings.service.js';
import { APP_VERSION } from '../../public/js/shared/version.js';
import { formatEpisodeCode } from '../../public/js/shared/episodeCode.js';
import { withinAgeLimit } from './catalog/age-limit.js';
import { appEvents, NOTIFICATIONS_CHANGED } from './events.js';

// What causes a notification. Each trigger runs after the action itself
// succeeded and never fails it.

const openRequestsFor = db.prepare(`
  SELECT id, user_id, title FROM requests
  WHERE tmdb_id = ? AND tmdb_type = ? AND status IN ('pending', 'approved')
`);
const markImported = db.prepare("UPDATE requests SET status = 'imported', updated_at = ? WHERE id = ?");
const watchlistUsersOf = db.prepare('SELECT user_id FROM watchlist WHERE item_id = ?');

// Series looked at for new episodes at the same time.
const EPISODE_LOOKUPS_PARALLEL = 4;

const quote = (text) => `„${text}“`;

// Within the user's parental limit (see user-directory.service.js and
// catalog/age-limit.js).
const withinUserAgeLimit = (user, item) => withinAgeLimit(
  Number.isFinite(user.maxAge) || user.blockUnrated?.length ? { maxAge: Number.isFinite(user.maxAge) ? user.maxAge : null, blockUnrated: user.blockUnrated || [] } : null,
  item
);

const visibleTo = (user, item) =>
  (user.libraryIds === null || user.libraryIds.includes(item.LibraryId)) && withinUserAgeLimit(user, item);

// `run` over `items`, at most `limit` at a time; results in order.
async function mapLimited(items, limit, run) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// "Neu: Dune, Heat und 3 weitere"
export function bundleTitles(items, shown = 2) {
  const names = items.map(item => item.Name);
  if (names.length <= shown + 1) return names.join(', ').replace(/, ([^,]*)$/, ' und $1');
  return `${names.slice(0, shown).join(', ')} und ${names.length - shown} weitere`;
}

export function createNotificationTriggers({
  notify = NotifyService,
  directory = UserDirectory,
  fetchJson = jellyfinJson,
  apiKey = env.JELLYFIN_API_KEY,
  settings = AppSettingsService,
  now = () => Date.now(),
  events = appEvents,
  log = console
} = {}) {
  const safely = (label, run) => Promise.resolve().then(run).catch(error => log.warn?.(`[Notify] ${label}: ${error.message}`));

  // Episodes of a series added since the last run, newest first.
  const newEpisodes = async (seriesId, sinceMs) => {
    const data = await fetchJson('/Items', {
      token: apiKey,
      query: { ParentId: seriesId, IncludeItemTypes: 'Episode', Recursive: 'true', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 20, Fields: 'DateCreated' }
    });
    return (data.Items || []).filter(episode => Date.parse(episode.DateCreated || '') > sinceMs);
  };

  // Users who watched part of these series (their "Weiter schauen").
  const startedBy = async (user, seriesIds) => {
    const data = await fetchJson(`/Users/${user.id}/Items`, {
      token: apiKey,
      query: { Ids: seriesIds.join(','), Fields: 'RecursiveItemCount', EnableImages: 'false' }
    });
    return new Set((data.Items || [])
      .filter(series => Number(series.UserData?.PlayedPercentage) > 0
        || Number(series.RecursiveItemCount) - Number(series.UserData?.UnplayedItemCount) > 0)
      .map(series => series.Id));
  };

  return {
    requestDecided(request) {
      if (!request?.user_id || !['approved', 'rejected'].includes(request.status)) return safely('request', () => {});
      const approved = request.status === 'approved';
      return safely('request_update', () => notify.notify({
        userIds: [request.user_id],
        kind: 'request_update',
        title: approved ? 'Anfrage angenommen' : 'Anfrage abgelehnt',
        body: `Deine Anfrage ${quote(request.title)} wurde ${approved ? 'angenommen' : 'abgelehnt'}.`,
        url: '/#/requests/mine'
      }));
    },

    reportHandled(report) {
      if (!report?.user_id || !['resolved', 'dismissed'].includes(report.status)) return safely('report', () => {});
      return safely('report_update', () => notify.notify({
        userIds: [report.user_id],
        kind: 'report_update',
        title: report.status === 'resolved' ? 'Meldung erledigt' : 'Meldung geschlossen',
        body: `Deine Meldung zu ${quote(report.title)} wurde ${report.status === 'resolved' ? 'erledigt' : 'geschlossen'}.`,
        url: '/#/report/mine',
        imageItemId: report.item_id || null
      }));
    },

    // A new request or report waits for an admin.
    adminWork({ kind, username, title, url }) {
      return safely('admin_new_request', async () => {
        const admins = await directory.admins();
        await notify.notify({
          userIds: admins.map(admin => admin.id),
          kind: 'admin_new_request',
          title: kind === 'report' ? `Neue Meldung von ${username}` : `Neue Anfrage von ${username}`,
          body: title,
          url
        });
      });
    },

    // The daily full catalogue run gave up (see catalog/scheduler.js).
    adminSyncFailed({ attempts, reason }) {
      return safely('admin_sync_failed', async () => {
        const admins = await directory.admins();
        await notify.notify({
          userIds: admins.map(admin => admin.id),
          kind: 'admin_sync_failed',
          title: 'Katalog-Abgleich fehlgeschlagen',
          body: `Der vollständige Abgleich mit Jellyfin ist nach ${attempts} Versuchen nicht gelaufen: ${reason}`,
          url: '/#/admin/settings'
        });
      });
    },

    watchPartyInvite(invitation, inviterName) {
      return safely('watch_party_invite', () => notify.notify({
        userIds: [invitation.invitedUserId],
        kind: 'watch_party_invite',
        title: 'Einladung zur Watch Party',
        body: `${inviterName || 'Jemand'} lädt dich zur Watch Party ein.`,
        url: `/#/watch-party/${encodeURIComponent(invitation.partyId)}`
      }));
    },

    // After a catalogue run (update or full): requested titles that arrived,
    // new titles and new episodes, each only to users who may see the title.
    // Not after the first fill, which would flood everyone with the whole
    // library.
    catalogRun({ record, added = [], updated = [], previousCount = 0, previousSuccessAt = null }) {
      return safely('catalog', async () => {
        if (!record || previousCount === 0) return;

        const users = await directory.all();
        const usersById = new Map(users.map(user => [user.id, user]));
        // Who already heard "Jetzt verfügbar" about which title in this run.
        const toldAvailable = new Map();

        // Requested titles that are here now.
        for (const item of added) {
          const tmdbId = item.ProviderIds?.Tmdb;
          if (!tmdbId) continue;
          const requests = openRequestsFor.all(Number(tmdbId), item.Type === 'Series' ? 'tv' : 'movie');
          for (const request of requests) markImported.run(now(), request.id);
          if (requests.length) events.emit(NOTIFICATIONS_CHANGED);
          const owners = [...new Set(requests.map(request => request.user_id).filter(Boolean).map(String))]
            .filter(userId => usersById.has(userId) && visibleTo(usersById.get(userId), item));
          if (!owners.length) continue;
          owners.forEach(userId => {
            if (!toldAvailable.has(userId)) toldAvailable.set(userId, new Set());
            toldAvailable.get(userId).add(item.Id);
          });
          await notify.notify({
            userIds: owners,
            kind: 'request_available',
            title: 'Jetzt verfügbar',
            body: `${quote(item.Name)} ist jetzt auf VANTA.`,
            url: `/#/item/${item.Id}`,
            imageItemId: item.Id
          });
        }

        // New titles, one bundled message per user and run, without the
        // ones the user just heard about as available.
        if (added.length) {
          for (const user of users) {
            const told = toldAvailable.get(user.id);
            const visible = added.filter(item => visibleTo(user, item) && !told?.has(item.Id));
            if (!visible.length) continue;
            await notify.notify({
              userIds: [user.id],
              kind: 'new_content',
              title: visible.length === 1 ? 'Neu auf VANTA' : `${visible.length} neue Titel`,
              body: `Neu: ${bundleTitles(visible)}`,
              url: visible.length === 1 ? `/#/item/${visible[0].Id}` : '/#/home',
              imageItemId: visible[0].Id
            });
          }
        }

        // New episodes of series on someone's list or in their "Weiter schauen".
        const series = updated.filter(item => item.Type === 'Series');
        if (!series.length || !previousSuccessAt) return;
        const found = await mapLimited(series, EPISODE_LOOKUPS_PARALLEL, async (item) => ({
          item,
          episodes: await newEpisodes(item.Id, previousSuccessAt).catch(() => [])
        }));
        const fresh = new Map(found.filter(entry => entry.episodes.length).map(entry => [entry.item.Id, { series: entry.item, episodes: entry.episodes }]));
        if (!fresh.size) return;

        const ids = [...fresh.keys()];
        for (const user of users) {
          const candidates = ids.filter(seriesId => visibleTo(user, fresh.get(seriesId).series));
          if (!candidates.length) continue;
          const started = await startedBy(user, candidates).catch(() => new Set());
          for (const seriesId of candidates) {
            const { series: item, episodes } = fresh.get(seriesId);
            const onList = watchlistUsersOf.all(seriesId).some(row => row.user_id === user.id);
            if (!onList && !started.has(seriesId)) continue;
            const latest = episodes[0];
            await notify.notify({
              userIds: [user.id],
              kind: 'new_episode',
              title: episodes.length === 1 ? 'Neue Folge' : `${episodes.length} neue Folgen`,
              body: episodes.length === 1 ? `${item.Name} ${formatEpisodeCode(latest)}` : `${item.Name}, zuletzt ${formatEpisodeCode(latest)}`,
              url: `/#/item/${seriesId}`,
              imageItemId: seriesId
            });
          }
        }
      });
    },

    // Once per version, on the first start that runs it.
    appStarted() {
      return safely('app_update', async () => {
        const previous = settings.get('notified_version');
        if (previous === APP_VERSION) return;
        settings.set('notified_version', APP_VERSION);
        if (!previous) return;
        const users = await directory.all();
        await notify.notify({
          userIds: users.map(user => user.id),
          kind: 'app_update',
          title: `VANTA ${APP_VERSION} ist da`,
          body: 'Lade die App neu, um die neue Version zu nutzen.',
          url: '/#/home'
        });
      });
    }
  };
}

export const NotificationTriggers = createNotificationTriggers();
