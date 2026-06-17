# Plan: Filme- und Serien-Seiten mobil reparieren

## Auftrag

Die Seiten `Filme` und `Serien` sollen auf Mobile sauber nutzbar werden. Aktuell ist die mobile Darstellung zu groß und wirkt kaputt: Poster-Karten, Abstände, Überschrift und Pagination brauchen mobile-spezifische Regeln. Ziel ist kein Redesign und keine neue Funktion, sondern ein enger Responsive-Fix für die Library-Ansicht.

Betroffene Routen:

- `#/movies`
- `#/series`
- `#/genre/:type/:genreName`, soweit sie dieselbe Library-Ansicht nutzt
- `#/publisher/:studioName`, soweit sie dieselbe Library-Ansicht nutzt

## Aktueller Befund

- `src/public/js/pages/library.page.js` erzeugt die Filme-/Serien-Seite.
- Die Seite nutzt aktuell `page-container content-section` und ein generisches `grid-container`.
- Die Überschrift wird inline in JavaScript gestylt, mit festem `fontSize: '2rem'` und großem `marginBottom`.
- Das Poster-Grid wird global in `src/public/css/layout.css` definiert:
  - Default: `repeat(auto-fill, minmax(150px, 1fr))`
  - ab 768px: `minmax(180px, 1fr)`
  - ab 1200px: `minmax(220px, 1fr)`
  - bei max. 600px: `minmax(112px, 1fr)`
  - bei max. 380px: fix `1fr 1fr`
- Pagination liegt in `src/public/css/pages/library.css`, hat aber noch keine Mobile-Breakpoints.
- `src/public/css/components/media-card.css` enthält Basiskarten-Styles.
- `index.html` lädt bereits `css/pages/library.css` und `css/components/media-card.css`.

## Zielbild

Auf einem typischen Smartphone sollen `Filme` und `Serien` kompakt, stabil und scanbar sein:

- Keine horizontale Überbreite.
- Keine riesigen Karten auf kleinen Displays.
- Poster-Grid nutzt auf 360-430px Breite bevorzugt drei kompakte Spalten, wenn das ohne Textbruch möglich ist.
- Sehr kleine Geräte bleiben nutzbar, notfalls mit zwei Spalten.
- Überschrift und Abstände sind mobile-gerecht.
- Pagination bricht sauber um und nimmt nicht mehr zu viel Platz ein.
- Desktop- und Tablet-Ansicht bleiben möglichst unverändert.

## Gestaltungsleitlinien

- Keine neue visuelle Sprache einführen.
- Keine API- oder Datenlogik ändern.
- CSS-Klassen für die Library-Seite einführen, statt globale `grid-container`-Regeln blind zu verändern.
- Titel- und Grid-Regeln nur soweit anfassen, wie es für Mobile-Breakpoints nötig ist.
- Mobile-Regeln eng auf `.library-page` begrenzen, damit Suche, Home-Carousels und Detailseiten nicht unbeabsichtigt verändert werden.
- Touch-Geräte sollen keine großen Hover-Scale-Effekte brauchen.

## Zielgrößen

Diese Werte sind Richtwerte für die Umsetzung, keine harte Design-Spezifikation:

- Mobile Container-Padding:
  - bis 768px: ca. 14px
  - bis 430px: ca. 10-12px
- Mobile Seitentitel:
  - `clamp(1.25rem, 5vw, 1.65rem)`
  - Margin unten ca. 14-18px
- Mobile Library-Grid:
  - bis 480px: `repeat(3, minmax(0, 1fr))`
  - bis 340px: fallback auf `repeat(2, minmax(0, 1fr))`, falls drei Spalten zu eng werden
  - Gap ca. 8-10px auf kleinen Phones
- Mobile Cards:
  - Titel ca. 0.72-0.8rem
  - Subtitle ca. 0.66-0.72rem
  - Details-Margin ca. 5-7px
  - Badge kleiner und weniger dominant
- Pagination:
  - Buttons kompakter, mindestens 40px Touch-Höhe
  - Page-Info darf umbrechen oder auf eine zweite Zeile wandern
  - Select volle oder sinnvolle mobile Breite

## Phase 1: Library-Seite gezielt ansprechbar machen

### Task 1: Library-spezifische Klassen einführen

