# How the features work

## Sign-in and sessions

Jellyfin checks the password; VANTA keeps the token in the session and gives each login its own device id, so Jellyfin keeps browsers apart. The session cookie lasts for the browser session unless „Angemeldet bleiben“ is ticked.

Wrong passwords: three per username and address lock for a minute, each further three double it up to 24 h; 20 usernames from one address lock the address. A ban or a deletion (Admin → Benutzer) ends all sessions, revokes the Jellyfin tokens and closes the user's sockets at once; the login page says why. Accounts deleted in Jellyfin itself are signed out after the next catalogue run.

## Player

- Built separately (`src/player/`, vidstack + hls.js on demand). Keys: Space/K, J/L and ←/→ ±10 s, ↑/↓ volume, M, F, C, Esc, 0–9; `?` shows all (generated from `player/shortcuts.js`). Pausing while a stream is still being prepared waits for it instead of breaking the start.
- **Segments** (`/api/media/segments/:id`): Jellyfin media segments, Intro Skipper results and chapter names, merged per type. Intro/recap get a skip button (automatic if set); the credits start the next-episode prompt, which starts the episode after 10 s.
- **Sleep timer**, **„Schaust du noch?“** (after 4 h without input by default), **AirPlay** on Safari; none of them in watch parties.
- **Loading**: progress from buffered seconds and the segment in flight, before that Jellyfin's transcode progress. A failed start names its reason in German; after 40 s without a picture the cover says so. The cover has its own back button.

## Watch party

Up to four people. The server holds one timeline: position, playing, the server time it was anchored at, and a sequence number.

A party lives as long as anyone is connected, the owner or not; nobody connected for 5 min and it is over (the owner can also end it). The watch-party dialog offers „Weiterschauen“ for each live party the user was in, next to „Neue Watch Party starten“; a title picked in the dialog is confirmed before the party is created. Invitations go by exact username to accounts that signed in (also from a stored session after a restart), never to someone banned from the party.

- Clients measure their clock offset with `TIME_PING`/`TIME_PONG` (lowest round trip wins, every 30 s).
- Admin play/pause/seek becomes a `TIMELINE` message; old sequence numbers are dropped.
- Every 500 ms each client compares with the timeline: ≤120 ms nothing, ≤2 s playback rate ±2–6 %, beyond a seek.
- Only the sync leader (owner, else longest-joined admin) reports position; it corrects the timeline only after 10 s of smooth playback.
- A member buffering for 3 s pauses everyone („Warte auf …“) until all have 3 s of video again.
- The start countdown and episode switches anchor the timeline ahead, so all start on their own at the same server time.

Debug: `?wpSkew=3000` fakes a clock 3 s ahead; `localStorage['vanta.debug.sync']='1'` shows drift and rate.

## TV mode

On by itself for Tizen, webOS, Android/Google TV and Fire TV browsers, asked once on TV-like screens, switchable per device (Einstellungen → Darstellung, the „TV-Ansicht“ / „Normale Ansicht“ button on the login page (not on phones; on a TV it asks first), `?tv=1` / `?tv=0`). The choice is kept in the browser (`vanta.tvMode`). Supported from Chromium 68 (webOS 5, Tizen 5.5).

- `html.tv-mode`, 1 rem = 1.25 % of the width, `css/bundles/tv.css`; sidebar instead of navbar; no admin area.
- **Focus engine** (`js/tv/focusEngine.js`): arrow keys move to the nearest element, line by line vertically.
  - `[data-tv-row]` keeps left/right inside; card rows remember their last card and stop at their end.
  - `[data-tv-column]` keeps up/down inside (sidebar, settings areas).
  - `[data-tv-group]` remembers its last focus (settings menu).
  - `[data-tv-autofocus]` is where a page starts. A row entered the first time starts at its chosen tab or first visible card; left into the sidebar lands on the current page.
  - A page opened anew starts at its top. „Zurück“ restores the focus it had, keyed to the history entry.
