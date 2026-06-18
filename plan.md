# Agent-Plan: Globales Jellyfin-Transcoding mit Admin-Schalter

## Ziel

Playback soll zuverlässig laufen. Dafür soll Vanta bei aktivierter globaler Einstellung für alle Inhalte Jellyfin-HLS-Transcoding anfordern:

- Ziel: H.264 Video + AAC Audio über HLS.
- Jellyfin transcodiert, nicht Vanta.
- Vanta spielt nur die von Jellyfin gelieferte Ausgabe ab.
- Es gibt keine User-Playback-Modi im Player.
- Admins können global umschalten: Transcoding aktiviert/deaktiviert.

Neuer Admin-Menüpunkt:

- `Admin tools` -> `Transcoding`
- Dort kann global für alle Inhalte `Transcoding` aktiviert oder deaktiviert werden.

## Grundsatz

Wenn Transcoding aktiviert ist:

- Backend fragt Jellyfin PlaybackInfo so an, dass Jellyfin für alle Inhalte HLS-Transcoding liefert.
- DeviceProfile bevorzugt HLS.
- Direct Play / Direct Stream sollen für diesen Modus nicht genutzt werden.
- Frontend spielt HLS:
  - Safari nativ über `<video>`.
  - Chrome/Firefox über self-hosted `hls.js`.

Wenn Transcoding deaktiviert ist:

- Backend fragt Jellyfin neutral an.
- Jellyfin darf Direct Play, Direct Stream oder Transcoding selbst entscheiden.
- Keine Frontend-Playback-Optionen wieder einführen.

## Relevante Dateien

Frontend:

- `src/public/js/components/navbar/adminPanel.js`
- `src/public/js/components/navbar/icons.js`
- `src/public/js/api/client.js`
- neu optional: `src/public/js/api/admin.api.js` oder `settings.api.js`
- `src/public/js/pages/player/playbackLoader.js`
- `src/public/index.html`
- `src/public/vendor/hls.min.js`

Backend:

- `src/server/app.js`
- neu: `src/server/routes/admin.routes.js` oder `settings.routes.js`
- neu: `src/server/services/settings.service.js`
- `src/server/db/database.js`
- `src/server/middleware/auth.middleware.js`
- `src/server/routes/media/playback.routes.js`
- `src/server/services/jellyfin/playback-api.service.js`
- `src/server/services/jellyfin/fields.js`
- `src/server/services/playback.service.js`

## Datenhaltung

Eine globale Einstellung wird serverseitig gespeichert:

- Key: `force_hls_transcoding`
- Type: boolean
- Default: `true`

Begründung Default:

- Ziel ist maximale Abspiel-Kompatibilität.
- Admin kann es global deaktivieren, falls Serverlast/Qualität wichtiger ist.

Implementierung:

- Bestehende DB-Struktur in `src/server/db/database.js` prüfen.
- Falls es keine Settings-Tabelle gibt, eine kleine Tabelle anlegen:
  - `app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`
- Werte als JSON-String speichern, z. B. `"true"` / `"false"` oder JSON boolean.
- Service-Funktionen:
  - `getBooleanSetting(key, defaultValue)`
  - `setBooleanSetting(key, value)`
  - `getTranscodingSettings()`
  - `updateTranscodingSettings({ forceHlsTranscoding })`

## Backend-API

Neue Admin-Endpunkte:

```text
GET /api/admin/transcoding
PUT /api/admin/transcoding
```

Auth:

- Beide Endpunkte brauchen `requireAuth`.
- Beide Endpunkte brauchen `requireFreshAdmin`.
- Nicht-Admins bekommen `403`.

Response `GET`:

```json
{
  "forceHlsTranscoding": true
}
```

Request `PUT`:

```json
{
  "forceHlsTranscoding": false
}
```

Response `PUT`:

```json
{
  "forceHlsTranscoding": false
}
```

Validierung:

- Nur boolean akzeptieren.
- Sonst `400`.

## Playback-Backend

### 1. Playback-Route liest globale Einstellung

In `src/server/routes/media/playback.routes.js`:

- Vor `PlaybackApiService.getPlaybackInfo(...)` die globale Transcoding-Einstellung laden.
- Beispiel:
  - `const { forceHlsTranscoding } = await SettingsService.getTranscodingSettings();`
- Einstellung an `getPlaybackInfo` und `resolvePlayback` übergeben.

### 2. PlaybackInfo-Optionen

In `src/server/services/jellyfin/playback-api.service.js`:

`getPlaybackInfo(userId, token, itemId, { userAgent, forceHlsTranscoding })`

