# Plan: Feedback-Runde 3 (11 Punkte)

Stand: 24.09.2026 · Branch `main` · noch nicht umgesetzt.

## Entscheidungen

| Frage | Entscheidung |
|---|---|
| Intro/Rückblick überspringen | **Nur per Button.** Keine Automatik, kein Schalter. |
| Ladeanzeige | **Prozent und geschätzte Restzeit** („Lädt … 63 % · noch ca. 3 s“). |
| „Zuletzt dabei“-Liste | Nur im Arbeitsspeicher; nach einem Server-Neustart leer ist okay. |
| Admin entziehen | Nur der Gastgeber (wie beim Schalter „Auf Puffernde warten“). |
| Doppelte Tonspuren | Gleicher Name wird nur einmal gezeigt; es bleibt die Standardspur, sonst die erste. |

## Diagnose (vorab geprüft)

| # | Ursache |
|---|---|
| 1 Hilfe | Der Code ist in Ordnung. Lokal läuft `NODE_ENV=production`, also liefert der Server die App aus `dist/`. Die Player-CSS steckt fest im App-Bundle (`src/public/index.html:74` wird von Vite eingebaut), das Player-JS kommt aber live aus `/vendor/player/`. Neues JS plus alte CSS: Das Fenster ging unsichtbar hinter dem Video auf. „?“ hat es dann nur unsichtbar geöffnet und geschlossen. |
| 3 Countdown | Die „alte Animation“ ist die CSS-Ersatzziffer „5“ (`countdown.js` `runFallback`, sofort in `showCountdown`). Sie ist zu sehen, während die three.js-Szene lädt: 534-KB-Bundle, Schrift, Abtasten von 5 × 12.000 Punkten, WebGL-Setup. Danach springt die Anzeige hart auf die Partikel um. Das Zusammenfliegen der Partikel (0,4 s Vorlauf) ist dann schon vorbei. Vorgeladen wird bisher nur das Modul, und das erst im Bereit-Raum. |
| 7 Skip | Intro Skipper 1.10.11.19 hat bisher erst etwa 8 % der Folgen analysiert (9 von 120 in der Stichprobe). Die Ergebnisse stehen nur im Plugin-Endpunkt `/Episode/{id}/IntroSkipperSegments`, **nicht** in `/MediaSegments` (0 von 250). Vanta liest bisher nur `/MediaSegments` und Kapitel. Der Kapitel-Fallback erkennt „Intro end“ fälschlich als Intro-Anfang und „Credit start/Credit end“ gar nicht. |
| 10 Spinner | Er wird bei `seeked` ausgeblendet (`eventBindings.js`), obwohl dann erst ein Bild da ist. vidstack verzögert `waiting` um 300 ms und bricht es bei `time-update` ab. Ein fester 6-s-Timeout (`seekRestore.js`) blendet ihn ohnehin aus. Bei pausiertem Video kommt er gar nicht wieder. |
| 11 Crash | `pipeReadable` (`proxyHelpers.js`) hat keinen Abbruch-Signal-Pfad zur Jellyfin-Anfrage. Springt der Player, schließt der Browser die Verbindung und `pipeline` endet. Der Upstream-Stream bricht danach mit „terminated“ (HTTP/2 `PROTOCOL_ERROR`) ab und löst ein `error`-Event aus, das niemand abfängt. Node beendet den Prozess. |

## Umsetzung (je ein Commit, in dieser Reihenfolge)

### 1. Server-Crash beim Spulen (#11)
- `pipeReadable(response, req, res, { controller })`: Jede Proxy-Anfrage (Stream, Playback/HLS, Bild) bekommt einen `AbortController`. Schließt der Browser die Verbindung, wird die Jellyfin-Anfrage abgebrochen.
- Der Datenstrom bekommt eine dauerhafte `error`-Behandlung, die abgebrochene Übertragungen (`terminated`, `ERR_STREAM_PREMATURE_CLOSE`, `AbortError`) still verwirft und alles andere nur protokolliert.
- Test: Ein Web-Stream, der nach dem Abbruch mit „terminated“ fehlschlägt, darf keinen unbehandelten Fehler auslösen. Der Upstream-Abbruch wird geprüft.

### 2. Player-CSS und -JS immer aus demselben Build (#1)
- `src/public/index.html`: Der Link auf `/vendor/player/vanta-player.css` wird mit `vite-ignore` markiert, wie bei `intro-gate.js`. Er bleibt dadurch ein Laufzeit-Link, und der Server liefert ihn aus `src/public` mit `no-cache`.
- Prüfen, dass `npm run build` die Datei nicht mehr ins Bundle zieht und dass Entwicklungs- und Produktionsmodus sie laden.
- Nebenbei: Im Querformat auf dem Handy (844×390) in der Watch Party liegt die Zeile „Hilfe“ halb außerhalb des Bildes. Die Liste soll bei Bedarf scrollen und die Zeile sichtbar machen.