**Beschreibung:** `library.page.js` soll eindeutige CSS-Hooks bekommen, damit die mobile Korrektur nicht über globale Layout-Klassen erzwungen werden muss.

**Akzeptanzkriterien:**

- [ ] Root-Container hat zusätzlich `library-page`.
- [ ] Die Überschrift hat eine Klasse, z. B. `library-title`.
- [ ] Das Grid hat eine Klasse, z. B. `library-grid`, zusätzlich oder statt `grid-container`.
- [ ] Der Wrapper um Titel, Grid und Pagination hat eine Klasse, z. B. `library-content`.
- [ ] Keine Datenlogik, keine API-Aufrufe und keine Routen ändern sich.

**Verifikation:**

- [ ] `node --check src/public/js/pages/library.page.js`
- [ ] `rg -n "library-page|library-title|library-grid|library-content" src/public/js/pages/library.page.js src/public/css/pages/library.css`

**Abhängigkeiten:** Keine.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/pages/library.page.js`
- `src/public/css/pages/library.css`

**Umfang:** S.

### Task 2: Mobile Titel-Regeln setzen

**Beschreibung:** Die feste `2rem`-Überschrift soll auf Mobile kleiner werden und lange Titel sollen sauber umbrechen. Falls dafür eine CSS-Klasse nötig ist, bleibt diese Änderung auf die Library-Seite begrenzt.

**Akzeptanzkriterien:**

- [ ] `library.css` definiert mobile Werte für `.library-title`.
- [ ] Der bisherige Gradient-Look bleibt erhalten.
- [ ] Lange Genre- oder Publisher-Namen umbrechen sauber und laufen nicht aus dem Viewport.

**Verifikation:**

- [ ] `node --check src/public/js/pages/library.page.js`
- [ ] `rg -n "library-title|font-size|word-break|overflow-wrap" src/public/css/pages/library.css`

**Abhängigkeiten:** Task 1.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/pages/library.page.js`
- `src/public/css/pages/library.css`

**Umfang:** S.

## Checkpoint A: Mobile Hooks

- [ ] `LibraryPage` hat eigene CSS-Hooks.
- [ ] Der Titel ist per CSS steuerbar.
- [ ] Es wurden noch keine globalen Layoutregeln verändert, außer bewusst und begründet.

## Phase 2: Mobile Grid und Karten verkleinern

### Task 3: Library-Grid mobil gezielt definieren

**Beschreibung:** Das Filme-/Serien-Grid soll eigene Spaltenregeln bekommen, statt komplett vom globalen `.grid-container` abhängig zu sein.

**Akzeptanzkriterien:**

- [ ] `.library-grid` hat Desktop/Tablet-Werte, die dem aktuellen Layout nahe bleiben.
- [ ] Auf 390-430px Breite sind Karten deutlich kompakter als aktuell.
- [ ] Auf 360-390px Breite werden bevorzugt drei Poster-Spalten verwendet, sofern Titel lesbar bleiben.
- [ ] Auf sehr kleinen Viewports gibt es einen stabilen Fallback ohne horizontales Scrollen.
- [ ] Die globale `.grid-container`-Regel wird nicht unnötig für andere Seiten verschlechtert.

**Verifikation:**

- [ ] `rg -n "library-grid|grid-template-columns|@media" src/public/css/pages/library.css src/public/css/layout.css`
- [ ] Manuelle Prüfung oder Screenshot-Vergleich bei 390x844, 375x812, 360x800 und 320x568.

**Abhängigkeiten:** Tasks 1-2.

**Dateien wahrscheinlich betroffen:**

- `src/public/css/pages/library.css`
- optional `src/public/css/layout.css`, falls globale Grid-Regeln entkoppelt werden müssen

**Umfang:** S.

### Task 4: MediaCard auf Mobile verkleinern

**Beschreibung:** Die Poster-Karten auf den Library-Seiten sollen auf Mobile kleiner und ruhiger werden. Bestehende CSS-Dateien werden nur minimal angepasst, soweit sie den Mobile-Fix direkt betreffen.

**Akzeptanzkriterien:**

- [ ] Titel, Subtitle, Details-Abstand und Badge sind auf Mobile kompakt.
- [ ] Touch-Geräte bekommen keine störenden Hover-Scale-Effekte.
- [ ] Carousels auf der Home- und Detailseite werden nicht unbeabsichtigt verschlechtert.

