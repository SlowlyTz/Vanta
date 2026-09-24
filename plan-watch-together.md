# Implementierungsplan: Watch Together — Sync, Lobby, 3D-Countdown, neuer Player

## Ziel

1. **Gemeinsames Schauen funktioniert zuverlässig.** Alle Teilnehmer sehen dasselbe Bild, mit einer
   Abweichung von höchstens ~150 ms. Play/Pause/Spulen kommen bei allen an, ohne Ping-Pong und
   ohne Benachrichtigungs-Spam.
2. **Neue Wartelobby** mit echter UI/UX statt einer Textliste. Ready-Room und Lobby werden zu
   *einem* Bildschirm zusammengeführt.
3. **Countdown neu in three.js** (Partikel wie beim Opener), **exakt 5,000 s**. Bei 0 läuft das Video
   sofort bei allen los, nicht erst danach das Laden.
4. **Player-UI neu:** ±10-s-Buttons neben Play/Pause mit „10s“-Beschriftung, alle Menüs
   (Untertitel, Qualität, Folgen, Teilnehmer) in **einem animierten Einstellungs-Flyout** hinter
   einem Zahnrad.

Entscheidungen (Rückfragen beantwortet am 2026-09-24):

- Die neue Player-UI gilt für **beide** Modi (normaler Player und Watch Together). Es ist derselbe
  Code, die Party-Teile (Teilnehmer, Sync-Status) erscheinen nur in einer Party.
- „Komplett neu“ betrifft die **UI-Schicht** (Markup, Controls, Menüs, CSS) und die
  **Watch-Party-Sync-Schicht**. Die funktionierende Engine bleibt: `sourceSwitch/*`,
  `jellyfinReporter.js`, `orientation.js`, `platform.js`, HLS-Fallback und vidstack 0.6 als
  Media-Engine. Ein Engine-Wechsel kommt nur in Frage, wenn er einen echten Vorteil bringt; das
  trifft hier nicht zu (Begründung in „vidstack: kein Upgrade“ weiter unten).
- **Zuschauer ohne Admin-Rechte sehen keine Wiedergabe-Steuerung.** Play/Pause, ±10 s, die
  bedienbare Zeitleiste, Gesten und Tastenkürzel sind für sie ausgeblendet bzw. abgeschaltet.
- **Lobby und Ready-Room werden ein Bildschirm** mit zwei Phasen.
- **Der Countdown hat keinen Ton.**

---

## Teil 0 — Befund: warum gemeinsames Schauen aktuell nicht funktioniert

### B1 — Keine Uhrensynchronisation zwischen Server und Clients

Jede Zeitrechnung vergleicht Server-Zeitstempel mit der **lokalen** Uhr des Browsers:

- Countdown: `startsAtServerTimeMs - Date.now()` (`src/public/js/pages/watch-party/countdown.js:17`)
- Sync: `Date.now() - serverTimeMs` (`src/public/js/pages/watch-party/sync.js:28`, `:62`, `:102`)
- Player: `Date.now() - serverTimeMs` (`src/player/src/watchParty.js:59`)

Handys und Windows-Rechner liegen oft 1–5 s daneben. Folgen: Der Countdown beginnt bei 7 oder 3
statt bei 5. Jede Play-Zielposition ist um genau diese Abweichung verschoben. Weil die Grenze für
einen harten Sprung bei 2,5 s liegt (`sync.js:32`), springt ein Client mit 3 s Abweichung bei
**jedem** Heartbeat (alle 5 s).

### B2 — Der Stream lädt erst, wenn der Countdown schon vorbei ist

Der Ready-Room mountet den Player mit `deferInitialLoad: true` (`readyRoom.js:87-92`,
`player/lifecycle.js:63-64`). `PLAYER_READY` geht direkt nach dem Mount raus (`readyRoom.js:67-68`),
ohne dass eine Quelle geladen wurde. Erst bei `CONTROL play` (nach dem Countdown) laufen
`prepareInitialPlayback` → `resolvePlayback` (Server startet ggf. den Transcode) → `loadPlayback`
(`sync.js:133-139`). Jeder Client braucht dafür unterschiedlich lange. Deshalb hängt nach den
„5 Sekunden“ noch eine unbestimmte Ladezeit dran, und alle starten versetzt.

### B3 — Echo-Schleife bei Steuerbefehlen

Der Server schickt `CONTROL` auch an den Admin zurück, der den Befehl ausgelöst hat
(`src/server/realtime/watch-party/messageHandlers.js:201`, `:210`, `:218`, jeweils ohne
`skipUserId`). Der Admin wendet seinen eigenen Befehl erneut an. Wegen B1 errechnet er eine andere
Zielposition und springt. Die Echo-Sperre endet nach festen **250 ms**
(`src/player/src/player/context.js:64`). Ein HLS-`seeked` kommt oft später und wird als neuer
`OWNER_SEEK` gesendet. Dieser Befehl geht wieder an alle, der Kreis schließt sich. Sichtbar wird das
als Springen und „Der Admin hat gespult“-Spam.

