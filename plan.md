# Implementierungsplan: Admin-Verwaltung als eigene Seite + Discord-Webhook für Anfragen

## Ziel

Die Admin-Verwaltung bekommt eine neue, luftigere Oberfläche als eigene Seite statt als verschachtelte
Ansicht im Einstellungen-Modal. Dazu kommen eine globale Suchleiste, ein Einstellungen-Bereich für die
Admin-Konfiguration und ein Discord-Webhook, der jede neue Medienanfrage als Embed an einen Discord-Kanal
meldet.

Drei Teilziele:

1. **Entzerrung**: Der Admin-Bereich wird zur Route `#/admin` mit voller Seitenbreite. Nutzerliste und
   Anfragenliste bekommen echten Platz statt der heutigen ~548 px im Modal.
2. **Suche + Einstellungen**: Oben auf der Admin-Seite eine globale Suchleiste, die gleichzeitig über
   Nutzer und Anfragen sucht. Rechts daneben ein Zahnrad-Icon, das ein Admin-Einstellungen-Panel öffnet.
3. **Discord-Webhook**: Im Einstellungen-Panel lässt sich eine Discord-Webhook-URL hinterlegen. Stellt ein
   Nutzer eine Anfrage, geht ein Embed an diesen Webhook: was angefragt wurde und von wem.

## Ausgangslage (recherchiert)

Diese Punkte sind der Grund für den Zuschnitt des Plans und sollten vor der Umsetzung bekannt sein:

- **Es gibt heute keine Admin-Seite.** Der komplette Admin-Bereich ist eine Panel-Ansicht im
  Einstellungen-Modal, gemountet in `src/public/js/components/navbar/settingsDialog.js:102`.
- **Ursache des „Gequetschten"**: `.settings-dialog` ist auf `width: min(620px, calc(100vw - 36px))` und
  `max-height: min(760px, calc(100vh - 48px))` begrenzt
  (`src/public/css/components/settings/settings-dialog/icons-and-modal.css:66-81`). Abzüglich Padding
  bleiben ~548 px nutzbare Breite für Nutzerzeilen mit Name + 3 Badges + Stream-Zähler + 3 Buttons, die
  dadurch permanent umbrechen (`users-tool/list-view.css:38-45`).
- **Navigation ist heute 3–4 Ebenen tief** in einem Modal: Einstellungen-Root → Tool-Grid → Tool-Ansicht →
  (bei Nutzern) Detailansicht, alles über einen einzigen geteilten Zurück-Button
  (`settingsDialog.js:67-78` → `AdminToolsPanel.js:70-84`).
- **Die Tabelle `app_settings (key, value, updated_at)` existiert bereits** in
  `src/server/db/database.js:123-129` und wird **nirgendwo im Code verwendet**. Sie ist der fertige
  Ablageort für die Webhook-Konfiguration — kein Schema-Change, keine Migration nötig.
- **Es gibt kein Migrationssystem.** Alle Tabellen werden per `CREATE TABLE IF NOT EXISTS` angelegt. Eine
  neue Spalte auf einer bestehenden `db/requests.db` würde stillschweigend nicht angelegt. Der Plan kommt
  deshalb ohne Schema-Änderung aus.
- **Discord/Webhook gibt es im Repo nirgends** — kein Treffer für `discord|webhook`. Es existiert
  überhaupt keine Outbound-Notification-Schicht und kein HTTP-Client; ausgehende Requests laufen über
  natives `fetch` (TMDB, Jellyfin).
- **`AdminRequestsTool.js` und `adminRequestItem.js` sind ungetestet.** Ebenso gibt es keine Tests für
  `requests.routes.js` und `requests.service.js`. Die Nutzerverwaltung ist dagegen gut abgedeckt.
- **Die Anfragen-Ansicht zeigt heute nur `status = 'pending'`** (`requests.service.js:133 getOpen`). Es
  gibt serverseitig keinen Endpunkt, der alle Anfragen liefert.
- **`db/requests.db-wal` (3,9 MB) und `db/requests.db-shm`** sind Altlasten eines früheren
  better-sqlite3-Setups; sql.js nutzt kein WAL. Nicht Teil dieses Plans, nur zur Kenntnis.

## Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Layout | Eigene Route `#/admin` mit voller Seitenbreite |
| Einstiegspunkt | **Unverändert**: Hamburger → Einstellungen → „Admin tools". Die Kachel schließt jetzt den Dialog und navigiert zu `#/admin` |
| Suchleiste | Global über Nutzer **und** Anfragen, Ergebnisse gruppiert |
| Bereiche | Anfragen + Nutzer (kein Dashboard, keine Sperrlisten-Sektion) |
| Anfragen-Ansicht | Tabs „Offen" / „Alle" — braucht einen neuen Server-Endpunkt |
| Webhook-Auslöser | **Nur** bei neuer Anfrage. Nicht bei Genehmigen/Ablehnen |
| Embed | Reich: Poster als Thumbnail, Titel, Nutzer, Typ, Jahr, Status, TMDB-Link, Zeitstempel |
| Webhook-Absicherung | Testen-Button, URL maskiert zurückgeben, Ein/Aus-Schalter |

## Arbeitsannahmen

- Der Einstiegspfad bleibt bewusst gleich: kein neuer Navbar-Eintrag. Die bestehende Kachel
  „Admin tools" im Einstellungen-Dialog verhält sich künftig wie die „Profil"-Option
  (`settingsDialog.js:32-35`): Dialog schließen, dann `window.location.hash = '#/admin'`.
- Die serverseitige Nutzer- und Anfragen-Logik bleibt funktional unverändert. Neu sind nur die
  Settings-Endpunkte, ein Endpunkt für alle Anfragen und der Webhook-Versand.
- Der Webhook-Versand ist **fire-and-forget**: Schlägt er fehl, wird geloggt, aber die Anfrage des Nutzers
  gilt trotzdem als erfolgreich. Ein toter Webhook darf die Anfragefunktion nie blockieren.
- Keine browserbasierten Visual-Checks automatisieren. Verifikation über Unit-/Route-Tests plus manuelle
  Sichtprüfung durch den Nutzer.
- Neue Dateien bleiben unter ~300 Zeilen, passend zur Struktur aus dem vorangegangenen Refactor.
- Neue CSS-Dateien brauchen ein manuelles `<link>` in `src/public/index.html` — es gibt keinen Bundler für
  die App-Shell, nur `@import`-Barrels innerhalb von CSS.

## Relevante Dateien

**Bestehend, wird geändert**

- `src/public/js/app.js` — neue Route `#/admin`
- `src/public/js/components/navbar/settingsDialog.js` — Admin-Panel entfernen, Kachel navigiert
- `src/public/js/components/admin-tools/AdminToolsPanel.js` — auf reine Sichtbarkeits-/Navigationslogik reduzieren
- `src/public/js/components/admin-tools/AdminToolRegistry.js` — Registry für die neue Seite
- `src/public/js/components/admin-tools/users/AdminUsersTool.js` — eigene Suche entfällt, Filter kommt von außen
- `src/public/js/components/admin-tools/requests/AdminRequestsTool.js` — Tabs, Filter von außen
- `src/public/js/components/admin-tools/requests/adminRequestItem.js` — reicheres Layout
- `src/public/js/components/admin-tools/users/adminUserRow.js` — Layout für breite Ansicht
- `src/public/js/api/requests.api.js` — `getAllRequests`
- `src/public/index.html` — `<link>` für neue CSS-Dateien
- `src/server/routes/admin/index.js` — `/settings` mounten
- `src/server/routes/requests.routes.js` — Endpunkt für alle Anfragen, Webhook-Aufruf nach `create`
- `src/server/services/requests.service.js` — `getAll`
- `src/public/css/components/admin-tools/**` — Redesign
- `src/public/css/pages/requests/admin.css` — toter Anteil (`.requests-admin-toggle`, `.requests-section*`, `.requests-list`) entfernen

**Neu**

- `src/public/js/pages/admin.page.js` — Seiten-Einstieg, Admin-Guard, Layout
- `src/public/js/pages/admin/adminHeader.js` — Suchleiste + Zahnrad
- `src/public/js/pages/admin/adminSearch.js` — Suchlogik über beide Bereiche
- `src/public/js/pages/admin/adminSettingsPanel.js` — Webhook-Einstellungen
- `src/public/js/api/admin-settings.api.js`
- `src/public/css/pages/admin/*.css` — Layout, Header, Sektionen, Responsive
- `src/server/routes/admin/settings.routes.js`
- `src/server/services/app-settings.service.js` — Wrapper um `app_settings`
- `src/server/services/discord-webhook.service.js` — Embed bauen + senden

