# Refactor-Plan: Tests bündeln, Module splitten und Dead Code entfernen

## Ziel

Dieser Refactor ist rein strukturell. Die App darf danach weder visuell noch funktional anders wirken. Alle Tests werden nach `tests/` verschoben, große Dateien über 300 Zeilen werden modularisiert, `player.css` wird in Player-CSS-Module aufgeteilt, und echter Dead Code in HTML/CSS/JS wird entfernt.

Wichtig: Dead Code darf nur entfernt werden, wenn er nachweisbar nicht mehr produktiv aufgerufen wird. Testdateien allein zählen nicht als produktive Nutzung. Wenn ein Test nur noch Dead Code schützt, wird der Test zusammen mit dem Dead Code gelöscht.

## Harte Regeln

- Keine Feature-Änderungen.
- Keine visuellen Änderungen.
- Keine API-, Route-, WebSocket- oder Player-Verhaltensänderungen.
- Keine CSS-Klassen umbenennen, außer die Klasse ist Teil von entferntem Dead Code.
- Moves mit `git mv` ausführen, damit Historie nachvollziehbar bleibt.
- Nach jedem Schritt gezielte Tests ausführen.
- Generated Assets unter `src/public/vendor/player/` nur durch `npm run player:build` aktualisieren.
- Dead-Code-Entfernung immer mit Suchbelegen absichern.

## Zielstruktur

```txt
tests/
  server/
  public/
  player/

src/player/src/player.css
src/player/src/player/
  base.css
  layout.css
  controls.css
  timeline.css
  menus.css
  episodes.css
  watch-party.css
  next-episode.css
  overlays.css
  responsive.css
```

## Aktueller Befund

Aktuelle Vitest-Includes:

```js
include: [
  'src/player/tests/unit/**/*.test.js',
  'src/server/**/*.test.js',
  'src/public/js/**/*.test.js'
]
```

Große Dateien über 300 Zeilen:

```txt
src/player/src/player.css                         1258
src/public/js/pages/watch-party.page.js           1226
src/public/js/pages/watch-party.page.test.js      1212
src/public/css/pages/trailer-scroller.css         1016
src/public/js/pages/trailer-scroller.page.js       957
src/player/src/index.js                            865
src/public/css/pages/watch-party.css               863
src/public/css/pages/requests.css                  764
src/server/realtime/watch-party.socket.test.js     708
src/public/css/pages/detail.css                    627
src/server/services/watch-party.service.js         606
src/server/realtime/watch-party.socket.js          528
src/server/services/watch-party.service.test.js    484
src/player/tests/unit/sourceSwitch.test.js         469
src/public/css/components/navbar/mobile-drawer.css 463
src/public/css/pages/home.css                      401
src/server/services/home-sections.service.js       400
src/public/css/components/admin-tools/users-tool.css 397
src/public/js/components/watch-party/createWatchPartyDialog.js 386
src/public/css/components/settings/settings-dialog.css 384
src/player/tests/unit/jellyfinReporter.test.js     377
src/player/src/sourceSwitch.js                     364
src/server/services/jellyfin/trailers.service.test.js 351
src/public/js/pages/requests.page.js               351
src/public/css/components/watch-party/watch-party-dialog.css 337
src/server/services/playback.service.js            328
src/public/css/components/navbar/navbar.css        316
src/public/js/components/admin-tools/users/adminUserDetailView.js 304
src/public/css/components/footer.css               302
```

## Bestätigter Dead Code

Diese Kandidaten wurden per `rg` geprüft und sind produktiv nicht mehr angebunden:

### 1. Mobile Settings im Drawer

Dead:

```txt
src/public/js/components/navbar/mobileSettings.js
```

Grund:

- `createMobileSettings()` wird in produktivem Code nicht mehr importiert.
- Settings werden inzwischen über `settingsDialog.js` als eigenes Overlay geöffnet.

Beleg-Suche:

```bash
rg -n "from './mobileSettings|from \"./mobileSettings|createMobileSettings" src --glob '!**/*.test.js' --glob '!src/public/vendor/**'
```

Erwarteter aktueller Treffer:

```txt
src/public/js/components/navbar/mobileSettings.js:9:export function createMobileSettings(...)
```

