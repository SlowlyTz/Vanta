# Implementierungsplan: Trailer-Scroller — Player-Blockade und festgeklebter For-You-Feed

## Ziel

Zwei Fehler auf der Scroller-Seite beheben:

1. **Nach ca. 5 Scrolls lädt kein Trailer mehr.** Nur ein Seiten-Reload hilft. Ursache liegt in der
   Player-Pipeline, nicht im Laden der Daten.
2. **Jeder Reload liefert exakt denselben For-You-Feed.** Man sieht danach nur noch Trailer, die man
   gerade schon gesehen hat. Ziel: jeder echte Seiten-Reload erzeugt eine komplett neue, zufällige
   Reihenfolge.

Festgelegt (Rückfragen beantwortet):

- Neu gemischt wird **nur beim echten Seiten-Reload** (F5, neuer Tab, erster Besuch). Der Wechsel zur
  Detailseite und zurück behält den laufenden Feed.
- **Rein zufällig**, keine Historie über gesehene Trailer.
- Der Jellyfin-Katalog wird **pro Nutzer ~10 Minuten gecacht**; der Shuffle passiert trotzdem bei
  jedem Reload neu.

---

## Befund A — die Player-Pipeline kann dauerhaft blockieren

`syncPlayers` (`src/public/js/pages/trailer-scroller/playback.js:20-65`) läuft als **serielle**
`for`-Schleife von `start` (= `activeIndex - 2`) bis `end` und wartet in Zeile 43 auf
`await ctx.playerManager.createPlayer(...)`.

Die Zusage, die `createPlayer` zurückgibt, wird **ausschließlich** in `onReady` oder `onError`
aufgelöst (`player.js:134-175`). Es gibt keinen Timeout und keinen Fehlerpfad. Daraus folgt eine Kette
von Problemen:

- **`player.js:115-117`** — eine bereits hängende Zusage liegt in `this.pending` und wird an jeden
  weiteren Aufrufer erneut herausgegeben. Ein einmal toter Player bleibt für immer tot.
- **`player.js:210-222`** — `destroy()` löscht den Eintrag aus `pending`, **löst die Zusage aber nie
  auf**. Wer gerade darauf wartet, wartet für immer.
- **`player.js:126-133`** — `this.pending.set(...)` passiert erst *nach* `target.replaceChildren(iframe)`
  und *nach* `await loadYouTubeIframeApi()`. Zwei überlappende `syncPlayers`-Durchläufe können deshalb
  beide durch die `pending`-Prüfung rutschen und zwei iframes mit derselben ID
  `${containerId}-iframe` bauen. Das zweite `replaceChildren` hängt das erste iframe ab — der
  `YT.Player`, der daran gebunden ist, meldet nie `onReady`.

Weil die Schleife seriell ist und beim **niedrigsten** Index beginnt, blockiert ein einziger toter
Player an einem Nachbar-Index den **aktiven** Slide. Auch die Aufräumschleife (`playback.js:67-71`)
wird nie erreicht, alte Player werden also nicht mehr abgebaut.

### Warum ausgerechnet bei ~5

`LOAD_LIMIT = 8` (`dataLoading.js:5`), `LOAD_THRESHOLD = 3` (`trailer-scroller.state.js:2`). Damit
greift `shouldLoadMore` (`trailer-scroller.state.js:64`) exakt ab `activeIndex >= 5`. Genau dort
startet `setActive` (`playback.js:123`) das Nachladen als Fire-and-forget, das mitten in einen
laufenden `syncPlayers` hinein `renderSlides()` mit acht neuen Slides ausführt. Das ist der erste
Moment im Ablauf, in dem sich zwei `syncPlayers`-Durchläufe und DOM-Arbeit überlappen können.

Zusätzlich ist die Seite in diesem Fenster ohnehin taub: `navigateRelative` steigt bei
`ctx.state.loading` sofort aus (`dataLoading.js:9`) und `updateChrome` deaktiviert den
Weiter-Button (`slideRenderer.js:9`).

