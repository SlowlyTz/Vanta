# VANTA

> **Update 1.1 released.** See the [changelog](docs/changelogs/changelog.md) for everything new since 1.0.

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

Build the player and the two three.js scenes (opening scene, watch-party countdown) once:

```bash
npm run player:build
npm run scenes:build
```

Start the development server:

```bash
npm run dev
```

Production start (`NODE_ENV=production` in `.env` or the environment):

```bash
npm run build
npm start
```

`npm run build` builds the player, the two three.js scenes and the web app itself; the last step bundles `src/public/` with Vite into `dist/` (not committed). In production the server refuses to start without `dist/index.html`.

Only the styles every page needs are linked from `index.html`. Each area with styles of its own (login, admin, requests and reports, profile, publishers, trailer scroller, watch party, player) has a bundle in `src/public/css/bundles/` that the router loads with the page and waits for before showing it (`js/utils/pageStyles.js`, route option `styles`). The build turns every bundle into one hashed file; the server reads them from `dist/.vite/manifest.json` and names them in `index.html`. The player's own stylesheet (`/vendor/player/vanta-player.css`) comes with the player bundle.

VANTA runs at `http://localhost:3000` by default.

## Development

Which files the server hands out depends on `NODE_ENV`:

- any value other than `production` (the default) serves `src/public/` as it is: plain ES modules and stylesheets, no build step, every file revalidated on each load (`Cache-Control: no-cache`).
- `production` serves the Vite build in `dist/` first and falls back to `src/public/` for everything the build does not contain (`/vendor/**`, `/assets/**`, `/js/intro-gate.js`). All files in `dist/` except `index.html` carry a content hash and are cached for a year (`immutable`); `index.html` is always revalidated. Changes to the app itself therefore only show up after `npm run build`; the player (JS and its stylesheet) always comes from `/vendor/player/` and needs only `npm run player:build`.

In production the server also hashes the client code (`dist/` and `src/public/` without images and fonts) into a build id at startup. It writes that id into `index.html`, sends it as `X-Vanta-Build` with every response, in `APP_SOCKET_READY` and from `GET /api/version`. A tab whose own id differs (checked on open, on every API call, on each app-socket reconnect, when the tab becomes visible and when a page chunk fails to load) gets a blocking „Neue Version verfügbar“ overlay whose „Update“ button reloads past every cache. A server-only change or a plain restart keeps the id, so it never asks anyone to reload for nothing; in development there is no id and no check.

The service worker (`src/public/sw.js`) answers a page load without network with `offline.html`. It also serves the hashed build files under `/assets/` from its own cache first (at most 60, dropped when a page load reports a new build) and tagged posters and backdrops stale-while-revalidate (at most 200, cleared on logout and when a ban ends the session); pages, API answers, the player and the scenes always come from the network or the browser's HTTP cache.

In both modes text responses are gzip/brotli compressed and hashed player chunks under `/vendor/player/` are immutable, while the unhashed entries (`vanta-player.js`, `vanta-intro.js`, `vanta-countdown.js`) are revalidated so a rebuild takes effect at once. Images under `/assets/` are cached for a day.

The player is built separately from `src/player/` and compiled with Vite into `src/public/vendor/player/`; hls.js is a chunk of its own there that only loads when a stream is played as HLS. The opening scene (`src/intro/`) and the watch-party countdown (`src/countdown/`) are built together by `src/scenes.vite.config.js` into `src/public/vendor/scenes/`, so three.js and the particle code in `src/shared/particles/` are one shared chunk (about 530 kB) instead of being bundled into each scene. The entries keep fixed paths because the app loads them by URL at runtime, and the outputs are committed. DOM-free helpers used by the web app, the player bundle and the server alike (clock format, member colours, party states, episode codes, request scopes, party size) live in `src/public/js/shared/`: the app loads them as they are, the player bundles them and Node imports them directly.

The Outfit font is self-hosted: the woff2 files live in `src/public/assets/fonts/`, the `@font-face` rules in `src/public/css/fonts.css`. Nothing is loaded from Google Fonts.

When working on the player, run the watcher alongside the server:

```bash
npm run player:watch
npm run dev
```

Run tests:

```bash
npm test
```

After `npm run build`, `npm run check:legacy` checks that the built scripts parse in Chromium 68 (the TV browsers below). With a running server, `npm run test:e2e` drives a headless Chromium through the TV interface (arrow keys only, at 1920, 1280 and 960 px) and the trailer scroller; it needs `VANTA_E2E_URL`, `VANTA_E2E_USER` and `VANTA_E2E_PASSWORD` and writes screenshots to `tests/e2e/output`.