Zu entfernende CSS-Regeln in `src/public/css/components/navbar/mobile-drawer.css`:

```txt
.mobile-settings-panel[hidden]
.mobile-settings-panel
.mobile-settings-back-button
.mobile-settings-back-button:hover
.mobile-settings-back-button:active
.mobile-settings-header
.mobile-settings-panel .settings-*
```

Nicht entfernen:

```txt
.navbar-mobile-settings-item
.navbar-mobile-settings
```

Diese Klassen gehören weiterhin zum Button "Einstellungen" im Drawer.

### 2. Alte Hover-Dropdowns der Navbar

Dead:

```txt
src/public/js/components/navbar/dropdownMenus.js
src/public/js/components/navbar/dropdownMenus.test.js
```

Wahrscheinlich ebenfalls dead, nach finaler Prüfung zu entfernen:

```txt
navLinks.js: menuId-Felder für movies/series/publishers
navbar.css: .dropdown-menu Legacy-Block
```

Grund:

- `loadDropdowns()` wird produktiv nicht importiert.
- Die Topbar rendert aktuell `createTopTabs()` ohne Hover-Dropdowns.
- Die einzigen Treffer sind Test, `navLinks.js`-Metadaten und ein CSS-Kommentar, der die Regeln explizit als Legacy beschreibt.

Beleg-Suche:

```bash
rg -n "loadDropdowns|dropdownMenus" src/public/js --glob '!**/*.test.js' --glob '!src/public/vendor/**'
```

Erwarteter aktueller Treffer:

```txt
src/public/js/components/navbar/dropdownMenus.js:54:export function loadDropdowns(navbarElement)
```

Vor Entfernen zusätzlich prüfen:

```bash
rg -n "movies-dropdown-menu|series-dropdown-menu|publishers-dropdown-menu|dropdown-menu" src --glob '!**/*.test.js' --glob '!src/public/vendor/**'
```

Wenn nur `navLinks.js` und `navbar.css` treffen, können die `menuId`-Felder und der `.dropdown-menu`-CSS-Block entfernt werden.

## Phase 1: Dead-Code-Audit als Pflichtschritt

### Task 1: Dead-Code-Audit dokumentieren

**Beschreibung:** Vor dem großen Refactor wird ein Audit ausgeführt und im Commit/PR kurz dokumentiert. Ziel ist, echten Dead Code von nur schwer auffindbarem dynamischem Code zu trennen.

**Befehle:**

```bash
rg -n "createMobileSettings|mobile-settings-panel|mobile-settings-back-button|mobile-settings-header" src --glob '!src/public/vendor/**'
rg -n "loadDropdowns|dropdownMenus|dropdown-menu|movies-dropdown-menu|series-dropdown-menu|publishers-dropdown-menu" src --glob '!src/public/vendor/**'
rg -n "document\\.querySelector|querySelectorAll|getElementById|dataset\\.|classList\\." src/public/js src/player/src --glob '!src/public/vendor/**'
```

**Akzeptanzkriterien:**

- Für jeden entfernten JS-Export gibt es keinen produktiven Import mehr.
- Für jede entfernte CSS-Klasse gibt es kein produktives HTML/JS mehr, das diese Klasse erzeugt oder selektiert.
- Wenn ein Treffer nur in Tests vorkommt, wird entschieden: Test migrieren, wenn Feature lebt; Test löschen, wenn Feature dead ist.

**Snippet für einen lokalen Dead-Code-Check:**

```js
// scripts/check-dead-code-candidates.mjs
import { execFileSync } from 'node:child_process';

const candidates = [
  'createMobileSettings',
  'mobile-settings-panel',
  'mobile-settings-back-button',
  'loadDropdowns',
  'movies-dropdown-menu',
  'series-dropdown-menu',
  'publishers-dropdown-menu'
];

for (const candidate of candidates) {
  const output = execFileSync('rg', [
    '-n',
    candidate,
    'src',
    '--glob',
    '!src/public/vendor/**'
  ], { encoding: 'utf8' });

  console.log(`\n${candidate}\n${output}`);
}
```

Hinweis: Dieses Script soll nur berichten, nicht automatisch löschen.