### B4 — Mehrere konkurrierende Taktgeber

Jeder Admin startet einen eigenen Heartbeat (`sync.js:5-15`, `maybeStartOwnerHeartbeat`). Der
Server nimmt `OWNER_SYNC` von jedem Admin an und schickt ihn an alle anderen
(`messageHandlers.js:231-241`). Bei zwei Admins korrigieren sich beide gegenseitig im
Fünf-Sekunden-Takt. Dazu kommt: Ein Admin, der gerade puffert, zieht alle anderen auf seine hängende
Position.

### B5 — Die Feinkorrektur greift nicht

Bei 0,35–2,5 s Drift wird die Geschwindigkeit für 2,5 s auf 0,98/1,02 gesetzt (`sync.js:47-53`).
Das korrigiert **50 ms**. Korrigiert wird außerdem nur, wenn ein Heartbeat eintrifft (alle 5 s),
es gibt keine fortlaufende Regelung. Steht ein Client auf Pause, obwohl die Party läuft
(z. B. nach einem Puffer-Hänger), startet ihn nichts wieder.

### B6 — Zwei Startpfade nach dem Countdown

Der Start läuft sowohl über `CONTROL play` als auch über `PARTY_UPDATED` mit
`playing && previousStatus === 'countdown'` (`socketHandlers.js:33-39`). Nur ein Zeitstempel
verhindert, dass er doppelt ausgeführt wird. Diesen Zeitstempel ersetzt der Client mit
`|| Date.now()`, er ist also nicht verlässlich.

---

## Teil A — Sync-Kern (Voraussetzung für alles andere)

### A1 — Server-Uhr im Client

- Neue WS-Nachrichten: `TIME_PING { clientSentAt }` → `TIME_PONG { clientSentAt, serverTimeMs }`
  in `messageHandlers.js`.
- Neues Modul `src/public/js/realtime/serverClock.js`:
  - Nach `open` 6 Pings im Abstand von 150 ms. Offset = `serverTimeMs + rtt/2 - clientReceivedAt`
    aus der Probe mit der **kleinsten RTT**. Danach alle 30 s eine Nachmessung; der Offset wird
    geglättet und springt nicht.
  - Monotone Basis: `performance.timeOrigin + performance.now()` statt `Date.now()`, damit
    Systemzeit-Sprünge nichts kaputtmachen.
  - API: `clock.now()`, `clock.ready` (Promise), `clock.rtt`.
- Alle Stellen aus B1 rechnen nur noch mit `clock.now()`. Der Player bekommt die Uhr über
  `watchParty.serverNow` hinein, `computeRemoteControlTarget` nimmt `now` als Parameter
  (bessere Testbarkeit).
- Nur in der Entwicklung: Query-Parameter `?wpSkew=3000` verstellt die lokale Uhr künstlich, damit
  sich B1 mit zwei Tabs auf einem Rechner nachstellen lässt.

### A2 — Server hält die eine Zeitleiste

- `party.timeline = { positionMs, playing, anchorServerTimeMs, seq }` ersetzt die lose Kombination
  aus `positionMs`, `status` und `lastServerTimeMs` für die Wiedergabe. `status` bleibt für die
  Phasen (`lobby`, `ready-room`, `countdown`, `playing`, `paused`, `ended`).
- Jede Änderung (Play, Pause, Seek, Countdown-Ende) erhöht `seq`. Clients verwerfen Nachrichten
  mit älterem `seq` und ignorieren damit verspätete Pakete.
- `CONTROL` wird zu `TIMELINE { timeline, actorUserId, reason }`. Der Auslöser bekommt die Nachricht
  auch, erkennt sich aber über `actorUserId` und übernimmt nur `seq` und Anker, ohne zu springen.
  Damit ist B3 strukturell behoben.
- **Taktgeber:** Genau ein Mitglied sendet Heartbeats, nämlich `party.syncLeaderUserId`. Das ist der
  Owner oder, wenn er nicht verbunden ist, der am längsten verbundene Admin. Der Server ignoriert
  `OWNER_SYNC` von allen anderen. Ein Heartbeat korrigiert die Server-Zeitleiste nur bei mehr als
  1 s Abweichung, also wenn der Leader hängt oder gepuffert hat. Er wird nicht mehr blind an alle
  weitergegeben (behebt B4).
- Ein Heartbeat enthält `bufferingSince`. Puffert der Leader, übernimmt der Server dessen Position
  nicht.

### A3 — Fortlaufende Drift-Regelung (Client)

