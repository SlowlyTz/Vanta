# Implementierungsplan: Player-Verbesserungen und Watch-Together-Nachbesserungen

Stand 2026-09-24. Baut auf `plan-watch-together.md` auf (alle Schritte dort sind umgesetzt).

Festgelegt (Rückfragen beantwortet):

- Benachrichtigungen: Nutzername statt „Admin“, dazu neue Optik mit Avatar.
- ±10 s bei anderen Zuschauern: Blase mit Namen („+10 s · Lena“); bei ±10-s-Sprüngen keine
  zusätzliche Benachrichtigung.
- Doppeltipp auf dem Handy wird ein eigener Handler.
- Aus der Vorschlagsliste kommen rein: 1 Tonspur, 2 Intro/Abspann plus besserer Zeitpunkt für
  „Nächste Folge“, 4 Tastatur/Maus/Medientasten, 5 Einstellungen merken, 7 Untertitel-Darstellung,
  8 Doppelklick = Vollbild, 9 Hilfe-Overlay, 12 Teilnehmer-Status, 13 auf Puffernde warten,
  15 „Nächste Folge“ auch in der Watch Party.
- Jellyfin 10.11.8 mit Intro-Skipper-Plugin: Media-Segmente sind die Hauptquelle.
- „Auf Puffernde warten“ schaltet nur der Gastgeber um (nicht Admins).
- Folgenwechsel in der Party ohne Countdown, direkt synchron.
- Mausrad: über dem Lautstärke-Icon/-Regler → Lautstärke, über der Zeitleiste → spulen,
  über dem Bild → nichts.

---

## Teil A — Nachbesserungen

### A1 — Lautstärke-Regler wird abgeschnitten

`.vanta-player-volume-slider` hat `overflow: hidden` für das Ausklappen
(`src/player/src/player/controls.css`). Dadurch wird der Griff (14 px) bei 100 % rechts
abgeschnitten.

- Neue Hülle `<div class="vanta-player-volume-reveal">` um den Slider in `markup.js`. Nur die Hülle
  animiert `width` und schneidet ab; sie hat links und rechts je 8 px Innenabstand. Der Slider selbst
  ist fest 92 px breit und schneidet nichts ab.
- Screenshot-Prüfung bei 0 %, 50 % und 100 %.

### A2 — Benachrichtigungen mit Namen und neuer Optik

- Server (`src/server/realtime/watch-party/notifications.js`, `messageHandlers.js`):
  `createNotification(type, { username, userId, ... })` wird immer mit dem Auslöser aufgerufen.
  Neue Texte: „Lena hat die Wiedergabe gestartet.“, „Lena hat pausiert.“, „Lena ist zu 12:34
  gesprungen.“; ohne Namen „Jemand …“. Die Benachrichtigung enthält `actor: { userId, username }`.
- Bei `OWNER_SEEK` mit `step` (±10-s-Sprung, siehe A5) gibt es keine Benachrichtigung.
- Client (`src/public/js/pages/watch-party/notifications.js`, `playback.css`): Karte mit Avatar
  (Initiale in der Personenfarbe `memberHue` aus `lobby/roster.js`), Aktions-Icon (▶ ❚❚ ↔ + −),
  Text und Glas-Hintergrund. Sie sitzt oben mittig, stapelt höchstens drei Einträge, gleitet
  herein und hinaus, und `prefers-reduced-motion` wird beachtet.
- Tests: Server (Texte, Name, kein Toast bei `step`), Client (Avatar, Farbe, Stapelgrenze).

### A3 — Play-Icon im großen Button nicht mittig

Das Play-Dreieck ist im Icon schon nach rechts gesetzt, sein Schwerpunkt liegt dadurch fast mittig.
Zusätzlich verschiebt `.vanta-player-play.is-large .is-play svg { margin-left: 4px }` es weiter. Die
Zeile entfällt; Screenshot-Prüfung für groß und klein.

### A4 — Countdown ohne äußeren Kreis

- `src/countdown/src/scene.js`: Ring-Geometrie, `RING_VERTEX`, Ring-Material und der Ring-Anteil an
  der Kamera-Einpassung entfallen. Die Ziffer darf etwas größer werden (`FIT_HEIGHT` 0,42 → 0,5).
- `timeline.js`: Das Feld `ring` entfällt.
- Fallback: SVG-Ring aus `context.js`, `countdown.js` und `watch-party-countdown.css` entfernen.
- Tests in `tests/countdown`, `ready-room.test.js` und `countdown-helpers.test.js` anpassen, Bundle
  neu bauen, Screenshots.

### A5 — ±10 s bei allen Zuschauern, mit Namen

