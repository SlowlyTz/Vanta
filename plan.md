# Implementierungsplan: Serien im Profil zusammenfassen

## Ziel

In den Profil-Tabs **„Weiter ansehen“** und **„History“** soll jede Serie höchstens einmal erscheinen. Mehrere begonnene oder bereits angesehene Episoden derselben Serie werden zu einer Serienkarte zusammengefasst. Ein Klick auf diese Karte öffnet die bestehende Standard-Detailansicht der Serie unter `#/item/:seriesId`; dort werden wie bisher alle Staffeln und Folgen geladen.

## Aktueller Stand

- `ProfileService.getContinueWatching()` und `ProfileService.getHistory()` fragen derzeit `Movie,Series,Episode` direkt bei Jellyfin ab und paginieren die rohen Ergebnisse.
- Dadurch wird jede Episode als eigener Eintrag an das Frontend geliefert.
- `MediaCard` zeigt Episoden mit Serienposter und Serienname an, verwendet beim Klick aber weiterhin die Episoden-ID.
- Die vorhandene Serien-Detailseite unterstützt bereits die benötigte Zielansicht: Bei einem Element vom Typ `Series` lädt `detail.page.js` über `getSeasons()` und `getEpisodes()` alle Staffeln und Folgen.

## Festgelegter Umfang

- Betroffen sind ausschließlich die Profil-Tabs **„Weiter ansehen“** und **„History“** unter `#/profile`.
- Filme bleiben unverändert und werden weiterhin einzeln angezeigt.
- Favoriten bleiben unverändert, weil dieser Endpunkt bereits nur Filme und Serien abfragt.
- Der Startseitenbereich **„Weiter schauen“** ist nicht Teil dieser Änderung.
- Die bestehende Detailroute, Staffelansicht, Folgenansicht und Wiedergabelogik werden nicht neu gebaut oder verändert.

## Technische Entscheidungen

1. **Zusammenfassung im Backend:** Das Frontend soll keine Jellyfin-Episoden in künstliche Serienobjekte umwandeln. Der Profil-Service liefert bereits fertige Kartenobjekte vom Typ `Movie` oder `Series`.
2. **Eindeutiger Gruppenschlüssel:** Für Episoden wird `SeriesId`, für bereits gelieferte Serien `Id` verwendet. Filme behalten ihre eigene `Id`.
3. **Neueste Aktivität bestimmt die Reihenfolge:** Da Jellyfin nach `DatePlayed` absteigend liefert, behält eine zusammengefasste Serie die Position ihres neuesten Episoden- beziehungsweise Serieneintrags.
4. **Vor der Pagination gruppieren:** Die Rohdaten werden vollständig beziehungsweise kontrolliert in Batches geladen, danach gruppiert und erst anschließend mit `page` und `limit` paginiert. So entstehen volle Seiten mit bis zu 24 eindeutigen Titeln, keine Seriendubletten über Seitengrenzen hinweg und korrekte Werte für `totalItems` und `totalPages`.
5. **Echte Serienmetadaten verwenden:** Die eindeutigen `SeriesId`-Werte werden gesammelt und die zugehörigen Serienobjekte gebündelt über Jellyfin aufgelöst. Dadurch stimmen ID, Typ, Titel, Poster, Staffelangabe und Navigation. Die Episode selbst bleibt nicht das klickbare Kartenobjekt.
6. **Fehlertoleranter Fallback:** Falls Jellyfin für eine gültige `SeriesId` kein Serienobjekt zurückgibt, wird aus den vorhandenen Episodenfeldern (`SeriesId`, `SeriesName`, `SeriesPrimaryImageTag`) ein minimales Objekt vom Typ `Series` erzeugt. Ein einzelner fehlerhafter Datensatz darf nicht den gesamten Profil-Tab unbrauchbar machen.

## Abhängigkeiten

```text
Jellyfin-Rohdaten
    -> Serien-IDs aus Episoden ermitteln
    -> Serienmetadaten gebündelt laden
    -> Filme und eindeutige Serien in Aktivitätsreihenfolge zusammenführen
    -> gruppierte Ergebnisse paginieren
    -> bestehende Profil-API
    -> bestehende MediaCard
    -> bestehende Route #/item/:seriesId
    -> bestehende Staffel- und Folgenansicht
```