Neues Modul `src/public/js/pages/watch-party/driftController.js`. Es ersetzt `applySync` und
`refreshRemotePayload` und läuft alle 500 ms, nicht nur beim Eintreffen eines Heartbeats:

| Drift | Aktion |
|---|---|
| < 120 ms | nichts, `playbackRate = 1` |
| 120 ms – 2 s | Proportionalregler: `rate = 1 ± clamp(drift / 4, 0.02, 0.06)` bis < 50 ms |
| > 2 s | harter Seek auf Soll + geschätzte Seek-Dauer (gleitender Mittelwert der letzten Seeks) |
| Soll „spielt“, lokal pausiert | `play()` (bei Autoplay-Block: bestehendes Overlay) |

- Keine Korrektur während `seeking`, `waiting` oder eines Quellwechsels.
- Nach einem harten Seek 1,5 s Ruhe, damit sich der Regler nicht aufschaukelt.
- Echo-Sperre neu: Statt eines 250-ms-Timers bekommt jede programmatische Änderung ein Token. Die
  Sperre endet, wenn das passende Event (`seeked`, `play` oder `pause`) eintrifft, spätestens nach
  3 s (`context.js:60-68` wird ersetzt).
- Im Flyout zeigt ein Status „Synchron · ±40 ms“ die Lage, dazu gibt es einen Button
  „Neu synchronisieren“ (erzwingt harten Seek). Mit `localStorage vanta.debug.sync = 1` blendet ein
  Debug-Overlay Drift, RTT, Rate und `seq` ein.

### A4 — Tests

- `tests/server/realtime/watch-party-socket/*`: TIME_PONG, `seq`, Leader-Regel, ignorierte
  Heartbeats von Nicht-Leadern.
- `tests/public/pages/watch-party/player-sync.test.js`: Umbau auf `driftController` mit Fake-Uhr
  und Fake-Player; Fälle für jede Tabellenzeile, verworfene alte `seq`, eigenes Echo.
- Neuer Test `serverClock.test.js`: Auswahl der Probe mit minimaler RTT, Glättung, Skew-Parameter.

---

## Teil B — Bereitmachen und Start: „echte 5 Sekunden“

### B1 — Vorladen vor dem „Bereit“

Der Klick auf „Bereit“ löst diese Kette aus (`readyRoom.js:61-79` wird ersetzt):

1. **Autoplay freischalten**, solange die Nutzergeste aktiv ist: `video.muted = true; await play();
   pause(); muted = false`. Danach blockt iOS/Chrome den späteren Start ohne Geste nicht mehr, und
   das Overlay „Wiedergabe aktivieren“ wird zum seltenen Notfall.
2. Player mounten (unsichtbar hinter der Lobby, `opacity: 0` statt `display: none`, damit
   dekodiert wird) und `prepareInitialPlayback({ position })` mit `shouldPlay: false`.
3. Warten, bis ab der Startposition **≥ 4 s gepuffert** sind (`buffered`-Range prüfen, Timeout 45 s).
   Währenddessen `PLAYER_READY_STATE { state: 'preparing', progress }`; die Lobby zeigt pro Person
   einen Fortschritt.
4. Erst dann `PLAYER_READY`. Bei einem Fehler: `state: 'error'` und in der Lobby ein
   „Erneut versuchen“.

### B2 — Server-Countdown

- `COUNTDOWN_MS = 5000` bleibt (`src/server/services/watch-party/helpers.js:7`). Neu ist
  `COUNTDOWN_LEAD_MS = 400`: `startsAt = now + LEAD + 5000`. Die Vorlaufzeit gleicht die
  Netzwerklaufzeit aus und reicht fürs Aufwärmen der WebGL-Szene und das Einblenden. Danach laufen
  bei allen **volle 5,000 s** Ziffern.
- `COUNTDOWN` enthält `startsAtServerTimeMs`, `durationMs` und `timeline` (Position, `seq`).
- Verbindet sich während des Countdowns jemand neu oder trennt sich, wird der Countdown **nicht**
  abgebrochen. Nachzügler steigen mit der korrekten Restzeit ein, denn alles hängt an der absoluten
  Zeit.

### B3 — Start ohne Warten auf den Server

- Jeder Client plant `play()` selbst auf `startsAt` (`setTimeout` bis ~30 ms vorher, dann exakt per
  `requestAnimationFrame` gegen `clock.now()`). Das Video ist gepuffert und steht auf der Position,
  der Start kommt also innerhalb eines Frames.
- Der Server setzt zum selben Zeitpunkt `status = 'playing'` und sendet `TIMELINE`
  (`countdowns.js:7-26`). Für Clients ist das nur noch eine Bestätigung; die Drift-Regelung fängt
  Ausreißer auf.