- **Keys** (`js/shared/remoteKeys.js`, `tv/back.js`): Back first steps back inside a dialog (settings areas), then closes it → closes the sidebar → a step of the page itself (search filters) → leaves the player → asks before leaving from home. The menu key opens a card's actions. Abmelden in the settings asks first.
- **On-screen keyboard** for every text field (text fields never take the focus by themselves, which would open the TV's keyboard). **Player**: OK pauses, holding ←/→ spools (also from the big play button while paused), ↑/↓ show the controls. **Trailers** play full screen: OK pauses, ←/→ jump 10 s.
- **Sign-in by phone**: the TV shows a code and QR; `#/connect` on a signed-in phone approves a Jellyfin Quick Connect request (must be enabled in Jellyfin). Codes last 5 min.

## Notifications

`notify.service.js` is the only way to notify. Per user and kind it decides the bell list (`inApp`) and push; kinds and defaults live in `js/shared/notificationKinds.js`. New titles and episodes are announced only after catalogue update runs.

Push is Web Push with VANTA's own VAPID keys. The server accepts endpoints only of known push services (FCM incl. `*.google.com`, Mozilla, Apple, WNS). A subscription made with another key is replaced, a refused test renews it once, and 404/410 answers drop it.

Browsers without a push service (Helium, ungoogled Chromium) cannot subscribe. There the switch turns on a fallback: every push is also sent as `NOTIFICATION_PUSH` over `/ws/app`, and the tab shows it as a system notification while VANTA is open.

## Titles in several libraries

A series whose seasons lie in different libraries (season 1 on one drive, season 2 on another) is one series: lists show its oldest copy the user can see, the detail page and the player join the seasons and episodes of all copies (each episode number once), and watched state, "next up" and "Als gesehen markieren" cover every copy. Copies share the type and the TMDB id (IMDb id without one); films must also run within 5 min of each other. A film held twice is one card whose copies are versions, chosen in the player (Einstellungen → Version, from the same spot).

Admins see real duplicates on the dashboard („Doppelte Dateien“): a film held more than once, or an episode in more than one library, each with path, library, size, picture, sound, languages and date. Files with the same id but another runtime are listed as „vermutlich falsch erkannt“ and stay separate titles until they are identified correctly in Jellyfin.

## Detail page

- **Hero**: the backdrop full-bleed on wide screens (poster beside it on phones and TVs), Jellyfin's logo instead of the name where there is one, a glow in the poster's colours, and chips for the TMDB and critic ratings, the age rating, resolution, HDR and sound of the file, and „Endet um“ for films (`pages/detail/heroFacts.js`).
- **Trailer**: after 3.5 s on a desktop the YouTube trailer fades in behind the hero, muted and looping, with a sound button; it pauses while scrolled away. Not on phones, TVs, with reduced motion or data saving (`components/backgroundTrailer.js`, `pages/detail/heroTrailer.js`).
- **Play button**: a started film shows the minutes left and a progress line; a series names the episode it continues with („S01E04 fortsetzen“). A film held twice offers its versions.
- **Rows**: „Besetzung & Crew“ as portraits with direction and script first, the film series („Harry Potter Filmreihe“, the films the library holds, how many are missing; `title-extras.service.js` via TMDB collections), „Trailer & Extras“ (YouTube trailers and extras stored in Jellyfin), then similar titles.
- **Weil du „X“ geschaut hast**: a home row of titles similar to the one finished last, without watched ones; needs at least four.

## Search

From the catalogue: exact > prefix > word start > contains > up to two typos, also through cast and crew. Filters: type, genre, decade, age rating, unwatched; kept in the hash. The last ten searches are kept per device.

## Requests and reports

Requests search TMDB for movies, series, seasons or single episodes; the cross-check against Jellyfin works episode by episode, so missing parts of an existing series can be requested. Admins approve or reject; rejected titles go to `db/banned.json`. Reports name a title (down to an episode) and a problem. Both can go to Discord, and the user's dots update live.

## Lists and profile

- **Meine Liste** (`watchlist`): per user, apart from Jellyfin favourites. A film leaves it once watched to the end after it was added.
- **Weiter schauen**: grouped per series; hiding an entry lasts until an episode is played again.
- **Cards** fetch the viewer's progress in batches once visible (`/api/media/userdata`, cached 1 min).
- **Profile** (`#/profile`): watch stats from all played items, series marked watched as a whole included (`/api/media/profile/stats`, cached 5 min per user), and under them the lists as tabs (Weiter schauen, Meine Liste, Favoriten, Verlauf), the chosen one whole as a grid. The tab is in the address (`#/profile?tab=watchlist`) and remembered per device; `#/watchlist` and `#/favorites` open their tab.

## Trailer scroller

YouTube trailers from Jellyfin metadata, with „Meine Liste“, details and share. Only the slide in view has a player; the random order of a feed is kept in server memory, not in the session. Videos YouTube no longer plays are filtered by its oEmbed answer, cached for a day.

## Smaller pieces

- **Opening scene**: a three.js logo animation over the first paint, at most once per 10 min per browser (`vanta.intro.lastPlayedAt`), skipped for player and party links, reduced motion, TV start, and any key or click.
- **Screensaver**: on home after 10 min without input (5–30 min or off in the settings), backdrops of titles the user may see; the navbar or sidebar button starts it anywhere.
- **Card menu**: long press, right click or the remote's menu key: continue, Meine Liste, remove from „Weiter schauen“ (with undo), share link, details, watched, start a watch party.
- **Publishers**: curated studio and service hubs (Disney, Warner Bros., Netflix, …) from the catalogue's studios.
- **Genres**: TMDB's English series genres are shown in German (`js/shared/genreLabels.js`); home genre rows need at least four titles; genre tags on a detail page lead to their list.
- **Top 10 heute**: two home rows ranked by TMDB's chart of the day, as far as the library has the titles, topped up from the week's chart and the popular list (`buildTopTenSections`); the films sit among the recommendations, the series further down before the genres; each rank is a large number filled with its poster's colours, half behind the poster. A row needs at least three titles.
- **Home banner trailers**: on desktops the shown title's trailer plays once over its backdrop, muted, with a sound button beside the pause button; the banner waits for it and moves on 2.5 s after it ends. The pause button stops it too; no trailers on phones, TVs, with reduced motion or data saving (`components/heroCarouselTrailer.js`).
- **Cover colours**: hovering (or focusing) a card on the home page tints the black background with the poster's colours (`components/ambientBackdrop.js`, colours from `utils/coverColors.js`), fading back when the pointer leaves the cards; not on touch screens or TVs.
- **Unknown addresses** show „Seite nicht gefunden“.
- **Admin dashboard** (`#/admin`, not on TVs): server and Jellyfin state, active streams, open work, catalogue, storage, parties and recent activity, refreshed every 10 s.