### 3. Hilfe-Text (#4)
- In `help.js` wird die Fußzeile gekürzt auf „Mit ? oder Esc schließen.“, ohne „das Video läuft weiter“. Der Kommentar oben in `help.css` wird entsprechend angepasst.

### 4. Doppelte Tonspuren (#2)
- `buildAudioTracks`: Spuren mit identischem Label werden zusammengefasst. Es bleibt die Standardspur, sonst die erste.
- `pickAudioStreamIndex` bleibt gleich und wählt weiter nach Sprache.
- Test: zwei „Deutsch · 5.1“ plus „Englisch · 2.0“ ergibt 2 Einträge, und die Standardspur bleibt erhalten.

### 5. Countdown ohne alte Zwischenanimation (#3)
- Die Ersatzziffer wird nur noch gezeigt, wenn die Szene nicht laden kann (Fehler oder Timeout) oder „Bewegung reduzieren“ aktiv ist. Bis zum Start der Szene sind nur Hintergrund, Titel und Position zu sehen.
- Der Canvas blendet weich ein (Opacity-Übergang), statt aufzuploppen.
- Vorwärmen: Bundle, Outfit-Schrift und Ziffern-Abtastung laufen schon beim Öffnen des Bereit-Raums, im Leerlauf (`requestIdleCallback`). `mountCountdown` nutzt die fertigen Ziffern-Ziele. Wer direkt im Countdown einsteigt, lädt wie bisher.
- Wird die Szene erst nach dem 0,4-s-Vorlauf fertig, spielt sie das Zusammenfliegen kurz verkürzt ab, statt die fertige „5“ zu zeigen. Die Zeit bleibt dabei an die Server-Uhr gebunden: Die „4“ kommt pünktlich.

### 6. Admin-Meldungen nur für die Beteiligten (#5)
- Server (`handleAdminPromoteMember`): Statt an alle geht die Meldung nur an zwei Personen:
  - Die ernannte Person bekommt „Du bist jetzt Admin.“ (neuer Typ `member_promoted_self`).
  - Wer ernannt hat, bekommt „Lena ist jetzt Admin.“
  - Alle anderen bekommen keine Meldung, nur das normale `PARTY_UPDATED`.
- Tests in `admin-roles.test.js` anpassen.

### 7. Admin wieder entziehen (#6)
- Service `demoteMember({ partyId, actorUserId, targetUserId })`: nur der Gastgeber, Ziel muss Admin sein, Rolle wird `viewer`.
- Socket `ADMIN_DEMOTE_MEMBER` schickt danach `PARTY_UPDATED` an alle. Meldungen wie bei #5: „Du bist kein Admin mehr.“ an die Person, „Lena ist kein Admin mehr.“ an den Gastgeber.
- Ist die Person gerade Sync-Leader, übernimmt der nächste Admin oder der Gastgeber, über das bestehende `getSyncLeaderUserId`.
- UI: Button „Admin entziehen“ neben „Zum Admin machen“, in der Lobby-Teilnehmerliste und im Zahnrad-Menü auf der Seite „Teilnehmer“. Er ist nur für den Gastgeber sichtbar.
- Der Player der Person schaltet live in den Zuschauer-Modus, weil `updateWatchPartyAccess` das schon kann: Transport-Controls weg, Nächste-Folge-Fenster ohne Buttons.
- Tests: Service, Socket und Client (Button nur beim Gastgeber, Nachricht wird gesendet).

### 8. Intro/Abspann aus Intro Skipper (#7), nur Button
- `segments.service.js`: Quellen in dieser Reihenfolge:
  1. `/MediaSegments`
  2. `/Episode/{id}/IntroSkipperSegments`. Die Plugin-Typen Introduction, Recap, Credits und Preview werden auf intro, recap, outro und preview abgebildet; Einträge mit `Valid: false` fallen weg.
  3. Kapitel
- Kapitel-Fallback: Paare wie „Intro start/Intro end“ und „Credit start/Credit end“ werden zu einem Segment. Ein Kapitel mit „… end“ im Namen gilt nie als Segment-Anfang.
- Kein automatisches Überspringen: Es bleibt beim Button „Intro/Rückblick überspringen“. Der Abspann steuert nur das Fenster „Nächste Folge“.
- Tests: Abbildung der Plugin-Antwort, Start/Ende-Paare, Reihenfolge der Quellen.
- Echter Test gegen den Jellyfin-Server mit schon analysierten Folgen (z. B. „The Rookie“, Credits-Segment):
  - Die Route `/api/media/segments/:id` liefert Segmente.
  - Im Browser-Harness erscheint der Button beim Intro.
  - Das Fenster „Nächste Folge“ öffnet sich zu Beginn des Abspanns.