### Task 2: Bestätigten Dead Code entfernen

**Beschreibung:** Entferne den bestätigten Dead Code in kleinen, überprüfbaren Patches.

**Zu entfernen:**

```txt
src/public/js/components/navbar/mobileSettings.js
src/public/js/components/navbar/dropdownMenus.js
src/public/js/components/navbar/dropdownMenus.test.js
```

**CSS-Bereinigung:**

Aus `src/public/css/components/navbar/mobile-drawer.css` entfernen:

```css
.mobile-settings-panel[hidden] { ... }
.mobile-settings-panel { ... }
.mobile-settings-back-button { ... }
.mobile-settings-back-button:hover { ... }
.mobile-settings-back-button:active { ... }

@media (...) {
  .mobile-settings-panel[hidden] { ... }
  .mobile-settings-panel { ... }
  .mobile-settings-header { ... }
  .mobile-settings-panel .settings-panel { ... }
  .mobile-settings-panel .settings-panel-root { ... }
  .mobile-settings-panel .settings-profile { ... }
  .mobile-settings-panel .settings-profile-avatar { ... }
  .mobile-settings-panel .settings-profile-icon svg { ... }
  .mobile-settings-panel .settings-profile-name { ... }
  .mobile-settings-panel .settings-profile-subtitle { ... }
  .mobile-settings-panel .settings-overview-grid { ... }
  .mobile-settings-panel .settings-stat { ... }
  .mobile-settings-panel .settings-stat-label { ... }
  .mobile-settings-panel .settings-stat-value { ... }
  .mobile-settings-panel .settings-option,
  .mobile-settings-panel .settings-choice,
  .mobile-settings-panel .settings-logout-button { ... }
  .mobile-settings-panel .settings-option-main { ... }
}
```

Aus `src/public/css/components/navbar/navbar.css` entfernen, wenn keine produktiven Treffer bleiben:

```css
/* Legacy genre/publisher hover dropdowns ... */
.dropdown-menu { ... }
.navbar-item.dropdown:hover .dropdown-menu { ... }
```

Aus `src/public/js/components/navbar/navLinks.js` entfernen, wenn `dropdownMenus.js` gelöscht ist:

```js
// vorher
{ key: 'movies', label: 'Filme', href: '#/movies', type: 'Movie', menuId: 'movies-dropdown-menu' }

// nachher
{ key: 'movies', label: 'Filme', href: '#/movies', type: 'Movie' }
```

**Akzeptanzkriterien:**

- `mobileSettings.js` existiert nicht mehr.
- `dropdownMenus.js` und zugehöriger Test existieren nicht mehr.
- Keine `.mobile-settings-*` Regeln bleiben übrig, außer `navbar-mobile-settings-*`.
- Keine `dropdown-menu`-Legacy-Regeln bleiben übrig, wenn sie nicht produktiv gebraucht werden.
- Navbar-Tests bleiben grün.

**Verifikation:**

```bash
rg -n "createMobileSettings|mobile-settings-panel|mobile-settings-back-button|mobile-settings-header" src --glob '!src/public/vendor/**'
rg -n "loadDropdowns|dropdownMenus|dropdown-menu|movies-dropdown-menu|series-dropdown-menu|publishers-dropdown-menu" src --glob '!src/public/vendor/**'
npm test -- src/public/js/components/navbar/Navbar.test.js src/public/js/components/navbar/settingsDialog.test.js
```

## Phase 2: Tests zentral nach `tests/` verschieben

### Task 3: Vitest final auf `tests/**/*.test.js` umstellen

**Beschreibung:** Die Testkonfiguration wird auf den neuen zentralen Testordner vorbereitet. Während der Migration darf kurzzeitig dual geladen werden. Der finale Zustand lädt nur noch `tests/**/*.test.js`.