> Welcher der drei Pfade den ersten Hänger auslöst, lässt sich aus dem Code allein nicht beweisen.
> Der Fix ist deshalb defensiv angelegt: **ein toter Player darf grundsätzlich keinen anderen mehr
> blockieren**, egal warum er stirbt.

---

## Befund B — die Feed-Reihenfolge klebt in der Session

`TrailersService.getTrailerQueue` (`src/server/services/jellyfin/trailers.service.js:146-161`) legt die
gemischte Liste in `req.session.trailerQueue` ab und gibt sie danach **unverändert** zurück, solange
nicht `refresh === true` übergeben wird.

`init.js:44` ruft aber immer `ctx.loadTrailers(false, ...)` — also ohne `refresh`. Ergebnis: dieselbe
Session liefert bis zum Session-Ablauf (7 Tage, `src/server/config/session.js:12`) oder Serverneustart
**immer dieselbe Reihenfolge ab Cursor 0**. Genau das beschriebene Verhalten.

Der einzige Aufruf mit `refresh = true` sitzt im Leer-Zustand-Button (`slideRenderer.js:67`) und wird
im Normalbetrieb nie erreicht.

Nebenbei: in der Session liegt die **komplette** Bibliothek als normalisierte Objekte inklusive aller
`overview`-Texte (`loadAllTrailerItems(userId, token, 10000)`). Mit dem Default-MemoryStore von
`express-session` sind das schnell mehrere MB pro Session.

---

## Befund C — kleinere Folgefehler

- **Doppeltes Mergen im Refresh-Pfad** (`dataLoading.js:43-54`): `mergeTrailerPage` läuft zweimal und
  `renderSlides()` in Zeile 45 baut Slides, die Zeile 50 sofort wieder wegwirft.
- **Sackgasse bei leerer Nachlade-Seite** (`dataLoading.js:19`): liefert eine Seite nur Duplikate, ist
  `trailers.length > previousLength` falsch und `navigateRelative` tut still gar nichts — obwohl
  `hasMore` weiterhin `true` ist.
- **Fehler sind endgültig** (`playback.js:29`): `if (slide.classList.contains('has-player-error')) continue;`
  schließt einen Slide für immer aus. Mit einem timeout-basierten Fehler ist das zu hart.
- **Slides wachsen unbegrenzt** (`slideRenderer.js:202`): `renderSlides` hängt nur an, entfernt nie.

---

## Teil 1 — Server: Feed-ID statt klebriger Session-Queue

Datei: `src/server/services/jellyfin/trailers.service.js`

**Katalog-Cache.** Nach dem Muster von `src/server/services/home-sections/cache.js` (Promise-Cache in
einer `Map`, Key = `userId`, TTL 10 Minuten, Eintrag bei Fehler wieder löschen):

```js
const catalogCache = new Map();
const CATALOG_TTL = 10 * 60 * 1000;
// getCatalog(userId, token) -> { list: Trailer[], byId: Map<string, Trailer> }
```

**Session-Format.** `req.session.trailerQueue` (volle Objekte) wird ersetzt durch:

```js
req.session.trailerFeed = { id: '<uuid>', order: ['itemId:ytId', ...] }
```

Nur noch IDs — die Session schrumpft von mehreren MB auf wenige Dutzend KB.

**Neue Signatur.** `getTrailerPage(req, userId, token, { feedId, cursor, limit, target })`:

1. Fehlt `feedId` **oder** passt er nicht zu `req.session.trailerFeed?.id` → neuen Feed bauen:
   Katalog holen, `shuffleArray`, neue ID via `randomUUID()` aus `node:crypto`, in der Session
   ablegen, Cursor auf 0 zurücksetzen.
