# Implementierungsplan: Neue modulare Startseiten-Logik

## Ziel

Die Startseite soll technisch neu geplant werden. Die Entscheidung, welche Filme und Serien auf der Startseite erscheinen, soll in eine eigene, klar abgegrenzte Home-Logik ausgelagert werden.

Diese Home-Logik soll:

- normale gemeinsame Kategorien aus Filmen und Serien bauen
- besondere Kategorien zwischen normalen Kategorien platzieren
- TMDB-Daten für besondere Kategorien nutzen
- ausschließlich Inhalte anzeigen, die tatsächlich auf dem Jellyfin-Server vorhanden sind
- getrennt von UI-Komponenten und reiner API-Routenlogik bleiben

Es wird in diesem Schritt nichts implementiert.

## Grundsatz

Die Startseite soll keine harte UI-Sammlung mehr sein, die direkt selbst entscheidet, welche Carousels angezeigt werden.

Stattdessen soll es eine eigene fachliche Schicht geben:

```text
Home Page UI
  -> MediaApi.getHomeSections()
    -> Backend Route /api/media/home-sections
      -> HomeSectionsService
        -> Jellyfin Library Services
        -> TMDB Service
        -> Matching / Filtering / Ranking
```

Die UI rendert am Ende nur noch eine fertige Liste von Sections.

## Neue zentrale Home-Logik

### Backend-Service

Neue Datei:

- `src/server/services/home-sections.service.js`

Aufgabe:

- Startseiten-Kategorien zusammenstellen
- Filme und Serien gemeinsam betrachten
- normale Genre-Kategorien bauen
- besondere Kategorien berechnen
- TMDB-Ergebnisse gegen Jellyfin-Bestand abgleichen
- fertige Section-Struktur zurückgeben

Mögliche Hauptfunktion:

```js
async function getHomeSections(userId, accessToken) {
  return {
    hero: [],
    resume: [],
    sections: []
  };
}
```

Wichtig:

- Der Service entscheidet über Inhalte und Reihenfolge.
- Die Route gibt nur JSON zurück.
- Die Frontend-Seite rendert nur noch die gelieferten Sections.

## Gemeinsame Kategorien

Aktuell sollen Filme und Serien nicht mehr getrennt gruppiert werden.

Statt:

- `Filme: Familie`
- `Serien: Familie`

Soll es geben:

- `Familie`

In dieser Kategorie befinden sich gemeinsam:

- Filme mit Genre `Familie`
- Serien mit Genre `Familie`

Das gilt genauso für:

- Drama
- Action
- Comedy
- Thriller
- Science Fiction
- Fantasy
- Abenteuer
- Animation
- Dokumentation
- Krimi
- Horror
- weitere vorhandene Jellyfin-Genres

## Kategorie-Building

### Datenquellen

Normale Kategorien nutzen Jellyfin:

- Filmgenres aus Jellyfin
- Seriengenres aus Jellyfin
- Library-Items mit `type=Movie,Series`

Bestehende Funktionen prüfen und weiterverwenden:

- `LibraryService.getGenres(userId, accessToken, 'Movie')`
- `LibraryService.getGenres(userId, accessToken, 'Series')`
- `LibraryService.getLibrary(userId, accessToken, 'Movie,Series', genre, null, page, limit)`

### Genre-Zusammenführung

Vorgehen:

1. Filmgenres laden.
2. Seriengenres laden.
3. Genres normalisieren.
4. Doppelte Genres zusammenführen.
5. Originalnamen erhalten, damit Jellyfin-Queries funktionieren.

Normalisierung:

- trimmen
- lowercase
- einfache Sonderzeichen-/Whitespace-Normalisierung

Beispiel:

```js
{
  key: 'familie',
  label: 'Familie',
  movieGenreName: 'Familie',
  seriesGenreName: 'Familie'
}
```

Wenn ein Genre nur bei Filmen oder nur bei Serien existiert, bleibt es trotzdem erhalten.

### Items pro Kategorie

Für jede gemeinsame Kategorie:

- passende Filme und Serien aus Jellyfin laden
- leere Kategorien entfernen
- Items mischen, aber stabil sortieren
- Limit pro Kategorie setzen, z. B. 18 bis 24 Items

Mögliche Sortierung:

1. neuere Titel bevorzugen
2. vorhandene Jellyfin-Sortierung übernehmen
3. optional zufällig leicht mischen, aber nicht bei jedem Request komplett chaotisch

Empfehlung:

- Erst stabil und nachvollziehbar sortieren.
- Zufälligkeit später nur einbauen, wenn gewünscht.

## Besondere Kategorien

Nach jeweils ca. 2 bis 3 normalen Kategorien soll eine besondere Kategorie erscheinen.

Beispiel-Reihenfolge:

```text
Weiter schauen
Familie
Drama
Top 5 Filme & Serien der letzten 20 Tage
Action
Comedy
Aktuell beliebt
Thriller
Science Fiction
Besonders oft gesehen
```

Die genaue Platzierung übernimmt die Home-Logik.

### Section-Typen

Normale Kategorie:

```json
{
  "type": "standard",
  "title": "Familie",
  "href": "#/genre/Familie",
  "items": []
}
```

Besondere Kategorie:

```json
{
  "type": "featured",
  "title": "Top 5 Filme & Serien der letzten 20 Tage",
  "subtitle": "Beliebte Titel, die in deiner Mediathek verfuegbar sind",
  "items": [],
  "cardSize": "large"
}
```

Das Frontend kann anhand von `type: "featured"` eine andere Darstellung wählen.

## Visuelle Planung für besondere Kategorien

Besondere Kategorien sollen anders aussehen als normale Kategorien.

Frontend-Komponenten:

- normale Sections nutzen bestehende `MediaCarousel`-Darstellung
- besondere Sections nutzen eine neue oder erweiterte Carousel-Variante

Mögliche Komponente:

- `FeaturedMediaCarousel`

Oder Erweiterung:

- `MediaCarousel({ variant: 'featured' })`

Anforderungen:

- größere Cards als normale Film-/Serien-Cards
- visuell klar abgesetzt
- nicht wie eine normale Genre-Reihe wirken
- auf Mobile horizontal scrollbar bleiben
- keine überladenen Texte
- Titel und ggf. Rang/Badge dürfen sichtbar sein

Beispiel:

- normale Cards: Posterformat ca. 160–180px breit
- besondere Cards: Posterformat ca. 220–260px breit oder Landscape-Cards

## TMDB + Jellyfin kombinieren

Besondere Kategorien sollen TMDB-Daten nutzen, aber nur Jellyfin-verfügbare Inhalte anzeigen.

Wichtig:

- TMDB darf nur Ranking-/Trend-Quelle sein.
- Jellyfin bleibt die Quelle dafür, was tatsächlich angezeigt werden darf.
- Kein Titel anzeigen, der nicht auf Jellyfin existiert.

## Matching-Strategie

### Bevorzugt: Externe Provider-IDs

Der Abgleich soll, wenn möglich, über IDs erfolgen:

- TMDB-ID
- IMDb-ID
- andere externe Provider-IDs aus Jellyfin

Jellyfin-Items prüfen auf Felder wie:

- `ProviderIds`
- `ProviderIds.Tmdb`
- `ProviderIds.Imdb`
- externe ID-Felder im normalisierten Item

Falls diese Felder aktuell nicht geladen werden:

- Jellyfin Fields erweitern
- `ProviderIds` in den Item-Abfragen einbeziehen

### Fallback: Titel + Jahr

Falls keine Provider-ID vorhanden ist:

- normalisierter Titel
- Originaltitel, falls vorhanden
- Produktionsjahr / Erscheinungsjahr
- Typ: Film oder Serie

Fallback nur defensiv nutzen:

- Keine unsicheren Matches anzeigen.
- Bei Mehrdeutigkeit lieber auslassen.

## TMDB-Datenquellen für besondere Kategorien

Mögliche besondere Kategorien:

### Top 5 Filme & Serien der letzten 20 Tage

Technisch mögliche Interpretation:

- TMDB Trending Endpoint mit Zeitraum `day`/`week`
- zusätzlich lokal auf Veröffentlichungs-/Hinzugefügt-Zeitraum oder Jellyfin-Verfügbarkeit prüfen

Offener Punkt:

- TMDB bietet nicht direkt "letzte 20 Tage" für lokale Mediathek.
- Wenn "letzte 20 Tage" lokal gemeint ist, braucht Jellyfin `DateCreated` oder ähnliches.

Empfehlung:

- Kategorie technisch definieren als:
  - TMDB Trending als Ranking
  - Jellyfin-Abgleich
  - optional nur Jellyfin-Items, die in den letzten 20 Tagen hinzugefügt wurden, wenn `DateCreated` zuverlässig verfügbar ist

### Aktuell beliebt