Wenn `forceHlsTranscoding === true`:

- `EnableDirectPlay: false`
- `EnableDirectStream: false`
- `EnableTranscoding: true`
- `AllowVideoStreamCopy: false`
- `AllowAudioStreamCopy: false`
- HLS DeviceProfile zuerst.
- Zielcontainer HLS/TS.
- VideoCodec H.264.
- AudioCodec AAC.
- MaxAudioChannels 2.

Wenn `forceHlsTranscoding === false`:

- `EnableDirectPlay: true`
- `EnableDirectStream: true`
- `EnableTranscoding: true`
- `AllowVideoStreamCopy: true`
- `AllowAudioStreamCopy: true`
- DeviceProfile neutral/browserkompatibel.

Wichtig:

- Vanta transcodiert nie selbst.
- Der Schalter steuert nur, wie Vanta Jellyfin PlaybackInfo anfragt.
- Das tatsächliche Transcoding macht Jellyfin.

### 3. DeviceProfile

In `src/server/services/jellyfin/fields.js`:

- `buildBrowserDeviceProfile({ forceHlsTranscoding = false } = {})`
- Bei `forceHlsTranscoding === true`:
  - `DirectPlayProfiles: []` oder keine passenden Direct-Profile.
  - `TranscodingProfiles: [hlsProfile]`
- Bei `false`:
  - DirectPlayProfiles wie bisher.
  - TranscodingProfiles browserkompatibel, HLS und HTTP in sinnvoller Reihenfolge.

### 4. Playback-Auswahl

In `src/server/services/playback.service.js`:

Wenn `forceHlsTranscoding === true`:

- Nur Jellyfin `TranscodingUrl` akzeptieren.
- Bevorzugt HLS (`.m3u8`, `master.m3u8`, `TranscodingSubProtocol === 'hls'`).
- Wenn Jellyfin keine HLS-TranscodingUrl liefert:
  - Fehler werfen: `Jellyfin hat keinen HLS-Transcoding-Stream bereitgestellt.`
- Keine DirectStreamUrl verwenden.
- Response:
  - `delivery: "hls"`
  - `isTranscoded: true`
  - optional `forceHlsTranscoding: true`

Wenn `forceHlsTranscoding === false`:

- Neutral wie aktuell:
  1. `DirectStreamUrl`
  2. `TranscodingUrl`
  3. direkter Jellyfin-Stream-Fallback nur wenn Quelle laut Jellyfin direkt streambar ist

## Frontend-Playback

`src/public/js/pages/player/playbackLoader.js`:

- HLS-Support behalten:
  - Native HLS wenn Browser es kann.
  - Sonst `window.Hls` nutzen.
- `hls.js` self-hosted in `src/public/vendor/hls.min.js`.
- `src/public/index.html` muss `/vendor/hls.min.js` vor `/js/app.js` laden.
- `hls.js` transcodiert nicht. Es spielt Jellyfin-HLS in Chrome/Firefox per MSE ab.

Loader-Verhalten:

- Bei HLS fatal error Loader ausblenden und sichtbaren Fehler anzeigen.
- Bei `MANIFEST_PARSED` Autoplay starten.
- Bei `playing` Loader ausblenden.
- Keine Endlosschleife ohne Fehlermeldung.

## Admin UI

In `src/public/js/components/navbar/adminPanel.js`:

### 1. Admin-Tool-Karte ergänzen

Neben `Anfragen` eine neue Karte:

- Titel: `Transcoding`
- Beschreibung: `Globale Wiedergabe-Kompatibilität`
- Icon: neues passendes Icon in `icons.js`, z. B. Sliders/Video/CPU-Symbol.

### 2. Transcoding-Panel

Beim Klick auf die Karte:

- Admin-Tools-Grid ausblenden.
- Neues Panel `adminTranscodingViewPanel` anzeigen.
- Header mit Back-Button:
  - `Transcoding`

Inhalt:

- Kurzer Status:
  - `Aktiviert` / `Deaktiviert`
- Toggle/Switch:
  - Label: `Transcoding für alle Inhalte`
- Kurzer Hinweistext:
  - Aktiviert: `Jellyfin liefert alle Streams als kompatibles HLS mit H.264/AAC.`
  - Deaktiviert: `Jellyfin entscheidet pro Medium zwischen Direct Play, Direct Stream und Transcoding.`
- Ladezustand:
  - `Lade Einstellung...`
- Fehlerzustand:
  - `Einstellung konnte nicht geladen werden.`

Interaktion:

- Beim Öffnen `GET /api/admin/transcoding`.
- Toggle sendet `PUT /api/admin/transcoding`.
- Während Save disabled.
- Nach Save UI mit Server-Response aktualisieren.
- Fehler sichtbar anzeigen und Toggle auf letzten bekannten Wert zurücksetzen.

Mobile:

- `createAdminPanel` wird bereits auch in `mobileSettings.js` genutzt.
- Neue Karte und Panel müssen dadurch auch mobil funktionieren.
- Keine separate mobile Implementierung duplizieren.

## Frontend API

Neue API-Datei oder Erweiterung:

`src/public/js/api/admin.api.js`

```js
import { request } from './client.js';

export const AdminApi = {
  getTranscoding() {
    return request('/api/admin/transcoding');
  },
  updateTranscoding(forceHlsTranscoding) {
    return request('/api/admin/transcoding', {
      method: 'PUT',
      body: { forceHlsTranscoding }
    });
  }
};
```

## Akzeptanzkriterien

Playback:

- Bei aktivem globalem Transcoding liefert `/api/media/playback/:id` für problematische Medien `delivery: "hls"` und `isTranscoded: true`.
- Die URL zeigt auf Jellyfin-HLS (`master.m3u8` oder `.m3u8`) über den Vanta-Proxy.
- Chrome/macOS spielt über `hls.js`.
- Timeline-Klick und Dragging funktionieren, soweit Jellyfin-HLS Segmente liefert.
- Keine Endlos-Loader ohne sichtbaren Fehler.

Admin:

- Nur Admins sehen `Admin tools`.
- In `Admin tools` gibt es `Transcoding`.
- Toggle lädt aktuellen globalen Wert.
- Toggle speichert neuen Wert.
- Nicht-Admins können API nicht nutzen.
- Desktop und Mobile funktionieren.

Deaktivierter Modus:

- Wenn globales Transcoding deaktiviert ist, fragt Backend Jellyfin neutral an.
- Direct Play/Direct Stream kann wieder genutzt werden.
- Keine Frontend-Playback-Modi erscheinen.

## Verifikation

Syntax:

- `node --check src/server/routes/media/playback.routes.js`
- `node --check src/server/services/jellyfin/playback-api.service.js`
- `node --check src/server/services/jellyfin/fields.js`
- `node --check src/server/services/playback.service.js`
- `node --check src/server/routes/admin.routes.js`
- `node --check src/server/services/settings.service.js`
- `node --check src/public/js/components/navbar/adminPanel.js`
- `node --check src/public/js/api/admin.api.js`
- `node --check src/public/js/pages/player/playbackLoader.js`

API:

```bash
curl -c /tmp/vanta-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"username":"test","password":"test"}' \
  http://127.0.0.1:3001/api/auth/login
```

Admin setting:

```bash
curl -b /tmp/vanta-cookies.txt http://127.0.0.1:3001/api/admin/transcoding
curl -b /tmp/vanta-cookies.txt \
  -H 'Content-Type: application/json' \
  -X PUT \
  -d '{"forceHlsTranscoding":true}' \
  http://127.0.0.1:3001/api/admin/transcoding
```

Playback:

```bash
curl -b /tmp/vanta-cookies.txt \
  'http://127.0.0.1:3001/api/media/playback/5394d280c14894840fede4182ac156c5' | jq
```

Erwartung bei aktivem Transcoding:

- `delivery: "hls"`
- `isTranscoded: true`
- URL enthält `.m3u8`.

Playlist:

```bash
url=$(curl -s -b /tmp/vanta-cookies.txt \
  'http://127.0.0.1:3001/api/media/playback/5394d280c14894840fede4182ac156c5' | jq -r .url)
curl -i -b /tmp/vanta-cookies.txt "http://127.0.0.1:3001${url}" --max-time 10
```

Erwartung:

- Playlist lädt.
- Content-Type ist HLS/MPEGURL.
- Segment-URLs sind auf `/api/media/playback/proxy?path=...` umgeschrieben.

Browser:

- macOS Chrome:
  - Video startet.
  - Kein unendlicher Loader.
  - Timeline-Klick springt.
  - Timeline-Drag springt.
  - Bei Backend-Stop erscheint sichtbarer Fehler.

## Nicht-Ziele

- Keine Rückkehr von User-Playback-Modi im Player.
- Kein Vanta-eigenes Transcoding.
- Kein CDN für `hls.js`.
- Kein manuelles Berechnen von `content-length` oder `content-range`.
- Kein per-User Setting. Der Schalter ist global.
