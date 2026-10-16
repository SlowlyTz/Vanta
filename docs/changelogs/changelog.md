# Changelog

## 1.1.1: bugfix patch

Fixes from an audit of server, client and the running app, plus what a few of them needed.

### Stability and security
- One oversized or broken WebSocket message no longer crashes the server for everyone.
- Child accounts no longer see titles, posters and trailers above their age limit: lists, search and images follow Jellyfin's parental control. **Nutzerverwaltung** sets the FSK age and "Titel ohne Altersfreigabe sperren" in Jellyfin.
- A deleted account is signed out on every device at once, and the login says "Dein Konto wurde gelöscht." Accounts deleted in Jellyfin itself are signed out too.
- Housekeeping no longer deletes the watchlist, settings and push subscriptions of a user created in the last ten minutes.
- A failing auto-update (a file in the way, a full disk) no longer keeps the server from starting.
- The daily full catalogue run is no longer skipped while an update runs: it tries again every ten minutes, up to ten times, then notifies the admins ("Probleme beim Katalog-Abgleich", bell and push, can be switched off).
- Long-running server caches are bounded, and old watch-party invitations are cleared.

### TV
- The player starts on webOS 5 (Chromium 68) again.
- The remote's Back leaves the player after seeking, the focused player control has a visible ring on older TVs, and the hidden ready-room player and the "Erneut versuchen" cover no longer take OK and the arrows.
- Leaving a page before it loaded no longer shows a loading error.
- The arrows leave a text field at its edge (the code on `#/connect`), and the trailer scroller leaves the arrows to open dialogs.

### Player and streams
- An open player counts as a stream until it is closed, paused too; one device holds one stream, and leaving a player before it started frees its slot at once.
- Closing or reloading a tab sends the stop, so the stream limit is free again.
- A failed quality or audio switch shows the old choice again and says so.
- Rewatching a film after its end saves progress again.
- Scrolling works right after leaving the player.

### App
- Watch parties live as long as anyone is in them; the dialog offers "Weiterschauen" for each live party, next to "Neue Watch Party starten". Restarting an ended party is gone.
- "Weiter schauen" shows current progress right after watching.
- The trailer scroller has "Meine Liste" instead of "Favorit", with the right state.
- Movie request details keep cast, genres and runtime.
- Phones: "Geräte → Code eingeben" no longer bounces back, and the navigation drawer closes with Back and on every page change.
- Taking the last title off "Meine Liste" removes its row.
- The trailer scroller stays at the top when the focus moves.
- Every error the user sees is German.

---

## 1.0 → 1.1

VANTA 1.1 brings together two update branches: `update-1.01` (fixes, security and performance) and `update-1.02` (new features, the TV interface and polish).

## 1.1 at a glance

- **TV mode** for Samsung, LG and Android TVs, with remote control, an on-screen keyboard, a sidebar and sign-in by phone code.
- **Meine Liste**, a watch-later list for films and series.
- **Notifications** in the app, with a bell and Web Push.
- **New player features**: sleep timer, "Schaust du noch?", the next episode after ten seconds, AirPlay, and direct play on TVs.
- **Better search**: forgives typos, finds people, has filters and remembers recent searches.
- **New settings** as a hub of areas, with preferences stored per user on the server.
- **Admin dashboard** and a new library access editor.
- **New profile page** with your own watch stats.
- **Security, stability and performance work** across server and client.

---

## Update 1.02: features

### TV interface
- **Detection and mode switch:** Known TV browsers start in TV mode before the first paint. A TV-like screen is asked once, and the choice is kept per device (settings, or `?tv=1` / `?tv=0`).
- **Remote keys:** Arrows, OK, Back and the media keys of Tizen, webOS and Android TV work.
  - Back closes a dialog, then the sidebar, leaves the player, asks before leaving the app from home, and otherwise goes back a page.
- **Spatial focus:**
  - The arrow keys move to the nearest element.
  - Up and down go line by line, so short rows are never skipped.
  - Rows of cards bring back the last card, and the end of a row stays the end.
  - Dialogs keep the focus.
  - A page opened anew starts at its top; "Zurück" brings back the place one left.
- **Sidebar** instead of the navbar; its labels open when the focus moves in.
- **Pages adapted for TV:** home, lists, details, search, settings and profile.
  - The hero fills nearly the screen.
  - The focused card's backdrop fades in behind the page.
  - Detail pages offer "Fortsetzen" and "Von vorn".
- **On-screen keyboard:** QWERTZ with umlauts. On the search page it stands beside the results.
- **Settings on the TV:**
  - Moving over an area shows it at once, without OK.
  - Up and down stay inside an area.
  - Left returns to the area's own row.
- **Player remote control:**
  - OK plays and pauses.
  - Holding left or right spools, with the target time shown.
  - Up and down reach prompts and the controls.
  - Media keys work.
