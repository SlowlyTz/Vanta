# Implementierungsplan: Publisher-Aliasgruppen fuer Featured-Publisher

## Ziel

Die Publisher-Seite soll fuer die oben gelisteten grossen Publisher nicht mehr nur einen einzelnen Jellyfin-Studio-Namen filtern. Stattdessen bekommt jeder Featured-Publisher eine kanonische Gruppe mit stabiler ID und Aliasliste. Ein Klick auf `Warner Bros` soll alle passenden Jellyfin-Studio-Varianten einsammeln, die Library-Ergebnisse zusammenfuehren und nach Jellyfin-Item-ID deduplizieren.

Jellyfin bleibt die Quelle fuer Bestand und Benutzerzugriff. TMDB wird fuer diesen Fix nicht benoetigt.

## Aktueller Ist-Zustand

Aktuell laeuft der Filter so:

1. `src/public/js/pages/publishers.page.js` ruft `MediaApi.getStudios()` auf.
2. `GET /api/media/studios` liefert Jellyfin `/Studios`.
3. `matchFeaturedStudio(studio.Name)` erkennt Featured-Publisher anhand weniger Namensmuster.
4. Pro Display-Label wird nur der erste passende Studio-Eintrag behalten.
5. Klick auf die Featured-Karte setzt `window.location.hash = #/publisher/<studio.Name>`.
6. `src/public/js/pages/library.page.js` ruft `MediaApi.getLibrary(type, genre, studio, page, limit)` auf.
7. `src/server/services/jellyfin/library.service.js` setzt exakt `query.Studios = studio`.

Das Problem: `Warner Bros` steht damit nicht fuer eine Gruppe, sondern fuer genau einen String. Wenn Jellyfin Filme unter `Warner Bros. Pictures`, `Warner Bros. Entertainment`, `Warner Bros. Animation` oder einer anderen Variante fuehrt, wird die Featured-Seite leer oder unvollstaendig.

## Architekturentscheidung

- Featured-Publisher bekommen stabile IDs, z. B. `warner-bros`, `disney`, `20th-century`, `netflix`, `apple-tv`, `prime-video`, `hbo`.
- Exakte Studiofilter bleiben erhalten: `#/publisher/:studioName` filtert weiterhin exakt nach einem Jellyfin-Studio.
- Featured-Publisher bekommen eine neue Gruppenroute, z. B. `#/publisher-group/:publisherId`.
- Die Library-API bekommt einen zusaetzlichen Query-Parameter `publisher=<publisherId>`.
- Server und Client nutzen dieselbe Alias-Definition aus einem reinen Daten-/Helper-Modul unter `src/public/js/constants/`, das serverseitig importiert werden darf. Diese Daten sind ohnehin oeffentlich, weil Logo/Label/Aliase UI-Bestandteil sind.
- Der Server versucht nicht, Jellyfin mit einer mehrdeutigen `Studios=a,b,c`-Query zu ueberreden. Stattdessen werden die passenden Studio-Namen einzeln abgefragt und die Ergebnisse in Vanta dedupliziert. Das ist vorhersehbarer.

## Ziel-Datenmodell

Neue oder umgebaute Datei:

- `src/public/js/constants/featuredPublishers.js`

Beispiel:

```js
export const FEATURED_PUBLISHERS = [
  {
    id: 'warner-bros',
    label: 'Warner Bros',
    image: '/assets/publisher/warner-bros.webp',
    aliases: [
      'warner bros',
      'warner bros.',
      'warner brothers',
      'warner bros pictures',
      'warner bros. pictures',
      'warner bros entertainment',
      'warner bros. entertainment',
      'warner bros animation',
      'warner bros. animation',
      'warner animation group',
      'warner bros television',
      'warner bros. television'
    ]
  }
];

export function normalizePublisherName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesPublisherAlias(studioName, alias) {
  const studio = normalizePublisherName(studioName);
  const normalizedAlias = normalizePublisherName(alias);
  return studio === normalizedAlias || studio.startsWith(`${normalizedAlias} `);
}

export function getFeaturedPublisherById(id) {
  return FEATURED_PUBLISHERS.find(publisher => publisher.id === id) || null;
}

export function matchFeaturedPublisher(studioName) {
  for (const publisher of FEATURED_PUBLISHERS) {
    if (publisher.aliases.some(alias => matchesPublisherAlias(studioName, alias))) {
      return publisher;
    }
  }
  return null;
}

export function getFeaturedPublishersFromStudios(studios) {
  const groups = new Map();

  for (const studio of studios || []) {
    const publisher = matchFeaturedPublisher(studio.Name);
    if (!publisher) continue;

    if (!groups.has(publisher.id)) {
      groups.set(publisher.id, {
        ...publisher,
        studioNames: []
      });
    }

    groups.get(publisher.id).studioNames.push(studio.Name);
  }

  return FEATURED_PUBLISHERS
    .map(publisher => groups.get(publisher.id))
    .filter(Boolean);
}
```