2. Sonst die gespeicherte `order` weiterverwenden.
3. Ist `target` gesetzt und **kein** `cursor` übergeben, beginnt die Seite beim Index des Targets in
   `order` — die Reihenfolge wird **nicht** mehr umsortiert. `prioritizeTrailer`
   (`trailers.service.js:126-136`) entfällt ersatzlos; damit verliert ein Share-Link nicht mehr den
   Rest des Feeds.
4. Seite materialisieren: `order.slice(start, start + limit).map(id => byId.get(id)).filter(Boolean)`.
5. **Wichtig:** wenn nach dem `filter` weniger Einträge übrig sind als `limit` und `hasMore` noch gilt
   (Katalog hat sich seit dem Shuffle geändert), weiterlaufen, bis die Seite voll ist oder die `order`
   endet. Sonst bekommt der Client eine leere Seite und läuft in die Sackgasse aus Befund C.
6. Antwort: `{ feedId, items, nextCursor, hasMore }` — `feedId` ist neu.

Datei: `src/server/routes/media/trailers.routes.js:8-30` — `feedId` aus `req.query` durchreichen,
`refresh` entfällt (ein fehlender `feedId` *ist* jetzt der Refresh).

---

## Teil 2 — Client: Feed-ID im Modul-Zustand, nicht im Storage

Der entscheidende Punkt für „nur echter Reload": `sessionStorage` überlebt F5 und wäre hier falsch.
Eine **Variable auf Modulebene** hat exakt die gewünschte Lebensdauer — sie stirbt bei jedem echten
Seitenladen und überlebt jeden SPA-Routenwechsel.

Neue Datei `src/public/js/pages/trailer-scroller/feedSession.js`:

```js
let currentFeedId = null;
export const getFeedId = () => currentFeedId;
export const setFeedId = id => { currentFeedId = id; };
```

- `src/public/js/api/media.api.js:121` — `getTrailers` auf ein Options-Objekt umstellen:
  `getTrailers({ feedId, cursor, limit, target })`. `refresh` fällt weg.
- `dataLoading.js:28-72` — `ctx.loadTrailers` schickt `getFeedId()` mit und ruft nach der Antwort
  `setFeedId(page.feedId)`.
- Kommt eine **andere** `feedId` zurück als geschickt (Feed serverseitig unbekannt/abgelaufen), gilt
  das als neuer Feed: `trailers`, `seenIds`, `cursor` und `activeIndex` zurücksetzen, `track` leeren,
  `playerManager.destroyAll()` — also genau der bestehende Refresh-Zweig, nur einmal sauber statt
  doppelt (siehe Teil 4).

Damit gilt: erster Mount nach Reload → kein `feedId` → Server würfelt neu. Rückkehr von der
Detailseite → `feedId` liegt noch im Modul → identische Reihenfolge, und dank Punkt 3 aus Teil 1
landet man wieder an der richtigen Stelle.

---

## Teil 3 — Player-Pipeline härten (der eigentliche Fix für „lädt nicht mehr")

Datei: `src/public/js/pages/trailer-scroller/player.js`

1. **`pending` synchron setzen**, ganz am Anfang von `createPlayer` — vor `replaceChildren` und vor
   `await loadYouTubeIframeApi()`. Ein Deferred anlegen, sofort in `this.pending` eintragen, dann erst
   die asynchrone Arbeit starten. Damit sind zwei iframes mit derselben ID ausgeschlossen.
2. **Timeout.** Meldet weder `onReady` noch `onError` innerhalb von ~12 s, wird die Zusage aufgelöst
   (mit Fehlermarker), das tote iframe entfernt und der `pending`-Eintrag gelöscht.
3. **`destroy()` muss auflösen.** Vor dem Löschen aus `pending` die Zusage mit `null` auflösen, damit
   wartende Aufrufer freikommen.
4. **Fehlversuche nicht cachen.** Bei Timeout/Fehler `pending` und `destroyed` für die `containerId`
   bereinigen, damit der nächste `syncPlayers`-Durchlauf es erneut versuchen darf.