- Der doppelte Startpfad über `PARTY_UPDATED` entfällt (`socketHandlers.js:33-39`, behebt B6).

---

## Teil C — Countdown in three.js

### C1 — Eigenes Bundle

- Neu: `src/countdown/` mit `vite.config.js` nach dem Vorbild von `src/intro/vite.config.js`.
  three.js wird mitgebündelt (CSP: Skripte nur vom eigenen Origin). Ausgabe:
  `src/public/vendor/countdown/vanta-countdown.js`, wird wie Player und Intro committet.
- `package.json`: Skript `countdown:build`, `build` erweitern. README-Abschnitt ergänzen.
- Das Bundle wird **beim Betreten der Bereit-Phase** per `import()` vorgeladen, nicht erst bei
  `COUNTDOWN`.
- Gemeinsamer Code mit dem Intro: `sample-logo.js` bekommt zusätzlich ein generisches
  `samplePixels(image, { count })` (ohne V/Wort-Aufteilung); das Intro bleibt unverändert.
  Additive Sprites, Shader-Grundgerüst, `isLowPower` und die DPR-Logik werden nach
  `src/shared/particles/` verschoben und von beiden importiert.

### C2 — Szene

- **Ziffern 5 → 1 als Partikelwolke**, die von Ziffer zu Ziffer **morpht**. Jede Ziffer wird mit
  der selbst gehosteten Outfit-Schrift (800) auf ein Offscreen-Canvas gezeichnet (vorher
  `document.fonts.load`) und gesampelt. Jede Ziffer bekommt **gleich viele** Punkte
  (12 000, bei `lowPower` 5 000). Die Punkte werden nach Winkel um den Schwerpunkt sortiert, damit
  Partikel *i* beim Morph eine kurze, weiche Bahn nimmt.
- Geometrie: Attribute `aTarget0..aTarget4` (je `vec3`) plus `aSeed`. Die CPU setzt pro Frame nur
  die Uniforms `uDigit`, `uMorph`, `uPulse`, `uDive` und `uFade`.
- Ein **Fortschrittsring** aus Partikeln um die Ziffer leert sich pro Sekunde einmal im
  Uhrzeigersinn und macht die Sekunden direkt sichtbar.
- Pro Sekunde k (lokal 0…1):

  | lokal | Phase |
  |---|---|
  | 0,00 – 0,30 | Morph aus der vorherigen Ziffer (gestaffelt per `aSeed`) |
  | 0,30 – 0,85 | Halten mit leichtem Atmen, Ring läuft |
  | 0,85 – 1,00 | Auflockern (Partikel driften auseinander) |

- **Letzte Sekunde (4,55–5,00 s):** Die Kamera taucht durch die „1“ wie beim Opener
  (`TIMELINE.zoom` im Intro). Das Overlay blendet aus und gibt das bereits stehende erste Bild frei.
  Bei 5,000 s startet das Video (B3).
- Über dem Canvas in HTML: Titel, Episode (S01E03), Jahr und Laufzeit sowie „Fortsetzen bei
  12:34“, per Fade-in während des Vorlaufs.
- **Kein Ton.** Der Countdown ist rein visuell; es werden keine Audio-Dateien geladen und kein
  AudioContext erzeugt.
- **Zeitsteuerung:** Jeder Frame rechnet `t = 5 - (startsAt - clock.now()) / 1000`. Es wird nichts
  aufaddiert, deshalb bleibt die Zeit auch bei Frame-Drops oder gedrosseltem Tab exakt.

### C3 — API und Fallback

```js
const countdown = await mountCountdown({
  container, startsAtServerTimeMs, durationMs: 5000,
  now: clock.now, meta: { title, subtitle, positionLabel }
});
countdown.done;     // Promise, erfüllt bei t = 5
countdown.destroy();
```

- Fallback ohne WebGL oder bei `prefers-reduced-motion`: große CSS-Ziffern mit Crossfade, gleiche
  Uhr, gleicher Ring als SVG.
- Entfernt werden: `src/public/css/pages/watch-party-countdown.css` (die komplette
  `numero_*`-Animation), die Countdown-DOM-Teile in `context.js:126-140` und der alte Inhalt von
  `countdown.js`.

### C4 — Tests

- `tests/countdown/timeline.test.js`: Phasengrenzen, `t` aus absoluter Zeit, Klammerung vor dem
  Start und nach dem Ende.
- `tests/intro/sample-logo.test.js`: um `samplePixels` erweitern (feste Anzahl, Sortierung).
- Die Seitenintegration (`countdown.js`) wird mit einem gemockten Modul auf Start und Abbau
  getestet.

---

## Teil D — Neue Wartelobby

### D1 — Ablauf