1. `transportControls.js`: `seekStep` addiert den Schritt in `context.pendingSeekStep`. Beim
   nächsten `seeked` gibt der Owner-Emitter in `eventBindings.js` `onOwnerSeek(positionMs, { step })`
   aus und setzt die Summe zurück. Mehrere schnelle Seeks ergeben oft nur ein einziges `seeked`,
   deshalb die Summe.
2. `playerMount.js`: `sendOwnerControl('OWNER_SEEK', positionMs, { step })`.
3. Server: `step` prüfen (ganze Zahl, |step| ≤ 600) und in `TIMELINE` mitschicken, zusammen mit
   `actorName`.
4. Seite: `handleTimelineMessage` ruft bei fremdem `reason: 'seek'` mit `step` die Methode
   `controller.showSeekFeedback(step, { by: actorName })` auf.
5. Player: `showSeekFeedback` nutzt dieselbe Blase und dieselbe Summenbildung wie lokal, mit der
   Beschriftung „+10 s · Lena“, und lässt das Icon mitdrehen, sofern der Button sichtbar ist.
6. **Eigener Doppeltipp:** Die `media-gesture`-Elemente mit `dblpointerup seek:±10` werden ersetzt.
   Neuer Handler auf den Randzonen (nur Touch): zwei Tipps innerhalb von 300 ms und 40 px ergeben
   `seekStep(±10)`, weitere Tipps innerhalb von 600 ms spulen weiter (wie bei YouTube). Ein
   einzelner Tipp blendet nur die Controls ein.
7. Tests: Summenbildung bis `seeked`, Server-Payload, Empfänger-Blase mit Name, keine Blase beim
   eigenen Echo, Doppeltipp-Erkennung.

---

## Teil B — Bedienung

### B1 — Tastatur, Maus, Medientasten (Vorschlag 4 und 8)

Ein eigenes Modul `src/player/src/player/shortcuts.js` ersetzt die vidstack-`keyShortcuts`
vollständig: eine Tabelle, eine Stelle für Rechte, und die Hilfe (B3) wird aus derselben Tabelle
erzeugt.

| Eingabe | Aktion | Zuschauer in der Party |
|---|---|---|
| Leertaste / K | Play/Pause | – |
| ← / → oder J / L | −10 s / +10 s (mit Blase) | – |
| ↑ / ↓ | Lautstärke ±5 % (mit Lautstärke-Blase) | ✓ |
| M | Stumm | ✓ |
| F | Vollbild | ✓ |
| C | Untertitel an/aus (letzte Sprache) | ✓ |
| 0–9 | Sprung auf 0–90 % | – |
| ? | Hilfe | ✓ |
| Esc | Hilfe/Flyout schließen, dann Vollbild verlassen | ✓ |
| Mausrad über Lautstärke-Icon/-Regler | Lautstärke ±5 % | ✓ |
| Mausrad über der Zeitleiste | ±10 s (mit Blase) | – |
| Klick aufs Bild | Play/Pause, 220 ms verzögert | – |
| Doppelklick aufs Bild | Vollbild | ✓ |

- Klick und Doppelklick: Die `media-gesture`-Umschaltung wird durch einen eigenen Handler ersetzt.
  Ein Klick startet einen Timer von 220 ms, ein Doppelklick bricht ihn ab und schaltet Vollbild.
- Lautstärke-Blase: kleine Pille oben mittig mit Icon und Balken, für Tastatur und Mausrad.
- **Media Session API** (Medientasten, Kopfhörer, Sperrbildschirm): Titel, Serie und Artwork, dazu
  die Aktionen play, pause, seekbackward und seekforward (10 s). In der Party nur für Admins.
  `setPositionState` wird bei jedem `timeupdate` gedrosselt aktualisiert.
- Beim Tippen in Eingabefeldern und bei offenem Flyout gelten keine Kürzel (wie bisher).

### B2 — Einstellungen merken (Vorschlag 5)

Neues Modul `src/player/src/preferences.js` mit zwei Speicherorten:

- **Allein:** `localStorage` `vanta.player.prefs`, dauerhaft.
- **Watch Party:** `sessionStorage` `vanta.player.party.<partyId>`. Die Werte starten als Standard
  (Untertitel aus, Standard-Tonspur, 80 % Lautstärke, normale Untertitelgröße), unabhängig von den
  Solo-Einstellungen, und gelten für diese Party-Session über Folgenwechsel und Reload hinweg.

Gespeichert werden Lautstärke, Stumm, Untertitel-**Sprache** (nicht die Spur-ID, damit die nächste
Folge die passende Spur findet, erzwungene Untertitel bevorzugt), Tonspur-Sprache (C1) und
Untertitel-Darstellung (B4). Der Player bekommt `preferencesKey` von der Seite (`player.page.js`:
Solo, `playerMount.js`: Party-ID) und schreibt Änderungen gedrosselt.