**Finaler `vitest.config.js`:**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'src/public/vendor']
  }
});
```

**Akzeptanzkriterien:**

- `npm test` lädt nur Tests aus `tests/`.
- `src/public/vendor` bleibt ausgeschlossen.
- Keine Testdatei bleibt unter `src/`.

### Task 4: Tests mit `git mv` migrieren

**Mapping:**

```txt
src/server/**/*.test.js          -> tests/server/**/*.test.js
src/public/js/**/*.test.js       -> tests/public/**/*.test.js
src/player/tests/unit/*.test.js  -> tests/player/unit/*.test.js
```

**Beispiele:**

```bash
mkdir -p tests/server tests/public tests/player/unit
git mv src/server/realtime/watch-party.socket.test.js tests/server/realtime/watch-party.socket.test.js
git mv src/public/js/pages/home.page.test.js tests/public/pages/home.page.test.js
git mv src/player/tests/unit/time.test.js tests/player/unit/time.test.js
```

**Import-Snippets:**

```js
// public vorher
import HomePage from './home.page.js';

// public nachher
import HomePage from '../../../src/public/js/pages/home.page.js';
```

```js
// player vorher
import { formatTime } from '../../src/time.js';

// player nachher
import { formatTime } from '../../../src/player/src/time.js';
```

```js
// server vorher
import authRoutes from './auth.routes.js';

// server nachher, Beispiel für tests/server/routes/auth.routes.test.js
import authRoutes from '../../../src/server/routes/auth.routes.js';
```

**Akzeptanzkriterien:**

- `rg --files -g '*test.js' src` liefert keine Treffer.
- `rg --files -g '*test.js' tests` enthält alle lebenden Tests.
- Tests für entfernten Dead Code werden nicht migriert.

**Verifikation:**

```bash
rg --files -g '*test.js' src
rg --files -g '*test.js' tests
npm test -- tests/player/unit/time.test.js tests/public/pages/home.page.test.js tests/server/routes/auth.routes.test.js
```

### Task 5: Große Testdateien splitten

**Beschreibung:** Testdateien über 300 Zeilen werden nach Szenarien gesplittet. Gemeinsames Setup wandert in Helper-Dateien unter `tests/*/helpers/`.

**Priorität:**

```txt
tests/public/pages/watch-party.page.test.js
tests/server/realtime/watch-party.socket.test.js
tests/server/services/watch-party.service.test.js
tests/player/unit/sourceSwitch.test.js
tests/player/unit/jellyfinReporter.test.js
tests/server/services/jellyfin/trailers.service.test.js
```

**Zielbeispiel:**

```txt
tests/public/pages/watch-party/
  lobby.test.js
  ready-room.test.js
  player-sync.test.js
  invitations.test.js
  participant-admin.test.js
  helpers.js
```

**Helper-Snippet:**

```js
// tests/public/pages/watch-party/helpers.js
import WatchPartyPage from '../../../../src/public/js/pages/watch-party.page.js';

