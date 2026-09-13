# VANTA

VANTA is a modern web client for Jellyfin with a custom streaming interface, trailer scroller, media requests, and admin tools. The project combines a vanilla JavaScript SPA with a Node/Express backend that keeps authentication, Jellyfin API access, and playback proxying on the server side.

> Work in progress: This project is under active development. APIs, UI behavior, and data formats may still change.

## Installation

Requirements:

- Node.js 18 or newer
- a reachable Jellyfin server
- a TMDB API key for search, media requests, and metadata

Install dependencies:

```bash
npm install
```

Configure the environment:

```bash
cp .env.example .env
```

Important `.env` values:

```env
PORT=3000
NODE_ENV=development
JELLYFIN_BASE_URL=http://localhost:8096
JELLYFIN_API_KEY=
SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
TMDB_API_KEY=
```

Build the player and the opening scene once:

```bash
npm run player:build
npm run intro:build
```

Start the development server:

```bash
npm run dev
```

Production start:

```bash
npm run player:build
npm run intro:build
npm start
```

VANTA runs at `http://localhost:3000` by default.

## Development

The regular web app is served directly from `src/public/`. The player is built separately from `src/player/` and compiled with Vite into `src/public/vendor/player/`.

When working on the player, run the watcher alongside the server:

```bash
npm run player:watch
npm run dev
```

Run tests:

```bash
npm test
```

## How It Works

The browser does not talk to Jellyfin directly. All communication goes through the Express backend:

- Jellyfin login with a server-side session
- HTTP-only session cookies instead of browser-stored tokens
- proxy routes for media, images, playlists, and playback reporting
- normalized Jellyfin data for the SPA
- local data for media requests, ban lists, and VANTA-specific admin rules

The frontend is a hash-based single page app without a framework. Pages and components are organized as ES modules and loaded dynamically.

## Features

VANTA adds app-level workflows and playback features on top of Jellyfin:

- **WatchTogether**: shared watch parties with a lobby, ready state, countdown, synchronized playback, owner/admin controls, participant management, reconnect handling, and in-player notifications.
- **WatchTogether invitations**: invite users directly inside VANTA by exact username, with persistent accept/decline invitation notifications across the app.
- **Media requests**: search TMDB, request missing movies or series, cross-check against the Jellyfin library, and track request status.
- **Request moderation**: admin approval/rejection flow for requested media, including local request and rejection history.
- **Custom VANTA player**: Vite-built streaming player with custom controls, quality selection, audio/subtitle menus, episode switching, Jellyfin playback reporting, and backend-resolved HLS/playback URLs.
- **Mobile-first player behavior**: custom fullscreen/orientation flow intended to keep VANTA controls available instead of falling back to the native iOS video player.
- **Opening scene**: a three.js particle animation of the VANTA logo covers every page load before anything of the app is visible. It plays at most once per ten minutes per browser (`localStorage` key `vanta.intro.lastPlayedAt`) and is skipped on `#/player/…` and `#/watch-party/…` deep links. Source in `src/intro/`, built to `src/public/vendor/intro/`.
- **Trailer scroller**: dedicated trailer feed using YouTube trailers derived from Jellyfin metadata.
- **Publisher/studio hubs**: curated publisher views for studios and services such as Disney, Warner Bros., Netflix, Apple TV, Prime Video, and HBO.
- **Admin user tools**: manage Jellyfin users from VANTA, including user details, password changes, library access, local bans, and VANTA-specific stream limits.
- **User rules outside Jellyfin**: local ban lists, rejected-request lists, and per-user VANTA settings stored separately from Jellyfin.
- **Profile hub**: VANTA profile area for continue watching, watch history, favorites, and user-facing account actions.
- **Server-side Jellyfin gateway**: browser requests go through the Express backend with HTTP-only sessions, normalized media data, image/media proxying, and playback reporting.

## Admin And Runtime Data

VANTA stores runtime data under `db/`. This directory is intentionally git-ignored and should not be committed to the public repository.

Relevant data files:

- `db/requests.db` for media requests, the TMDB cache and app settings
- `db/catalog.db` for the local catalogue mirror (see below)
- `db/banned.json` for rejected media requests
- `db/user/banned.json` for banned users
- `db/user/settings.json` for VANTA-specific user rules, such as maximum concurrent streams

Jellyfin remains the source of truth for real user accounts, passwords, libraries, and admin permissions. VANTA only adds local rules that it enforces during login and playback.

### Catalogue mirror

Browsing (home page, library, genres, publishers, search, trailer scroller) is served from a local SQLite mirror of all movies and series instead of live Jellyfin queries, so those pages load without waiting on the Jellyfin server. The mirror is filled on first start and kept fresh automatically:

- an update run every few minutes adds new and changed titles (default: every 10 minutes)
- a full run once a day also removes titles that disappeared from Jellyfin (default: 03:00)

Both schedules can be changed under Admin > Einstellungen > Katalog, where a run can also be started by hand. From the command line, `npm run refresh` runs an update right away (or `npm run refresh -- --full` for a full run) — it hands the run to the running server, or syncs on its own when no server is up. The sync authenticates with `JELLYFIN_API_KEY`; per-user library access is still applied on every request. Playback, resume state, favourites and item details always come live from Jellyfin. If the mirror is empty, VANTA falls back to live Jellyfin queries.

### Image cache

Posters, backdrops and logos are resized once on the VANTA server and stored as WebP under `cache/images/` (override with `IMAGE_CACHE_DIR`, relative paths count from the repo root). Each image is kept in a few fixed widths (posters 200/400/800, backdrops 800/1280/1920), so Jellyfin is asked for the original only on the first request and every later request is a plain file read. After each catalogue sync the poster and backdrop of every new or changed title are rendered in the background, so the home page is warm before anyone opens it.

The directory is git-ignored and safe to delete at any time; missing renditions are simply rendered again. For a library of around 480 titles expect a few hundred MB at most. Resizing needs the `sharp` package (installed with `npm install`); if its native binary cannot be loaded, VANTA logs a warning at startup and proxies images straight from Jellyfin as before.

## Important Notes

- In production, `SESSION_SECRET` must be set to a long, random value.
- If VANTA is served behind HTTPS, set `COOKIE_SECURE=true`.
- `TMDB_API_KEY` and `JELLYFIN_API_KEY` are required; the server will not start without them. Create the Jellyfin key under Dashboard > API Keys.
- After changing files in `src/player/`, run `npm run player:build` so `src/public/vendor/player/` stays up to date; the same goes for `src/intro/` and `npm run intro:build`.
- VANTA is not a full Jellyfin Web replacement. Its focus is a custom, streamlined streaming and media browsing experience.
