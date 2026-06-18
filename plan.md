# Implementierungsplan: Startseite mit Genre- und Publisher-Kategorien

## Ziel

Die Startseite soll nicht mehr nur die groben Reihen `Filme` und `Serien` anzeigen. Stattdessen soll sie kuratierte Kategorien zeigen:

- Film-Kategorien: dieselben Genres, die im Desktop-Dropdown beim Hover über `Filme` verfügbar sind.
- Serien-Kategorien: dieselben Genres, die im Desktop-Dropdown beim Hover über `Serien` verfügbar sind.
- Publisher-Kategorien: nur die großen Publisher, die auf der Publisher-Seite ganz oben als Featured-Publisher angezeigt werden.

Die Kategorien sollen direkt auf der Startseite als Inhalte sichtbar sein, idealerweise als horizontale Carousels mit Medienkarten. Die bestehenden Routen für vollständige Listen bleiben erhalten.

## Ist-Zustand

Startseite:

- Datei: `src/public/js/pages/home.page.js`
- Lädt aktuell nur `MediaApi.getHome()`.
- Rendert:
  - Hero aus zufälligen Filmen/Serien
  - `Weiter schauen`
  - `Filme`
  - `Serien`

Dropdowns:

- Datei: `src/public/js/components/navbar/dropdownMenus.js`
- Film- und Serien-Dropdowns nutzen `MediaApi.getGenres(type)`.
- Angezeigt werden jeweils `genres.slice(0, 12)`.
- Links zeigen auf `#/genre/Movie/:genreName` bzw. `#/genre/Series/:genreName`.

Publisher:

- Datei: `src/public/js/pages/publishers.page.js`
- Featured-Publisher sind:
  - Disney
  - 20th Century Studios
  - Warner Bros
  - Netflix
  - Apple TV
  - Prime Video
  - HBO
- Die gleiche Logik existiert fast doppelt in `dropdownMenus.js`.

Library:

- Datei: `src/public/js/pages/library.page.js`
- Unterstützt bereits:
  - Typ-Filter: `Movie`, `Series`, `Movie,Series`
  - Genre-Filter
  - Studio-/Publisher-Filter
- API: `MediaApi.getLibrary(type, genre, studio, page, limit)`

## Zielbild der Startseite

Reihenfolge:

1. Hero
2. `Weiter schauen`, falls vorhanden
3. Film-Genre-Kategorien, z. B. `Filme: Action`, `Filme: Drama`
4. Serien-Genre-Kategorien, z. B. `Serien: Comedy`, `Serien: Crime`
5. Publisher-Kategorien, z. B. `Disney`, `Netflix`, `Warner Bros`

Jede Kategorie wird als `MediaCarousel` gerendert.

- Genre-Carousels zeigen Poster-Karten.
- Publisher-Carousels zeigen ebenfalls Poster-Karten aus `Movie,Series`.
- Eine Kategorie wird nur angezeigt, wenn sie mindestens einen Titel enthält.
- Jede Kategorie soll einen Weg zur vollständigen Liste haben, entweder über einen `Alle anzeigen`-Link im Carousel-Header oder als Titel-Link.

## Datenmodell im Frontend

Eine gemeinsame Konfiguration für Featured-Publisher auslagern, damit Publisher-Seite, Dropdown und Startseite dieselben Daten nutzen.

Neue Datei:

- `src/public/js/constants/featuredStudios.js`

Inhalt:

- `FEATURED_STUDIOS`
- `matchFeaturedStudio(studioName)`
- Optional: `getFeaturedStudiosFromLibraryStudios(studios)`

Danach anpassen:

- `src/public/js/components/navbar/dropdownMenus.js`
- `src/public/js/pages/publishers.page.js`
- `src/public/js/pages/home.page.js`

Vorteil:

- Die großen Publisher werden nur noch an einer Stelle gepflegt.
- Startseite und Publisher-Seite können nicht auseinanderlaufen.

## API-Strategie

### Variante A: Minimal und schnell

Im Frontend:

- `MediaApi.getHome()` weiter für Hero, Resume und Fallback nutzen.
- Zusätzlich laden:
  - `MediaApi.getGenres('Movie')`
  - `MediaApi.getGenres('Series')`
  - `MediaApi.getStudios()`
- Für jede Startseiten-Kategorie:
  - Genre: `MediaApi.getLibrary(type, genre, null, 1, 20)`
  - Publisher: `MediaApi.getLibrary('Movie,Series', null, studio.Name, 1, 20)`