### 9. „Zuletzt dabei“ im Watch-Party-Dialog (#8)
- Server:
  - `recentPartiesByUser` (Map userId → Map partyId → lastSeenAt) wird beim Beitreten und Verbinden gepflegt. Kicks bleiben enthalten, ein Bann entfernt den Eintrag.
  - `WatchPartyService.getRecentPartiesForUser(userId)` liefert nur Partys, die noch existieren, nicht beendet sind und aus denen man nicht gebannt ist. Neueste zuerst, höchstens 5.
  - Aufgeräumt wird zusammen mit `cleanupExpired`.
- Route `GET /api/watch-party/recent`, registriert vor `/:partyId`. Sie liefert eine schlanke Übersicht: Titel, Bild, Gastgeber, Status, belegte und freie Plätze, eigene Rolle.
- Client: `WatchPartyApi.recent()`. `createWatchPartyDialog` zeigt einen Abschnitt „Zuletzt dabei“ mit Beitreten-Button (führt zu `#/watch-party/:id`).
  - Ist die Party voll (4 Plätze) und man ist nicht mehr Mitglied, ist der Button deaktiviert und zeigt „Voll“.
- Tests: Service (Filter gebannt, beendet, weg), Route und Dialog.

### 10. Spinner beim Spulen bleibt bis zum echten Weiterlaufen (#10)
- Ausblenden nicht mehr bei `seeked`, sondern über eine kleine Bereitschaftsprüfung, die nach `seeked` alle ~100 ms läuft:
  - Video spielt: `readyState ≥ HAVE_FUTURE_DATA`, mindestens ~1 s geladen und `currentTime` läuft weiter.
  - Video pausiert: `readyState ≥ HAVE_CURRENT_DATA` an der Zielstelle.
- Der feste 6-s-Timeout blendet nicht mehr aus. Er schaltet nur auf den Text „Lädt länger als üblich …“ um, der Spinner bleibt.
- Die bestehende Regel `isBusy()` in `syncControls.js` wird dafür wiederverwendet.
- Tests mit einem Fake-Player: `seeked` bei `readyState 2` lässt den Spinner stehen, erst genug Puffer plus laufende Zeit blendet ihn aus.

### 11. Echte Ladeanzeige mit Prozent und Restzeit (#9)
- Neues Modul `loadProgress.js` im Player:
  - Ziel: 4 s Puffer ab der Startposition (Erststart und Spulen).
  - Fortschritt = (geladene Sekunden + Anteil des gerade ladenden HLS-Segments) / Ziel. Der Segmentanteil kommt aus `frag.stats.loaded/total` über die Events `hls-frag-loading/-loaded/-buffered`. Die hls.js-Instanz kommt über das Event `hls-instance`.
  - Restzeit = fehlende Bytes / Bandbreite (`hls.bandwidthEstimate` bzw. gemessener Durchsatz des Segments), geglättet. Sie wird erst gezeigt, wenn sie stabil ist, und auf ganze Sekunden gerundet („noch ca. 3 s“).
  - Direct Play (mp4): nur über geladene Sekunden und `progress`-Events. Die Restzeit wird dort aus der Zunahme der geladenen Sekunden pro Sekunde geschätzt.
- Phase ohne echte Daten: Solange Jellyfin das erste Segment transkodiert und noch kein Byte kam, steht „Server bereitet Stream vor …“ ohne Prozentzahl und ohne erfundene Werte.
- Anzeige:
  - Lade-Cover beim Erststart: Prozent, Balken und Restzeit unter „Video wird vorbereitet“.
  - Spinner beim Spulen und Puffern: kleine Prozentzahl im Spinner.
  - Watch-Party-Bereit-Button: vorhandener Prozentwert plus Restzeit.
- Tests: Berechnung (Segmentanteil, Glättung der Restzeit, Phase ohne Bytes) und Anzeige im Cover und im Spinner.

## Abschluss
- `npm run player:build`, `npm run countdown:build`, `npm run build` (damit `dist/` aktuell ist).
- Komplette Testsuite. Bekannte Ausnahme: die 10 alten intro-gate-Fehler (jsdom/localStorage unter Node 26).
- README ergänzen: Intro-Skipper-Quelle, „Zuletzt dabei“, Admin entziehen, Ladeanzeige, Hinweis zu `NODE_ENV=production` und `npm run build`.
- Offene Commits auflisten.

## Hinweise
- Solange `.env` lokal `NODE_ENV=production` hat, braucht jede Änderung an der App (nicht am Player) ein `npm run build`, sonst liefert der Server veraltete Dateien aus `dist/`.
- Damit Intro Skipper alle Folgen erfasst, muss die Aufgabe „Detect and Analyze Media Segments“ in Jellyfin durchlaufen (zuletzt komplett am 16.06.). Bis dahin gibt es den Button nur bei bereits analysierten Folgen.
