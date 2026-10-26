# Architecture

The browser never talks to Jellyfin. An Express server holds the Jellyfin token in a server-side session (HTTP-only cookie) and acts as the gateway for data, images and streams; a framework-free SPA renders everything.

```
src/
  server/           Express app, services, SQLite, WebSockets (layout below)
  public/           the SPA (served as is in dev, built into dist/ for prod)
    js/shared/      DOM-free code used by app, player and server alike
  player/           player source → src/public/vendor/player/ (committed)
  intro/ countdown/ three.js scenes → src/public/vendor/scenes/ (committed),
  shared/particles/ built by src/scenes.vite.config.js; particle code both share
server.js           entry: update on start (scripts/update.js), then src/server/main.js
```

### Server layout

```
src/server/
  main.js           HTTP server, sockets, schedulers (catalogue, party cleanup), shutdown
  app.js            Express wiring
  config/           env.js (every setting), paths.js (db, cache, public, dist), session, CSP, static
  db/               sql.js databases: database.js (requests.db), catalog.js, session-store.js,
                    sqlite.js (shared statement API), migrations.js
  middleware/       auth (sessions, bans, fresh admin check), errors, security headers
  routes/           one router per mount; HTTP only, the rules live in services
  realtime/         app socket and watch-party socket hub (watch-party/: its parts)
  services/
    browse/         what users browse: library, profile, trailers, home sections
                    (catalogue mirror or live Jellyfin)
    catalog/        catalogue mirror: sync, reader, scheduler, visibility, age limits
    jellyfin/       thin Jellyfin API wrappers (client, items, people, playback, admin users …)
    playback/       stream selection, paths and proxying, quality steps, reports
    watch-party/    party state: constants, permissions, timeline, members, lifecycle …
    images/         WebP cache and per-user image access
    *.service.js    requests, reports, notifications, push, bans, stream limits, sessions …
    events.js       domain events the socket hubs listen to (main.js wires them)
  utils/            httpError, jellyfinRoute, jsonStore, shuffle, text keys, ids …
```

## Server

| Mount | Routes |
|---|---|
| `/api/auth` | login, logout, session; `/api/auth/pairing` for TV codes |
| `/api/media` | library and search (from the catalogue), items, resume, user data, `/image`, `/playback`, `/segments`, `/person`, `/profile`, trailers |
| `/api/requests`, `/api/reports` | TMDB requests and problem reports |
| `/api/notifications` | feed, preferences, push key and subscriptions, test push |
| `/api/preferences`, `/api/watchlist`, `/api/sessions` | per-user settings, Meine Liste, own sessions |
| `/api/watch-parties`, `/api/watch-party-invitations` | parties and invites |
| `/api/admin` | dashboard, users, catalogue, settings (admins only) |
| `/api/internal` | catalogue refresh from the CLI (local, keyed) |
| `/api/version`, `/api/health` | no session needed |

Everything else under `/api` answers a JSON 404. A static test keeps every API route behind `requireAuth` (except a short allow-list in `tests/server/routes/route-auth.test.js`), which also checks bans on each request. Media routes accept only item-shaped ids (`router.param('id', …)`).

WebSockets: `/ws/app` (per user: notification changes, push fallback, build id, session end) and `/ws/watch-party/<id>`. Both refuse a foreign `Origin` (clients without one still need the session cookie), parse the upgrade URL safely, cap messages at 64 KB, rate-limit and drop dead connections by ping.