**Verifikation:**

- [ ] `rg -n "media-card|media-card-title|media-card-badge|hover" src/public/css/components/media-card.css src/public/css/pages/library.css`
- [ ] Manuelle Prüfung: Karten in `#/movies`, `#/series` und mindestens eine Carousel-Karte auf `#/home`.

**Abhängigkeiten:** Task 3.

**Dateien wahrscheinlich betroffen:**

- `src/public/css/components/media-card.css`
- optional `src/public/css/pages/library.css`

**Umfang:** M.

### Task 5: Library-Abstände mobil reduzieren

**Beschreibung:** Die Library-Seite soll weniger vertikalen und horizontalen Raum verschwenden.

**Akzeptanzkriterien:**

- [ ] `.library-page` oder `.library-content` definiert mobile Padding-/Gap-Werte.
- [ ] Titel, Grid und Pagination sitzen enger, ohne gequetscht zu wirken.
- [ ] Die Seite startet unter der mobilen Navbar korrekt und überlappt nicht.
- [ ] Keine horizontale Überbreite entsteht.

**Verifikation:**

- [ ] `rg -n "library-page|library-content|padding|gap|margin" src/public/css/pages/library.css src/public/css/layout.css`
- [ ] Manuelle Prüfung auf 320px und 390px Breite.

**Abhängigkeiten:** Tasks 1-3.

**Dateien wahrscheinlich betroffen:**

- `src/public/css/pages/library.css`
- optional `src/public/css/layout.css`

**Umfang:** S.

## Checkpoint B: Grid und Karten

- [ ] `#/movies` ist auf 390px Breite kompakt und ohne horizontales Scrollen nutzbar.
- [ ] `#/series` ist auf 390px Breite kompakt und ohne horizontales Scrollen nutzbar.
- [ ] 320px Breite hat einen sauberen Fallback.
- [ ] Desktop bleibt optisch nah am bisherigen Zustand.

## Phase 3: Pagination mobil reparieren

### Task 6: Pagination responsive machen

**Beschreibung:** Die Pagination darf auf Mobile nicht breiter als der Viewport werden und soll weniger dominant sein.

**Akzeptanzkriterien:**

- [ ] `.pagination-buttons` kann auf kleinen Viewports umbrechen oder in eine mobile Reihenfolge wechseln.
- [ ] `Zurück` und `Vor` bleiben als Touch-Ziele mindestens ca. 40px hoch.
- [ ] `.pagination-info` darf umbrechen und blockiert die Buttons nicht.
- [ ] `.pagination-limit-select` ist auf Mobile kompakt und gut antippbar.
- [ ] Lange Zähltexte wie `Seite 10 von 128 · 6350 Einträge` laufen nicht aus dem Viewport.

**Verifikation:**

- [ ] `rg -n "pagination|pagination-buttons|pagination-info|pagination-limit" src/public/css/pages/library.css`
- [ ] Manuelle Prüfung mit vielen Seiten oder simuliertem langen Text.

**Abhängigkeiten:** Task 5.

**Dateien wahrscheinlich betroffen:**

- `src/public/css/pages/library.css`

**Umfang:** S.

### Task 7: Optional kurze Mobile-Pagination-Copy prüfen

**Beschreibung:** Falls der Text trotz CSS zu lang bleibt, darf `library.page.js` auf kleinen Screens eine kürzere Page-Info ausgeben.

**Akzeptanzkriterien:**

- [ ] Standardtext bleibt auf Desktop erhalten.
- [ ] Mobile darf eine kürzere Form nutzen, z. B. `1 / 23 · 460`.
- [ ] Die Umsetzung ist nicht abhängig von dauerhaftem Resize-Listener-Chaos.
- [ ] Keine Businesslogik ändert sich.

**Verifikation:**

- [ ] `node --check src/public/js/pages/library.page.js`
- [ ] Manuelle Prüfung bei 320px und 390px Breite.

**Abhängigkeiten:** Task 6.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/pages/library.page.js`
- `src/public/css/pages/library.css`

**Umfang:** S.

## Phase 4: Mobile-Verifikation und Feinschliff

### Task 8: Viewport-Matrix prüfen

**Beschreibung:** Prüfe die Library-Seiten in den typischen mobilen Breiten und notiere konkrete Restprobleme.

**Akzeptanzkriterien:**

- [ ] `#/movies` geprüft bei 320x568, 360x800, 375x812, 390x844, 430x932.
- [ ] `#/series` geprüft bei mindestens 360x800 und 390x844.
- [ ] Es gibt kein horizontales Scrollen.
- [ ] Keine Karte, Überschrift oder Pagination überlappt sichtbar.
- [ ] Karten sind auf Mobile deutlich kleiner als vor dem Fix.

