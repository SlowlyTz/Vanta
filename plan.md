# Kurzplan: "Jetzt im Kino" auf der Startseite

## Ziel

Auf der Startseite soll direkt unter dem Bereich "Weiter schauen" immer eine Kategorie "Jetzt im Kino" erscheinen. Die Filme dafür kommen aus der TMDB-API, angezeigt werden aber ausschließlich Medien, die wirklich in Jellyfin vorhanden sind.

Annahme: TMDB wird mit `language=de-DE` und `region=DE` abgefragt. Wenn ein anderes Kinoland gemeint ist, sollte das als `TMDB_REGION` konfigurierbar werden.

## Technischer Ansatz

- `HomeSectionsService` ist der richtige Ort. Dort werden bereits echte Jellyfin-Medien geladen, TMDB-Trending/Popular abgefragt und über `_matchTmdbItems()` gegen die Jellyfin-Library gematcht.
- `TmdbService` bekommt eine neue Methode `getNowPlaying(limit = 60, region = 'DE')`, die `/movie/now_playing` abfragt.
- Die neue Section wird serverseitig als erste normale Section zurückgegeben, damit sie im Frontend direkt nach "Weiter schauen" steht.
- Die Section muss auch bei 0 Treffern zurückgegeben werden, weil die Kategorie laut Anforderung immer sichtbar sein soll. Dann rendert das Frontend einen kompakten Empty-State statt Karten.
- Es dürfen keine rohen TMDB-Objekte ans UI durchgereicht werden. Jedes angezeigte Item muss ein echtes Jellyfin-Item mit `Id` sein.

## Backend-Änderungen

### 1. TMDB Now Playing ergänzen

In `src/server/services/tmdb.service.js`:

```js
static async getNowPlaying(limit = 60, region = 'DE') {
  const cacheKey = `tmdb_now_playing_${region}`;
  const cached = getMemoryCache(cacheKey, 60 * 60 * 1000);
  if (cached) return cached.slice(0, limit);

  const data = await fetchTmdbJson('/movie/now_playing', {
    language: 'de-DE',
    region,
    page: 1
  });

  const results = (data.results || []).map(item => ({
    id: item.id,
    title: item.title,
    originalTitle: item.original_title,
    mediaType: 'movie',
    releaseDate: item.release_date,
    popularity: item.popularity || 0
  }));

  setMemoryCache(cacheKey, results);
  return results.slice(0, limit);
}
```

### 2. Feste Home-Section bauen

In `src/server/services/home-sections.service.js`:

```js
static async _buildNowPlayingSection(items) {
  const indexes = this._buildItemIndexes(items);

  try {
    const tmdbItems = await TmdbService.getNowPlaying(60, process.env.TMDB_REGION || 'DE');
    const matchedItems = this._matchTmdbItems(tmdbItems, indexes, SECTION_LIMIT);

    return {
      type: 'standard',
      title: 'Jetzt im Kino',
      href: '#/movies',
      items: matchedItems,
      emptyMessage: 'Keine aktuellen Kinofilme in deiner Mediathek.'
    };
  } catch (error) {
    console.error('[HomeSectionsService] Failed to build now playing section:', error.message);
    return {
      type: 'standard',
      title: 'Jetzt im Kino',
      href: '#/movies',
      items: [],
      emptyMessage: 'Aktuelle Kinofilme konnten gerade nicht geprüft werden.'
    };
  }
}
```

Dann in `getHomeSections()` parallel mitbauen und vor die restlichen Sections setzen:

```js
const [standardSections, publisherSections, featuredSections, nowPlayingSection] = await Promise.all([
  this._buildGenreSections(userId, accessToken, allIndexItems),
  this._buildPublisherSections(userId, accessToken),
  this._buildFeaturedSections(allIndexItems),
  this._buildNowPlayingSection(allIndexItems)
]);

const sections = [
  nowPlayingSection,
  ...this._arrangeSections(standardSections, publisherSections, featuredSections)
];
```

## Frontend-Änderungen

Aktuell überspringt `src/public/js/pages/home.page.js` Sections ohne Items:

```js
if (!section.items || section.items.length === 0) return;
```

Das muss für feste Sections mit `emptyMessage` angepasst werden:

```js
if (!section.items || section.items.length === 0) {
  if (!section.emptyMessage) return;
  sectionsContainer.appendChild(createElement('section', { className: 'media-section media-section-empty' },
    createElement('div', { className: 'section-header' },
      createElement('h2', {}, section.title)
    ),
    createElement('p', { className: 'section-empty-message' }, section.emptyMessage)
  ));
  return;
}
```

Designvorgabe: Empty-State kompakt halten, keine große leere Fläche. Titel, Abstand und Typografie sollen wie normale Home-Sections wirken.

## Tests

- `src/server/services/tmdb.service.test.js`: `getNowPlaying()` ruft `/movie/now_playing` mit `language=de-DE` und `region=DE` ab und mappt nur Movie-Felder.
- `src/server/services/home-sections.service.test.js`: Section "Jetzt im Kino" wird immer zurückgegeben.
- `src/server/services/home-sections.service.test.js`: Items in "Jetzt im Kino" sind nur gematchte Jellyfin-Items, keine TMDB-only Treffer.
- `src/server/services/home-sections.service.test.js`: Bei TMDB-Fehler bleibt die Startseite stabil und die Section enthält `items: []`.
- `src/public/js/pages/home.page.test.js`: Empty-Section mit `emptyMessage` wird gerendert und nicht übersprungen.

## Akzeptanzkriterien

- `/api/media/home-sections` enthält immer eine Section mit `title: 'Jetzt im Kino'`.
- Die Section steht als erste Section nach dem Resume-Bereich, also visuell direkt unter "Weiter schauen".
- Karten in der Section sind ausschließlich vorhandene Jellyfin-Medien mit Jellyfin-`Id`.
- Wenn kein aktueller Kinofilm in Jellyfin vorhanden ist, bleibt der Section-Titel sichtbar und zeigt eine kurze leere Meldung.
- TMDB-Ausfälle brechen die Startseite nicht.