Wichtig: Subsidiaries wie `New Line Cinema`, `DC Studios`, `Lucasfilm`, `Pixar` oder `Marvel Studios` sind keine reine Schreibvarianten. Die sollten nicht automatisch in die Aliasliste, ausser wir wollen bewusst Konzern-/Markengruppen statt Namensvarianten bauen.

## Task 1: Alias-Helper einfuehren und absichern

**Beschreibung:** Die bestehende `featuredStudios`-Logik durch eine robustere Featured-Publisher-Definition ersetzen oder als Kompatibilitaetsschicht darauf umstellen.

**Akzeptanzkriterien:**

- [ ] Jeder Featured-Publisher hat `id`, `label`, `image` und `aliases`.
- [ ] `matchFeaturedPublisher('Warner Bros. Pictures')` liefert `warner-bros`.
- [ ] `matchFeaturedPublisher('Warner Bros. Animation')` liefert `warner-bros`.
- [ ] `matchFeaturedPublisher('Apple TV+')` liefert `apple-tv`, aber ein beliebiger String mit nur `apple` wird nicht zu breit gematcht.
- [ ] `getFeaturedPublishersFromStudios()` sammelt alle passenden Jellyfin-Studio-Namen pro Publisher-Gruppe.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/constants/featuredPublishers.js`
- `src/public/js/constants/featuredStudios.js` optional als Re-Export/Adapter
- neuer Test: `src/public/js/constants/featuredPublishers.test.js`

**Verifikation:**

- [ ] `npm test -- src/public/js/constants/featuredPublishers.test.js`

**Dependencies:** Keine

**Estimated scope:** Small

## Task 2: Publisher-Seite auf Gruppenlinks umstellen

**Beschreibung:** Die Featured-Karten sollen nicht mehr auf `#/publisher/<erstes Studio>` zeigen, sondern auf `#/publisher-group/<publisherId>`. Die normale Studio-Liste unterhalb bleibt exakt wie bisher und nutzt weiter `#/publisher/<studio.Name>`.

Beispiel-Aenderung in `publishers.page.js`:

```js
import {
  getFeaturedPublishersFromStudios,
  matchFeaturedPublisher
} from '../constants/featuredPublishers.js';

const featured = getFeaturedPublishersFromStudios(studios);
const others = studios.filter(studio => !matchFeaturedPublisher(studio.Name));

featured.forEach(publisher => {
  const card = createElement('button', {
    className: 'publisher-featured-card',
    'aria-label': publisher.label,
    onClick: () => {
      window.location.hash = `#/publisher-group/${encodeURIComponent(publisher.id)}`;
    }
  });
});
```

**Akzeptanzkriterien:**

- [ ] Warner Bros rendert genau eine Featured-Karte.
- [ ] Diese Karte verlinkt auf `#/publisher-group/warner-bros`.
- [ ] Normale Publisher-Buttons verlinken weiter auf `#/publisher/<exakter Studio-Name>`.
- [ ] Die Suchliste zeigt keine Studios, die bereits einer Featured-Gruppe zugeordnet wurden.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/pages/publishers.page.js`
- `src/public/js/pages/publishers.page.test.js`

**Verifikation:**

- [ ] `npm test -- src/public/js/pages/publishers.page.test.js`

**Dependencies:** Task 1

**Estimated scope:** Small

## Task 3: Navbar-Dropdown auf dieselben Gruppenlinks umstellen

**Beschreibung:** Das Publisher-Dropdown in der Navbar verwendet aktuell ebenfalls die "erstes Studio gewinnt"-Logik. Es soll dieselbe Gruppierungsfunktion wie die Publisher-Seite nutzen.

Beispiel-Aenderung:

```js
import { getFeaturedPublishersFromStudios } from '../../constants/featuredPublishers.js';