Heute: Lobby (Textliste) → „Starten“ → Ready-Room als Overlay über dem Player → Countdown.
Neu: **ein Bildschirm mit zwei Phasen.**

1. **Warten:** Mitglieder kommen dazu, der Owner lädt ein.
2. **Bereitmachen** (nachdem der Owner „Party starten“ gedrückt hat): Dieselbe Lobby, die
   Teilnehmerkarten zeigen jetzt Lade-Fortschritt und Bereit-Häkchen, in der Aktionsleiste steht
   „Bereit“.

Sind alle bereit, blendet die Lobby in den Countdown über und der Countdown ins Video.

### D2 — Layout

**Desktop (≥ 900 px):**

- Vollflächiges **Backdrop** des Titels, stark abgedunkelt mit Verlauf nach unten und links
  (Stil wie der Detail-Hero). Bildquelle: `getPosterUrl(item)` aus `helpers.js:50` mit dem Item,
  das die Seite ohnehin per `MediaApi.getItem` lädt; der Server muss dafür nicht angepasst werden.
- **Links:** Logo-Bild des Titels (Fallback: Titel als Text), darunter Meta (Jahr · FSK · ★ ·
  Laufzeit, bei Serien „S01E03 · Folgenname“) und ein Chip „Fortsetzen bei 12:34“ bzw.
  „Von Anfang an“.
- **Rechts:** Glas-Karte „Teilnehmer 2/4“ mit **4 festen Plätzen**:
  - Belegt: Avatar mit Präsenz-Ring (pulsiert bei „verbindet“), Name, Rollen-Badge, Status-Chip
    (`Verbunden` → `Lädt 42 %` → `Bereit ✓`). Beim Owner zusätzlich ein dezentes „Entfernen“ im
    Hover- bzw. Kontextmenü.
  - Leer: gestrichelter Platz „Platz frei“. Für den Owner ist er klickbar und öffnet die Einladung.
- **Einladen:** Button „Link kopieren“, der nach dem Kopieren in „Kopiert ✓“ morpht, und
  „Nutzer einladen“ (bestehendes Modal aus `inviteModal.js`, neu gestylt).
- **Aktionsleiste unten** (sticky): Hinweistext links, Primäraktion rechts.
  - Owner in Phase 1: **„Party starten“**.
  - Alle in Phase 2: **„Bereit“**. Nach dem Klick: „Wird geladen … 42 %“, dann „Bereit ✓“
    (deaktiviert).
- **Kopfleiste** schmal: Zurück-Icon, „Watch Party“ und für den Owner ein ⋯-Menü mit
  „Party beenden“ inklusive Bestätigung. Der bisherige Sync-Badge gehört in den Player.

**Mobil:** Backdrop oben (~38 vh) mit Titel darüber, darunter die Teilnehmerliste, die
Aktionsleiste unten fix mit `safe-area-inset-bottom`. Touch-Ziele sind mindestens 44 px groß.

### D3 — Zustände und Details

- Lade-Skelett statt leerem Bildschirm, bis `join` zurückkommt.
- Fehler- und Beendet-Zustand im selben Stil (Backdrop, zentrierte Glas-Karte, Primärbutton).
- Animationen: neue Mitglieder gleiten in ihren Platz, Bereit-Häkchen zeichnet sich als
  SVG-Stroke, Phasenwechsel per Crossfade. Alles mit `var(--abyss-ease)`, bei
  `prefers-reduced-motion` nur Fades.
- Barrierefreiheit: `aria-live` für Beitritt/Bereit, Fokus springt beim Phasenwechsel auf die
  Primäraktion, Status nicht nur über Farbe (Icon + Text).

### D4 — Dateien

- `context.js`: Das DOM-Gerüst wird in Komponenten aufgeteilt:
  `lobby/hero.js`, `lobby/participants.js`, `lobby/inviteBar.js`, `lobby/actionBar.js`.
  `context.js` erzeugt nur noch den Container und den Zustand.
- `rendering.js` und `readyRoom.js` gehen in `lobby/*` auf. Das Ready-Overlay (`readyOverlay`)
  fällt weg.
- CSS: `src/public/css/pages/watch-party/{lobby,members,ready-room,invite,layout,responsive}.css`
  werden neu geschrieben als `lobby/{hero,participants,action-bar,invite}.css`; `ready-room.css`
  entfällt.
- Tests: `lobby.test.js`, `ready-room.test.js`, `invitations.test.js` und
  `participant-admin.test.js` an die neue Struktur anpassen. Neu: Phasenwechsel, Fortschritt pro
  Mitglied, leere Plätze.

---

## Teil E — Neue Player-Controls