### B3 — Hilfe-Overlay (Vorschlag 9)

- Aufruf mit `?` oder über die neue letzte Zeile „Hilfe“ auf der Startseite des Zahnrad-Menüs.
- Vollbild-Overlay über dem Player, Hintergrund etwa 50 % transparent mit leichtem Blur; das Video
  läuft weiter. Die Controls bleiben dabei ausgeblendet.
- Inhalt in drei Spalten (auf dem Handy untereinander): **Tastatur**, **Maus & Touch** (Klick,
  Doppelklick, Doppeltipp, Mausrad), **Watch Party** (Rollen, „Admin steuert“, Pause-Warten, Sync).
  Alles wird aus der Tabelle in B1 erzeugt; für Zuschauer sind gesperrte Aktionen als
  „Nur Admins“ markiert.
- Schließen mit Esc, `?`, dem Schließen-Button oder einem Klick daneben; der Fokus kehrt zurück.

### B4 — Untertitel-Darstellung (Vorschlag 7)

Zahnrad-Menü → Untertitel → unten ein Abschnitt „Darstellung“: Größe (klein, mittel, groß) und
Hintergrund (aus, halbtransparent, deckend). Umgesetzt über die CSS-Variablen auf
`.vanta-player-captions` (`--media-cue-font-size`, `--media-cue-bg`) und gespeichert über B2.

---

## Teil C — Tonspur (Vorschlag 1)

- Server `streamSelection.js`: `audioTracks` aus `getMediaStreams(source, 'audio')` mit Index,
  Sprache, Titel, Codec, Kanälen und Standard-Flag. `audioStreamIndex` aus der Anfrage wird
  durchgereicht (die Route liest ihn schon, `playback.routes.js:39`). Bei einer Nicht-Standard-Spur
  wird HLS erzwungen, weil Browser Tonspuren in MP4 nicht zuverlässig umschalten.
- Player: `createAudioController` im Stil von `createQualityController`. Die Flyout-Zeile heißt
  „Tonspur“, z. B. „Deutsch · 5.1“. Die Auswahl geht über `resolvePlayback('auto',
  { audioStreamIndex })` und `sourceSwitch.switchTo` an der aktuellen Position.
- Watch Party: Jeder wählt seine Spur selbst. Der Quellwechsel ist für die Drift-Regelung ein
  „busy“-Zustand; danach springt der Player wieder auf die Zeitleiste.
- `jellyfinReporter` meldet die gewählte Spur.

---

## Teil D — Intro/Abspann und „Nächste Folge“ (Vorschlag 2)

### Befund „Nächste Folge“

`src/player/src/nextEpisode.js` rechnet mit festen Anteilen: Hinweis bei **97 %** der Laufzeit,
automatischer Wechsel bei **98,5 %**, mindestens 25 s Vorlauf. Bei Folgen mit langem Abspann kommt
der Hinweis zu spät, bei Folgen mit Szene nach dem Abspann zu früh.

### Umsetzung

1. **Server:** neue Route `GET /api/media/:id/segments`. Sie fragt Jellyfin `/MediaSegments/{id}`
   ab (ab Jellyfin 10.10) und liefert `[{ type: 'Intro' | 'Outro' | 'Recap' | 'Preview', startMs, endMs }]`.
   Fallback: Kapitel des Items (Feld `Chapters` zu den Detail-Feldern ergänzen) mit Namen wie
   „Intro“, „Opening“, „Vorspann“, „Credits“, „Abspann“, „End Credits“. Ohne beides kommt eine leere
   Liste. Antworten werden pro Item gecacht.
2. **Player:** `segments.js` lädt die Segmente parallel zum Stream.
   - **Intro/Recap:** Button „Intro überspringen“ bzw. „Rückblick überspringen“ unten rechts, ab
     Segmentbeginn für höchstens die Segmentdauer. Der Klick springt zum Segmentende. In der Party
     nur für Admins; der Sprung wird normal synchronisiert.
   - **„Nächste Folge“:** Gibt es ein Outro-Segment, kommt der Hinweis bei dessen Beginn und der
     Wechsel bei dessen Ende (bzw. 10 s vor Laufzeitende, falls früher), mit mindestens 10 s
     Vorlauf. Ohne Segment gelten die heutigen Prozentwerte als Rückfall.
     `computeNextEpisodeTimings` bekommt `outro` als optionalen Parameter; die bestehenden Tests
     bleiben für den Rückfall gültig.
   - Filme: Ein Outro-Segment bewirkt nichts (kein Abspann-Überspringen ins Leere).