**Verifikation:**

- [ ] Manuelle Browserprüfung mit responsive DevTools.
- [ ] Keine Playwright-/Browser-Automation ohne ausdrückliche Freigabe.

**Abhängigkeiten:** Tasks 1-7.

**Dateien wahrscheinlich betroffen:**

- Keine zwingend, außer Restfixes aus der Prüfung.

**Umfang:** S.

### Task 9: Syntax- und Regressionscheck

**Beschreibung:** Schließe den Fix mit den in diesem Projekt verfügbaren Checks ab.

**Akzeptanzkriterien:**

- [ ] Alle geänderten JS-Dateien bestehen `node --check`.
- [ ] CSS-Dateien sind syntaktisch plausibel und in `index.html` weiter korrekt geladen.
- [ ] `git diff` zeigt nur gezielte Responsive-Änderungen für Library/MediaCard/Pagination.

**Verifikation:**

- [ ] `node --check src/public/js/pages/library.page.js`
- [ ] `rg -n "/css/pages/library.css|/css/components/media-card.css" src/public/index.html`
- [ ] `git diff -- src/public/js/pages/library.page.js src/public/css/pages/library.css src/public/css/components/media-card.css src/public/css/layout.css`

**Abhängigkeiten:** Tasks 1-8.

**Dateien wahrscheinlich betroffen:**

- `src/public/js/pages/library.page.js`
- `src/public/css/pages/library.css`
- `src/public/css/components/media-card.css`
- optional `src/public/css/layout.css`

**Umfang:** S.

## Reihenfolge

1. Library-spezifische CSS-Klassen ergänzen.
2. Mobile Titel-Regeln setzen.
3. `.library-grid` mobil kleiner und stabil machen.
4. MediaCard-Mobile-Regeln anwenden.
5. Library-Abstände reduzieren.
6. Pagination mobil reparieren.
7. Optional Pagination-Text kürzen, falls CSS allein nicht reicht.
8. Mobile Viewport-Matrix manuell prüfen.
9. Syntax- und Diff-Check.

## Risiken und Gegenmaßnahmen

| Risiko | Impact | Gegenmaßnahme |
|---|---:|---|
| Globale Grid-Änderung bricht Suche oder Detailseiten | Mittel | Library-spezifische `.library-grid`-Regeln bevorzugen |
| Karten werden zu klein und Titel unlesbar | Mittel | Breakpoints mit 320px-Fallback und gekürzter Typografie prüfen |
| Pagination läuft bei langen Zahlen über | Mittel | `flex-wrap`, `min-width: 0`, `white-space: normal` und optional kurze Mobile-Copy |
| Mobile-Fix verändert Desktop | Mittel | Desktop-Werte erst erhalten, mobile Overrides unter `max-width` setzen |
| Hover-Regeln stören Touch | Niedrig | Hover-Effekte auf Touch/Mobile deaktivieren oder auf `hover: hover` begrenzen |

## Nicht-Ziele

- Kein neues Design für Filme/Serien.
- Keine Änderung an Media-API oder Pagination-Daten.
- Keine Änderung an Routing oder URLs.
- Keine Änderung an Home-Carousels, außer falls MediaCard-Regeln versehentlich dorthin ausstrahlen und begrenzt werden müssen.
- Keine Browser-Automation ohne ausdrückliche Freigabe.

## Definition of Done

- [ ] `#/movies` ist auf Mobile kompakt und ohne horizontales Scrollen nutzbar.
- [ ] `#/series` ist auf Mobile kompakt und ohne horizontales Scrollen nutzbar.
- [ ] Karten, Titel, Badges, Abstände und Pagination sind sichtbar kleiner und stabil.
- [ ] Desktop-Layout ist nicht sichtbar verschlechtert.
- [ ] Geänderte JS-Dateien bestehen `node --check`.
- [ ] CSS-Änderungen sind auf Library/MediaCard/Pagination begrenzt und nachvollziehbar.
