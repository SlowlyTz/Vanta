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
SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=false
TMDB_API_KEY=
```

Build the player once:

```bash
npm run player:build
```

Start the development server:

```bash
npm run dev
```

Production start:

```bash
npm run player:build
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

- Home, movies, series, search, detail pages, and profile
- custom VANTA player with HLS/playback resolution through the backend
- trailer scroller using YouTube trailers from Jellyfin metadata
- media requests through TMDB with admin approval/rejection
- publisher/studio views
- admin tools for requests and user management
- local section loaders instead of global full-screen loading overlays

## Admin And Runtime Data

VANTA stores runtime data under `db/`. This directory is intentionally git-ignored and should not be committed to the public repository.

Relevant data files:

- `db/requests.db` for media requests and the TMDB cache
- `db/banned.json` for rejected media requests
- `db/user/banned.json` for banned users
- `db/user/settings.json` for VANTA-specific user rules, such as maximum concurrent streams

Jellyfin remains the source of truth for real user accounts, passwords, libraries, and admin permissions. VANTA only adds local rules that it enforces during login and playback.

## Important Notes

- In production, `SESSION_SECRET` must be set to a long, random value.
- If VANTA is served behind HTTPS, set `COOKIE_SECURE=true`.
- `TMDB_API_KEY` is required; the server will not start without it.
- After changing files in `src/player/`, run `npm run player:build` so `src/public/vendor/player/` stays up to date.
- VANTA is not a full Jellyfin Web replacement. Its focus is a custom, streamlined streaming and media browsing experience.