---

## Teil A — Admin-Verwaltung als eigene Seite

### A1. Route und Zugriffsschutz

- In `src/public/js/app.js` nach den Requests-Routen ergänzen:
  `router.add('#/admin', () => import('./pages/admin.page.js'), { requiresAuth: true })`.
- Der Router kennt heute nur `requiresAuth` und `guestOnly`, keine Rollenprüfung (`router.js:159-172`).
  Der Admin-Check gehört deshalb in die Seite selbst: `admin.page.js` ruft `AuthApi.getCurrentUser()`,
  und bei `user.isAdmin !== true` wird sofort auf `#/home` umgeleitet und ein Toast „Kein Zugriff" gezeigt.
- Die Seite rendert währenddessen einen Ladezustand, damit für den Bruchteil einer Sekunde keine
  Admin-Struktur für Nicht-Admins sichtbar ist.
- Der eigentliche Schutz bleibt serverseitig: alle Endpunkte hängen an `requireAuth, requireFreshAdmin`
  (`src/server/middleware/auth.middleware.js:26-41`). Der Client-Check ist reine UX.

### A2. Einstieg aus dem Einstellungen-Dialog

- `AdminToolsPanel.js` verliert seine Panel- und Tool-Grid-Verantwortung und behält nur:
  - `adminOption` (die Kachel „Admin tools" mit Icon)
  - `loadAdminVisibility()` (blendet die Kachel für Nicht-Admins aus)
  - `checkAdminAndOpenAdmin()` — prüft weiterhin per `AuthApi.getCurrentUser()` und ruft dann `onOpen`
- In `settingsDialog.js` wird `onOpen` von `setSettingsView('admin')` auf das Muster der Profil-Option
  umgestellt: `setSettingsOpen(false)` und `window.location.hash = '#/admin'`.
- Entfallen damit in `settingsDialog.js`: der `adminPanel` im Dialog-Baum (Zeile 102), der `'admin'`-Zweig
  in `setSettingsView` (Zeilen 147-155) und die Sonderbehandlung im Zurück-Button (Zeile 75). Der
  Zurück-Button vereinfacht sich zu `setSettingsView('root')`.
- Prüfen, ob `checkAdminAndOpenAdmin` noch von außen gebraucht wird — es wird aktuell aus
  `settingsDialog.js` nach oben durchgereicht (Zeile 202). Falls kein Aufrufer existiert, entfernen.

### A3. Seitenlayout

Zielstruktur der Seite (volle Seitenbreite, unter der Navbar):

```txt
┌──────────────────────────────────────────────────────────┐
│ Admin-Verwaltung                                          │
│ ┌──────────────────────────────────┐  ┌───┐               │
│ │ 🔍 Nutzer oder Anfragen suchen…  │  │ ⚙ │               │
│ └──────────────────────────────────┘  └───┘               │
├──────────────┬───────────────────────────────────────────┤
│ Anfragen  ●3 │                                            │
│ Nutzer       │   (Inhalt des aktiven Bereichs)            │
│              │                                            │
└──────────────┴───────────────────────────────────────────┘
```

- Bereichswechsel über eine seitliche Navigation (Desktop) bzw. Tab-Leiste (Mobil). Kein Tool-Grid mehr,
  kein Aufklappen — beide Bereiche sind einen Klick entfernt.
- Der aktive Bereich wird im Hash mitgeführt (`#/admin` → Anfragen als Standard). Ob Unterrouten wie
  `#/admin/users` sinnvoll sind, siehe „Offene Punkte".
- Die Nutzer-Detailansicht wird nicht mehr als Vollbildwechsel gerendert, sondern als zweite Spalte bzw.
  Detail-Panel neben der Liste, solange die Breite reicht. Auf Mobil bleibt es der bisherige
  Ansichtswechsel mit Zurück-Steuerung.
- Der Badge an „Anfragen" zeigt die Anzahl offener Anfragen.

### A4. Anfragen-Bereich

- Tabs **Offen** (Standard) und **Alle**.
  - „Offen" nutzt weiterhin `GET /api/requests/admin/open`.
  - „Alle" nutzt einen neuen Endpunkt (siehe A6) und zeigt zusätzlich ein Status-Badge je Zeile
    (pending / approved / imported / rejected) mit den Labels aus
    `src/public/js/pages/requests/helpers.js`.
- Zeilenlayout in `adminRequestItem.js` wird von der heutigen Textzeile
  (`username — tmdb_type — status`) auf eine echte Zeile mit Poster-Thumbnail, Titel, Nutzer, Typ und
  Anfragedatum umgestellt. `poster_path` liegt bereits in der `requests`-Tabelle.
- Genehmigen/Ablehnen bekommen Toast-Feedback über `appStore.showToast`. Heute werden Fehler nur
  `console.error`-t und es gibt gar keine Erfolgsmeldung (`AdminRequestsTool.js:39-43`).
- Beim Ablehnen sichtbar machen, dass der Titel dadurch auf die Sperrliste kommt und nicht erneut
  angefragt werden kann (`requests.service.js:201-217`) — das ist heute unsichtbar und überraschend.

### A5. Nutzer-Bereich

- Inhaltlich unverändert: Liste, Umbenennen, Passwort, Bibliothekszugriff, Stream-Limit, Sperren, Löschen.
- Die tool-eigene Suche in `AdminUsersTool.js:17-25` entfällt; der Filterbegriff kommt künftig von der
  globalen Suchleiste über eine `setFilter(term)`-Methode.
- `renderList()` baut heute bei jedem Tastendruck die komplette Liste per `innerHTML = ''` neu auf. Beim
  Umbau auf die globale Suche wird das entzerrt: Eingabe entprellen (ca. 150 ms) und nur bei geändertem
  Ergebnis neu rendern.
- Die Zeile wird für die neue Breite neu gesetzt: feste Spalten für Name, Badges, Streams und Aktionen
  statt `flex-wrap` mit `flex: 1 1 160px`.
- Die Bestätigungsdialoge aus `adminUserDialogs.js` (Sperren, Löschen) bleiben, brauchen aber neue
  z-index-Werte: Der heutige Wert `10000` war auf „Modal über Modal" ausgelegt und muss gegen die
  Navbar/Overlays der Seite geprüft werden.

### A6. Serverseitig für „Alle Anfragen"

- `requests.service.js`: `getAll()` analog zu `getOpen()` (`:133`), ohne `WHERE status = 'pending'`,
  sortiert nach `created_at DESC`.
- `requests.routes.js`: `GET /api/requests/admin/all` mit `requireAuth, requireFreshAdmin` — direkt neben
  dem bestehenden `/admin/open` (`:81`). Wichtig: **vor** der Route `GET /:id` (`:99`) registrieren, sonst
  greift der Parameter-Match.
- `requests.api.js` im Client bekommt `getAllRequests()`.

### A7. Aufräumen

- `src/public/css/pages/requests/admin.css`: `.requests-admin-toggle`, `.requests-section`,
  `.requests-section-title`, `.requests-list` haben null JS-Referenzen — Reste einer entfernten
  In-Page-Admin-Sektion. Entfernen. Der genutzte Teil (`.request-item*`, `.request-admin-actions`,
  `.request-approve`, `.request-reject`) wandert in die neue Admin-Seiten-CSS und wird dort ersetzt.
- Der Kommentar `6. ADMIN STYLES (keep untouched)` in derselben Datei ist damit hinfällig.
- `admin-tools.css` verliert das Kachel-Grid (`repeat(auto-fill, minmax(180px, 1fr))`, Zeilen 2-6), da es
  kein Tool-Grid mehr gibt.

---

## Teil B — Suchleiste und Einstellungen-Icon

### B1. Kopfzeile

- `adminHeader.js` rendert die Suchleiste und rechts daneben einen Icon-Button „Einstellungen" (Zahnrad).
  Für das Icon ein `createSettingsGearIcon()` in `src/public/js/components/navbar/icons.js` ergänzen,
  passend zu den vorhandenen Icon-Factories.
- Der Button braucht `aria-label="Admin-Einstellungen"` und einen sichtbaren Fokusring — die
  bestehenden Icon-Buttons im Repo sind das Vorbild.
- Die Suchleiste bekommt `type="search"`, ein Lupen-Icon und einen Leeren-Button.

### B2. Suchverhalten

- Leeres Suchfeld: der aktive Bereich zeigt seinen normalen Inhalt.
- Gefülltes Suchfeld: eine gruppierte Ergebnisansicht ersetzt den Bereichsinhalt:
  - **Nutzer** — Treffer auf dem Nutzernamen (wie heute: `toLowerCase().includes`)
  - **Anfragen** — Treffer auf Titel **und** anfragendem Nutzernamen
- Beide Datenquellen liegen ohnehin vollständig im Client vor; die Suche bleibt also clientseitig, es
  braucht keine Server-Query.
- Damit die Anfragen-Suche auch abgeschlossene Anfragen findet, wird für die Suche die „Alle"-Liste
  herangezogen, nicht nur die offenen.
- Eingabe entprellen (~150 ms). Ergebniszahlen je Gruppe anzeigen. Klick auf einen Treffer springt in den
  jeweiligen Bereich und selektiert den Eintrag.
- Leerzustand: „Keine Treffer für …".

### B3. Einstellungen-Panel

- Öffnet als Panel/Overlay auf der Admin-Seite, nicht als weitere Route.
- Inhalt in dieser Ausbaustufe: ausschließlich der Abschnitt „Discord-Webhook" (Teil C). Das Panel wird so
  strukturiert, dass weitere Abschnitte später ohne Umbau danebenpassen.
- Schließen per Zahnrad erneut, Klick auf den Hintergrund und `Escape`.

---

## Teil C — Discord-Webhook für neue Anfragen

### C1. Ablage der Konfiguration

- Neuer Service `src/server/services/app-settings.service.js` als schmaler Wrapper um die bereits
  bestehende, bislang leere Tabelle `app_settings`:
  - `get(key)` → `value` oder `null`
  - `set(key, value)` → Upsert mit `updated_at` als ISO-String
  - `remove(key)`
- Genutzte Schlüssel:
  - `discord_webhook_url` — die vollständige URL
  - `discord_webhook_enabled` — `'true'` / `'false'`
- Kein Schema-Change nötig. **Achtung**: `database.js` schreibt bei jedem Write die komplette DB-Datei neu
  (`persist()`, `:19-21`). Für zwei Settings-Writes ist das unkritisch, aber der Settings-Service darf
  nicht in Schleifen schreiben.
- Der Service wird als Factory mit optionalem DB-Handle exportiert, passend zum Muster von
  `createUserBanService` / `createUserSettingsService` — sonst sind die Tests nicht isolierbar.

### C2. Endpunkte

Neue Datei `src/server/routes/admin/settings.routes.js`, in `src/server/routes/admin/index.js` per
`router.use('/settings', settingsRoutes)` gemountet. Alle Routen hinter
`router.use(requireAuth, requireFreshAdmin)`, genau wie `users.routes.js:11`.

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/admin/settings/discord-webhook` | Status lesen |
| PUT | `/api/admin/settings/discord-webhook` | URL und/oder Schalter setzen |
| DELETE | `/api/admin/settings/discord-webhook` | Konfiguration entfernen |
| POST | `/api/admin/settings/discord-webhook/test` | Test-Embed senden |

**GET liefert die URL nie im Klartext**, sondern:

```json
{ "configured": true, "enabled": true, "maskedUrl": "https://discord.com/api/webhooks/1234…f9c2" }
```

Maskierung: Schema + Host + Pfadanfang sichtbar, Token-Anteil bis auf die letzten 4 Zeichen durch `…`
ersetzt. Die Maskierung passiert **serverseitig** — die volle URL verlässt den Server nach dem Speichern
nie wieder.

**PUT** akzeptiert `{ url?, enabled? }`. Ohne `url` wird nur der Schalter geändert, sodass sich der
Versand pausieren lässt, ohne die URL neu eingeben zu müssen.

**POST /test** sendet ein Beispiel-Embed („Testnachricht von Vanta") an die gespeicherte URL — oder, wenn
im Body eine URL mitgeschickt wird, an diese, damit sich eine URL vor dem Speichern prüfen lässt. Antwort
enthält Erfolg bzw. den HTTP-Status von Discord, damit der Admin eine falsche URL sofort erkennt.
Siehe dazu den Punkt zur URL-Validierung unter „Offene Punkte" — der ist vor der Umsetzung zu klären.

### C3. Webhook-Service

Neue Datei `src/server/services/discord-webhook.service.js`:

- `buildRequestEmbed(request, media)` — baut das Embed-Objekt, rein und ohne Netzwerk, damit direkt testbar.
- `sendRequestCreated(request)` — liest Konfiguration, prüft `enabled`, baut das Embed und sendet.
  Kein `throw` nach außen; Fehler nur `console.error`.
- Versand per nativem `fetch` (`POST`, `Content-Type: application/json`), mit `AbortSignal.timeout` von
  ca. 5 s, damit ein hängender Webhook nichts blockiert.
- Kein Retry in dieser Ausbaustufe.

**Embed-Aufbau**

| Feld | Quelle |
|---|---|
| `title` | `request.title` |
| `url` | `https://www.themoviedb.org/{movie\|tv}/{tmdb_id}` |
| `description` | `overview` aus `tmdb_media`, gekürzt auf ~300 Zeichen |
| `thumbnail.url` | `https://image.tmdb.org/t/p/w342{poster_path}` (nur wenn vorhanden) |
| Feld „Angefragt von" | `request.username` |
| Feld „Typ" | `Film` / `Serie`, abgeleitet aus `tmdb_type` |
| Feld „Jahr" | `release_date` bzw. `first_air_date` aus `tmdb_media` |
| Feld „Status" | `Offen` |
| `color` | fester Akzentwert |
| `timestamp` | `request.created_at` als ISO-String |

**Wichtig**: Das Jahr steht **nicht** in der `requests`-Tabelle. `release_date` / `first_air_date` /
`overview` liegen in `tmdb_media` (`database.js:90-103`). Der Embed-Builder braucht also entweder einen
Join über `tmdb_id` + `tmdb_type` oder eine zusätzliche Abfrage. Da `RequestsService.create` die
TMDB-Details ohnehin schon geladen hat (`requests.service.js:67-70`), ist der einfachste Weg, diese Daten
an den Aufrufer durchzureichen.

Alle Textfelder werden vor dem Senden gekappt (Discord-Limits: Titel 256, Description 4096, Feldwert 1024
Zeichen). Ein außergewöhnlich langer Titel darf den Versand nicht mit HTTP 400 scheitern lassen.

### C4. Auslösepunkt

- Der Aufruf gehört in den Handler `POST /api/requests/` in `requests.routes.js:65`, **nach** dem
  erfolgreichen `RequestsService.create(...)` und **nach** dem Senden der HTTP-Antwort an den Nutzer.
- Bewusst nicht in `requests.service.js`: der Service bleibt frei von ausgehendem HTTP und damit ohne
  Netzwerk-Mocks testbar.
- Der Aufruf wird nicht `await`-et bzw. nur mit `.catch()` versehen — der Nutzer wartet nie auf Discord.
- Nur bei neuer Anfrage. Genehmigen und Ablehnen lösen bewusst **keinen** Webhook aus.

---

## Tests

**Neu, serverseitig**

- `tests/server/services/app-settings.service.test.js` — get/set/remove, Upsert-Verhalten, Isolation über
  ein temporäres DB-Handle
- `tests/server/services/discord-webhook.service.test.js` — Embed-Aufbau für Film und Serie, fehlendes
  Poster, fehlendes Jahr, Kürzung überlanger Felder; `fetch` gemockt: Versand unterbleibt bei
  `enabled=false` und bei fehlender URL, Fehler propagiert nicht nach außen
- `tests/server/routes/admin/settings.routes.test.js` — Admin-Gate greift, GET liefert maskiert und nie die
  volle URL, PUT ohne `url` ändert nur den Schalter, DELETE räumt auf, Test-Endpunkt meldet Discord-Fehler
  durch
- `tests/server/routes/requests.routes.test.js` — bislang komplett fehlend. Mindestens: `/admin/all` ist
  admin-gated, Reihenfolge gegenüber `GET /:id` stimmt, und `POST /` löst genau einen Webhook-Aufruf aus
  bzw. bleibt bei Webhook-Fehler erfolgreich

**Neu, clientseitig**

- `tests/public/pages/admin.page.test.js` — Nicht-Admin wird umgeleitet, Bereichswechsel, Ladezustand
- `tests/public/pages/admin/adminSearch.test.js` — gruppierte Treffer über Nutzer und Anfragen, Leerzustand,
  Zurücksetzen
- `tests/public/pages/admin/adminSettingsPanel.test.js` — Speichern, Schalter, Testen-Button, maskierte
  Anzeige
- `tests/public/components/admin-tools/requests/AdminRequestsTool.test.js` — die heute ungetestete Hälfte:
  Tabs, Statusbadges, Toast bei Genehmigen/Ablehnen, Fehlerzustand

**Anzupassen**

- `tests/public/components/navbar/settingsDialog.test.js` — die Admin-Ansicht im Dialog gibt es nicht mehr;
  stattdessen prüfen, dass die Kachel den Dialog schließt und auf `#/admin` navigiert
- `tests/public/components/admin-tools/AdminToolsPanel.test.js` — Panel ist auf Sichtbarkeit und
  Navigation reduziert
- `tests/public/components/admin-tools/users/AdminUsersTool.test.js` — Suche kommt von außen über
  `setFilter`

---

## Offene Punkte

1. **URL-Validierung des Webhooks (vor der Umsetzung zu entscheiden).** Aktuell nicht eingeplant, weil
   nicht ausgewählt. Damit kann ein Admin den Server dazu bringen, ein POST an eine beliebige URL zu
   schicken — auch an interne Adressen im selben Netz, etwa den Jellyfin-Server. Der Endpunkt ist zwar
   durch `requireFreshAdmin` geschützt, trotzdem ist eine Einschränkung auf
   `https://discord.com/api/webhooks/…` bzw. `discordapp.com` billig umzusetzen und schließt das
   vollständig. **Empfehlung: aufnehmen.**
2. **Unterrouten für die Bereiche.** `#/admin/users` und `#/admin/requests` würden Deep-Links und den
   Browser-Zurück-Button korrekt bedienen, kosten aber zwei zusätzliche Routen-Einträge. Alternative:
   ein einziger `#/admin` mit internem Zustand.
3. **Verhalten des Browser-Zurück-Buttons** aus der Nutzer-Detailansicht heraus — abhängig von Punkt 2.
4. **Ort der Anfragen-Sperrliste.** Beim Ablehnen landet ein Titel in `db/banned.json` und kann nie wieder
   angefragt werden. Es gibt keine Oberfläche, das rückgängig zu machen. Bewusst nicht Teil dieses Plans,
   aber ein guter Kandidat für den nächsten Schritt.
5. **`requireFreshAdmin` fragt bei jedem Request Jellyfin.** Die Admin-Seite feuert beim Laden mehrere
   Requests parallel (Nutzer, Bibliotheken, Anfragen, Einstellungen) — das sind ebenso viele zusätzliche
   Jellyfin-Roundtrips. Falls das spürbar wird, ist ein kurzlebiger Cache in der Middleware der Hebel.

## Reihenfolge der Umsetzung

1. Serverseite Anfragen: `getAll` + `GET /api/requests/admin/all` + Tests
2. Serverseite Einstellungen: `app-settings.service.js` + `settings.routes.js` + Tests
3. Serverseite Webhook: `discord-webhook.service.js` + Auslöser in `requests.routes.js` + Tests
4. Route `#/admin`, Seitengerüst, Admin-Guard, Umstellung des Einstellungen-Dialogs
5. Nutzer- und Anfragen-Bereich in die neue Seite überführen, Detailansicht als Spalte
6. Kopfzeile mit Suchleiste und globaler Suche
7. Einstellungen-Panel mit Webhook-Formular, Schalter und Testen-Button
8. CSS-Redesign und Responsive-Feinschliff, toten CSS-Anteil entfernen
9. Bestehende Tests anpassen, kompletter Durchlauf `npm test`
10. Manuelle Sichtprüfung durch den Nutzer
