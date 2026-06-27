# Implementierungsplan: Trailer-Scroller

## Ziel

Neue VANTA-Seite `#/scroller` als TikTok-artiger vertikaler Trailer-Scroller. Es werden ausschliesslich YouTube-Trailer angezeigt, deren zugehoeriger Film oder Serie auf dem angebundenen Jellyfin-Server vorhanden ist. Beim Oeffnen der Seite startet kein Trailer automatisch; stattdessen erscheint ein kurzes responsives Intro-Popup. Danach kann der Nutzer Trailer vertikal durchscrollen, liken und zur Detailseite des Films/der Serie wechseln.

## Produktanforderungen

- Navigation:
  - Neuer Eintrag in Desktop-Navbar und mobilem Hamburger-Menue.
  - Label: `Scroller`
  - Route: `#/scroller`
- Intro:
  - Beim ersten Oeffnen der Seite pro Browser-Session ein modales Popup anzeigen.
  - Popup kurz halten, responsiv fuer Mobile/Desktop.
  - Inhalt sinngemaess: Trailer scrollen, mit Herz zu Jellyfin-Favoriten hinzufuegen, Detailseite oeffnen.
  - Keine Trailer-Wiedergabe, solange das Popup offen ist.
- Trailer:
  - Nur YouTube-Trailer.
  - Quelle muss aus Jellyfin-Daten kommen, nicht aus TMDB als unabhaengige externe Suche.
  - Nur Trailer fuer Items anzeigen, die als `Movie` oder `Series` in Jellyfin verfuegbar sind.
  - Reihenfolge komplett random.
  - Infinite Scroll mit Nachladen.
  - Preloading fuer die naechsten Trailer.
  - Aktiver Trailer startet nach Popup-Schliessen direkt mit Ton.
  - Aktiver Trailer loopt.
- Interaktion:
  - Like-Button: setzt den zugehoerigen Film/die Serie in Jellyfin auf Favorit.
  - Detail-Button: navigiert zu `#/item/:id`.
  - Serien-Trailer fuehren ebenfalls zur Serien-Detailseite, nicht direkt zur Episode.
  - Keyboard-Steuerung Desktop: Pfeil runter/Space = naechster Trailer, Pfeil hoch = vorheriger Trailer, `L` = Like, `Enter` = Detail.
  - Swipe-/Wheel-Steuerung: vertikales Scrollen auf Mobile und Desktop.
- Tests:
  - Backend-Service-Tests fuer Trailer-Normalisierung, Random-Pagination und Favoriten-Endpunkt.
  - Frontend-Unit-Tests fuer API-Wrapper und zentrale Scroller-State-Logik, soweit im bestehenden Setup sinnvoll.

## Relevante Projektstruktur

- Routing: `src/public/js/app.js`
- Navbar-Eintraege: `src/public/js/components/navbar/navLinks.js`
- Navbar-Aktivstatus: `src/public/js/components/navbar.js`
- Frontend-API: `src/public/js/api/media.api.js`
- Media-Routes: `src/server/routes/media/index.js`, `src/server/routes/media/library.routes.js`
- Jellyfin-Services: `src/server/services/jellyfin/*.js`
- Gemeinsame Item-Felder: `src/server/services/jellyfin/fields.js`
- CSS-Konventionen:
  - Seiten-CSS unter `src/public/css/pages/*.css`
  - Komponenten-CSS unter `src/public/css/components/*.css`
  - CSS muss in `src/public/index.html` eingebunden werden, falls es nicht schon ueber bestehende Imports geladen wird.

## Backend-Plan

1. Jellyfin-Felder erweitern
   - In `src/server/services/jellyfin/fields.js` sicherstellen, dass Item-Details Trailer-Informationen liefern.
   - Pruefen, ob Jellyfin die YouTube-Links ueber `RemoteTrailers`, `TrailerUrl`, `ExternalUrls` oder ein vergleichbares Feld liefert.
   - Falls Feld optional ueber `Fields` angefordert werden muss, in `DETAIL_ITEM_FIELDS` und/oder einem neuen `TRAILER_ITEM_FIELDS` aufnehmen.

