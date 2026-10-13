# Setup and deployment

## Requirements

- Node.js 18+ (production runs 24)
- A Jellyfin server (tested with 12.x) and an API key from Dashboard → API Keys
- A TMDB API key
- Optional in Jellyfin: Quick Connect (TV sign-in by phone), the Intro Skipper plugin (skip buttons)

## Local

```bash
npm install
cp .env.example .env        # fill in JELLYFIN_BASE_URL, JELLYFIN_API_KEY, TMDB_API_KEY
npm run player:build        # once, and after changes in src/player/
npm run scenes:build        # once, and after changes in src/intro/, src/countdown/, src/shared/particles/
npm run dev                 # http://localhost:3000, restarts on server changes
```

In development the server serves `src/public/` unbuilt, so client changes need only a reload. The player is a separate build; run `npm run player:watch` next to `npm run dev` when working on it.

## Production

```bash
npm ci
npm run build               # player + scenes + Vite build of the app into dist/
NODE_ENV=production npm start
```

The server refuses to start in production without `dist/index.html` or with the default `SESSION_SECRET`. It reads the CSS manifest and computes the build id **at start**: restart after every build.

Behind HTTPS set `COOKIE_SECURE=true`. A reverse proxy on the same host or a private network is trusted by default (`TRUST_PROXY`, see [configuration](configuration.md)).

## Deploying an update

In production every start updates itself first (`scripts/update.js`), whether it runs under pm2 or with `npm start`:

1. Skips unless the checkout is on `main` with no changes to tracked files and no local commits missing on `origin/main`.
2. Fetches `origin/main`; nothing to do when it is the current commit.
3. Copies `db/` to `backups/db-<time>-<old commit>` (the newest five stay; `UPDATE_BACKUP_DIR` to move them).
4. Fast-forwards, runs `npm ci` when `package.json` or the lock file changed, then `npm run build`.
5. Checks that `.env` has every required value, that `dist/index.html` exists and that the build parses on Chromium 68.
6. On success the new code starts: under pm2 the process exits and pm2 starts it again; with `npm start` it starts itself again. On failure it resets to the old commit, builds that, and starts it.

So deploying is pushing to `main` and restarting:

```bash
pm2 restart server        # or stop and npm start
```

`npm run update` does steps 1–5 by hand without starting the server; a running server picks the update up on its next restart. `AUTO_UPDATE=false` turns the update on start off (it never runs in development).

Open tabs notice the new build on their next API call or socket reconnect and show the „Neue Version verfügbar“ overlay. A restart without client changes keeps the build id and bothers no one.

## Releases

A release number like `1.02` lives in `src/public/js/shared/version.js` (`APP_VERSION`); `package.json` carries it as semver (`1.02` → `1.0.2`, `1.1` → `1.1.0`). A test fails when the two disagree. Bump both per release; changes go into [changelogs/](changelogs/changelog.md).
