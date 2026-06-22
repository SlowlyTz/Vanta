# Verbleibende Arbeiten

Stand: 22. Juni 2026

Phase 1 und Phase 2 sind abgeschlossen. Offen ist die abschließende Phase 3 mit Komfortfunktionen, Detailseiten-Anpassungen und der finalen Abnahme.

## Phase 3: Komfortfunktionen

### Kapitel und Vorschaubilder

- Jellyfin-Kapitel laden und normalisieren.
- Kapitelmarker und Kapitelnamen in der Timeline darstellen.
- Trickplay-/Preview-Daten über einen authentifizierten Vanta-Proxy laden.
- Vorschaubilder lazy laden und den Cache begrenzen.
- Ohne verfügbare Preview-Daten weiterhin eine normale Timeline anzeigen.
- Fehler beim Laden von Kapiteln oder Vorschaubildern dürfen die Wiedergabe nicht stoppen.

### Nächste Episode

- Die nächste Episode serverseitig bestimmen.
- Einen Button beziehungsweise Endscreen für die nächste Episode ergänzen.
- Die aktuelle Episode vor dem Wechsel korrekt als beendet melden.
- Browser-Autoplay-Regeln beim automatischen Wechsel berücksichtigen.
- Nach einem manuellen Abbruch nicht automatisch zur nächsten Episode wechseln.
- Fehler beim Laden der nächsten Episode mit Retry und Rücknavigation behandeln.
- Position, Reporting und Player-Cleanup beim Episodenwechsel prüfen.

### Responsiveness und visuelles Finetuning

- Verbleibende Playerfehler getrennt für Smartphone, Tablet und Desktop beheben.
- Control-Abstände und Typografie finalisieren.
- Mobile Touch-Ziele, Safe Areas und Animationen prüfen.
- Smartphone-Wiedergabe im Querformat und den Vollbild-Fallback auf Android und iPhone abnehmen.
- Tablet-Layouts im Hoch- und Querformat separat prüfen.
- Maus-, Tastatur-, Hover- und Focus-Verhalten auf Desktop prüfen.
- Focus-, Kontrast- und Accessibility-Zustände vervollständigen.
- Loader, Orientation-Hinweis und Error-Overlay visuell angleichen.
- Sicherstellen, dass die bestehende HLS.js-Logik unverändert bleibt.

## Detailseite

- Die Buttons `Abspielen` und `Zurück` in `src/public/js/components/detailView.js` über Beschreibung und Crew-/Studio-Informationen verschieben.
- Abstände in `src/public/css/pages/detail.css` für Desktop, Tablet und Smartphone prüfen.
- Film- und Serien-Detailseiten manuell abnehmen.

## Tests und Wartung

- Unit-Tests für Kapitel-, Preview- und Episodenlogik ergänzen.
- Den authentifizierten Trickplay-/Preview-Proxy automatisiert testen.
- Reporting und Cleanup beim Wechsel zur nächsten Episode testen.
- Responsive Abnahmematrix für Android, iPhone/iPad, Tablet-Breakpoints sowie Chromium und Firefox dokumentieren.
- Nach Player-Änderungen `npm test` und `npm run player:build` ausführen.
- Build-Ausgabe unter `src/public/vendor/player/` nach Player-Änderungen aktualisieren.
- Das Produktions-Bundle weiterhin ohne Sourcemap ausliefern.
- Abhängigkeiten und Vidstack-Version vor einem Upgrade prüfen; Upgrades separat testen.
- Keine Zugangsdaten, Jellyfin-Tokens, Session-Cookies oder Test-Screenshots committen.

## Abschlusskriterien

- Kapitel und Preview-Bilder funktionieren mit sauberem Fallback ohne Preview-Daten.
- Der Wechsel zur nächsten Episode meldet die aktuelle Episode korrekt und hinterlässt keine alten Requests, Timer oder Listener.
- Der Player ist auf Smartphone, Tablet und Desktop responsiv und auf realen Mobilgeräten abgenommen.
- Smartphone-Wiedergabe erfolgt im Querformat mit kontrolliertem Vollbild-Fallback.
- Detailseiten sind auf Desktop, Tablet und Smartphone korrekt angeordnet.
- Jellyfin-Fortschritt und Played-Status bleiben über Episodenwechsel hinweg korrekt.
- Alle automatisierten Tests bestehen und das produktive Player-Bundle ist aktuell.
