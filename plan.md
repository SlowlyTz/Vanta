# Implementierungsplan: Webhook-Abschnitt aufklappbar, Nutzer-Detail im Modal

## Ziel

Zwei Korrekturen an der neuen Admin-Verwaltung:

1. **Discord-Webhook als aufklappbarer Abschnitt.** Im Einstellungen-Panel liegt der Webhook-Block
   momentan komplett offen. Er wird zu einem auf- und zuklappbaren Abschnitt, der standardmäßig
   **eingeklappt** ist.
2. **Nutzer-Detail im Popup.** Ein Klick auf „Bearbeiten" ersetzt heute die Liste durch eine
   Inline-Detailansicht in der Seite. Stattdessen soll sich die Detailansicht als Modal über der Seite
   öffnen, während die Liste im Hintergrund stehen bleibt.

Ursprünglich war ein dritter Menüpunkt „Einstellungen" angefragt — hinfällig, weil das
Einstellungen-Panel bereits über das Zahnrad neben der Suchleiste erreichbar ist. Kein neuer Menüpunkt.

## Ausgangslage

- `src/public/js/pages/admin/adminSettingsPanel.js:148-178` baut `webhookSection` als flache Liste aus
  Titel, Beschreibung, Status, URL-Feld, Schalter, Aktionen und Meldung. Der `sectionsContainer` war
  bereits als erweiterbare Sektionsliste angelegt.
- `load()` (`:213`) wird heute bei **jedem** `open()` aufgerufen. Da der Endpunkt hinter
  `requireFreshAdmin` hängt und dieses bei jedem Request Jellyfin befragt, kostet das Öffnen des Panels
  einen Jellyfin-Roundtrip — auch wenn niemand den Webhook ansehen will.
- `AdminUsersTool.js:97-108` (`showDetail`) blendet die Liste per `listView.hidden = true` aus und
  rendert die Detailansicht in `detailSlot`. `showList()` (`:89`) macht es rückgängig.
- `adminUserDialogs.js:3-40` enthält bereits einen generischen, aber **nicht exportierten** Modal-Helfer
  `openDialog(contentEl)` — inklusive Overlay, Schließen-Button, Escape und Backdrop-Klick. Genau das
  Verhalten, das das Nutzer-Detail braucht.
- Die Split-Spalten-Darstellung in `users-tool/list-view.css` (`:has()`-Regel und
  `.admin-users-list-view[hidden]`-Override) wird durch das Modal gegenstandslos.
- `registerBackControl` / `setBackControl` existiert nur, damit die Seite beim Öffnen der
  Inline-Detailansicht einen Zurück-Button einblendet (`AdminUsersTool.js:166`,
  `admin.page.js:60-66`). Mit einem Modal, das sich selbst schließt, entfällt der Mechanismus.

## Teil 1 — Webhook-Abschnitt aufklappbar

- `webhookSection` wird in zwei Teile zerlegt:
  - eine Kopfzeile als `<button class="admin-settings-section-toggle">` mit Titel, Kurzbeschreibung und
    einem Chevron, dazu `aria-expanded` und `aria-controls`
  - ein Rumpf (`admin-settings-section-body`), der Status, URL-Feld, Schalter, Aktionen und Meldung
    enthält und per `hidden` geschaltet wird
- Startzustand: **eingeklappt**. Der Chevron dreht sich beim Aufklappen.
- Das Auf- und Zuklappen ist animiert. Nicht über `hidden` (`display: none` lässt sich nicht
  animieren) und nicht über eine feste `max-height` wie im Drawer-Accordion — der Rumpf wächst je nach
  Status- und Fehlermeldung, eine geratene Maximalhöhe würde springen. Stattdessen fährt ein
  Grid-Wrapper `grid-template-rows` von `0fr` auf `1fr`, was die echte Inhaltshöhe animiert, ohne sie
  in JS zu messen. Timing und Kurve sind vom bestehenden Drawer-Accordion übernommen. Eingeklappt hält
  `inert` den Inhalt aus Tastaturfokus und Screenreadern heraus, da er im Layout-Baum bleibt.
  `prefers-reduced-motion` schaltet die Übergänge ab.
- **Lazy Load**: `load()` wandert von `open()` in das erstmalige Aufklappen. Wer das Panel öffnet, ohne
  den Webhook anzufassen, löst keinen Request und damit keinen Jellyfin-Roundtrip aus. Ein Flag
  verhindert erneutes Laden bei jedem Auf-/Zuklappen; nach `Speichern`/`Entfernen` bleibt der Status
  ohnehin über die Server-Antwort aktuell.