export function renderStudiosMenu(menu, studios) {
  menu.innerHTML = '';

  const featured = getFeaturedPublishersFromStudios(studios);
  if (featured.length === 0) {
    menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
    return;
  }

  featured.forEach(publisher => {
    menu.appendChild(
      createElement('li', { className: 'dropdown-list-item' },
        createElement('a', {
          className: 'dropdown-item dropdown-item-publisher',
          href: `#/publisher-group/${encodeURIComponent(publisher.id)}`
        }, publisher.label)
      )
    );
  });
}
```

**Akzeptanzkriterien:**

- [ ] Navbar und Publisher-Seite verwenden dieselben Gruppen und dieselbe Reihenfolge.
- [ ] Warner Bros im Dropdown fuehrt auf `#/publisher-group/warner-bros`.
- [ ] Dropdown zeigt pro Featured-Publisher hoechstens einen Eintrag.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/components/navbar/dropdownMenus.js`
- `src/public/js/components/navbar/dropdownMenus.test.js`

**Verifikation:**

- [ ] `npm test -- src/public/js/components/navbar/dropdownMenus.test.js`

**Dependencies:** Task 1

**Estimated scope:** Small

## Task 4: Client-Route und LibraryPage fuer Publisher-Gruppen ergaenzen

**Beschreibung:** Eine neue Hash-Route fuer Featured-Publisher-Gruppen hinzufuegen. Die bestehende exakte Studio-Route bleibt unveraendert.

Neue Route in `src/public/js/app.js`:

```js
router.add('#/publisher-group/:publisherId', () => import('./pages/library.page.js'), {
  requiresAuth: true,
  defaultParams: { type: 'Movie,Series' }
});
router.add('#/publisher/:studioName', () => import('./pages/library.page.js'), {
  requiresAuth: true,
  defaultParams: { type: 'Movie,Series' }
});
```

LibraryPage unterscheidet dann zwischen `publisherId` und exaktem `studioName`:

```js
import { getFeaturedPublisherById } from '../constants/featuredPublishers.js';

const publisherId = params.publisherId || null;
const publisher = publisherId ? getFeaturedPublisherById(publisherId) : null;
const studio = publisherId ? null : (params.studioName || params.studio || null);

const pageTitle = publisher
  ? publisher.label
  : studio
    ? studio
    : genre
      ? (isMixedType ? `${genre}` : `${labelType}: ${genre}`)
      : (isMixedType ? 'Alle Titel' : `Alle ${labelType}`);
```

Beim Laden:

```js
const result = await MediaApi.getLibrary(type, genre, studio, page, limit, {
  publisherId
});
```

**Akzeptanzkriterien:**

- [ ] `#/publisher-group/warner-bros` rendert die LibraryPage mit Titel `Warner Bros`.
- [ ] `#/publisher/Warner%20Bros.%20Pictures` bleibt ein exakter Studiofilter.
- [ ] Unbekannte `publisherId` fuehrt nicht zu einem Crash; die Seite zeigt eine normale leere/error state je nach API-Antwort.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/app.js`
- `src/public/js/pages/library.page.js`
- `src/public/js/pages/library.page.test.js`
- `src/public/js/api/media.api.js`
- `src/public/js/api/media.api.test.js`

**Verifikation:**

- [ ] `npm test -- src/public/js/pages/library.page.test.js src/public/js/api/media.api.test.js`

**Dependencies:** Task 1

**Estimated scope:** Medium

## Task 5: MediaApi um `publisher`-Parameter erweitern

**Beschreibung:** `MediaApi.getLibrary()` bekommt optional `publisherId`. Wenn gesetzt, wird `publisher=<id>` an die API gehaengt. `studio` und `publisher` sollen nicht gleichzeitig gesetzt werden.

Beispiel:

```js
getLibrary(type, genre = null, studio = null, page = 1, limit = 50, options = {}) {
  const params = new URLSearchParams({
    type,
    page: String(page),
    limit: String(limit)
  });

  if (genre) params.set('genre', genre);
  if (studio) params.set('studio', studio);
  if (options.publisherId) params.set('publisher', options.publisherId);

  return request(`/api/media/library?${params.toString()}`);
}
```

**Akzeptanzkriterien:**

- [ ] Bestehende Calls ohne `options.publisherId` erzeugen dieselben API-URLs wie bisher.
- [ ] Publisher-Gruppen erzeugen `/api/media/library?type=Movie%2CSeries&...&publisher=warner-bros`.
- [ ] Tests decken URL-Encoding fuer `studio` und `publisher` ab.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/api/media.api.js`
- `src/public/js/api/media.api.test.js`

