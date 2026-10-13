# Configuration

## Environment (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `JELLYFIN_BASE_URL` | – (required) | Jellyfin address as the server reaches it |
| `JELLYFIN_API_KEY` | – (required) | Used by the catalogue sync, which runs without a user session |
| `TMDB_API_KEY` | – (required) | Requests, metadata, „Jetzt im Kino“ |
| `SESSION_SECRET` | placeholder | Must be set in production, or the server does not start |
| `PORT` | `3000` | |
| `NODE_ENV` | `development` | `production` serves the Vite build from `dist/` |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS, also when a proxy terminates TLS |
| `TRUST_PROXY` | loopback + private networks | Who may set `X-Forwarded-For/-Proto`. `false` when VANTA is reached directly, a number for N hops |
| `TMDB_REGION` | `DE` | Region for „Jetzt im Kino“ |
| `TMDB_REQUEST_TIMEOUT_MS` | `2500` | |
| `IMAGE_CACHE_DIR` | `cache/images` | Resized posters/backdrops; relative to the repo root |
| `IMAGE_CACHE_MAX_MB` | `2048` | Least recently used renditions go beyond it (down to 90 %) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | generated | Web Push keys. Without them a pair is made on first start and kept in `app_settings`. Changing them invalidates every push subscription |
| `VAPID_SUBJECT` | `mailto:admin@usevanta.de` | Contact the push services see |
| `AUTO_UPDATE` | `true` | In production each start pulls and builds a newer `origin/main` first ([setup](setup.md#deploying-an-update)); `false` turns it off |
| `UPDATE_BACKUP_DIR` | `backups` | Where `db/` is copied before an update; the newest five stay |

## Settings in the app

Kept in `db/`, changed by admins in the app:

| Where | What |
|---|---|
| Admin → Einstellungen → Katalog | Update interval (1–60 min, default 10), daily full sync (default 03:00), manual run |
| Admin → Einstellungen → Discord | Webhook for new requests and reports (must be a `discord.com/api/webhooks/…` URL) |
| Admin → Benutzer | Library access, password, ban, concurrent streams (default 1) |
| Admin dashboard | Message to all users as a notification |

Per user, synced to every device (`user_preferences`): default quality, audio/subtitle language, autoplay, intro skip, „Schaust du noch?“ time, opening scene, reduced motion, screensaver. Per device (`localStorage`): TV mode (`vanta.tvMode`), player volume and subtitle style, push fallback (`vanta.push.local`).

## Runtime data

Everything below is git-ignored. Back up `db/` before updates.

| Path | Content |
|---|---|
| `db/requests.db` | Requests, reports, TMDB cache, notifications and push subscriptions, watchlist, preferences, hidden resume entries, `app_settings` |
| `db/catalog.db` | Mirror of all movies and series with genres, studios, people; rebuilt by a sync if lost |
| `db/sessions.db` | Login sessions |
| `db/banned.json` | Rejected TMDB titles |
| `db/user/banned.json` | Banned users (re-read within a second when edited) |
| `db/user/settings.json` | Per-user stream limits |
| `cache/images/` | WebP renditions; safe to delete |
| `backups/` | `db/` copies made before each update |

Jellyfin stays the source of truth for accounts, passwords, libraries, admin rights, watched state and favourites.

## Playback quality

`auto`/`direct` pass the file through when the client can play it. Fixed profiles cap the transcode: 1080p 8 Mbit/s, 720p 4, 480p 2, 360p 1 (`src/server/services/playback/qualityProfiles.js`).