- Der Aufbau bleibt so, dass weitere Abschnitte als eigene aufklappbare Blöcke danebenpassen.
- CSS in `src/public/css/pages/admin/settings-panel.css`: Toggle-Zeile, Chevron-Rotation, Rumpf.

## Teil 2 — Nutzer-Detail im Modal

- Der Modal-Helfer aus `adminUserDialogs.js` wird nach `src/public/js/components/admin-tools/adminModal.js`
  gezogen und exportiert (`openAdminModal({ content, labelledBy, className })`). `adminUserDialogs.js`
  importiert ihn danach, statt eine eigene Kopie zu halten — es soll genau eine Modal-Implementierung
  im Admin-Bereich geben.
- `AdminUsersTool.showDetail(user)` öffnet die Detailansicht künftig in diesem Modal. Die Liste bleibt
  sichtbar und unverändert im Hintergrund; `listView.hidden` wird nicht mehr angefasst.
- Schließen: Schließen-Button, Escape, Klick auf den Hintergrund. Danach wird die Liste neu geladen,
  damit dort geänderte Namen, Badges und Stream-Limits sofort stimmen.
- `detailSlot` entfällt ersatzlos, ebenso `showList()`.
- `selectUser(userId)` (Sprung aus der globalen Suche) öffnet dasselbe Modal.
- Das Modal braucht eine Breite, die dem bisherigen Detailformular gerecht wird (Bibliotheksraster!),
  und muss bei wenig Höhe intern scrollen statt über den Viewport hinauszuwachsen.
- **z-index**: Die Bestätigungsdialoge für Sperren/Löschen werden aus dem Detail-Modal heraus geöffnet,
  liegen also Modal-über-Modal. Ihr Wert (aktuell `5000`) muss über dem neuen Detail-Modal liegen und
  unter dem globalen Toast (`10000`). Beim Umbau gezielt prüfen.

## Aufräumen

- `users-tool/list-view.css`: `:has()`-Split-Regel und der `[hidden]`-Override entfallen. Die
  Container-Query für schmale Listen bleibt — sie deckt weiterhin das Handy ab.
- `AdminUsersTool.js`: `registerBackControl`, `setBackControl`, `detailSlot`, `showList` entfernen.
- `admin.page.js`: die Zurück-Button-Logik in `buildSectionPanel` entfällt, da kein Tool sie mehr nutzt.

## Tests

**Anzupassen**
- `tests/public/pages/admin/adminSettingsPanel.test.js` — der Rumpf ist beim Öffnen zu; Status wird erst
  nach dem Aufklappen geladen. Alle bestehenden Fälle (Speichern, Schalter, Testen, Entfernen, Fehler)
  müssen künftig zuerst aufklappen. Neu: `open()` allein löst **keinen** GET aus.
- `tests/public/components/admin-tools/users/AdminUsersTool.test.js` — „Bearbeiten" öffnet ein Modal
  statt `detailSlot`; die Liste bleibt sichtbar; Schließen entfernt das Modal und lädt neu; der Test zum
  geteilten Zurück-Button entfällt; `selectUser` öffnet das Modal.
- `tests/public/pages/admin.page.test.js` — falls dort der Zurück-Button geprüft wird.

**Neu**
- Ein Fall, der belegt, dass die Nutzerliste beim Öffnen des Detail-Modals sichtbar bleibt.

## Offene Punkte (unverändert aus dem Vorgängerplan)

1. Globale Suche: Der Sprung zu einem Treffer greift erst, wenn der Bereich schon geladen war.
2. Unterrouten `#/admin/users` bewusst nicht umgesetzt.
3. Der Webhook lief noch nie gegen echtes Discord — nur gegen gemocktes `fetch`.

## Reihenfolge

1. Modal-Helfer extrahieren, `adminUserDialogs.js` darauf umstellen, Tests grün halten
2. Nutzer-Detail auf das Modal umstellen, `detailSlot`/Back-Control/Split-CSS entfernen
3. Webhook-Abschnitt aufklappbar machen inkl. Lazy Load
4. CSS für Toggle und Modalbreite
5. Tests anpassen, voller Durchlauf `npm test`
6. Manuelle Sichtprüfung durch den Nutzer