### Versioning

Every release has a number like `1.01`: the part after the dot counts up per release branch (`1.01`, `1.02`, …) until the next minor release (`1.1`). The number lives in `src/public/js/shared/version.js` (`APP_VERSION`); `package.json` carries the same number as semver (`1.01` is `1.0.1`, `1.1` is `1.1.0`), and a test keeps both in step. Bump both with every release.

Users and admins see the version at the bottom of the settings dialog. The server reports its release from `GET /api/version` and in `APP_SOCKET_READY`; the update overlay shows the step from the tab's own release to the server's (`1.01 → 1.02`) and leaves the arrow out when only the build changed.

## How It Works

The browser does not talk to Jellyfin directly. All communication goes through the Express backend:

- Jellyfin login with a server-side session, a fresh session id per login and the Jellyfin token revoked on logout
- login throttling: three wrong passwords for one username from one address lock it for a minute, every further three double the lock up to 24 hours (an address trying many usernames is locked after 20); a successful login or a day without failures starts over, and locked attempts never reach Jellyfin
- HTTP-only session cookies instead of browser-stored tokens
- a Jellyfin device id per login, so Jellyfin keeps each browser's session (and transcoding progress) apart
- proxy routes for media, images, playlists, and playback reporting
- normalized Jellyfin data for the SPA
- local data for media requests, ban lists, and VANTA-specific admin rules

The frontend is a hash-based single page app without a framework. Pages and components are organized as ES modules and loaded dynamically.

## Features

VANTA adds app-level workflows and playback features on top of Jellyfin:

- **WatchTogether**: shared watch parties for up to four people. One lobby screen shows the title's artwork and four seats; after the host starts, everyone's player preloads a few seconds of video behind the lobby, and a three.js particle countdown (exactly five seconds, from the server clock) hands over to playback that starts on every client at the same server time. Owner/admin controls, participant management (the host can make members admins and take it back; only the two people involved are told) and reconnect handling included; viewers without admin rights get no transport controls. Notifications name the person with their avatar, a ten-second jump shows a bubble with the name on every screen, the settings flyout lists who is in sync, and at the end of an episode everyone sees the same next-episode prompt (only admins can cancel or skip) before the next episode preloads and starts for all at once. The watch-party dialog lists „Zuletzt dabei“: parties the user joined that are still running and they are not banned from (`GET /api/watch-parties/recent`, kept in memory).
- **WatchTogether invitations**: invite users directly inside VANTA by exact username, with persistent accept/decline invitation notifications across the app.
- **Media requests**: search TMDB and request a missing movie, a whole series, single seasons or single episodes — also seasons or episodes still missing from a series that is already in the library (the cross-check compares episode by episode). Every hit opens its request page; „Meine Anfragen“ tracks the status and marks new answers.
- **Request moderation**: admin approval/rejection flow for requested media, including local request and rejection history.
- **Problem reports**: under „Meldung“ (or „Problem melden“ on a title's page) users report a problem with a movie, a whole series, one season or one episode — missing German audio, poor resolution, playback trouble or a free-text issue. Admins find them under Anfragen > Offen next to media requests, mark them „Erledigt“ or „Verworfen“, and get them on Discord if the webhook is set. Red dots in the menu (at Meldung/Anfragen, and for admins at the gear, Admin-Tools and Anfragen) show unseen answers and open work; they update live over the app socket.
- **Custom VANTA player**: Vite-built streaming player with custom controls (play/pause between labelled ten-second seek buttons), one animated settings flyout behind a gear button for subtitles, audio track, quality, episodes, party members and help, Jellyfin playback reporting, and backend-resolved HLS/playback URLs.
  - **Keyboard, mouse and touch**: space/K pause, ←/→ (J/L) seek ten seconds, ↑/↓ change the volume, M mute, F fullscreen, C subtitles, 0–9 jump to 0–90 %; double click toggles fullscreen, the wheel changes the volume over the volume icon and seeks over the timeline; double tap on the left or right third seeks. `?` or „Hilfe“ in the flyout opens a half-transparent overview. Media keys and lock-screen controls go through the Media Session API.
  - **Preferences**: volume, mute, subtitle and audio language and subtitle style (size, background) are remembered in `localStorage` when watching alone; a watch party starts from the defaults and remembers choices only for that party in `sessionStorage`.
  - **Intro/outro segments**: `GET /api/media/segments/:id` combines, per segment type, Jellyfin's media segments, the Intro Skipper plugin's own results (`/Episode/{id}/IntroSkipperSegments`, which it does not always hand to Jellyfin) and chapter names („Intro“, „Credits“, „Intro start/Intro end“ pairs; credits in the first quarter count as the intro). Intros and recaps get a „überspringen“ button (skipped automatically only when the user chose so under Einstellungen → Wiedergabe); with an outro the next-episode prompt appears when the credits start instead of at a fixed percentage, and the next episode starts ten seconds after the prompt (unless autoplay is off).
  - **Sleep timer**: in the settings flyout — 15/30/60/120 minutes, a custom time or „bis zum Ende“ (the start of the credits, else the end of the file). It counts playback time only, warns one minute before with a cancel button, then closes the player and returns to the title playback started from. Not in watch parties.
  - **„Schaust du noch?“**: after hours of playback without any input (4 h by default, 2/3/6 h or off in the settings), also across an autoplay chain, the video pauses and asks; „Nein“ leaves the player. Not in watch parties.
  - **AirPlay**: on Safari a button appears while an AirPlay receiver is around (not in watch parties).
  - **Loading progress**: the loading cover, the seek/buffer spinner and the party's ready button show a real percentage with the time left: buffered seconds plus the bytes of the HLS segment downloading right now, against four seconds of video. Before the first byte it shows Jellyfin's transcoding progress through the segment it needs (`GET /api/media/playback/:id/transcode-progress`, from the session's completion and encoding frame rate), and while Jellyfin reports nothing yet an estimate from earlier load times in this browser, marked „ca.“. The seek spinner stays until playback really moves on.
  - **Stream limit**: switching audio track, quality or to HLS names the session it replaces, so it never counts as a second stream; a real stream-limit error shows a popup and returns home.
- **Mobile-first player behavior**: the player never demands landscape; its fullscreen button turns a phone's video sideways where the browser allows it (Android) and fills the screen on an iPhone, keeping the VANTA controls instead of falling back to the native iOS video player.
- **Opening scene**: a three.js particle animation of the VANTA logo covers every page load before anything of the app is visible. It plays at most once per ten minutes per browser (`localStorage` key `vanta.intro.lastPlayedAt`) and is skipped on `#/player/…` and `#/watch-party/…` deep links. Source in `src/intro/`, built to `src/public/vendor/scenes/`.
- **Trailer scroller**: dedicated trailer feed using YouTube trailers derived from Jellyfin metadata; only the trailer in view has a player, and trailers YouTube no longer plays (private, removed) are left out (checked through YouTube's oEmbed answer, cached for a day).
- **Publisher/studio hubs**: curated publisher views for studios and services such as Disney, Warner Bros., Netflix, Apple TV, Prime Video, and HBO.
- **Admin user tools**: manage Jellyfin users from VANTA, including user details, password changes, library access, local bans, and VANTA-specific stream limits. A ban takes effect at once: the user's sessions end, their Jellyfin tokens are revoked, open apps and watch parties are disconnected, and every tab lands on the login with the reason. Every authenticated request checks the ban list (kept in memory, re-read within a second when `db/user/banned.json` changes).
- **User rules outside Jellyfin**: local ban lists, rejected-request lists, and per-user VANTA settings stored separately from Jellyfin.
- **Profile hub**: a head with what the user has watched (films, episodes, series, time, favourite genres; `/api/media/profile/stats`, kept five minutes) in front of the last title, then a row each for continue watching, „Meine Liste“, favorites and history; each list also opens whole as a grid (`#/profile?tab=continue`, `#/watchlist`, `#/favorites`, `#/profile?tab=history`).
- **Meine Liste**: a watch-later list per user (`watchlist` in `db/requests.db`, apart from Jellyfin's favourites): a button on the detail page, a home row, a profile row and list, a bookmark on cards. A film leaves the list once it was watched to the end after it was added.
- **Media context menu**: long press (touch), right click (mouse) or the menu key on a card or the hero: continue watching, Meine Liste, out of „Weiter schauen“ (with undo; a series is hidden until an episode is played again), copy a share link (always the detail page, the series for an episode), details, played/unplayed and „Watch Party starten“.
- **Progress on every card**: cards from the catalogue ask in bundles, once visible, for the viewer's progress (`GET /api/media/userdata`, cached a minute); a started series shows its next episode („S2 E4 als Nächstes“).
- **Search**: typo-tolerant (exact > prefix > word start > contains > up to two typos), also through cast and crew (`catalog_item_people`), with a „Personen“ row, filters for type, genre, decade, age rating and unwatched (kept in the hash) and the last ten searches per device.
- **Screensaver**: on the home page after a while without input (default 10 minutes, on/off and 5–30 minutes in the settings): backdrops of titles the user may see with title, details and the time; input shows the controls, Escape ends it. The button at the top right (in TV mode in the sidebar) starts it at once on any page.
- **Settings**: a hub of areas — account, notifications, playback (default quality, audio and subtitle language, autoplay, intro skip, „Schaust du noch?“), appearance (TV mode, opening scene, less motion, screensaver) and devices (pair a TV, sign out other sessions). Playback and appearance settings are kept per user on the server (`user_preferences`, `GET/PUT /api/preferences`) and follow the user to every device.
- **Admin dashboard** (`#/admin`): server and Jellyfin state, active streams (direct or transcoded), open requests and reports, catalogue (with a sync button), storage, watch parties, recent requests, reports, logins and bans, refreshed every ten seconds; plus a message to all users. Library access per user is a list grouped by kind with title counts and a save bar with undo.
- **Server-side Jellyfin gateway**: browser requests go through the Express backend with HTTP-only sessions, normalized media data, image/media proxying, and playback reporting.

## Notifications

The bell in the navbar lists the last 50 notifications; push notifications reach the devices where the user switched them on (Einstellungen → Benachrichtigungen, also in the installed app; on iPhone and iPad only from the home screen, iOS 16.4 or later). Per kind the user chooses push and/or the list: decided requests, requested titles that arrived, handled reports, new episodes of series on the list or in „Weiter schauen“, new titles (off by default, bundled per catalogue run), watch-party invitations, a new VANTA version (off by default), messages from admins and, for admins, new requests and reports.

Push uses the Web Push standard with VAPID keys VANTA makes itself on the first start (kept in `app_settings`); set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` to use your own. No account at any push service is needed. Browsers without a push service (Helium, ungoogled Chromium, Brave with Google push off) cannot subscribe; there the switch turns on system notifications from the open app instead (`NOTIFICATION_PUSH` on the app socket), which arrive while a VANTA tab is open. Subscriptions a push service no longer knows are dropped, entries older than 90 days are pruned. New titles and episodes are only announced after update runs of the catalogue, never after the first fill or a full run.

## TV Mode

TV browsers from about 2020 on are supported (Chromium 68: webOS 5, Tizen 5.5 and newer): the build lowers the syntax to them and `js/polyfills.js` adds the few missing APIs. On a Samsung (Tizen), LG (webOS), Android/Google TV or Fire TV browser VANTA switches to a 10-foot interface by itself; a screen that only looks like a TV is asked once, and every device can switch it under Einstellungen → Darstellung or with `?tv=1` / `?tv=0` in the address (kept per device in `localStorage`, `vanta.tvMode`).

- one scale for every TV (1rem is 1.25 % of the screen width), a sidebar instead of the navbar, a safe area against overscan, no blur; the admin area is not part of it
- the arrow keys move the focus to the nearest element (rows keep left/right, columns such as the sidebar and the search results keep up/down, rows and groups remember their last focus, open dialogs keep the focus, every page brings back its focus with „Zurück“); OK activates; the menu key opens the actions of a card (Meine Liste, gesehen); Back closes a dialog, steps back in the settings, closes the sidebar or the player and asks before leaving the app from the home page
- the settings as a full screen with the areas that make sense on a TV (playback, appearance, account)
- an on-screen keyboard (next to the results in the search, over the page for any other field)
- in the player: OK pauses, holding left/right spools faster with the target time shown, up/down bring the controls; media keys work
- sign in with a phone: the TV shows a code and a QR code; a signed-in phone confirms it under `#/connect` (also Einstellungen → Geräte → „Fernseher verbinden“). This approves a Jellyfin Quick Connect request, so the TV gets a session and token of its own — Quick Connect must be enabled in Jellyfin (Dashboard → Allgemein). Codes last five minutes, work once and are throttled like passwords.
- Tizen and webOS browsers get a device profile that plays HEVC, AC3/E-AC3 and MKV directly (every other client keeps HLS); a file that does not start within 20 seconds falls back to HLS.

## Watch Party Sync

Playback in a watch party follows one timeline held by the server: a position, whether it is playing, the server time it was anchored at and a sequence number that grows with every change. Clients never compare server timestamps with their own clock:

- **Server clock**: right after connecting (and every 30 seconds) each client exchanges `TIME_PING`/`TIME_PONG` messages and keeps the offset from the round trip with the lowest latency.
- **Timeline messages**: play, pause and seek from an admin become a `TIMELINE` message for everyone; older sequence numbers are dropped and the sender recognises its own command instead of applying it twice.
- **Drift loop**: every 500 ms each client compares its player with the timeline. Up to 120 ms it does nothing, up to two seconds it nudges the playback rate by 2–6 %, beyond that it seeks once (aiming ahead by the measured seek time).
- **One heartbeat**: only the sync leader (the owner, or the longest-joined connected admin) reports its position, and the server only corrects the timeline from it when that player has been playing smoothly for ten seconds.
- **Start**: the countdown's timeline is anchored at its end, so every client starts on its own at that server time with an already buffered stream.
- **Presence**: every client reports its player state (in sync, correcting, buffering …), drift and buffered seconds; the server relays them as `PRESENCE` for the member list in the settings flyout.
- **Waiting for buffering**: if a member has been stuck buffering for three seconds, the party pauses (250 ms past the server position, so nobody jumps back) with a „Warte auf …“ pill. It resumes together (anchored one second ahead) once that member and anyone else still loading has three seconds of video again, with no time limit. A waited-for member who drops out gets 20 seconds to come back. An admin's play goes on at once; only the host can switch the wait off for the session.
- **Next episode**: an admin's switch (or the prompt running out) moves the party to `switching`: every client loads the new episode paused at 0:00 without a click and reports ready; when all connected members are ready, or after 20 seconds, the timeline starts one second ahead for everyone, without a countdown.

For debugging, `?wpSkew=3000` in the URL makes a tab pretend its clock runs three seconds ahead (the sync must absorb it), and `localStorage.setItem('vanta.debug.sync', '1')` shows drift, rate, round trip and sequence number on the watch-party page.

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

The directory is git-ignored and safe to delete at any time; missing renditions are simply rendered again. For a library of around 480 titles expect a few hundred MB at most. The cache is capped at 2 GB (`IMAGE_CACHE_MAX_MB`); beyond that the least recently used renditions are deleted down to 90 %.

The renditions are shared by all users, so every request is checked against the user's access first: movies and series through the catalogue and the user's libraries, everything else (seasons, episodes, people) by asking Jellyfin once per user and item (remembered for ten minutes). A title from a library the user cannot see gets the placeholder. Image responses are `Cache-Control: private`. Resizing needs the `sharp` package (installed with `npm install`); if its native binary cannot be loaded, VANTA logs a warning at startup and proxies images straight from Jellyfin as before.

## Operations

- `GET /api/health` (no session needed) answers `200 {"status":"ok"}` with the version, uptime, Jellyfin's reachability and whether the catalogue is ready, or `503` with `"degraded"` while Jellyfin cannot be reached. Jellyfin is pinged at most every ten seconds however often it is polled.
- SIGINT/SIGTERM (pm2, systemd, Ctrl+C) close the sockets, write every database and exit within 1.5 s. An uncaught exception writes the databases and exits so the process manager restarts it; unhandled promise rejections are logged.
- Unknown `/api/*` paths answer a JSON 404. The access log leaves out the query of playback proxy requests and masks token-like parameters elsewhere.

## Important Notes

- In production, `SESSION_SECRET` must be set to a long, random value.
- If VANTA is served behind HTTPS, set `COOKIE_SECURE=true`. Behind a reverse proxy, `TRUST_PROXY` decides which proxies may pass on the visitor's address and protocol (`X-Forwarded-For`/`-Proto`); the default trusts loopback and private networks, which covers a proxy on the same host or LXC bridge. Set it to `false` when VANTA is reachable directly.
- `TMDB_API_KEY` and `JELLYFIN_API_KEY` are required; the server will not start without them. Create the Jellyfin key under Dashboard > API Keys.
- After changing files in `src/player/`, run `npm run player:build` so `src/public/vendor/player/` stays up to date; after changes in `src/intro/`, `src/countdown/` or `src/shared/particles/`, run `npm run scenes:build`.
- VANTA is not a full Jellyfin Web replacement. Its focus is a custom, streamlined streaming and media browsing experience.