export function mountWatchPartyPage(params = { partyId: 'party-1' }) {
  document.body.innerHTML = '';
  const element = WatchPartyPage(params);
  document.body.appendChild(element);
  return element;
}
```

**Akzeptanzkriterien:**

- Keine Testdatei über 300 Zeilen.
- Keine Testlogik wird entfernt, außer sie testet bestätigten Dead Code.
- Test-Helper bleiben ebenfalls unter 300 Zeilen.

**Verifikation:**

```bash
find tests -type f -name '*.test.js' -print0 | xargs -0 wc -l | sort -nr | head -40
npm test
```

## Phase 3: `player.css` modularisieren

### Task 6: Player-CSS in Module splitten

**Beschreibung:** `src/player/src/player.css` bleibt als Import-Einstieg bestehen. Der Inhalt wird in `src/player/src/player/*.css` verschoben. Reihenfolge muss der aktuellen Cascade entsprechen.

**Zielstruktur:**

```txt
src/player/src/player.css
src/player/src/player/
  base.css
  layout.css
  controls.css
  timeline.css
  menus.css
  episodes.css
  watch-party.css
  next-episode.css
  overlays.css
  responsive.css
```

**Import-Einstieg:**

```css
@import "./player/base.css";
@import "./player/layout.css";
@import "./player/controls.css";
@import "./player/timeline.css";
@import "./player/menus.css";
@import "./player/episodes.css";
@import "./player/watch-party.css";
@import "./player/next-episode.css";
@import "./player/overlays.css";
@import "./player/responsive.css";
```

**Komplexer Split-Ansatz:**

```css
/* src/player/src/player/next-episode.css */
.vanta-player-next-episode { ... }
.vanta-player-next-episode[hidden] { ... }
.vanta-player-next-episode-media { ... }
.vanta-player-next-episode-confirm { ... }
.vanta-player-next-episode-confirm::before { ... }
```

```css
/* src/player/src/player/episodes.css */
.vanta-player-episodes-panel { ... }
.vanta-player-episode-season { ... }
.vanta-player-episode-row { ... }
.vanta-player-episode-row.is-current { ... }
```

**Akzeptanzkriterien:**

- `src/player/src/player.css` enthält nur Imports.
- Alle neuen CSS-Dateien bleiben unter 300 Zeilen.
- Keine Selektoren werden geändert.
- Build erzeugt weiterhin `vanta-player.css`.

**Verifikation:**

```bash
npm run player:build
find src/player/src/player -type f -name '*.css' -print0 | xargs -0 wc -l | sort -nr
```

## Phase 4: Produktive CSS-Dateien über 300 Zeilen splitten

### Task 7: Public-CSS modularisieren und Dead CSS entfernen

**Beschreibung:** Alle produktiven CSS-Dateien über 300 Zeilen werden in kleinere Module aufgeteilt. CSS, dessen HTML/JS-Erzeugung entfernt wurde, wird gelöscht statt verschoben.

**Priorität:**

```txt
src/public/css/pages/trailer-scroller.css
src/public/css/pages/watch-party.css
src/public/css/pages/requests.css
src/public/css/pages/detail.css
src/public/css/components/navbar/mobile-drawer.css
src/public/css/pages/home.css
src/public/css/components/admin-tools/users-tool.css
src/public/css/components/settings/settings-dialog.css
src/public/css/components/watch-party/watch-party-dialog.css
src/public/css/components/navbar/navbar.css
src/public/css/components/footer.css
```

**Muster:**

```txt
src/public/css/pages/watch-party.css
src/public/css/pages/watch-party/
  layout.css
  lobby.css
  invite.css
  members.css
  ready-room.css
  countdown.css
  player.css
  responsive.css
```

```css
/* src/public/css/pages/watch-party.css */
@import "./watch-party/layout.css";
@import "./watch-party/lobby.css";
@import "./watch-party/invite.css";
@import "./watch-party/members.css";
@import "./watch-party/ready-room.css";
@import "./watch-party/countdown.css";
@import "./watch-party/player.css";
@import "./watch-party/responsive.css";
```

**Dead-CSS-Regel:**

Vor dem Verschieben eines Blocks prüfen:

```bash
rg -n "class-name-ohne-punkt" src/public/js src/player/src src/server --glob '!src/public/vendor/**'
```

Wenn kein produktiver Treffer existiert und die Klasse nicht serverseitig als HTML-String erzeugt wird, Block löschen.

**Akzeptanzkriterien:**

- Keine produktive CSS-Datei über 300 Zeilen.
- Bestätigter Dead CSS ist gelöscht, nicht nur verschoben.
- Import-Reihenfolge erhält die Cascade.

**Verifikation:**

```bash
find src/public/css src/player/src -type f -name '*.css' -not -path '*/vendor/*' -print0 | xargs -0 wc -l | sort -nr | head -40
npm test -- tests/public
npm run player:build
```

## Phase 5: Player-JS splitten

### Task 8: `src/player/src/index.js` in Orchestrator und Module splitten

**Beschreibung:** `index.js` soll unter 300 Zeilen bleiben. `mountVantaPlayer()` bleibt die öffentliche API. Verhalten, Return-Werte und Events bleiben identisch.

**Zielstruktur:**

```txt
src/player/src/index.js
src/player/src/player/
  context.js
  bootstrap.js
  controls.js
  events.js
  lifecycle.js
  playbackState.js
  watchPartyIntegration.js
  episodeIntegration.js
```

**Orchestrator-Snippet:**

```js
import './player.css';
import { createPlayerContext } from './player/context.js';
import { initializePlayer } from './player/bootstrap.js';
import { bindControls } from './player/controls.js';
import { bindPlayerEvents } from './player/events.js';
import { bindWatchPartyIntegration } from './player/watchPartyIntegration.js';
import { bindEpisodeIntegration } from './player/episodeIntegration.js';
import { createPlayerController } from './player/lifecycle.js';