## Task 1: Gruppierungs- und Auflösungslogik im Profil-Service einführen

**Beschreibung:** In `ProfileService` eine klar abgegrenzte Hilfslogik ergänzen, die rohe Jellyfin-Ergebnisse in eindeutige Filme und Serien überführt. Episoden derselben `SeriesId` sowie ein eventuell zusätzlich vorhandener Eintrag vom Typ `Series` dürfen nur eine gemeinsame Serienkarte erzeugen.

**Akzeptanzkriterien:**

- [ ] Mehrere Episoden derselben `SeriesId` ergeben exakt einen Eintrag vom Typ `Series` mit der Serien-ID als `Id`.
- [ ] Filme werden nicht gruppiert oder inhaltlich verändert.
- [ ] Die Reihenfolge richtet sich nach dem jeweils neuesten Rohdatensatz einer Serie beziehungsweise eines Films.
- [ ] Serienmetadaten werden gebündelt statt mit einer Jellyfin-Anfrage pro Episode geladen.
- [ ] Fehlende Serienmetadaten werden durch ein navigierbares minimales Serienobjekt abgefangen.

**Verifikation:**

- [ ] Unit-Tests decken mehrere Folgen einer Serie, mehrere Serien, gemischte Filme/Serien, einen zusätzlichen `Series`-Rohdatensatz und fehlende Serienmetadaten ab.
- [ ] Die Tests prüfen explizit `Id`, `Type`, `Name`, Reihenfolge und Dublettenfreiheit.

**Abhängigkeiten:** Keine

**Voraussichtlich betroffene Dateien:**

- `src/server/services/jellyfin/profile.service.js`
- `src/server/services/jellyfin/profile.service.test.js`

**Geschätzter Umfang:** Mittel

## Task 2: Gruppierung vor die Profil-Pagination ziehen

**Beschreibung:** Die Rohdaten für „Weiter ansehen“ und „History“ so laden, dass erst nach der serienweiten Deduplizierung paginiert wird. Dafür die Jellyfin-Ergebnisse in begrenzten Batches vollständig einlesen, gruppieren und anschließend den gewünschten Ausschnitt zurückgeben.

**Akzeptanzkriterien:**

- [ ] `getContinueWatching()` und `getHistory()` liefern höchstens `limit` eindeutige Filme/Serien pro Seite.
- [ ] Eine Serie kann nicht auf mehreren API-Seiten erneut erscheinen.
- [ ] `totalItems` zählt die gruppierten Filme und Serien, nicht die rohen Episoden.
- [ ] `totalPages` wird weiterhin aus dem gruppierten `totalItems` berechnet.
- [ ] Ungültige Werte für `page` und `limit` bleiben durch die vorhandene Routenvalidierung abgesichert.

**Verifikation:**

- [ ] Service-Test mit Seriendubletten auf unterschiedlichen Rohdaten-Batches beziehungsweise späteren Profilseiten.
- [ ] Service-Test für Seite 2 nach der Gruppierung.
- [ ] Route-Test, der korrekte `items`, `totalItems`, `page`, `limit` und `totalPages` für gruppierte Ergebnisse bestätigt.

**Abhängigkeiten:** Task 1

**Voraussichtlich betroffene Dateien:**

- `src/server/services/jellyfin/profile.service.js`
- `src/server/services/jellyfin/profile.service.test.js`
- `src/server/routes/media/profile.routes.test.js`

**Geschätzter Umfang:** Mittel

## Checkpoint: Backend-Vertrag

- [ ] Beide Profil-Endpunkte geben ausschließlich Kartenobjekte vom Typ `Movie` oder `Series` zurück.
- [ ] Serien-IDs, Reihenfolge und Pagination sind in Service- und Route-Tests abgesichert.
- [ ] Der Favoriten-Endpunkt verhält sich unverändert.

## Task 3: Profilansicht und Seriennavigation durch Frontend-Tests absichern