Limit:

- Pro Kategorie reichen 15 bis 20 Items.
- Genres werden exakt wie im Dropdown auf `slice(0, 12)` begrenzt.
- Featured-Publisher werden nach der bestehenden Featured-Reihenfolge sortiert.

Nachteil:

- Viele parallele API-Requests auf der Startseite.
- Bei 12 Filmgenres, 12 Seriengenres und bis zu 7 Publishern können bis zu 31 zusätzliche Requests entstehen.

### Variante B: Sauberer Backend-Endpunkt

Neuer Backend-Endpunkt:

```text
GET /api/media/home-categories
```

Response-Beispiel:

```json
{
  "movieGenres": [
    {
      "name": "Action",
      "href": "#/genre/Movie/Action",
      "items": []
    }
  ],
  "seriesGenres": [
    {
      "name": "Comedy",
      "href": "#/genre/Series/Comedy",
      "items": []
    }
  ],
  "publishers": [
    {
      "name": "Disney",
      "studioName": "Walt Disney Pictures",
      "href": "#/publisher/Walt%20Disney%20Pictures",
      "items": []
    }
  ]
}
```

Backend-Aufgaben:

- In `src/server/routes/media/library.routes.js` neuen `/home-categories`-Handler ergänzen.
- Genres mit `LibraryService.getGenres(userId, accessToken, type)` laden.
- Studios mit `LibraryService.getStudios(userId, accessToken)` laden.
- Für die ersten 12 Genres je Typ und die Featured-Publisher jeweils `LibraryService.getLibrary(...)` mit kleinem Limit laden.
- Leere Kategorien aus der Response entfernen oder im Frontend ignorieren.

Vorteil:

- Startseite bekommt eine kompakte, fertig vorbereitete Struktur.
- Sortierung, Limits und Featured-Matching sind zentral.
- Weniger UI-seitige Orchestrierung.

Empfehlung:

- Variante B implementieren, wenn Performance und Wartbarkeit wichtig sind.
- Variante A reicht, wenn die Änderung möglichst klein bleiben soll.

## Frontend-Umsetzung

### 1. `MediaApi` erweitern

Datei:

- `src/public/js/api/media.api.js`

Bei Variante B:

```js
getHomeCategories() {
  return request('/api/media/home-categories');
}
```

Bei Variante A ist keine neue API-Methode nötig, weil `getGenres`, `getStudios` und `getLibrary` bereits existieren.

### 2. `home.page.js` umbauen

Datei:

- `src/public/js/pages/home.page.js`

Änderungen:

- `loadData` lädt Home-Daten und Kategorie-Daten parallel.
- `renderHome(data, categories)` rendert nach `Weiter schauen` die neuen Kategorie-Carousels.
- Die alten pauschalen `Filme`- und `Serien`-Carousels entfernen oder nur als Fallback behalten.

Fallback-Regel:

- Wenn keine Kategorien geladen werden können, weiter die alten Reihen `Filme` und `Serien` anzeigen.
- Wenn einzelne Kategorien leer sind, diese Kategorie überspringen.

### 3. Carousel-Header klickbar machen

Aktuell:

- `MediaCarousel` nimmt nur `title`, `items`, `landscape`.
- `HorizontalCarousel` muss geprüft werden, ob es bereits Header-Actions unterstützt.

Plan:

- `MediaCarousel` optional erweitern:
  - `href`
  - `actionLabel = 'Alle anzeigen'`
- `HorizontalCarousel` optional erweitern:
  - Header rechts mit Link/Button, wenn `href` gesetzt ist.

Beispiele:

- `Filme: Action` -> `#/genre/Movie/Action`
- `Serien: Comedy` -> `#/genre/Series/Comedy`
- `Disney` -> `#/publisher/<studioName>`

### 4. Publisher-Matching zentralisieren

Neue Datei:

- `src/public/js/constants/featuredStudios.js`

Danach Imports anpassen:

- `dropdownMenus.js`
- `publishers.page.js`
- `home.page.js`

Wichtig:

- Für Links immer den tatsächlichen `studio.Name` aus Jellyfin verwenden.
- Für Labels das kuratierte Label verwenden, z. B. `Prime Video`.

## Backend-Umsetzung bei Variante B

### 1. Gemeinsame Featured-Studio-Konfiguration

Da Backend und Frontend getrennte Module haben, entweder:

- eine Backend-Konstante in `src/server/services/jellyfin/featured-studios.js` anlegen, oder
- die Logik nur im Frontend behalten und Variante A wählen.

