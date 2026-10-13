# Development

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Server with `--watch`, client served unbuilt from `src/public/` |
| `npm run player:build` / `player:watch` | Player → `src/public/vendor/player/` |
| `npm run scenes:build` | Opening scene and party countdown (one shared three.js chunk) → `src/public/vendor/scenes/` |
| `npm run build` | Player, scenes and the app into `dist/` |
| `npm test` | Vitest: `tests/server`, `tests/public`, `tests/player`, … mirror `src/` |
| `npm run check:legacy` | After a build: every built script must parse in Chromium 68 |
| `npm run test:e2e` | Headless Chromium against a running server (below) |
| `npm run refresh [-- --full]` | Catalogue sync now |
| `npm run update` | Pull, build and check `origin/main` without starting the server ([setup](setup.md#deploying-an-update)) |

Player and scene outputs are committed; rebuild them when their sources change, or the app keeps running the old ones.

## End-to-end checks

```bash
VANTA_E2E_URL=http://localhost:3000 VANTA_E2E_USER=… VANTA_E2E_PASSWORD=… npm run test:e2e
```

Drives the TV interface with arrow keys only (1920, 1280, 960 px): focus start, rows, sidebar, search, keyboard, settings, profile, clipping of focus rings, and checks that scroller trailers actually play while scrolling. Screenshots go to `tests/e2e/output/`. Use an account with content; the browser runs muted.

## Conventions

- Plain ES modules, no framework, no TypeScript. Pages are `pages/*.page.js` returning an element; components are functions returning elements (`utils/dom.js` `createElement`).
- Client code must run on Chromium 68: no flex `gap` in TV styles (use margins or grid), no `toggleAttribute`; missing APIs go into `polyfills.js`.
- Code shared by app, player and server goes into `src/public/js/shared/` and stays DOM-free.
- New API routes need `requireAuth` (a test enforces it).
- UI text is German, code and comments English.

## Debugging

- `?tv=1` / `?tv=0`: TV mode on/off for this device.
- `?wpSkew=3000`, `localStorage['vanta.debug.sync']='1'`: watch party sync (see [features](features.md#watch-party)).
- Player errors are logged as `[VANTA Player]` in the console.
- After `npm run build` restart the server, or it keeps naming the old stylesheet files.

## Operations

- `GET /api/health`: `200 ok` with version, uptime, Jellyfin reachability (pinged at most every 10 s) and catalogue state; `503 degraded` without Jellyfin.
- SIGINT/SIGTERM close sockets, write all databases and exit within 1.5 s; an uncaught exception does the same so pm2 restarts the process.
- The access log drops playback proxy queries and masks token-like parameters.
