# Implementierungsplan: Detailseiten-Buttons über dem Infotext

## Ziel

Auf der Detailseite sollen die Buttons `Abspielen` und `Zurück` oberhalb des Infotexts angezeigt werden.

Gemeint ist die Detail-Info-Spalte rechts neben dem Poster:

1. Titel
2. Metadaten
3. Genres
4. optional Tagline
5. Buttons `Abspielen` und `Zurück`
6. Beschreibung/Overview
7. Regie/Studio

Die Buttons sollen also nicht mehr unter Beschreibung, Regie und Studio stehen.

## Relevante Dateien

- `src/public/js/components/detailView.js`
- `src/public/css/pages/detail.css`

Optional nur zur Prüfung:

- `src/public/js/pages/detail.page.js`

## Ist-Zustand

In `src/public/js/components/detailView.js` wird innerhalb von `.detail-info` aktuell ungefähr diese Reihenfolge gerendert:

1. `.detail-title`
2. `.detail-episode-title`
3. `.detail-metadata`
4. `.detail-genres`
5. `.detail-tagline`
6. `.detail-overview`
7. `.detail-crew`
8. `.detail-actions`

Dadurch erscheinen `Abspielen` und `Zurück` unter dem Beschreibungstext und unter den Crew-/Studio-Infos.

## Umsetzung

### 1. DOM-Reihenfolge ändern

Datei:

- `src/public/js/components/detailView.js`

Die vorhandene `detail-actions`-Zeile wird innerhalb von `.detail-info` nach oben verschoben:

- direkt nach `taglineEl`
- vor `.detail-overview`
- vor `.detail-crew`

Neue Reihenfolge:

```js
createElement('h1', { className: 'detail-title' }, ...),
episodeTitleEl,
metadataItems.length > 0 ? createElement('div', { className: 'detail-metadata' }, metadataItems) : null,
genreTags.length > 0 ? createElement('div', { className: 'detail-genres' }, genreTags) : null,
taglineEl,
actionButtons.length > 0 ? createElement('div', { className: 'detail-actions' }, actionButtons) : null,
createElement('p', { className: 'detail-overview' }, item.overview),
crewInfo.length > 0 ? createElement('div', { className: 'detail-crew' }, crewInfo) : null
```

### 2. CSS prüfen und nur bei Bedarf anpassen

Datei:

- `src/public/css/pages/detail.css`

Aktuell hat `.detail-info` einen `gap: 16px`, und `.detail-actions` hat `margin-top: 4px`.

Prüfen:

- Durch die neue Position dürfen die Buttons nicht zu eng an Genre/Tagline kleben.
- Zwischen Buttons und Beschreibung soll ein sauberer Abstand bleiben.
- Auf Mobile müssen Buttons weiterhin zentriert bleiben.

Falls nötig:

- `.detail-actions` mit stabilerem Abstand versehen, z. B. `margin: 2px 0 4px;`
- Keine großen Layout-Änderungen vornehmen.

## Nicht ändern

- Keine Änderung an Button-Labels.
- Keine Änderung an Button-Funktion:
  - `Abspielen` bleibt Link zu `#/player/:id`.
  - `Zurück` bleibt `window.history.back()`.
- Keine Änderung an Poster, Backdrop, Hero, Cast, Staffeln oder ähnlichen Titeln.
- Keine neue Komponente einführen.

## Akzeptanzkriterien

- `Abspielen` und `Zurück` stehen oberhalb der Beschreibung.
- Beschreibung, Regie und Studio stehen unterhalb der Buttons.
- Desktop-Layout entspricht weiterhin dem vorhandenen Detailseiten-Design.
- Mobile-Layout bleibt sauber zentriert und ohne Überlappung.
- Buttons funktionieren unverändert.

## Verifikation

Automatisch:

```bash
node --check src/public/js/components/detailView.js
```

Manuell:

- Eine Film-Detailseite öffnen.
- Eine Serien-Detailseite öffnen.
- Prüfen bei Desktop-Breite.
- Prüfen bei Mobile-Breite.
- Sicherstellen, dass `Abspielen` und `Zurück` über dem Beschreibungstext stehen.
