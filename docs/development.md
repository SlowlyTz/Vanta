# Development

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Server with `--watch`, client served unbuilt from `src/public/` |
| `npm run player:build` / `player:watch` | Player → `src/public/vendor/player/` |
| `npm run scenes:build` | Opening scene and party countdown (one shared three.js chunk) → `src/public/vendor/scenes/` |
| `npm run build` | Player, scenes and the app into `dist/` |
| `npm test` | Vitest: `tests/server`, `tests/public`, `tests/player`, … mirror `src/` |
| `npm run check:legacy` | After a build: built scripts (app, player, scenes) parse in Chromium 68, and the built CSS has nothing Chromium 68 drops |
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
- Everything that renders on a TV must work in Chromium 68: no `inset` (write top/right/bottom/left), `min()`/`max()`/`clamp()` only after a plain fallback value (custom properties get theirs in `@supports not (width: max(1px, 1px))`), flex `gap` only with a margin fallback, no `:focus-visible`/`:is()`/`:has()` in a selector list with other selectors; missing JS APIs go into `polyfills.js`. `check:legacy` enforces most of it.
- Code shared by app, player and server goes into `src/public/js/shared/` and stays DOM-free.
- New API routes need `requireAuth` (a test enforces it). Routes stay thin: rules go into `services/`, errors with a status come from `utils/httpError.js`, Jellyfin failures go through `utils/jellyfinRoute.js`.
- UI text and API error messages are German; code, comments and logs English. Every module starts with a 1–2 line comment saying what it is for.
- Layers stack by the z-index scale in `css/base.css` (`--z-navbar` … `--z-offline`).
- Tests and builds run with at most half the CPU: `systemd-run --user --scope -q -p CPUQuota=$(( $(nproc) * 50 ))% -- npm test -- --maxWorkers=4`.

## Debugging

- `?tv=1` / `?tv=0`: TV mode on/off for this device.
- `?wpSkew=3000`, `localStorage['vanta.debug.sync']='1'`: watch party sync (see [features](features.md#watch-party)).
- Player errors are logged as `[VANTA Player]` in the console; the viewer only ever sees German messages (`player/src/playbackErrors.js`).
- After `npm run build` restart the server, or it keeps naming the old stylesheet files.

## Operations

- `GET /api/health`: `200 ok` with version, uptime, Jellyfin reachability (pinged at most every 10 s) and catalogue state; `503 degraded` without Jellyfin.
- SIGINT/SIGTERM close sockets, write all databases and exit within 1.5 s; an uncaught exception does the same so pm2 restarts the process.
- The access log drops playback proxy queries and masks token-like parameters.