export async function mountVantaPlayer(options) {
  const context = createPlayerContext(options);

  try {
    await initializePlayer(context);
    bindControls(context);
    bindPlayerEvents(context);
    bindWatchPartyIntegration(context);
    bindEpisodeIntegration(context);
    return createPlayerController(context);
  } catch (error) {
    context.destroy();
    throw error;
  }
}
```

**Context-Snippet:**

```js
export function createPlayerContext(options) {
  const disposers = [];

  return {
    ...options,
    disposers,
    addDisposer(disposer) {
      disposers.push(disposer);
      return disposer;
    },
    destroy() {
      while (disposers.length) {
        const dispose = disposers.pop();
        try {
          dispose?.();
        } catch (error) {
          console.warn('[Player Cleanup]', error);
        }
      }
    }
  };
}
```

**Akzeptanzkriterien:**

- `mountVantaPlayer(options)` bleibt kompatibel.
- Player-Tests bleiben grün.
- `index.js` und neue Module sind unter 300 Zeilen.
- Kein DOM-Markup und keine CSS-Klasse ändert sich.

**Verifikation:**

```bash
npm test -- tests/player
npm run player:build
```

### Task 9: `sourceSwitch.js` splitten

**Beschreibung:** `sourceSwitch.js` enthält State Capture, Seek Restore, Rollback und Loading-Status. Diese Teile werden in Module extrahiert.

**Zielstruktur:**

```txt
src/player/src/sourceSwitch.js
src/player/src/sourceSwitch/
  state.js
  seekRestore.js
  rollback.js
  loadingStatus.js
```

**Snippet:**

```js
// src/player/src/sourceSwitch/state.js
export function capturePlaybackState({ player, reporter, lastRequestedPosition }) {
  return {
    paused: player.paused,
    muted: player.muted,
    volume: player.volume,
    position: Math.max(reporter.getPosition(), lastRequestedPosition)
  };
}
```

**Akzeptanzkriterien:**

- Öffentliche Factory/API von `sourceSwitch.js` bleibt gleich.
- Keine zyklischen Imports.
- Source-Switch-Tests bleiben grün.

**Verifikation:**

```bash
npm test -- tests/player/unit/sourceSwitch
npm run player:build
```

## Phase 6: Public-Frontend-JS splitten

### Task 10: `watch-party.page.js` modularisieren

**Beschreibung:** Die WatchTogether-Seite wird in Shell, State, Socket-Handling, Lobby, Invite, Ready Room und Player-Mount aufgeteilt.

**Zielstruktur:**

```txt
src/public/js/pages/watch-party.page.js
src/public/js/pages/watch-party/
  context.js
  shell.js
  lobbyView.js
  readyRoom.js
  countdown.js
  inviteModal.js
  memberList.js
  notifications.js
  playerMount.js
  socketHandlers.js
  sync.js
```

**Entry-Snippet:**

```js
import { createWatchPartyContext } from './watch-party/context.js';
import { renderWatchPartyShell } from './watch-party/shell.js';
import { attachWatchPartySocketHandlers } from './watch-party/socketHandlers.js';
import { loadInitialParty } from './watch-party/sync.js';

export default function WatchPartyPage({ partyId }) {
  const context = createWatchPartyContext({ partyId });
  renderWatchPartyShell(context);
  attachWatchPartySocketHandlers(context);
  loadInitialParty(context);
  return context.container;
}
```

**Akzeptanzkriterien:**

- Default Export bleibt gleich.
- WatchTogether Lobby, Ready Room, Rejoin, Notifications, Invite, Player-Sync und Admin-Funktionen bleiben gleich.
- Alle Module unter 300 Zeilen.

**Verifikation:**

```bash
npm test -- tests/public/pages/watch-party
```

### Task 11: Weitere Public-Dateien über 300 Zeilen splitten

**Priorität:**

```txt
src/public/js/pages/trailer-scroller.page.js
src/public/js/components/watch-party/createWatchPartyDialog.js
src/public/js/pages/requests.page.js
src/public/js/components/admin-tools/users/adminUserDetailView.js
```

**Zielbeispiele:**

```txt
src/public/js/pages/trailer-scroller/
  controls.js
  slideRenderer.js
  playback.js
  gestures.js
  hashState.js
