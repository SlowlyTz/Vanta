# How the features work

## Sign-in and sessions

Jellyfin checks the password; VANTA keeps the token in the session and gives each login its own device id, so Jellyfin keeps browsers apart. The session cookie lasts for the browser session unless „Angemeldet bleiben“ is ticked.

Wrong passwords: three per username and address lock for a minute, each further three double it up to 24 h; 20 usernames from one address lock the address. A ban (Admin → Benutzer) ends all sessions, revokes the Jellyfin tokens and closes the user's sockets at once.

## Player

- Built separately (`src/player/`, vidstack + hls.js on demand). Keys: Space/K, ←/→ ±10 s, ↑/↓ volume, M, F, C, 0–9; `?` shows all.
- **Segments** (`/api/media/segments/:id`): Jellyfin media segments, Intro Skipper results and chapter names, merged per type. Intro/recap get a skip button (automatic if set); the credits start the next-episode prompt, which starts the episode after 10 s.
- **Sleep timer**, **„Schaust du noch?“** (after 4 h without input by default), **AirPlay** on Safari; none of them in watch parties.
- **Loading**: progress from buffered seconds and the segment in flight, before that Jellyfin's transcode progress. A failed start names its reason; after 40 s without a picture the cover says so.

## Watch party

Up to four people. The server holds one timeline: position, playing, the server time it was anchored at, and a sequence number.

- Clients measure their clock offset with `TIME_PING`/`TIME_PONG` (lowest round trip wins, every 30 s).
- Admin play/pause/seek becomes a `TIMELINE` message; old sequence numbers are dropped.
- Every 500 ms each client compares with the timeline: ≤120 ms nothing, ≤2 s playback rate ±2–6 %, beyond a seek.
- Only the sync leader (owner, else longest-joined admin) reports position; it corrects the timeline only after 10 s of smooth playback.
- A member buffering for 3 s pauses everyone („Warte auf …“) until all have 3 s of video again.
- The start countdown and episode switches anchor the timeline ahead, so all start on their own at the same server time.

Debug: `?wpSkew=3000` fakes a clock 3 s ahead; `localStorage['vanta.debug.sync']='1'` shows drift and rate.

## TV mode

On by itself for Tizen, webOS, Android/Google TV and Fire TV browsers, asked once on TV-like screens, switchable per device (Einstellungen → Darstellung, `?tv=1` / `?tv=0`). Supported from Chromium 68 (webOS 5, Tizen 5.5).

- `html.tv-mode`, 1 rem = 1.25 % of the width, `css/bundles/tv.css`; sidebar instead of navbar; no admin area.
- **Focus engine** (`js/tv/focusEngine.js`): arrow keys move to the nearest element, line by line vertically.
  - `[data-tv-row]` keeps left/right inside; card rows remember their last card and stop at their end.
  - `[data-tv-column]` keeps up/down inside (sidebar, settings areas).
  - `[data-tv-group]` remembers its last focus (settings menu).
  - `[data-tv-autofocus]` is where a page starts.
  - A page opened anew starts at its top. „Zurück“ restores the focus it had, keyed to the history entry.
- **Keys** (`js/tv/keys.js`, `back.js`): Back closes a dialog → steps back in settings → closes the sidebar → leaves the player → asks before leaving from home. The menu key opens a card's actions.
- **On-screen keyboard** for every text field. **Player**: OK pauses, holding ←/→ spools, ↑/↓ show the controls.
- **Sign-in by phone**: the TV shows a code and QR; `#/connect` on a signed-in phone approves a Jellyfin Quick Connect request (must be enabled in Jellyfin). Codes last 5 min.

## Notifications

`notify.service.js` is the only way to notify. Per user and kind it decides the bell list (`inApp`) and push; kinds and defaults live in `js/shared/notificationKinds.js`. New titles and episodes are announced only after catalogue update runs.

Push is Web Push with VANTA's own VAPID keys. The server accepts endpoints only of known push services (FCM incl. `*.google.com`, Mozilla, Apple, WNS). A subscription made with another key is replaced, a refused test renews it once, and 404/410 answers drop it.

Browsers without a push service (Helium, ungoogled Chromium) cannot subscribe. There the switch turns on a fallback: every push is also sent as `NOTIFICATION_PUSH` over `/ws/app`, and the tab shows it as a system notification while VANTA is open.

## Search

From the catalogue: exact > prefix > word start > contains > up to two typos, also through cast and crew. Filters: type, genre, decade, age rating, unwatched; kept in the hash. The last ten searches are kept per device.

## Requests and reports

Requests search TMDB for movies, series, seasons or single episodes; the cross-check against Jellyfin works episode by episode, so missing parts of an existing series can be requested. Admins approve or reject; rejected titles go to `db/banned.json`. Reports name a title (down to an episode) and a problem. Both can go to Discord, and the user's dots update live.

## Lists and profile

- **Meine Liste** (`watchlist`): per user, apart from Jellyfin favourites. A film leaves it once watched to the end after it was added.
- **Weiter schauen**: grouped per series; hiding an entry lasts until an episode is played again.
- **Cards** fetch the viewer's progress in batches once visible (`/api/media/userdata`, cached 1 min).
- **Profile** (`#/profile`): watch stats from all played items (`/api/media/profile/stats`, cached 5 min per user), then a row per list. The full lists are `#/profile?tab=continue`, `#/watchlist`, `#/favorites`, `#/profile?tab=history`.

## Trailer scroller

YouTube trailers from Jellyfin metadata. Only the slide in view has a player. Videos YouTube no longer plays are filtered by its oEmbed answer, cached for a day.

## Smaller pieces

- **Opening scene**: a three.js logo animation over the first paint, at most once per 10 min per browser (`vanta.intro.lastPlayedAt`), skipped for player and party links, reduced motion, TV start, and any key or click.
- **Screensaver**: on home after 10 min without input (5–30 min or off in the settings), backdrops of titles the user may see; the navbar or sidebar button starts it anywhere.
- **Card menu**: long press, right click or the remote's menu key: continue, Meine Liste, remove from „Weiter schauen“ (with undo), share link, details, watched, start a watch party.
- **Publishers**: curated studio and service hubs (Disney, Warner Bros., Netflix, …) from the catalogue's studios.
- **Admin dashboard** (`#/admin`, not on TVs): server and Jellyfin state, active streams, open work, catalogue, storage, parties and recent activity, refreshed every 10 s.
