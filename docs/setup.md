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

The live instance runs under pm2 from a git checkout. One update:

```bash
cp -a db /root/vanta-backups/db-$(date +%F)-before-<version>   # back up runtime data
git pull --ff-only origin main
npm ci                       # only needed when package-lock.json changed
npm run build
pm2 restart server
curl -s localhost:3000/api/health
```

Open tabs notice the new build on their next API call or socket reconnect and show the „Neue Version verfügbar“ overlay. A restart without client changes keeps the build id and bothers no one.

## Releases

A release number like `1.02` lives in `src/public/js/shared/version.js` (`APP_VERSION`); `package.json` carries it as semver (`1.02` → `1.0.2`, `1.1` → `1.1.0`). A test fails when the two disagree. Bump both per release; changes go into [changelogs/](changelogs/changelog.md).