Datei: `src/public/js/pages/trailer-scroller/playback.js`

5. **Aktiver Slide zuerst, Nachbarn dürfen nie blockieren.** Die serielle Schleife (`:20-65`)
   umbauen: erst den Player des `activeIndex` erzeugen und abwarten, danach die Puffer-Nachbarn
   **ohne `await`** anstoßen (mit `.catch`). Ein toter Nachbar kann den aktiven Slide dann nicht mehr
   aushungern.
6. **Aufräumen zuerst.** Die Destroy-Schleife (`:67-71`) läuft künftig **vor** dem Erzeugen neuer
   Player (oder in einem `finally`), damit sie auch nach einem Fehlschlag ausgeführt wird.
7. **`runId` vor jedem `createPlayer` prüfen**, nicht erst danach (`:64`).
8. **Fehler wieder versuchbar machen.** Der Frühausstieg über `has-player-error` (`:29`) gilt nur noch
   für echte YouTube-Fehler; ein Timeout setzt stattdessen einen zurücksetzbaren Zustand. Im
   Status-Bereich (`slideRenderer.js:161-173`) neben „Nächster Trailer" einen „Erneut versuchen"-Knopf
   ergänzen, der `has-player-error` entfernt und `ctx.syncPlayers()` auslöst.

---

## Teil 4 — Nachlade-Pfad aufräumen

Datei: `src/public/js/pages/trailer-scroller/dataLoading.js`

- Den Refresh-Zweig (`:43-57`) auf eine Reihenfolge bringen: erst zurücksetzen (Observer, Player,
  `track`, `state`), dann **einmal** `mergeTrailerPage`, dann **einmal** `renderSlides`, dann
  `setActive(0)`. Das doppelte Mergen und das verworfene `renderSlides` in Zeile 45 entfallen.
- `navigateRelative` (`:14-23`): liefert eine Nachlade-Seite keine neuen Einträge, obwohl `hasMore`
  gilt, bis zu dreimal weiterladen, statt still stehenzubleiben.

---

## Teil 5 — optional, nicht Teil des Fixes

Slides und Thumbnails wachsen unbegrenzt (`slideRenderer.js:202`). Ein Fenster-basiertes Entfernen
weit entfernter Slides wäre sinnvoll, kollidiert aber mit den indexbasierten Container-IDs
(`context.js:72`) und wird deshalb hier **nicht** angefasst. Bei Bedarf separat.

---

## Tests

Anzupassen:

- `tests/server/services/jellyfin/trailers/service.test.js` — die Blöcke `getTrailerQueue` und
  `getTrailerPage` neu schreiben: neuer Feed ohne `feedId`, gleiche Reihenfolge bei passendem
  `feedId`, neuer Feed bei unbekanntem `feedId`, `target` startet die Seite am Target-Index (ohne
  Umsortieren), Katalog wird innerhalb der TTL nur einmal von Jellyfin geholt.
- `tests/public/api/media.api.test.js` — neue Options-Signatur von `getTrailers`.

Neu:

- `tests/public/pages/trailer-scroller/player.test.js` erweitern: `createPlayer` löst bei Timeout auf;
  `destroy()` befreit wartende Aufrufer; zwei parallele Aufrufe erzeugen genau ein iframe.
- Ein `playback`-Test: ein hängender Nachbar-Player verhindert **nicht**, dass der aktive Player
  erzeugt wird. Das ist der Regressionstest für den gemeldeten Fehler.

---

## Reihenfolge der Umsetzung

1. **Teil 3** — behebt das „nach 5 Scrolls lädt nichts mehr" und ist unabhängig vom Rest.
2. **Teil 4** — kleine Aufräumarbeit, Voraussetzung für den sauberen Feed-Wechsel.
3. **Teil 1 + 2** — neuer Zufalls-Feed pro Reload.
4. **Tests** parallel zu den jeweiligen Teilen.
