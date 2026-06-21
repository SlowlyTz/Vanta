# Offene Arbeiten

Stand: 21. Juni 2026

## Priorität 0: Problemmedien und HLS-Transcoding

Einige Medien starten weiterhin nicht, obwohl Master- und Media-Playlist korrekt ausgeliefert werden. Beim verifizierten Problemmedium blieb das erste Jellyfin-HLS-Segment `0.ts` auch nach 60 Sekunden ohne Antwort. Das ist kein UI- oder Playlist-Rewrite-Fehler; der Engpass liegt beim Erzeugen beziehungsweise Lesen des ersten Segments durch Jellyfin/FFmpeg oder den Quelldatenträger.

Offen:

- Betroffene Medien nach Container, Video-/Audio-Codec, Auflösung, Bitrate und Speicher-Backend klassifizieren.
- Für mindestens ein betroffenes Medium zeitgleich Jellyfin- und FFmpeg-Transcoding-Logs auswerten.
- Direkten Dateizugriff als Jellyfin-User mit `ffprobe` prüfen.
- Prüfen, ob langsamer Remote-I/O, ein defekter Mount, fehlender Hardware-Decoder oder FFmpeg selbst den Start blockiert.
- Prüfen, ob abgebrochene Segmentanfragen Transcoding-Prozesse korrekt beenden und keine verwaisten Jobs hinterlassen.
- Entscheiden, ob bei bestimmten Codecs/Quellen ein anderes Transcoding-Profil, fMP4 statt MPEG-TS oder ein niedrigeres Bitratenlimit erforderlich ist.
- Nach der Serverkorrektur sicherstellen, dass das erste Segment innerhalb des konfigurierten 90-Sekunden-Fensters geliefert wird.
- Fehler- und Retry-Verhalten bei dauerhaft fehlendem ersten Segment manuell abnehmen.

Aktueller Client-Schutz:

- HLS-Fragment-Timeout: 90 Sekunden
- zwei kontrollierte Fragment-Retries
- maximal 210 Sekunden bis zum Fehler wegen fehlendem ersten Videoframe
- Loader bleibt bis zum tatsächlich dargestellten ersten Frame sichtbar
- Live-Status zeigt den aktuellen Lade-/Transcoding-Schritt

Diese Timeouts kaschieren keinen permanenten Jellyfin-/Storage-Fehler. Wenn nie ein Segment geliefert wird, muss die Serverursache behoben werden.

## Priorität 1: Phase-1-Abnahme abschließen

- MP4 Direct Play testen.
- MKV, HEVC/H.265 und H.264/AAC testen.
- Jellyfin-HLS mit schnellem und langsamem Transcoding testen.
- Direct-Play-zu-HLS-Fallback mit absichtlich nicht unterstütztem Medium testen.
- Resume-Position und Positionserhalt beim Source-Switch prüfen.
- Pause, Fortsetzen, Timeline, ±10 Sekunden, Mausrad und Touch-Gesten prüfen.
- Retry nach Netzwerk-, Decode- und Segmentfehler prüfen.
- Route während Initialisierung, Seek und Source-Switch verlassen und auf Ton, Requests, Timer und Listener prüfen.
- Jellyfin-Reporting für Start, Progress, Pause, Seek, Stop und Ende kontrollieren.
- Sicherstellen, dass interne Source-Switches kein falsches `stopped` erzeugen.
- Controls, Fullscreen und Safe Areas in Chromium und Firefox manuell prüfen.
- Reale Tests auf Android sowie iPhone/iPad durchführen.
- iOS: Inline-Wiedergabe, Fullscreen und ausgeblendete Lautstärkesteuerung prüfen.
- Hoch-/Querformat und Viewports ab 320 Pixel Breite prüfen.
- Loading-, Buffering-, Error- und Autoplay-blockiert-Zustände manuell prüfen.

## Priorität 2: Medienfunktionen

### Qualität

