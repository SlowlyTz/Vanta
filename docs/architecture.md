# Architecture

The browser never talks to Jellyfin. An Express server holds the Jellyfin token in a server-side session (HTTP-only cookie) and acts as the gateway for data, images and streams; a framework-free SPA renders everything.

```
src/
  server/           Express app, services, SQLite, WebSockets
  public/           the SPA (served as is in dev, built into dist/ for prod)
    js/shared/      DOM-free code used by app, player and server alike
  player/           player source → src/public/vendor/player/ (committed)
  intro/ countdown/ three.js scenes → src/public/vendor/scenes/ (committed)
server.js           entry: update on start (scripts/update.js), then src/server/main.js
  (main.js          HTTP server, sockets, schedulers, shutdown)
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

Everything else under `/api` answers a JSON 404. A static test keeps every API route behind `requireAuth`, which also checks bans on each request.

WebSockets: `/ws/app` (per user: notification changes, push fallback, build id, session end) and `/ws/watch-party/<id>`. Both require the page's origin, cap messages at 64 KB, rate-limit and drop dead connections by ping.

Jellyfin calls time out (15 s; PlaybackInfo and images 30 s; sync 60 s) and use the standard `Authorization` header (Jellyfin 12 rejects the legacy one).

### Catalogue mirror

Browsing (home, library, genres, publishers, search, scroller) reads `db/catalog.db`, not Jellyfin. The sync (`services/catalog/`) authenticates with `JELLYFIN_API_KEY`: an update run every 10 min adds and changes titles, a daily full run also removes. Per-user library access is applied on every read. Item details, playback, resume state and favourites stay live. With an empty mirror the routes fall back to live queries. `npm run refresh [-- --full]` triggers a run on the running server or syncs alone.

### Images

`/api/media/image/:id` resizes once with sharp into WebP renditions (posters 200/400/800, backdrops 800/1280/1920) under `cache/images/`, warmed after each sync. Renditions are shared, so each request is first checked against the user's access (catalogue for movies/series, Jellyfin for the rest, remembered 10 min) and answered `private`. Without sharp, images are proxied unchanged.

### Playback

`/api/media/playback/:id` asks Jellyfin for PlaybackInfo with a device profile and returns either a direct file or an HLS playlist; both are proxied, so the token never reaches the browser. Tizen/webOS get a profile with HEVC, AC3/E-AC3 and MKV. Each start counts against the user's stream limit (`stream-session.service.js`); switching audio, quality or to HLS names the session it replaces. Progress is reported to Jellyfin.

### Storage

SQLite via sql.js: databases live in memory and are written atomically (temp file + rename), `requests.db` batched over 250 ms. SIGINT/SIGTERM and uncaught exceptions flush everything before exit.

## Client

- **Router** (`js/router.js`): hash routes registered in `app.js`, each page loaded on demand with its stylesheet bundle (`css/bundles/`, route option `styles`). A page gets a scope whose timers, listeners and fetches end when it is left; an older navigation cannot overwrite a newer one.
- **Stores** (`js/store/`): auth, app (toasts), notifications, preferences, watchlist, party invitations; all extend one `Store` with `subscribe`.
- **Dialogs** go through `utils/modal.js` (focus trap, Escape, inert background).
- **Polyfills** (`js/polyfills.js`) and the Vite target keep the build parseable on Chromium 68.

### Builds and caching

In production the server hashes the client code into a build id, writes it into `index.html` and sends it as `X-Vanta-Build`, in `APP_SOCKET_READY` and from `/api/version`. A tab with another id shows the update overlay. Hashed files are cached for a year; `index.html` and unhashed player entries revalidate.

The service worker (`sw.js`) shows `offline.html` without network, serves hashed `/assets/` cache-first (60 files) and tagged images stale-while-revalidate (200, cleared on logout), and handles push and notification clicks.