```

```txt
src/public/js/components/watch-party/createWatchPartyDialog/
  shell.js
  search.js
  suggestions.js
  validation.js
```

**Akzeptanzkriterien:**

- Öffentliche Exporte bleiben kompatibel.
- Keine UI-Texte oder Klassen ändern sich.
- Dead Code innerhalb dieser Dateien wird gelöscht, wenn keine produktiven Aufrufe existieren.

**Verifikation:**

```bash
npm test -- tests/public/pages/trailer-scroller.page.test.js tests/public/components/watch-party tests/public/pages/requests.page.test.js
```

## Phase 7: Server-JS splitten

### Task 12: WatchParty Service und Socket modularisieren

**Beschreibung:** Die zentralen WatchParty-Dateien werden entlang von Verantwortlichkeiten gesplittet. Die bisherigen Importpfade bleiben durch Re-Exports stabil.

**Service-Zielstruktur:**

```txt
src/server/services/watch-party.service.js
src/server/services/watch-party/
  WatchPartyService.js
  store.js
  permissions.js
  lifecycle.js
  members.js
  playback.js
  episodes.js
  snapshots.js
  publicApi.js
```

**Socket-Zielstruktur:**

```txt
src/server/realtime/watch-party.socket.js
src/server/realtime/watch-party/
  WatchPartySocketHub.js
  messageHandlers.js
  notifications.js
  countdowns.js
  broadcasts.js
  connectionRegistry.js
```

**Re-Export-Snippet:**

```js
// src/server/services/watch-party.service.js
export { WatchPartyService } from './watch-party/WatchPartyService.js';
export {
  getPartyEffectivePosition,
  isPartyAdmin,
  startWatchPartyCleanup
} from './watch-party/publicApi.js';
```

**Akzeptanzkriterien:**

- Bestehende Imports funktionieren weiter.
- WebSocket Message Types bleiben unverändert.
- Error Messages bleiben unverändert, soweit Tests darauf prüfen.
- Alle neuen Module unter 300 Zeilen.

**Verifikation:**

```bash
npm test -- tests/server/services/watch-party tests/server/realtime/watch-party
```

### Task 13: Weitere Server-Dateien über 300 Zeilen splitten

**Priorität:**

```txt
src/server/services/home-sections.service.js
src/server/services/playback.service.js
```

**Muster:**

```txt
src/server/services/home-sections.service.js
src/server/services/home-sections/
  cache.js
  groups.js
  loaders.js
  normalizers.js
```

```txt
src/server/services/playback.service.js
src/server/services/playback/
  streamSelection.js
  qualityProfiles.js
  validation.js
  reporting.js
```

**Akzeptanzkriterien:**

- Public Exports bleiben stabil.
- Keine Route-Antworten ändern sich.
- Tests bleiben grün.

**Verifikation:**

```bash
npm test -- tests/server/services/home-sections.service.test.js tests/server/services/playback.service.test.js
```

## Phase 8: Größen- und Dead-Code-Gates

### Task 14: Größenprüfung hinzufügen

**Beschreibung:** Ergänze ein Script, das `.js`, `.css` und `.html` unter `src` und `tests` prüft. Dateien über 300 Zeilen führen zu Exit Code 1. `src/public/vendor` wird ignoriert.

**Dateien:**

```txt
scripts/check-file-size.mjs
package.json
```

**Snippet:**

```js
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_LINES = 300;
const ROOTS = ['src', 'tests'];
const EXTENSIONS = new Set(['.js', '.css', '.html']);
const IGNORED = ['src/public/vendor', 'node_modules'];

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (IGNORED.some(prefix => full.startsWith(prefix))) continue;
    if (entry.isDirectory()) await walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const oversized = [];

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const lines = (await readFile(file, 'utf8')).split('\n').length;
    if (lines > MAX_LINES) oversized.push({ file, lines });
  }
}