Mögliche TMDB-Quelle:

- Trending Movies/TV
- Popular Movies/TV

Dann:

- TMDB-Liste holen
- gegen Jellyfin matchen
- Top N anzeigen

### Besonders oft gesehen

Mögliche Datenquelle:

- Wenn Jellyfin Nutzungs-/PlayCount-Daten verfügbar sind: Jellyfin bevorzugen
- Falls nicht verfügbar: TMDB Popularity als Ersatz ist semantisch nicht dasselbe

Empfehlung:

- Nur "Besonders oft gesehen" verwenden, wenn Jellyfin Nutzungsdaten verfügbar sind.
- Sonst besser umbenennen in `Beliebt auf TMDB, verfuegbar bei dir`.

## Backend-API

Neue Route:

```text
GET /api/media/home-sections
```

Response:

```json
{
  "hero": [],
  "resume": [],
  "sections": [
    {
      "type": "standard",
      "title": "Familie",
      "href": "#/genre/Familie",
      "items": []
    },
    {
      "type": "featured",
      "title": "Aktuell beliebt",
      "items": [],
      "cardSize": "large"
    }
  ]
}
```

Route-Aufgaben:

- Auth prüfen
- `HomeSectionsService.getHomeSections(userId, accessToken)` aufrufen
- JSON zurückgeben
- Unauthorized wie bestehende Media-Routen behandeln

Keine komplexe Logik in der Route.

## Frontend-API

Datei:

- `src/public/js/api/media.api.js`

Neue Methode:

```js
getHomeSections() {
  return request('/api/media/home-sections');
}
```

Langfristig kann `getHome()` ersetzt oder nur noch als Fallback genutzt werden.

## Frontend-Startseite

Datei:

- `src/public/js/pages/home.page.js`

Plan:

- `HomePage` lädt künftig `MediaApi.getHomeSections()`.
- Hero, Resume und Sections kommen aus einer fertigen Backend-Struktur.
- Die Seite entscheidet nicht mehr selbst, welche Genres/Publisher/Rankings erscheinen.

Rendering:

- `hero` -> `HeroCarousel`
- `resume` -> `MediaCarousel` mit `landscape: true`
- `section.type === 'standard'` -> normale `MediaCarousel`
- `section.type === 'featured'` -> besondere Carousel-Darstellung

Fallback:

- Falls `/home-sections` fehlschlägt, kann temporär das bestehende `/home` genutzt werden.
- Falls einzelne Sections leer sind, nicht rendern.

## Publisher und bisherige auswählbare Inhalte

Anforderung:

- Alles, was aktuell auf der Startseite auswählbar ist, soll weiterhin angezeigt werden.

Aktueller Stand prüfen:

- Genre-Kategorien
- Featured-Publisher-Kategorien
- ggf. weitere Home-Sections

Plan:

- Bestehende auswählbare Home-Inhalte in die neue Section-Struktur übernehmen.
- Publisher können weiterhin eigene Sections bleiben, weil sie keine Genre-Typ-Trennung haben.
- Genre-Sections werden zusammengeführt.

Beispiel:

```text
Familie
Drama
Disney
Top 5 Filme & Serien der letzten 20 Tage
Action
Comedy
Netflix
Aktuell beliebt
```

Offener Entscheidungspunkt:

- Sollen Publisher-Sections zwischen Genre-Sections bleiben oder gebündelt an einer festen Position erscheinen?

## Daten- und Performance-Plan

Wichtig:

- Nicht pro Startseitenaufruf zu viele Jellyfin- und TMDB-Requests auslösen.
- Ergebnisse kurzzeitig cachen.

Empfehlung:

- Cache für Home-Sections pro User oder pro Jellyfin-User:
  - TTL: 10 bis 30 Minuten
- TMDB-Trending/Popular separat cachen:
  - TTL: 1 bis 6 Stunden
- Jellyfin-Bestand mit ProviderIds cachen:
  - TTL: 10 bis 30 Minuten

Bei Cache-Invalidierung:

- manuell nicht nötig für ersten Schritt
- später optional bei Admin-Aktionen oder Library-Refresh

## Fehlerverhalten

Normale Kategorien:

- Wenn ein Genre nicht geladen werden kann, Kategorie auslassen.
- Wenn alle Genres fehlschlagen, Fallback auf alte Home-Daten.

Besondere Kategorien:

- Wenn TMDB nicht erreichbar ist, besondere Kategorie auslassen.
- Startseite darf dadurch nicht komplett fehlschlagen.
- Keine leeren besonderen Kategorien anzeigen.