- **Direct play** of HEVC, AC3/E-AC3 and MKV on Samsung (Tizen) and LG (webOS), with an HLS fallback after 20 seconds.
- **TV sign-in with a code** confirmed on a phone (`#/connect`, Jellyfin Quick Connect).
- **Older TVs:** Builds for Chromium 68 (webOS 5, Tizen 5.5) with polyfills; `npm run check:legacy` guards the syntax.

### Player
- **Sleep timer:** presets, a custom time, or "until the end".
- **"Schaust du noch?"** after hours of playback without input; the default is 4 h and can be set.
- **Next episode:** starts ten seconds after its prompt appears.
- **AirPlay** button on Safari.
- **Clear errors:** A failed start shows its reason, with "Erneut versuchen" and "Zurück", instead of loading forever; a 40-second watchdog notices when no picture comes.
- **Playback settings follow you:** quality, languages, autoplay and intro skip apply in the player.
- The loading status resets once the cover has faded out.

### Lists, cards and actions
- **Meine Liste:**
  - Kept per user, separate from Jellyfin favourites.
  - Reached from the detail page, a home row, the profile and a mark on cards.
  - A film leaves the list once watched to the end.
- **Media actions menu** on long press or right click: continue, Meine Liste, remove from "Weiter schauen" (with undo), share, details, watched, and watch party.
- **Cards show progress,** watched state and a series' next episode.
- **Episode cards** show each episode's own still.
- **Series can be marked unwatched again,** together with all their episodes.
- **"Weiter schauen"** shows no separate season entries.
- **"Jetzt im Kino"** only lists films really in cinemas, matched by TMDB/IMDb id and release window.

### Search
- **Typo-tolerant ranking** and search by cast and crew.
- **Filters** for type, genre, decade, age rating and unwatched.
- **Recent searches** are remembered per device.

### Notifications
- **Bell and Web Push** (VAPID) for requests, reports, new titles and episodes, watch party invites, new versions and admin work, configurable per kind.
- **Admin messages** to all users.

### Settings and profile
- **Settings dialog** rebuilt as a hub: account, notifications, playback, appearance and devices (sign out other sessions).
- **Preferences** are stored per user on the server (`/api/preferences`).
- **Screensaver** after idle on home, or started at once from the navbar.
- **New profile page:**
  - A head with your own numbers (films and episodes watched, series, total time, favourite genres) in front of the last title you watched.
  - A row for each list below it.
  - Each list also opens whole as a grid.

### Trailer scroller
- **Trailers keep playing** while scrolling: only one active YouTube player at a time, and unplayable videos are left out.
- **New look** for phone, desktop and TV.

### Admin
- **Dashboard:** server and Jellyfin state, active streams, open work, catalogue sync, storage, watch parties and recent activity.
- **Library access editor:** a grouped list with a save bar and undo.

### Fixes
- Unknown titles answer 404 and show "not available".
- Library access is read from the user's policy, not their views.
- Cached API answers no longer bring back the update overlay.

### Testing
- **End-to-end checks** (`npm run test:e2e`) drive the TV interface with the arrow keys only and check that scroller trailers really play.

---

## Update 1.01: fixes, security and performance

### Security
- **Dependencies** with known vulnerabilities updated (npm audit, sharp 0.35).
- **TMDB request details** need a session, and ids are validated.
- **Failed logins** are throttled with a doubling lock; a login gets a fresh session id, and logout revokes the Jellyfin token.
- **Bans** end every session and socket at once.
- **Hardened WebSockets:** origin check, size cap, rate limit and heartbeat.
- **Images** are cached only for users who may see the item; the cache is capped at 2 GB.
- **Reverse proxy** trusted for client address and protocol (`TRUST_PROXY`).

### Stability
- **Atomic writes** for databases and JSON stores.
- **Clean shutdown** on SIGINT and SIGTERM.
- **Timeouts** for Jellyfin calls instead of hanging.
- **Health endpoint** `GET /api/health`, JSON 404s for unknown API paths, and error logging.
- **Jellyfin 12 support:** box sets in the catalogue sync, and the standard Authorization header.

### Performance
- **Page scopes:** each page cleans up its timers, observers and requests when it is left.
- **Area stylesheets** load with their page; the shell CSS went from 248 to 120 KB.
- **Smaller bundles:** three.js is shared, and hls.js loads only when needed.
- **Library restore** in one request, with offscreen cards skipped.
- **Navbar** is no longer rebuilt on every scroll event.
- **Service worker** caches hashed build files and posters.
- **Hero carousel timer** stops when the home page is left.

### Accessibility
- **Dialogs** share one helper: focus trap, Escape, inert background.
- **Cards are links** and cast entries are buttons.
- **Hero, intro, toasts and search** are accessible, and a skip link leads past the navigation.
- **Shared store and empty-state code.**

### Versioning
- **App versions** starting at 1.01: shown in the settings, and the update overlay names the step from the old version to the new one.