2. Neuen Service anlegen
   - Datei: `src/server/services/jellyfin/trailers.service.js`
   - Verantwortlichkeiten:
     - Movies und Series aus Jellyfin laden.
     - Fuer jedes Item YouTube-Trailer aus Jellyfin-Daten extrahieren.
     - Nur valide YouTube-URLs akzeptieren (`youtube.com/watch`, `youtu.be`, `youtube.com/embed`, optional `youtube.com/shorts` nur wenn als Trailer sinnvoll).
     - YouTube-Video-ID normalisieren.
     - Items ohne YouTube-Trailer herausfiltern.
     - Ergebnis zufaellig mischen.
     - Pagination/Batching fuer Infinite Scroll bereitstellen.
   - Rueckgabeformat pro Trailer:
     ```js
     {
       id: `${item.Id}:${youtubeVideoId}`,
       itemId: item.Id,
       itemType: item.Type,
       title: item.Name,
       overview: item.Overview || '',
       year: item.ProductionYear || null,
       backdropUrl: null,
       primaryImageTag: item.ImageTags?.Primary || null,
       backdropImageTag: item.BackdropImageTags?.[0] || null,
       youtubeVideoId,
       youtubeUrl,
       isFavorite: Boolean(item.UserData?.IsFavorite)
     }
     ```
   - Hinweis: Keine TMDB-Suche als Ersatz implementieren. Wenn Jellyfin keine Trailerdaten liefert, leere Liste zurueckgeben.

3. Backend-Routes ergaenzen
   - Bestehende Media-Routen koennen in `library.routes.js` erweitert werden oder sauberer: neue Datei `src/server/routes/media/trailers.routes.js`.
   - In `src/server/routes/media/index.js` einhaengen:
     ```js
     router.use('/trailers', trailerRoutes);
     ```
   - Endpunkte:
     - `GET /api/media/trailers?cursor=&limit=10`
       - `requireAuth`
       - Limit clampen, z. B. 1-20, Default 8.
       - Antwort:
         ```js
         { items: [...], nextCursor: "...", hasMore: true }
         ```
       - Randomisierung nicht nur pro Seite neu mischen, sonst entstehen viele Duplikate. Empfehlung: serverseitigen Seed/Cursor nutzen oder clientseitig bereits gesehene IDs uebergeben.
     - `POST /api/media/item/:id/favorite`
       - `requireAuth`
       - Setzt Jellyfin-Favorit fuer Movie/Series.
       - Jellyfin-Endpunkt verwenden: `POST /Users/{userId}/FavoriteItems/{itemId}`.
       - Antwort: `{ isFavorite: true }`.
   - Optional fuer spaeter: `DELETE /api/media/item/:id/favorite`.

4. Fehlerbehandlung
   - Bei Jellyfin-401 wie bestehende Routen `destroyInvalidSession` verwenden.
   - Trailer-Endpunkt bei leerer Library nicht als Fehler behandeln.
   - YouTube-URLs defensiv parsen; invalides Trailer-Objekt skippen.

5. Backend-Tests
   - Neue Tests fuer:
     - YouTube-ID-Extraktion aus mehreren URL-Formaten.
     - Nicht-YouTube-URLs werden entfernt.
     - Items ohne Trailer werden entfernt.
     - Movie/Series bleiben erhalten, andere Typen werden ignoriert.
     - Favorite-Service ruft den korrekten Jellyfin-Pfad mit POST auf.

## Frontend-Plan

1. API erweitern
   - In `src/public/js/api/media.api.js`:
     ```js
     getTrailers(cursor = null, limit = 8)
     favoriteItem(id)
     ```
   - `getTrailers` baut Query mit `URLSearchParams`.
   - `favoriteItem` POST auf `/api/media/item/${id}/favorite`.

2. Route und Navigation
   - In `src/public/js/app.js`:
     ```js
     router.add('#/scroller', () => import('./pages/trailer-scroller.page.js'), { requiresAuth: true });
     ```
   - In `src/public/js/components/navbar/navLinks.js` neuen Eintrag einfuegen:
     ```js
     { key: 'scroller', label: 'Scroller', href: '#/scroller' }
     ```
   - In `src/public/js/components/navbar.js` Aktivstatus fuer `scroller` ergaenzen.
   - In `src/public/js/components/navbar/icons.js` ein passendes Icon fuer `scroller` ergaenzen, z. B. Play/Reels-Icon im vorhandenen SVG-Stil.

3. Neue Seite
   - Datei: `src/public/js/pages/trailer-scroller.page.js`
   - Struktur:
     - Root `.trailer-scroller-page`
     - Vollhoehen-Scroller unter Navbar, mobile angepasst.
     - Vertikale Slides mit `scroll-snap-type: y mandatory`.
     - Pro Slide:
       - YouTube-Iframe oder YouTube embed container.
       - Overlay unten mit Titel, Jahr, kurzer Beschreibung.
       - Aktionen rechts/unten: Like-Button, Detail-Button.
   - Keine verschachtelten Karten. Das Layout soll wie ein echtes Scroll-Erlebnis wirken, nicht wie eine Card-Liste.