if (oversized.length > 0) {
  console.error('Files over 300 lines:');
  for (const { file, lines } of oversized) console.error(`${lines} ${file}`);
  process.exit(1);
}
```

`package.json`:

```json
{
  "scripts": {
    "lint:size": "node scripts/check-file-size.mjs"
  }
}
```

### Task 15: Dead-Code-Prüfung als Report-Script hinzufügen

**Beschreibung:** Ergänze ein Report-Script für bekannte Dead-Code-Kandidaten. Es soll nicht automatisch löschen, aber verhindern, dass entfernte Legacy-Begriffe wieder auftauchen.

**Snippet:**

```js
import { execFileSync } from 'node:child_process';

const forbiddenPatterns = [
  'createMobileSettings',
  'mobile-settings-panel',
  'mobile-settings-back-button',
  'mobile-settings-header',
  'loadDropdowns',
  'movies-dropdown-menu',
  'series-dropdown-menu',
  'publishers-dropdown-menu'
];

let failed = false;

for (const pattern of forbiddenPatterns) {
  try {
    const output = execFileSync('rg', [
      '-n',
      pattern,
      'src',
      '--glob',
      '!src/public/vendor/**'
    ], { encoding: 'utf8' });

    if (output.trim()) {
      failed = true;
      console.error(`Forbidden legacy pattern found: ${pattern}`);
      console.error(output);
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (failed) process.exit(1);
```

**Akzeptanzkriterien:**

- `npm run lint:size` ist grün.
- Dead-Code-Report ist grün.
- Falls ein Begriff bewusst weiter existiert, wird er aus der Forbidden-Liste entfernt und im Plan/Commit begründet.

## Checkpoints

### Checkpoint A: Dead Code entfernt

```bash
rg -n "createMobileSettings|mobile-settings-panel|mobile-settings-back-button|mobile-settings-header" src --glob '!src/public/vendor/**'
rg -n "loadDropdowns|dropdownMenus|dropdown-menu|movies-dropdown-menu|series-dropdown-menu|publishers-dropdown-menu" src --glob '!src/public/vendor/**'
npm test -- src/public/js/components/navbar/Navbar.test.js src/public/js/components/navbar/settingsDialog.test.js
```

### Checkpoint B: Tests migriert

```bash
rg --files -g '*test.js' src
rg --files -g '*test.js' tests
npm test
```

### Checkpoint C: Player refactored

```bash
npm test -- tests/player
npm run player:build
```

### Checkpoint D: Public frontend refactored

```bash
npm test -- tests/public
```

### Checkpoint E: Server refactored

```bash
npm test -- tests/server
```

### Checkpoint F: Gesamtprüfung

```bash
npm test
npm run player:build
npm run lint:size
git diff --check
```

## Risiken und Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
| --- | --- | --- |
| Dead Code wird zu aggressiv gelöscht | Feature bricht unbemerkt | Vor Löschung produktive `rg`-Belege, danach gezielte Tests |
| CSS-Cascade ändert sich durch Imports | Visuelle Regression | CSS-Blöcke in exakt gleicher Reihenfolge importieren |
| Test-Migration bricht relative Imports | Viele rote Tests | Domänenweise mit kleinen Test-Slices migrieren |
| WatchParty-Refactor verändert Sync-Timing | Hohe Regression | Socket/Service erst nach Test-Migration refactoren |
| Player-Refactor bricht Build-Asset | Player lädt nicht | Nach Player-Phase immer `npm run player:build` |
| Größenregel blockiert sinnvolle Entry-Dateien | Refactor wird unnötig künstlich | Entry-Dateien klein halten; Ausnahmen nur begründet |

## Reihenfolge für den implementierenden Agenten

1. Dead-Code-Audit ausführen und bestätigte Kandidaten entfernen.
2. Navbar-Tests nach Dead-Code-Entfernung laufen lassen.
3. Tests nach `tests/` migrieren und Vitest final umstellen.
4. Große Testdateien splitten.
5. `player.css` in Module splitten.
6. Weitere produktive CSS-Dateien splitten und Dead CSS entfernen.
7. `src/player/src/index.js` und `sourceSwitch.js` modularisieren.
8. Große Public-JS-Dateien modularisieren.
9. Große Server-JS-Dateien modularisieren.
10. Größen- und Dead-Code-Report-Scripts ergänzen.
11. Gesamtprüfung ausführen.