Matching:

- Unsichere TMDB-Matches auslassen.
- Lieber weniger Items anzeigen als falsche Titel.

## Relevante Dateien

Backend:

- `src/server/routes/media/library.routes.js`
- `src/server/services/home-sections.service.js` neu
- `src/server/services/tmdb.service.js`
- `src/server/services/jellyfin/library.service.js`
- `src/server/services/jellyfin/items.service.js`
- `src/server/services/jellyfin/fields.js`
- optional: `src/server/services/home-sections-cache.service.js`

Frontend:

- `src/public/js/pages/home.page.js`
- `src/public/js/api/media.api.js`
- `src/public/js/components/mediaCarousel.js`
- optional neu: `src/public/js/components/featuredMediaCarousel.js`
- `src/public/css/pages/home.css`
- `src/public/css/components/carousel.css`

## Umsetzungsschritte

### Schritt 1: Bestehende Daten prüfen

- Prüfen, welche Jellyfin-Items bereits `ProviderIds` enthalten.
- Prüfen, ob `DateCreated`, `UserData.PlayCount` oder ähnliche Felder verfügbar sind.
- Prüfen, welche TMDB-Funktionen in `tmdb.service.js` bereits existieren.

### Schritt 2: Section-Contract definieren

- JSON-Struktur für Home-Sections final festlegen.
- Normale und besondere Sections unterscheiden.
- Card-Variant-Feld definieren.

### Schritt 3: HomeSectionsService bauen

- Resume/Hero übernehmen oder neu zusammenstellen.
- gemeinsame Genre-Kategorien bauen.
- Publisher-Sections übernehmen.
- besondere Kategorien über TMDB + Jellyfin-Matching bauen.
- Reihenfolge final mischen.

### Schritt 4: Backend-Route ergänzen

- `/api/media/home-sections`
- Auth und Fehlerhandling wie bestehende Media-Routen.

### Schritt 5: Frontend anpassen

- `MediaApi.getHomeSections()`
- `home.page.js` rendert nur noch Sections.
- besondere Carousel-Darstellung ergänzen.

### Schritt 6: Fallbacks und Tests

- TMDB-Ausfall testen.
- Jellyfin ohne ProviderIds testen.
- leere Kategorien testen.
- Mobile/Desktop Layout prüfen.

## Akzeptanzkriterien

- Startseiten-Inhaltslogik ist in einem eigenen Service/einer eigenen Funktion gekapselt.
- Filme und Serien werden in gemeinsamen Genre-Kategorien angezeigt.
- Es gibt nicht mehr getrennte Kategorien wie `Filme: Familie` und `Serien: Familie`.
- Besondere Kategorien erscheinen nach ca. 2 bis 3 normalen Kategorien.
- Besondere Kategorien sind visuell anders und nutzen größere Cards.
- TMDB-basierte Kategorien zeigen ausschließlich Titel, die auf Jellyfin vorhanden sind.
- Keine unsicheren oder nicht vorhandenen TMDB-Titel erscheinen auf der Startseite.
- UI-Code entscheidet nicht mehr fachlich, welche Inhalte auf der Startseite erscheinen.

## Offene Rückfragen

1. Soll `Top 5 Filme & Serien der letzten 20 Tage` die letzten 20 Tage in TMDB-Trends meinen oder die letzten 20 Tage seit Hinzufügen zur eigenen Jellyfin-Mediathek?
2. Sind Publisher-Sections weiterhin Teil der Startseite, und falls ja: zwischen den Genre-Kategorien oder gesammelt an einer festen Position?
3. Darf `Besonders oft gesehen` nur erscheinen, wenn Jellyfin echte PlayCount-/Nutzungsdaten liefert, oder soll TMDB-Popularität als Ersatz akzeptiert werden?
4. Soll die Startseite pro User personalisiert sein, z. B. mit individuellen Resume-/PlayCount-Daten, oder für alle Nutzer gleich außer `Weiter schauen`?

## Empfehlung

- HomeSectionsService serverseitig bauen.
- Genre-Kategorien aus `Movie` und `Series` zusammenführen.
- TMDB nur als Ranking-Quelle nutzen.
- Jellyfin-Verfügbarkeit über `ProviderIds` matchen.
- Unsichere Matches auslassen.
- Besondere Kategorien nur anzeigen, wenn ausreichend sichere Jellyfin-Treffer vorhanden sind.