4. YouTube-Playback
   - Verwende YouTube Embed/IFrame API, weil Ton, Autoplay, Loop und Steuerung gebraucht werden.
   - Aktiver Slide:
     - Nach Intro-Schliessen starten.
     - Mit Ton.
     - Loop aktivieren ueber `loop=1&playlist={videoId}`.
   - Inaktive Slides pausieren/stoppen.
   - Preloading:
     - Naechste 2 Trailer mit Iframe vorbereiten oder `preconnect`/`preload` fuer YouTube-Domains setzen.
     - Nicht zu viele Iframes gleichzeitig aktiv halten; Mobile-Performance beachten.
   - Falls Browser Autoplay mit Ton blockiert:
     - Auf dem ersten User-Klick im Intro-Schliessen starten. Das sollte als User-Gesture gelten.
     - Wenn trotzdem blockiert, sichtbaren Play-Button im aktiven Slide anzeigen.

5. Intro-Popup
   - SessionStorage-Key: `vantaTrailerScrollerIntroSeen`.
   - Beim ersten Besuch anzeigen.
   - Button `Starten`.
   - Schliessen per Escape und Button.
   - Solange offen: keine Trailer-Wiedergabe starten.

6. Infinite Scroll und State
   - State:
     ```js
     {
       trailers: [],
       activeIndex: 0,
       cursor: null,
       hasMore: true,
       loading: false,
       introOpen: true,
       seenIds: Set
     }
     ```
   - Initial 8-10 Trailer laden.
   - Wenn aktiver Index nahe Ende ist, naechste Page laden.
   - Duplikate clientseitig anhand `id` entfernen.
   - Leerer Zustand: Hinweis anzeigen, dass keine YouTube-Trailer in Jellyfin gefunden wurden.

7. Interaktionen
   - Like:
     - Optimistisch UI auf aktiv setzen.
     - `MediaApi.favoriteItem(itemId)` aufrufen.
     - Fehlerfall: UI zuruecksetzen und Toast/Inline-Fehler zeigen.
   - Detail:
     - `window.location.hash = '#/item/' + itemId`
   - Keyboard:
     - Nur aktiv, wenn Route sichtbar und kein Modal offen.
     - ArrowDown/Space: naechster Slide.
     - ArrowUp: vorheriger Slide.
     - `l`/`L`: Like.
     - Enter: Detail.
   - Swipe/Scroll:
     - Scroll-Snap als Basis.
     - IntersectionObserver zur Ermittlung des aktiven Slides.

8. Styling
   - Neue Datei: `src/public/css/pages/trailer-scroller.css`
   - In `src/public/index.html` einbinden.
   - Anforderungen:
     - Mobile: Fullscreen-artig, Controls gut erreichbar, safe-area beachten.
     - Desktop: zentrierter vertikaler Video-Bereich, aber nicht als dekorative Card. Breite begrenzen, damit 9:16-Trailer gut wirken.
     - Texte duerfen Buttons und Video nicht ueberlappen.
     - Responsive Popup fuer kleine Screens.
     - `prefers-reduced-motion` respektieren.

## Wichtige technische Hinweise

- YouTube-Trailer kommen zwar als YouTube-Embeds, aber die Trailer-Liste muss aus Jellyfin-Itemdaten gebaut werden. Kein unabhaengiges Scraping oder TMDB-Fallback.
- Der normale VANTA-Player ist fuer Jellyfin-Medienstreams gebaut und sollte nicht fuer YouTube-Trailer wiederverwendet werden.
- Der Favoriten-Like ist ein Jellyfin-User-State des eigentlichen Movie/Series-Items, nicht des Trailers.
- Randomisierung muss Duplikate vermeiden. Eine rein zufaellige Query pro Page kann bei Infinite Scroll schnell Dopplungen erzeugen.
- Bestehende Session-/Auth-Patterns der Media-Routen wiederverwenden.

## Akzeptanzkriterien

- `#/scroller` ist ueber Desktop-Navbar und Mobile-Hamburger erreichbar.
- Beim ersten Oeffnen erscheint ein responsives Intro-Popup; vor dem Schliessen spielt nichts.
- Nach Start spielt der aktive YouTube-Trailer mit Ton und Loop.
- Vertikales Scrollen/Snap funktioniert auf Desktop und Mobile.
- Keyboard-Steuerung funktioniert auf Desktop.
- Beim Erreichen des Endes werden weitere Trailer nachgeladen.
- Like setzt den Film/die Serie in Jellyfin als Favorit.
- Detail-Button oeffnet `#/item/:id`.
- Es erscheinen nur Trailer fuer vorhandene Jellyfin-Filme/-Serien.
- Es erscheinen nur YouTube-Trailer.
- Leerer Zustand ist verstaendlich, wenn keine Trailer vorhanden sind.
- Tests fuer Backend-Normalisierung/Favoriten und zentrale Frontend-Logik laufen mit `npm test`.
