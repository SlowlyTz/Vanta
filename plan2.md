# Agent-Plan: Publisher-Seite aktualisieren

## Problem

Die Publisher-Seite braucht drei UI-Fixes:

1. Die großen Featured-Publisher oben sind linksbündig und sollen zentriert stehen.
2. Die kleineren Publisher darunter brauchen eine eigene Suchleiste direkt über ihren Cards.
3. Auf Mobile sind die kleinen Publisher-Cards nicht gleich groß.

## Relevante Dateien

- `src/public/js/pages/publishers.page.js`
- `src/public/css/pages/publishers.css`
- optional vorhandene Search-Styles prüfen in:
  - `src/public/css/pages/search.css`
  - `src/public/css/layout.css`

## Auftrag

Passe nur die Publisher-Seite an. Kein Redesign, keine API-Änderungen, keine Änderungen an Navbar- oder globaler Suche.

## Umsetzung

1. Featured-Publisher zentrieren:
   - `.publishers-featured-grid` so anpassen, dass die großen Publisher-Karten als Gruppe horizontal zentriert sind.
   - Desktop und Mobile berücksichtigen.
   - Bestehende Card-Größen und Logo-Darstellung möglichst beibehalten.

2. Eigene Suche für kleinere Publisher hinzufügen:
   - In `publishers.page.js` über dem Grid der `others` eine Suchleiste rendern.
   - Suche filtert nur die kleineren Publisher (`others`), nicht die Featured-Publisher.
   - Filter clientseitig auf `studio.Name`, case-insensitive.
   - Bei leerem Suchfeld alle kleineren Publisher anzeigen.
   - Bei keinem Treffer eine knappe Empty-State-Meldung anzeigen.
   - Suchleiste soll in Desktop und Mobile die verfügbare Breite einnehmen, mit Seitenabstand passend zur Seite.

3. Kleine Publisher-Cards auf Mobile gleich groß machen:
   - `.publishers-grid` und `.publisher-button` mit stabilen Grid-/Höhenregeln versehen.
   - Buttons sollen gleiche Höhe je Zeile bzw. konsistente Mindesthöhe haben.
   - Lange Publisher-Namen dürfen umbrechen, aber nicht einzelne Cards optisch aus der Reihe reißen.
   - Keine horizontale Überbreite auf kleinen Viewports.

## Akzeptanzkriterien

- Große Featured-Publisher sind oben sichtbar zentriert statt linksbündig.
- Über den kleineren Publisher-Cards gibt es eine eigene Suchleiste.
- Die Suche filtert nur die kleineren Publisher.
- Die Suchleiste nimmt auf Desktop und Mobile die ganze verfügbare Inhaltsbreite ein.
- Mobile kleine Publisher-Cards wirken gleich groß und stabil.
- Lange Publisher-Namen brechen sauber um.
- Klick auf Publisher-Cards navigiert weiterhin zu `#/publisher/:studioName`.

## Verifikation

- `node --check src/public/js/pages/publishers.page.js`
- `rg -n "publishers-featured-grid|publisher-search|publishers-grid|publisher-button" src/public/js/pages/publishers.page.js src/public/css/pages/publishers.css`
- Manuell prüfen:
  - Desktop: `#/publishers`
  - Mobile ca. 390px und 320px Breite: `#/publishers`
  - Suchfeld leer, Treffer, keine Treffer
  - Klick auf Featured- und kleine Publisher-Cards
