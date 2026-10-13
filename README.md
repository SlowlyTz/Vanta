<p align="center">
  <img src="src/public/assets/logo2.png" alt="VANTA" width="460">
</p>

<p align="center"><b>A web client for Jellyfin with its own player, watch parties and a TV interface.</b></p>

> **Update 1.1 released.** See the [changelog](docs/changelogs/changelog.md) for everything new since 1.0.

VANTA brings its own streaming interface and player, watch parties, a trailer scroller, media requests, notifications, a TV interface and admin tools to Jellyfin. A Node/Express server sits between browser and Jellyfin; the frontend is a framework-free SPA.

## Quick start

```bash
npm install
cp .env.example .env     # JELLYFIN_BASE_URL, JELLYFIN_API_KEY, TMDB_API_KEY
npm run player:build && npm run scenes:build
npm run dev              # http://localhost:3000
```

Production: `npm run build`, then `NODE_ENV=production npm start` with a real `SESSION_SECRET`.

## Documentation

| | |
|---|---|
| [Setup and deployment](docs/setup.md) | Requirements, local and production runs, updating a live instance, releases |
| [Configuration](docs/configuration.md) | All environment variables, admin settings, runtime data in `db/` |
| [Architecture](docs/architecture.md) | Server routes, catalogue mirror, images, playback, client router, caching |
| [Features](docs/features.md) | How the player, watch party, TV mode, notifications, search and requests work |
| [Development](docs/development.md) | Scripts, tests, end-to-end checks, conventions, debugging |
| [Changelog](docs/changelogs/changelog.md) | Changes from 1.0 to 1.1 |

> Work in progress: APIs, behaviour and data formats may still change. VANTA is not a full Jellyfin Web replacement.