**Beschreibung:** Die Profilseite soll die vom Backend gelieferten Serienobjekte ohne Sonderroute an die bestehende `MediaCard` übergeben. Die Tests werden um reale Serienfälle ergänzt, damit beide Tabs die deduplizierten Daten rendern und die Karte zur Standard-Serienansicht navigiert.

**Akzeptanzkriterien:**

- [ ] „Weiter ansehen“ rendert pro zurückgelieferter Serie genau eine Serienkarte.
- [ ] „History“ rendert pro zurückgelieferter Serie genau eine Serienkarte.
- [ ] Der Klick auf eine Serienkarte setzt den Hash auf `#/item/<SeriesId>` und nicht auf eine Episoden-ID.
- [ ] Die Karte verwendet Serienname, Serienposter und den Badge „SERIE“; eine Episodenbezeichnung wie `S01E02` wird nicht mehr angezeigt.
- [ ] „Mehr laden“, Tab-Wechsel, Fehlerzustände und leere Zustände funktionieren weiterhin.

**Verifikation:**

- [ ] `profile.page.test.js` prüft Serienobjekte in beiden betroffenen Tabs.
- [ ] Der bestehende oder ein ergänzter `mediaCard`-Test prüft die Navigation mit einer Serien-ID.
- [ ] Keine eigene Profil-Detailroute und keine Änderung an der Staffel-/Folgenansicht wurden eingeführt.

**Abhängigkeiten:** Task 2

**Voraussichtlich betroffene Dateien:**

- `src/public/js/pages/profile.page.test.js`
- `src/public/js/components/mediaCard.test.js` (neu, falls kein passender Test existiert)

**Geschätzter Umfang:** Klein

## Checkpoint: Gesamtverifikation

- [ ] Gezielte Tests bestehen:
  `npm test -- src/server/services/jellyfin/profile.service.test.js src/server/routes/media/profile.routes.test.js src/public/js/pages/profile.page.test.js src/public/js/components/mediaCard.test.js`
- [ ] Die vollständige Testsuite besteht: `npm test`
- [ ] Keine Whitespace- oder Patchfehler: `git diff --check`
- [ ] Es wurden keine Änderungen an Player-, HLS-, Detail-, Staffel- oder Folgenlogik vorgenommen.

## Risiken und Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Gruppierung erst nach einer rohen Jellyfin-Seite | Zu wenige Karten, falsche Gesamtzahl und Dubletten auf Folgeseiten | Alle relevanten Rohdaten kontrolliert in Batches laden und erst danach gruppiert paginieren |
| Eine Anfrage pro Episode oder Serie | Langsame Profilseite bei langer History | Serien-IDs deduplizieren und Metadaten gebündelt laden |
| Episodenobjekt wird nur oberflächlich umbenannt | Klick führt weiterhin zur Folge oder Metadaten bleiben inkonsistent | Echte Serienobjekte mit `Id = SeriesId` und `Type = Series` zurückgeben |
| Dieselbe Serie liegt als Episode und als Series-Eintrag vor | Doppelte Karte trotz Episodengruppierung | Beide Varianten auf denselben Schlüssel `Series:<Id>` normalisieren |
| Jellyfin liefert unvollständige Serienmetadaten | Fehlende Karte oder kompletter API-Fehler | Minimales Serienobjekt aus den vorhandenen Episodenfeldern erzeugen |

## Nicht Bestandteil dieses Plans

- Fortsetzen einer konkreten Episode direkt beim Klick auf die Serienkarte
- Veränderung des Startseiten-Carousels „Weiter schauen“
- Änderungen am Player oder an der HLS.js-Logik
- Neue Detailseiten, neue Staffel-/Folgen-Komponenten oder Designänderungen
- Änderungen an Favoriten

## Offene Fragen

Keine blockierende Rückfrage. Der Plan geht davon aus, dass sich „Weiter anschauen“ auf den Profil-Tab **„Weiter ansehen“** bezieht und dass ein Klick bewusst die Serien-Detailseite statt die zuletzt begonnene Episode öffnen soll.