Wenn Variante B gewählt wird:

- Backend braucht dieselbe Match-Liste wie das Frontend.
- Doppelte Listen sind unschön, aber akzeptabel, wenn klar dokumentiert.

### 2. Route ergänzen

Datei:

- `src/server/routes/media/library.routes.js`

Neue Route:

```text
GET /home-categories
```

Logik:

- Auth wie bei `/home`, `/genres`, `/studios`.
- Parallel laden:
  - `genres(Movie)`
  - `genres(Series)`
  - `studios`
- Kategorien bauen:
  - `movieGenres = genres.slice(0, 12)`
  - `seriesGenres = genres.slice(0, 12)`
  - `publishers = featured studios from studios`
- Pro Kategorie Library-Items laden.
- Kategorien ohne Items nicht zurückgeben.
- Fehler bei Jellyfin-Unauthorized wie bestehend behandeln.

### 3. Service-Helfer optional auslagern

Wenn die Route zu groß wird:

- Neuer Service: `src/server/services/home-categories.service.js`
- Aufgabe:
  - Kategorie-Definitionen bauen
  - Items laden
  - leere Kategorien entfernen

## Styling

Wahrscheinlich reichen bestehende Styles:

- `src/public/css/components/carousel.css`
- `src/public/css/pages/home.css`

Mögliche Ergänzungen:

- Header-Link `Alle anzeigen` dezent rechts im Carousel-Header.
- Auf Mobile darf der Link als kleines Icon oder kurze Textaktion erscheinen.
- Lange Kategorienamen müssen ellipsisiert werden und dürfen den Header nicht sprengen.

Keine neuen Card-Designs nötig, wenn Kategorien als Medien-Carousels umgesetzt werden.

## Performance

Wichtig:

- Kategorie-Requests parallel laden.
- Pro Kategorie niedriges Limit verwenden, z. B. 15 oder 20.
- Kategorien ohne Items nicht rendern.
- Bei Variante A `Promise.allSettled` nutzen, damit ein einzelner Fehler nicht die ganze Startseite kaputt macht.
- Bei Variante B serverseitig ebenfalls einzelne Kategoriefehler defensiv behandeln oder gesammelt als 500 zurückgeben.

Empfehlung für erste Umsetzung:

- Maximal 12 Filmgenres
- Maximal 12 Seriengenres
- Maximal 7 Publisher
- 15 Items pro Kategorie

## Tests und Prüfung

Manuell prüfen:

- Desktop:
  - Dropdown `Filme` zeigt dieselben Genres wie die Startseite bei Film-Kategorien.
  - Dropdown `Serien` zeigt dieselben Genres wie die Startseite bei Serien-Kategorien.
  - Publisher auf der Startseite entsprechen den großen Publishern oben auf der Publisher-Seite.
  - `Alle anzeigen`/Titel-Link führt zur korrekten Library-Seite.
- Mobile:
  - Carousels scrollen sauber horizontal.
  - Header laufen nicht über.
  - Startseite bleibt bedienbar und lädt nicht sichtbar blockierend.
- Fehlerfälle:
  - Jellyfin liefert keine Genres.
  - Ein Genre hat keine Inhalte.
  - Featured-Publisher existiert in Jellyfin nicht.
  - Kategorien-API schlägt fehl, aber alte Home-Daten laden.

Automatisiert, falls vorhandene Teststruktur ergänzt wird:

- Unit-Test für `matchFeaturedStudio`.
- Unit-Test für Kategorie-Building.
- Integrationstest für `/api/media/home-categories`, falls Variante B gewählt wird.

## Offene Rückfragen

1. Sollen die alten Reihen `Filme` und `Serien` komplett verschwinden, oder als Fallback/zusätzliche Reihe am Ende bleiben?
2. Soll die Startseite wirklich für alle 12 Filmgenres und alle 12 Seriengenres Carousels zeigen, oder sollen auf der Startseite weniger Kategorien erscheinen als im Dropdown?
3. Bevorzugst du die schnelle Frontend-Variante A oder den saubereren Backend-Endpunkt Variante B?

Meine Empfehlung:

- Alte `Filme`/`Serien`-Reihen entfernen, aber als technischer Fallback behalten.
- Dieselben 12 Dropdown-Genres pro Typ verwenden, damit die Anforderung exakt erfüllt ist.
- Variante B umsetzen, damit die Startseite nicht dutzende einzelne Requests koordinieren muss.
