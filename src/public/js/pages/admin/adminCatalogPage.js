import { createElement } from '../../utils/dom.js';
import { AdminSettingsApi } from '../../api/admin-settings.api.js';

const POLL_INTERVAL_MS = 2000;
const RUN_LABELS = { update: 'Neue Inhalte', full: 'Vollabgleich' };

const formatTime = (timestamp) => {
  if (!timestamp) return '–';
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

const formatDuration = (ms) => {
  if (!Number.isFinite(ms)) return '';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
};

export const describeRun = (run) => {
  if (!run) return 'Noch kein Lauf.';
  const label = RUN_LABELS[run.type] || run.type;
  if (run.error) return `${label} am ${formatTime(run.finishedAt)} fehlgeschlagen: ${run.error}`;

  const parts = [`+${run.added ?? 0} neu`, `${run.updated ?? 0} aktualisiert`];
  if (run.type === 'full') parts.push(`${run.removed ?? 0} entfernt`);
  const skipped = run.removalSkipped ? ` — Löschung übersprungen: ${run.removalSkipped}` : '';

  return `${label} am ${formatTime(run.finishedAt)} (${formatDuration(run.durationMs)}): ${parts.join(', ')}${skipped}`;
};

const group = (title, ...children) => createElement('section', { className: 'admin-settings-group' },
  title ? createElement('h3', { className: 'admin-settings-group-title' }, title) : null,
  createElement('div', { className: 'admin-settings-card' }, ...children)
);

const formatCount = value => (Number.isFinite(value) ? new Intl.NumberFormat('de-DE').format(value) : '–');

// Unterseite "Katalog" der Admin-Einstellungen: was der Spiegel enthält, was
// der Abgleich zuletzt getan hat und wann er wieder läuft, der Zeitplan und
// die Läufe zum Anstoßen. activate() lädt bei jedem Öffnen frisch,
// deactivate() beendet das Nachfragen während eines Laufs.
export function createAdminCatalogPage() {
  let busy = false;
  let pollTimer = null;
  let active = false;

  const setMessage = (text, type = '') => {
    messageEl.textContent = text || '';
    messageEl.className = `admin-settings-message ${type}`.trim();
  };

  const setBusy = (value) => {
    busy = value;
    [saveButton, updateButton, fullButton].forEach(button => { button.disabled = busy; });
  };

  const stat = label => {
    const value = createElement('strong', { className: 'admin-catalog-stat-value' }, '–');
    return { value, element: createElement('div', { className: 'admin-catalog-stat' }, value, createElement('span', {}, label)) };
  };
  const stats = { movies: stat('Filme'), series: stat('Serien'), episodes: stat('Folgen'), libraries: stat('Bibliotheken') };

  const infoRow = label => {
    const value = createElement('span', { className: 'admin-catalog-info-value' }, '–');
    return { value, element: createElement('div', { className: 'admin-catalog-info-row' }, createElement('span', {}, label), value) };
  };
  const lastRun = infoRow('Letzter Lauf');
  const nextUpdate = infoRow('Nächste Suche nach neuen Inhalten');
  const nextFull = infoRow('Nächster Vollabgleich');
  const runningText = createElement('p', { className: 'admin-catalog-line admin-catalog-running', hidden: true }, 'Abgleich läuft…');

  const intervalInput = createElement('input', {
    className: 'admin-settings-input admin-catalog-input',
    type: 'number',
    inputMode: 'numeric',
    min: '1',
    max: '60',
    step: '1',
    id: 'admin-catalog-interval'
  });

  const timeInput = createElement('input', {
    className: 'admin-settings-input admin-catalog-input',
    type: 'time',
    id: 'admin-catalog-full-time'
  });

  const applyStatus = (status) => {
    const { movies = 0, series = 0, episodes = null } = status.library || {};
    stats.movies.value.textContent = formatCount(movies);
    stats.series.value.textContent = formatCount(series);
    stats.episodes.value.textContent = episodes === null ? '–' : formatCount(episodes);
    stats.libraries.value.textContent = formatCount(status.libraryCount);
    lastRun.value.textContent = describeRun(status.lastRun);
    nextUpdate.value.textContent = formatTime(status.plan?.nextUpdateAt);
    nextFull.value.textContent = formatTime(status.plan?.nextFullAt);
    runningText.hidden = !status.running;

    if (document.activeElement !== intervalInput) intervalInput.value = String(status.plan?.updateIntervalMinutes ?? '');
    if (document.activeElement !== timeInput) timeInput.value = status.plan?.fullSyncTime ?? '';

    if (status.running && active) startPolling();
    else stopPolling();
  };

  const load = async () => {
    try {
      applyStatus(await AdminSettingsApi.getCatalogStatus());
    } catch (error) {
      lastRun.value.textContent = 'Status konnte nicht geladen werden.';
      setMessage(error.message || 'Status konnte nicht geladen werden.', 'error');
    }
  };

  // A triggered run answers 202 right away; keep asking until it has finished
  // so the admin sees the outcome without reloading.
  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(load, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  };

  const save = async () => {
    setMessage('');
    setBusy(true);
    try {
      const status = await AdminSettingsApi.updateCatalogSettings({
        updateIntervalMinutes: Number(intervalInput.value),
        fullSyncTime: timeInput.value
      });
      applyStatus(status);
      setMessage('Zeitplan gespeichert.', 'success');
    } catch (error) {
      setMessage(error.message || 'Zeitplan konnte nicht gespeichert werden.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const trigger = async (run, label) => {
    setMessage('');
    setBusy(true);
    try {
      const status = await run();
      applyStatus({ ...status, running: true });
      setMessage(status.started ? `${label} gestartet.` : 'Es läuft bereits ein Abgleich.', 'success');
    } catch (error) {
      setMessage(error.message || `${label} konnte nicht gestartet werden.`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveButton = createElement('button', {
    className: 'admin-settings-action admin-settings-action-primary',
    type: 'button',
    onClick: save
  }, 'Zeitplan speichern');

  const updateButton = createElement('button', {
    className: 'admin-settings-action admin-settings-action-secondary',
    type: 'button',
    onClick: () => trigger(() => AdminSettingsApi.runCatalogUpdate(), 'Suche nach neuen Inhalten')
  }, 'Neue Inhalte jetzt suchen');

  const fullButton = createElement('button', {
    className: 'admin-settings-action admin-settings-action-secondary',
    type: 'button',
    onClick: () => trigger(() => AdminSettingsApi.runCatalogFullSync(), 'Vollabgleich')
  }, 'Vollabgleich jetzt');

  const messageEl = createElement('div', { className: 'admin-settings-message', 'aria-live': 'polite' });

  const element = createElement('div', { className: 'admin-settings-page' },
    createElement('p', { className: 'admin-settings-page-intro' },
      'Spiegelt Filme und Serien aus Jellyfin, damit Startseite, Bibliothek und Suche ohne Wartezeit laden.'),
    createElement('div', { className: 'admin-catalog-stats' },
      stats.movies.element, stats.series.element, stats.episodes.element, stats.libraries.element),
    group('Abgleich', lastRun.element, nextUpdate.element, nextFull.element, runningText),
    group('Zeitplan',
      createElement('div', { className: 'admin-settings-row' },
        createElement('label', { className: 'admin-settings-row-text', for: 'admin-catalog-interval' },
          createElement('strong', {}, 'Neue Inhalte suchen'),
          createElement('span', {}, 'Alle … Minuten (1–60)')
        ),
        intervalInput
      ),
      createElement('div', { className: 'admin-settings-row' },
        createElement('label', { className: 'admin-settings-row-text', for: 'admin-catalog-full-time' },
          createElement('strong', {}, 'Vollabgleich'),
          createElement('span', {}, 'Täglich um, entfernt auch Gelöschtes')
        ),
        timeInput
      ),
      createElement('div', { className: 'admin-settings-actions' }, saveButton)
    ),
    group('Jetzt ausführen',
      createElement('div', { className: 'admin-settings-actions' }, updateButton, fullButton)
    ),
    messageEl
  );

  return {
    element,
    activate: () => {
      active = true;
      setMessage('');
      return load();
    },
    deactivate: () => {
      active = false;
      stopPolling();
    },
    destroy: () => {
      active = false;
      stopPolling();
    }
  };
}