**Verifikation:**

- [ ] `npm test -- src/public/js/api/media.api.test.js`

**Dependencies:** Keine, kann parallel zu Task 4 vorbereitet werden

**Estimated scope:** Small

## Task 6: Server-API fuer Publisher-Gruppen implementieren

**Beschreibung:** `GET /api/media/library` soll optional `publisher` akzeptieren. Wenn `publisher` gesetzt ist, wird keine exakte Studio-Query verwendet, sondern `LibraryService.getLibraryByPublisher()` aufgerufen.

Beispiel in `library.routes.js`:

```js
const { type, genre, studio, publisher, page, limit } = req.query;

if (studio && publisher) {
  return res.status(400).json({ error: 'Use either studio or publisher, not both' });
}

const result = publisher
  ? await LibraryService.getLibraryByPublisher(userId, accessToken, type, publisher, genre, pageNum, limitNum)
  : await LibraryService.getLibrary(userId, accessToken, type, genre, studio, pageNum, limitNum);
```

**Akzeptanzkriterien:**

- [ ] `publisher` ist optional und bricht bestehende Studio-/Genre-/Type-Filter nicht.
- [ ] `studio` + `publisher` gleichzeitig gibt 400 zurueck.
- [ ] Unbekannte Publisher-ID gibt 400 oder kontrolliert leere Ergebnisse zurueck; Empfehlung: 400, weil es ein ungueltiger API-Parameter ist.
- [ ] Auth-/Session-Fehler verhalten sich wie bisher.

**Dateien wahrscheinlich betroffen:**

- `src/server/routes/media/library.routes.js`
- neuer/erweiterter Test fuer Library-Route, falls noch keiner existiert

**Verifikation:**

- [ ] Route-Test fuer `publisher=warner-bros`.
- [ ] Route-Test fuer Konflikt `studio` + `publisher`.

**Dependencies:** Task 7

**Estimated scope:** Medium

## Task 7: LibraryService-Gruppenfilter bauen

**Beschreibung:** Der Service loest eine `publisherId` in alle passenden Jellyfin-Studio-Namen auf, fragt jedes passende Studio ab, kombiniert die Ergebnisse ueber Movie/Series hinweg und dedupliziert per `Id`.

Beispiel-Struktur:

```js
import {
  getFeaturedPublisherById,
  matchFeaturedPublisher
} from '../../../public/js/constants/featuredPublishers.js';

static async getPublisherStudioNames(userId, token, publisherId) {
  const publisher = getFeaturedPublisherById(publisherId);
  if (!publisher) {
    const error = new Error(`Unknown publisher: ${publisherId}`);
    error.status = 400;
    throw error;
  }

  const studios = await this.getStudios(userId, token);
  return studios
    .filter(studio => matchFeaturedPublisher(studio.Name)?.id === publisherId)
    .map(studio => studio.Name);
}

static async getLibraryByPublisher(userId, token, type, publisherId, genre = null, page = 1, limit = 50) {
  const studioNames = await this.getPublisherStudioNames(userId, token, publisherId);
  if (studioNames.length === 0) {
    return { items: [], totalRecordCount: 0 };
  }

  const types = type.split(',').map(t => t.trim()).filter(Boolean);
  const requests = [];

  for (const itemType of types.length ? types : [type]) {
    for (const studioName of studioNames) {
      requests.push(this._fetchLibraryPage(userId, token, itemType, genre, studioName, 1, 100000));
    }
  }

  const results = await Promise.all(requests);
  const byId = new Map();

  for (const item of results.flatMap(result => result.items)) {
    if (item?.Id) byId.set(item.Id, item);
  }

  const allItems = Array.from(byId.values())
    .sort((a, b) => (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || ''));

  const startIndex = (page - 1) * limit;
  return {
    items: allItems.slice(startIndex, startIndex + limit),
    totalRecordCount: allItems.length
  };
}
```

**Akzeptanzkriterien:**