### E1 — Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ←  Titel                                       [●● 3] Synchron   │  Topbar (Party-Pill nur in Party)
│             S01E03 · Folgenname                                  │
│                                                                  │
│                   ⟲        ▶        ⟳                            │  nur Touch: Mitte
│                  10s                10s                          │
│                                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━●─────────────────────────  12:34 / 45:10 │  Zeitleiste
│  ⟲    ▶/❚❚   ⟳                            🔊━━━   ⚙   ⧉   ⛶      │  Controls
│ 10s          10s                                                 │
└──────────────────────────────────────────────────────────────────┘
```

- **Links:** `⟲ 10s` · Play/Pause (größer) · `⟳ 10s`. Die Spul-Buttons zeigen ein
  kreisförmiges Pfeil-Icon mit **„10s“ darunter** (gestapelt, 10–11 px, 70 % Deckkraft).
  Tooltip und `aria-label`: „10 Sekunden zurück/vor“.
  Bei Klick: Icon dreht sich kurz (±30°), und am jeweiligen Bildschirmrand erscheint eine Blase
  „−10 s“/„+10 s“, die sich bei mehrfachem Klick auf „−20 s“, „−30 s“ … aufaddiert (wie beim
  Doppeltipp).
- **Rechts:** Lautstärke (Slider klappt beim Hover aus) · **⚙ Einstellungen** · PiP · Vollbild.
  Die bisherigen Einzel-Buttons für Qualität, Untertitel, Folgen und Teilnehmer verschwinden.
- **Mitte:** Nur auf Touch-Geräten der große Cluster ⟲/▶/⟳ mit denselben „10s“-Labels. Auf dem
  Desktop entfällt die doppelte Mitte (heute `markup.js:59-70`); ein Klick aufs Video schaltet
  Play/Pause um.
- **Zeitleiste:** Gepufferter Bereich sichtbar, beim Hover Zeit-Vorschau und dickere Leiste.
- **Watch Party, Zuschauer ohne Rechte: Steuerung ausgeblendet.**
  - Der linke Cluster (⟲ · Play/Pause · ⟳) und der Touch-Cluster in der Mitte werden nicht
    angezeigt. Die Zeitleiste bleibt als **reine Anzeige** sichtbar, ohne Griff und ohne
    Hover-Vorschau, und reagiert nicht auf Klicks.
  - Ein Klick oder Tipp aufs Video, die Doppeltipp-Gesten und die Tasten Space/K/←/→ tun nichts.
    Erlaubt bleiben Stumm (M), Vollbild (F), Lautstärke, PiP und das Zahnrad.
  - Die Topbar zeigt bei Zuschauern in der Party-Pill den Hinweis „Admin steuert“, damit das
    Fehlen der Buttons nicht wie ein Fehler aussieht.
  - Wird jemand in der laufenden Party zum Admin, blendet sich der Cluster sanft ein; beim
    Entzug der Rechte wieder aus.
  - Umsetzung: `applyWatchPartyPermissions` (`watchParty.js:1-56`) setzt nur noch die Klasse
    `is-watch-party-viewer` am Root. Das Ausblenden und das Deaktivieren der Zeitleiste erledigt
    das CSS. Gesten und Tastenkürzel schaltet das Skript ab. Die bisherige Einzel-Sperre per
    `inert` und `pointer-events` pro Element entfällt.

### E2 — Umsetzung

- `markup.js` wird neu geschrieben. Icons: eigene `replay10`/`forward10`-SVGs, dazu das Zahnrad
  aus `quality.js`, das nach `icons.js` verschoben wird.
- **Play/Pause und ±10 s werden eigene `<button>`s** statt `media-play-button` und
  `media-seek-button`. Gespult wird über das vorhandene `seekBy` (`seek.js:32`, mit Klammerung
  am Ende). Die Buttons brauchen das „10s“-Label, die aufaddierende Blase und das saubere
  Ausblenden für Zuschauer; mit eigenen Buttons ist das einfacher als mit den vidstack-Elementen.
  Außerdem hängt die UI dann kaum noch an vidstack, was einen späteren Engine-Wechsel klein hält.
  Das Label ist ein `<span class="vanta-seek-label">10s</span>` unter dem Icon.
- Zeitleiste (`media-time-slider`), Zeitanzeige (`media-time`), Stumm- und Lautstärke-Slider
  sowie PiP bleiben vidstack-Elemente und werden nur neu gestylt.
- `ui/playerUi.js`: neue Methode `holdActive(reason)` / `releaseActive(reason)`. Solange das
  Flyout offen ist oder die Maus über den Controls schwebt, blenden sie sich nicht aus.
- CSS: `controls.css`, `layout.css`, `timeline.css`, `overlays.css` und `responsive.css` neu.
  `menus.css`, `episodes.css` und `watch-party.css` gehen im Flyout-CSS auf.
- Tastenkürzel für Zuschauer: `viewerKeyShortcuts` in `context.js:81-83` (nur M und F) passt
  bereits und bleibt so. Neu ist nur, dass auch der Klick aufs Video für Zuschauer nichts tut.
- Tests: `tests/player/unit/watchParty.test.js` auf das Klassen-Modell umstellen (Root-Klasse
  wechselt bei Rechte-Änderung, Gesten ohne Aktion, Video-Klick wirkungslos). Neu:
  `controls.test.js` für ±10 s (Klammerung, aufaddierende Blase, Labels und `aria-label`).

---

## Teil F — Einstellungs-Flyout (Zahnrad)

### F1 — Verhalten

- **Öffnen:** Das Flyout wächst am Zahnrad verankert auf (`transform-origin` = Zahnrad):
  `scale(.94) translateY(8px), opacity 0` → `1`, 240 ms `var(--abyss-ease)`. Das Zahnrad dreht
  sich dabei um 60°. Schließen läuft rückwärts in 160 ms.
- **Mobil/Querformat:** Das Flyout ist eine **Seitenleiste von rechts** (volle Höhe,
  `min(380px, 45vw)`), mit Wisch-Geste zum Schließen. Im Hochformat zeigt der Player ohnehin das
  Orientierungs-Gate.
- **Navigation:** Die Startseite listet Zeilen mit aktuellem Wert. Ein Tipp schiebt die Unterseite
  von rechts herein (Drill-down wie bei iOS), der Kopf hat einen Zurück-Pfeil. Die **Höhe animiert**
  zwischen den Seiten (per ResizeObserver gemessen, explizite `height`-Transition). Für die
  Folgen-Seite animiert auch die Breite (breiter als die anderen Seiten).
- **Schließen:** Esc, Klick außerhalb, Zahnrad erneut, Zurück-Taste auf der Startseite.
  Der Fokus kehrt zum Zahnrad zurück.
- **Tastatur:** Pfeiltasten in Listen, Enter wählt, ←/Backspace eine Seite zurück. Während das
  Flyout offen ist, sind die Player-Kurzbefehle (←/→/Space) gesperrt.
- `role="dialog"`, `aria-modal="false"`, `aria-expanded` am Zahnrad.

### F2 — Inhalt

| Zeile | Wert rechts | Unterseite | Sichtbar |
|---|---|---|---|
| Untertitel | „Deutsch“ / „Aus“ | Liste mit Häkchen | immer (deaktiviert, wenn keine vorhanden) |
| Qualität | „Auto · 1080p“ | Profile | nur außerhalb der Party (`disableQualityMenu`) |
| Folgen | „S01E03“ | Staffel-Tabs + Folgenliste mit Thumbnails | nur bei Serien; in der Party nur lesend für Zuschauer |
| Teilnehmer | Avatar-Stapel „3/4“ | Liste mit Status, „Admin machen“, „Bannen“ (mit Bestätigung) | nur in der Party |
| *Sync-Kopf* | „Synchron · ±40 ms“ | — (Button „Neu synchronisieren“) | nur in der Party, als Kopfzeile der Startseite |

### F3 — Dateien

- Neu: `src/player/src/settings/flyout.js` (Hülle: Seitenstapel, Animationen, Außenklick,
  Tastatur, Idle-Sperre) und `settings/pages/{subtitles,quality,episodes,participants}.js`
  (rendern nur in einen übergebenen Container).
- Umbau: `subtitles.js`, `quality.js`, `episodes.js` und `watchPartyParticipants.js` behalten ihre
  **reine Logik** (`buildSubtitleMenuItems`, `sortQualityProfiles`, `formatEpisodeCode`,
  `canPromote`, `canBan` …); deren Tests bleiben gültig. Die DOM-Teile (eigener Button, eigenes
  Panel, `document`-Klick-Listener) entfallen. Die Spurregistrierung in `subtitles.js` bleibt als
  Controller ohne View.
- `menuEvents.js` entfällt, weil das Flyout der einzige Menü-Container ist.
- `player/menus.js` verdrahtet nur noch Flyout und Seiten.
- Tests: `watchPartyParticipants.test.js`, `subtitles.test.js`, `quality.test.js` und
  `episodes.test.js` auf die neuen Seiten-Renderer umstellen. Neu: `settingsFlyout.test.js` (Öffnen,
  Schließen, Drill-down, Esc, Außenklick, Fokus-Rückgabe, Idle-Sperre).

---

## Reihenfolge und Commits

Jeder Schritt ist ein eigener Commit und für sich lauffähig. Nach jedem Player- oder
Countdown-Schritt `npm run player:build` bzw. `npm run countdown:build` ausführen und die
Vendor-Ausgabe mit committen.

| # | Schritt | Behebt / liefert |
|---|---|---|
| 1 | Server-Uhr (`TIME_PING/PONG`, `serverClock.js`, `?wpSkew`) | B1 |
| 2 | Server-Zeitleiste mit `seq`, `TIMELINE` statt `CONTROL`, Auslöser-Erkennung | B3, B6 |
| 3 | Ein Taktgeber (`syncLeaderUserId`) | B4 |
| 4 | Drift-Regelung + Token-Echo-Sperre + Debug-Overlay | B5 |
| 5 | Vorladen vor „Bereit“ + Autoplay-Freischaltung + Start zur absoluten Zeit | B2, „echte 5 s“ |
| 6 | `src/shared/particles` + `samplePixels` (Intro unverändert, Intro-Tests grün) | Vorbereitung |
| 7 | Countdown-Bundle + Szene + Fallback, alter Countdown raus | 3D-Countdown |
| 8 | Lobby neu (zwei Phasen, Backdrop, Plätze, Aktionsleiste), Ready-Overlay raus | Lobby |
| 9 | Player-Controls neu (±10 s mit Label, Layout, Zeitleiste) | Controls |
| 10 | Einstellungs-Flyout + Migration aller Menüs | Flyout |
| 11 | README (Countdown-Bundle, Sync-Protokoll), Aufräumen alter CSS | Doku |

Die Schritte 1–5 machen das gemeinsame Schauen auch mit der alten Oberfläche stabil und lassen
sich deshalb zuerst prüfen.

## Prüfung

- `npm install` (aktuell fehlt `node_modules`, `npm test` startet deshalb nicht), danach
  `npm test` nach jedem Schritt.
- Manuell mit zwei Browsern (Desktop + Handy) im Heimnetz:
  - Tab A normal, Tab B mit `?wpSkew=4000`: Beide Countdowns zeigen dieselbe Ziffer, und das Video
    startet sichtbar gleichzeitig (Stoppuhr-Video beider Bildschirme mit dem Handy filmen).
  - Admin spult 5× schnell hintereinander: kein Ping-Pong, maximal eine „gespult“-Meldung pro
    800 ms.
  - Zwei Admins gleichzeitig: Das Debug-Overlay zeigt eine stabile Drift < 150 ms.
  - Netzwerk-Drosselung (DevTools „Fast 4G“) für einen Client: Er holt per Rate-Regelung auf, ohne
    zu springen.
  - Ein Countdown mit 20 % CPU-Throttling: dauert trotzdem 5,0 s (Frames fallen weg, Zeit nicht).
- iOS Safari: Autoplay nach „Bereit“, Flyout im Inline-Vollbild, Seitenleiste im Querformat.

## Risiken

- **iOS und `playbackRate`:** Kleine Ratenänderungen können auf manchen Geräten kurz knacksen.
  Deshalb die Obergrenze ±6 %; falls nötig, auf iOS nur harte Seeks ab 400 ms.
- **Vorladen reserviert den Stream früher:** Das Stream-Limit pro Nutzer greift schon im
  Bereit-Schritt statt erst beim Start. Das ist gewollt, sollte aber in der Fehlermeldung klar
  benannt werden.
- **three.js doppelt** (Intro- und Countdown-Bundle, ~130 KB gzip): Das Countdown-Bundle wird nur
  in einer Watch Party geladen, das Intro nur beim Seitenstart. Ein gemeinsamer Chunk wäre möglich,
  würde aber die festen Vendor-Pfade des Intros ändern.

## vidstack: kein Upgrade

Geprüft wurde, ob ein Wechsel von vidstack 0.6 auf 1.x oder auf ein reines `<video>` + hls.js
einen echten Vorteil bringt. Ergebnis: **nein, nicht in diesem Umbau.**

- Der Player nutzt vidstack fast nur als Hülle um das Video-Element. Direkt importiert wird nur
  `isHLSProvider` (`eventBindings.js:2`). Sonst greift der Code auf Standard-Media-Properties zu
  (`currentTime`, `paused`, `playbackRate`, `textTracks`, `seekable`).
- Keine der Ursachen B1–B6 liegt an vidstack. Sie stecken alle im eigenen Sync- und Ablauf-Code.
- Ein Upgrade auf 1.x benennt Elemente und Events um (u. a. `media-outlet` → `media-provider`,
  `provider-change`-Handling) und würde `sourceSwitch/*` samt Tests berühren. Das ist Aufwand und
  Risiko ohne sichtbaren Gewinn für die Nutzer.
- Nebeneffekt des Plans: Play/Pause und Spulen werden eigene Buttons (E2). Die UI hängt danach
  nur noch an Zeitleiste, Zeitanzeige, Lautstärke und PiP von vidstack. Falls später doch ein
  Wechsel nötig wird (z. B. ein Browser-Bug, der nur in 1.x behoben ist), ist er deutlich kleiner.