- Auto-Modus als Standard implementieren.
- verfügbare HLS-Level anzeigen.
- Direct Play als eigene Option kennzeichnen, wenn verfügbar.
- bei notwendigem Jellyfin-Neutranscoding eine neue Quelle anfordern.
- Position, Pause-/Play-Zustand, Lautstärke und Geschwindigkeit beim Qualitätswechsel erhalten.
- verschwundene oder ungültige Qualitätsstufen abfangen.

### Audio und Untertitel

- vollständige Jellyfin-Track-Metadaten an den Browser liefern.
- Audio- und Untertitelmenüs in die vorbereitete Control-Leiste integrieren.
- Sprache, Titel, Default und Forced anzeigen.
- „Untertitel aus“ unterstützen.
- externe Untertitel authentifiziert über den Vanta-Proxy laden.
- Track-Auswahl an Jellyfin reporten.
- bei erforderlichem Neutranscoding Trackwechsel mit Positionserhalt durchführen.
- fehlerhafte Untertitel dürfen die Videowiedergabe nicht stoppen.

### Geschwindigkeit und Picture-in-Picture

- unterstützte Wiedergabegeschwindigkeiten anbieten.
- Geschwindigkeit beim Source-Switch erhalten.
- Geschwindigkeit beim nächsten Medium definiert auf Normal zurücksetzen.
- PiP nur bei tatsächlicher Browser-/Provider-Unterstützung anzeigen.
- PiP bei Navigation und Medienende sauber beenden.

## Priorität 3: Komfortfunktionen

### Kapitel und Vorschaubilder

- Jellyfin-Kapitel laden und normalisieren.
- Kapitelmarker und Namen in der Timeline darstellen.
- Trickplay-/Preview-Daten über einen authentifizierten Proxy laden.
- Vorschaubilder lazy laden und Cache begrenzen.
- ohne Preview-Daten eine normale Timeline beibehalten.

### Nächste Episode

- nächste Episode serverseitig bestimmen.
- Button beziehungsweise Endscreen ergänzen.
- aktuelle Episode vor dem Wechsel korrekt als beendet melden.
- Browser-Autoplay-Regeln berücksichtigen.
- nach manuellem Abbruch nicht automatisch wechseln.
- Fehler beim Folgeladen mit Retry und Rücknavigation behandeln.

### Visuelles Finetuning

- Control-Abstände und Typografie finalisieren.
- mobile Touch-Ziele und Animationen prüfen.
- Focus-, Kontrast- und Accessibility-Zustände prüfen.
- Loader und Error-Overlay abschließend angleichen.

## Detailseite

- Buttons `Abspielen` und `Zurück` in `src/public/js/components/detailView.js` über Beschreibung und Crew-/Studio-Informationen verschieben.
- Abstände in `src/public/css/pages/detail.css` für Desktop und Mobile prüfen.
- Film- und Serien-Detailseite manuell abnehmen.

## Tests und Wartung

- Unit-Tests für neue Qualitäts-, Track-, Kapitel- und Episodenlogik ergänzen.
- HLS-Playlist-Rewrite und Proxy-Header automatisiert testen.
- Tests für langsames beziehungsweise nie eintreffendes erstes HLS-Segment ergänzen.
- Build-Ausgabe unter `src/public/vendor/player/` nach Player-Änderungen immer aktualisieren.
- Produktions-Bundle weiterhin ohne Sourcemap ausliefern.
- Abhängigkeiten und Vidstack-Version vor größeren Folgearbeiten prüfen; Upgrades separat testen.
- Keine Zugangsdaten, Jellyfin-Tokens, Session-Cookies oder Test-Screenshots committen.

## Abschlusskriterien des Gesamtprojekts

- Alle unterstützten Direct-Play- und HLS-Medien starten zuverlässig oder zeigen einen klaren, wiederholbaren Fehlerzustand.
- Phase-1-Matrix ist auf Desktop, Android und realem iOS-Gerät abgenommen.
- Qualität, Audio, Untertitel, Geschwindigkeit und PiP funktionieren ohne Positionsverlust.
- Kapitel, Preview und nächste Episode sind implementiert und getestet.
- Jellyfin-Fortschritt und Played-Status bleiben über alle Source- und Medienwechsel korrekt.