---

## Teil E — Watch Party

### E1 — Teilnehmer-Status im Zahnrad-Menü (Vorschlag 12)

- Clients melden alle 2 s oder bei Änderung `PLAYER_STATUS { state: 'sync' | 'correcting' |
  'buffering' | 'paused' | 'blocked', driftMs }` aus der Drift-Regelung.
- Der Server speichert den Status am Mitglied und sendet eine schlanke Nachricht
  `PRESENCE { members: [{ userId, connected, state, driftMs }] }` statt eines vollen
  `PARTY_UPDATED`.
- Flyout: Das Menü wird breiter (Standard 380 px, breite Seiten 460 px). Die Startseite zeigt oben
  statt der reinen Sync-Zeile eine **„Watch Party“-Karte**: Avatar-Stapel aller Teilnehmer mit
  Statuspunkt (grün synchron, blau gleicht an, gelb puffert, rot blockiert, grau offline), der eigene
  Sync-Status und „Neu synchronisieren“. Die Teilnehmer-Seite zeigt pro Person Status und Abweichung
  („±40 ms“, „puffert“), dazu wie bisher „Admin machen“ und „Bannen“.

### E2 — Auf Puffernde warten (Vorschlag 13)

- Server: Meldet ein verbundenes Mitglied länger als **3 s** `buffering`, während die Party läuft,
  pausiert der Server die Zeitleiste (`TIMELINE` mit `reason: 'wait'`, `waitingFor: [userIds]`).
  Sobald alle Wartenden wieder genug Puffer melden, startet er erneut, verankert 1 s in der
  Zukunft, damit alle gleichzeitig loslaufen. Spätestens nach **30 s** geht es ohne die Wartenden
  weiter; sie holen über die Drift-Regelung auf.
- Anzeige für alle: Pille oben mittig „Warte auf Lena …“ mit dem Zusatz „Lässt sich im Zahnrad-Menü
  unter Watch Party abschalten.“
- Einstellung „Auf Puffernde warten“ als Schalter in der Watch-Party-Karte des Flyouts, pro
  Party-Session (serverseitig, siehe Rückfrage), standardmäßig an.
- Der Sync-Leader-Heartbeat wird während des Wartens ignoriert.

### E3 — „Nächste Folge“ für alle (Vorschlag 15)

- Alle sehen denselben Hinweis zur selben Zeit; die Zeiten kommen aus derselben Zeitleiste.
  Zuschauer sehen Countdown und Vorschau, aber keine Buttons. Admins sehen „Abbrechen“ und
  „Jetzt abspielen“.
- „Abbrechen“ durch einen Admin sendet `NEXT_EPISODE_CANCEL` und schließt den Hinweis bei allen.
- Automatischer Wechsel am Ende: Nur der **Sync-Leader** sendet `OWNER_CHANGE_EPISODE`, damit nicht
  mehrere Admins gleichzeitig wechseln. „Jetzt abspielen“ darf jeder Admin.
- Übergang zur neuen Folge: Der Server setzt `status: 'switching'`. Alle Clients laden die neue
  Folge ohne Klick vor (Autoplay ist seit dem ersten „Bereit“ freigeschaltet) und melden
  `PLAYER_READY`. Sobald alle bereit sind, spätestens nach 20 s, startet die Zeitleiste 1 s in der
  Zukunft für alle gleichzeitig. Heute landet die neue Folge pausiert bei 0 und ein Admin muss Play
  drücken.

---

## Reihenfolge und Commits

| # | Schritt |
|---|---|
| 1 | A1 Lautstärke-Regler |
| 2 | A3 Play-Icon zentriert |
| 3 | A4 Countdown ohne Kreis |
| 4 | A2 Benachrichtigungen mit Namen und Avatar |
| 5 | A5 ±10 s bei allen (Protokoll, Blase mit Name, Doppeltipp) |
| 6 | B1 Tastatur, Maus, Doppelklick, Mausrad, Media Session |
| 7 | B2 Einstellungen merken |
| 8 | B4 Untertitel-Darstellung |
| 9 | B3 Hilfe-Overlay |
| 10 | C Tonspur |
| 11 | D1 Segment-Route (Server) |
| 12 | D2 Intro überspringen + „Nächste Folge“ nach Segmenten |
| 13 | E1 Teilnehmer-Status |
| 14 | E2 Auf Puffernde warten |
| 15 | E3 „Nächste Folge“ in der Party + synchroner Folgenstart |
| 16 | README |

Nach jedem Player-, Countdown- oder Server-Schritt: Tests, Build, Screenshot-Prüfung in
Headless-Chromium für sichtbare Änderungen.