- [ ] Warner-Bros-Gruppe fragt alle passenden Jellyfin-Studio-Namen ab.
- [ ] Ergebnisse werden nach `Id` dedupliziert.
- [ ] Pagination passiert nach dem Zusammenfuehren und Deduplizieren.
- [ ] Sortierung entspricht der bestehenden Library-Sortierung nach `SortName || Name`.
- [ ] `genre` bleibt optional kompatibel, auch wenn die Publisher-UI ihn aktuell nicht nutzt.
- [ ] Exakte Studiofilter via `getLibrary()` bleiben unveraendert.

**Dateien wahrscheinlich betroffen:**

- `src/server/services/jellyfin/library.service.js`
- `src/server/services/jellyfin/library.service.test.js` neu oder erweitert
- `src/server/services/jellyfin/featured-studios.js` optional als Adapter/Legacy-Datei

**Verifikation:**

- [ ] `npm test -- src/server/services/jellyfin/library.service.test.js`

**Dependencies:** Task 1

**Estimated scope:** Medium

## Task 8: Home-Sections und Home-Categories angleichen

**Beschreibung:** Home-Sections und Home-Categories nutzen aktuell dieselbe fehleranfaellige "erstes Studio gewinnt"-Logik. Sie sollen fuer Featured-Publisher ebenfalls Gruppenlinks und den Gruppenfilter verwenden.

Zielbild:

```js
const publishers = getFeaturedPublishersFromStudios(studios);

for (const publisher of publishers) {
  const result = await LibraryService.getLibraryByPublisher(
    userId,
    accessToken,
    'Movie,Series',
    publisher.id,
    null,
    1,
    SECTION_LIMIT
  );

  sections.push({
    type: 'standard',
    title: publisher.label,
    href: `#/publisher-group/${encodeURIComponent(publisher.id)}`,
    items: sortByNewest(result.items)
  });
}
```

**Akzeptanzkriterien:**

- [ ] Home-Links fuer Featured-Publisher zeigen auf `#/publisher-group/<id>`.
- [ ] Home-Sections verwenden dieselbe Aliasauflösung wie die Publisher-Seite.
- [ ] Wenn eine Publisher-Gruppe keine Inhalte liefert, wird sie wie bisher nicht angezeigt.
- [ ] Es gibt keine dritte, leicht abweichende Aliaslogik in Home-Categories/Home-Sections.

**Dateien wahrscheinlich betroffen:**

- `src/server/services/home-categories.service.js`
- `src/server/services/home-sections.service.js`
- Tests fuer diese Services, falls vorhanden oder sinnvoll neu anzulegen

**Verifikation:**

- [ ] Tests mit zwei Warner-Studio-Varianten liefern eine Warner-Section.
- [ ] Bestehende Home-Tests bleiben gruen.

**Dependencies:** Task 7

**Estimated scope:** Medium

## Task 9: Aliaslisten anhand echter Jellyfin-Daten erweitern

**Beschreibung:** Vor oder waehrend der Implementierung sollte einmal gegen den echten Server geprueft werden, welche Studio-Namen Jellyfin aktuell liefert. Die Aliaslisten sollen reale Schreibweisen abdecken, aber nicht unkontrolliert ganze Konzernfamilien zusammenwerfen.

Zu pruefen:

- Warner Bros
- Disney
- 20th Century Studios
- Netflix
- Apple TV
- Prime Video / Amazon
- HBO

Start-Aliase:

```text
warner-bros:
- Warner Bros
- Warner Bros.
- Warner Brothers
- Warner Bros. Pictures
- Warner Bros Pictures
- Warner Bros. Entertainment
- Warner Bros Entertainment
- Warner Bros. Animation
- Warner Bros Animation
- Warner Animation Group
- Warner Bros. Television
- Warner Bros Television

disney:
- Disney
- Walt Disney
- Walt Disney Pictures
- Walt Disney Studios
- Walt Disney Animation Studios
- Disney Television Animation

20th-century:
- 20th Century
- 20th Century Studios
- 20th Century Fox
- Twentieth Century Fox

netflix:
- Netflix
- Netflix Studios
- Netflix Animation

apple-tv:
- Apple TV
- Apple TV+
- Apple Studios
- Apple Original Films

prime-video:
- Prime Video
- Amazon
- Amazon Studios
- Amazon MGM Studios
- Amazon Prime
- MGM Amazon Studios

hbo:
- HBO
- HBO Max
- Max
- HBO Films
- Home Box Office
```

Nicht automatisch aufnehmen ohne Produktentscheidung:

- `Pixar`, `Marvel Studios`, `Lucasfilm` unter Disney
- `New Line Cinema`, `DC Studios`, `Castle Rock` unter Warner
- `MGM` unter Prime Video/Amazon

Diese Namen koennen sinnvoll sein, sind aber keine reinen Namensvarianten. Wenn sie aufgenommen werden, wird aus dem Feature eher "Konzern-/Marken-Gruppe" statt "Publisher-Schreibvarianten".

**Akzeptanzkriterien:**

- [ ] Aliasliste deckt echte Jellyfin-Schreibweisen aus `/api/media/studios` ab.
- [ ] Keine zu breiten Aliase wie nur `apple`, wenn dadurch falsche Treffer moeglich werden.
- [ ] Jeder neu aufgenommene Alias hat mindestens einen Testfall.

**Verifikation:**

- [ ] Authentifiziert `/api/media/studios` pruefen.
- [ ] Fuer Warner jede gefundene Variante direkt gegen `/api/media/library?...&studio=<variante>` testen.

**Dependencies:** Task 1, kann parallel zur Implementierung passieren

**Estimated scope:** Small

## Checkpoint: Nach Tasks 1-5

- [ ] Client-Tests fuer API, Publisher-Seite, Navbar und LibraryPage laufen.
- [ ] Featured-Karten linken auf `#/publisher-group/<id>`.
- [ ] Exakte Studio-Links funktionieren weiterhin.
- [ ] Kein Browser-/Playwright-Check notwendig, solange nicht explizit angefragt.

## Checkpoint: Nach Tasks 6-8

- [ ] Server-Tests fuer Route und LibraryService laufen.
- [ ] Home-Services nutzen Gruppenfilter statt erstem Studio.
- [ ] `npm test` laeuft gruen.
- [ ] `git diff --check` ist sauber.

## Risiken und Gegenmassnahmen

| Risiko | Auswirkung | Gegenmassnahme |
|---|---|---|
| Alias zu breit, z. B. `apple` | Falsche Studios landen in Apple TV | Nur konkrete Aliase wie `apple tv`, `apple studios`, `apple original films`; Tests fuer Negativfaelle |
| Alias zu eng | Warner bleibt unvollstaendig | Echte `/api/media/studios`-Namen vor finaler Aliasliste pruefen |
| Client/Server-Aliase driften auseinander | UI zeigt Gruppe, Server filtert anders | Ein reines `featuredPublishers.js`-Modul fuer beide Seiten verwenden oder Kompatibilitaet per Test erzwingen |
| Viele Studio-Varianten erzeugen viele Jellyfin-Requests | Langsamere Gruppenansicht | Nur Featured-Gruppen nutzen diesen Pfad; optional spaeter Request-Cache fuer `getPublisherStudioNames()` |
| Duplicate Items ueber mehrere Studios | Doppelte Karten in Library | Immer nach `item.Id` deduplizieren, bevor paginiert wird |
| Bestehende `#/publisher/:studioName`-Links brechen | Normale Studios nicht mehr erreichbar | Neue Route `#/publisher-group/:publisherId` einfuehren und alte Route unveraendert lassen |

## Nicht Bestandteil dieses Plans

- TMDB-basierte Metadatenindexierung.
- Automatisches Zusammenfassen ganzer Konzernfamilien, z. B. Disney + Pixar + Marvel.
- Browser-Automation oder visuelle Regressionstests.
- Umbau der gesamten Library-API auf ein neues Request-Objekt.
- Caching-/Datenbankindex fuer Publisher-Ergebnisse; das kann spaeter folgen, falls die Gruppenabfragen zu langsam werden.

## Empfohlene Umsetzungsreihenfolge

1. `featuredPublishers.js` mit Alias-Helpern und Tests anlegen.
2. `MediaApi.getLibrary()` optional um `publisherId` erweitern.
3. `publishers.page.js` und Navbar-Dropdown auf Gruppenlinks umstellen.
4. Neue Route `#/publisher-group/:publisherId` und LibraryPage-Unterstuetzung einbauen.
5. `LibraryService.getLibraryByPublisher()` implementieren.
6. `/api/media/library` um `publisher` erweitern.
7. Home-Sections und Home-Categories auf Gruppenfilter ziehen.
8. Echte Jellyfin-Studio-Namen pruefen und Aliaslisten nachschaerfen.
9. Gezielte Tests, danach `npm test` und `git diff --check`.