Jellyfin calls time out (15 s by default; PlaybackInfo and images 30 s, the stream proxy's headers 45 s, the sync 60 s) and use the standard `Authorization` header (Jellyfin 12 rejects the legacy one). Routes reading Jellyfin go through `utils/jellyfinRoute.js`: a refused token ends the session, a missing item is a 404, a timeout a 504.

### Catalogue mirror

Browsing (home, library, genres, publishers, search, scroller) reads `db/catalog.db`, not Jellyfin. The sync (`services/catalog/`) authenticates with `JELLYFIN_API_KEY`: an update run every 10 min adds and changes titles, a daily full run also removes (while an update runs it is tried again every 10 min, up to 10 times, then the admins are notified). Per-user library access and Jellyfin's parental control (`MaxParentalRating`, `BlockUnratedItems`; `catalog/age-limit.js`) are applied on every read and to images. Item details, playback, resume state and favourites stay live. With an empty mirror the routes fall back to live queries. `npm run refresh [-- --full]` triggers a run on the running server or syncs alone.

### Images

`/api/media/image/:id` resizes once with sharp into WebP renditions (posters 200/400/800, backdrops 800/1280/1920) under `cache/images/`, warmed after each sync. Renditions are shared, so each request is first checked against the user's access (catalogue for movies/series, Jellyfin for the rest, remembered 10 min) and answered `private`. Without sharp, images are proxied unchanged.

### Playback

`/api/media/playback/:id` asks Jellyfin for PlaybackInfo with a device profile and returns either a direct file or an HLS playlist; both are proxied, so the token never reaches the browser. The proxy serves only `/Videos/` paths, and streams only for a play session the user holds (a replaced one is refused, a lost one counted again within the limit). Tizen/webOS get a profile with HEVC, AC3/E-AC3 and MKV. Each open player counts against the user's stream limit (`stream-session.service.js`), paused too (it reports every 10 s); one device holds one stream, so a new start replaces that device's older sessions, and a player left before it started cancels its session. A stream without reports for 90 s is gone. Progress is reported to Jellyfin.

### Storage

SQLite via sql.js: databases live in memory and are written atomically (temp file + rename): `requests.db` batched over 250 ms, `sessions.db` over 1 s, `catalog.db` once at the end of each sync. A failed write is logged and retried with the next change. Three small JSON files (`db/banned.json`, `db/user/banned.json`, `db/user/settings.json`) go through `utils/jsonStore.js`, which keeps them in memory and re-reads only on change. SIGINT/SIGTERM and uncaught exceptions flush everything before exit.

## Client

- **Router** (`js/router.js`): hash routes registered in `app.js`, each page loaded on demand with its stylesheet bundle (`css/bundles/`, route option `styles`). A page gets a scope whose timers, listeners and fetches end when it is left; an older navigation cannot overwrite a newer one.
- **Stores** (`js/store/`): auth, notifications, preferences, watchlist, party invitations extend one `Store` with `subscribe` (a failing listener does not stop the others; a logout bumps a generation so late answers of the old account are dropped); `app.store.js` only shows toasts.
- **Page scope** (`utils/pageScope.js`): what a page registers with `onLeave` or starts with its `signal` ends when it is left.
- **Dialogs** go through `utils/modal.js` (focus trap, Escape, inert background, focus back to the opener or a fallback); the mobile drawer traps the focus itself.
- **TV** (`js/tv/`): focus engine, Back handling, focus backdrop; pages can take a Back step of their own via `vanta:tv-back`.
- **Shared** (`js/shared/`): DOM-free code also used by the server and the player (episode codes, featured publishers, remote keys, focus geometry, next episode …).
- **Polyfills** (`js/polyfills.js`, incl. `inert`) and the Vite target keep the build working on Chromium 68; `npm run check:legacy` also checks the built CSS for what Chromium 68 drops.

### Builds and caching

In production the server hashes the client code into a build id, writes it into `index.html` (put together once per process) and sends it as `X-Vanta-Build`, in `APP_SOCKET_READY` and from `/api/version`. A tab with another id shows the update overlay. Hashed files are cached for a year; `index.html` and the unhashed player and scene entries revalidate. Page stylesheets are Vite inputs per `css/bundles/*.css`; their hashed names reach the page through a manifest in `#vanta-page-styles`.

The service worker (`sw.js`) shows `offline.html` without network, serves hashed `/assets/` cache-first (60 files; after a deploy only files cached before the new page load go) and tagged images stale-while-revalidate (200, cleared whenever a session ends), and handles push and notification clicks.
