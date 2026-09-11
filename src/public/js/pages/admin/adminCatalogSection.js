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

// Accordion section for the catalogue mirror: shows what the sync last did and
// when it runs next, and lets the admin change the schedule or trigger a run.
export function createAdminCatalogSection() {
  let expanded = false;
  let loaded = false;
  let busy = false;
  let pollTimer = null;

  const setMessage = (text, type = '') => {
    messageEl.textContent = text || '';
    messageEl.className = `admin-settings-message ${type}`.trim();
  };

  const setBusy = (value) => {
    busy = value;
    [saveButton, updateButton, fullButton].forEach(button => { button.disabled = busy; });
  };

  const countsText = createElement('p', { className: 'admin-settings-webhook-status' }, 'Lädt…');
  const lastRunText = createElement('p', { className: 'admin-catalog-line' });
  const nextRunText = createElement('p', { className: 'admin-catalog-line' });
  const runningText = createElement('p', { className: 'admin-catalog-line admin-catalog-running', hidden: true }, 'Abgleich läuft…');

  const intervalInput = createElement('input', {
    className: 'admin-settings-input admin-catalog-input',
    type: 'number',
    min: '1',
    max: '60',
    step: '1',
    id: 'admin-catalog-interval',
    'aria-label': 'Intervall für neue Inhalte in Minuten'
  });

  const timeInput = createElement('input', {
    className: 'admin-settings-input admin-catalog-input',
    type: 'time',
    id: 'admin-catalog-full-time',
    'aria-label': 'Uhrzeit des Vollabgleichs'
  });

  const applyStatus = (status) => {
    const { movies = 0, series = 0, episodes = null } = status.library || {};
    const episodesText = episodes === null ? '' : `, ${episodes} Folgen`;
    countsText.textContent = `${movies} Filme, ${series} Serien${episodesText} in ${status.libraryCount} Bibliotheken.`;
    lastRunText.textContent = `Letzter Lauf: ${describeRun(status.lastRun)}`;
    nextRunText.textContent = `Nächste Läufe: neue Inhalte ${formatTime(status.plan?.nextUpdateAt)}, Vollabgleich ${formatTime(status.plan?.nextFullAt)}.`;
    runningText.hidden = !status.running;

    if (document.activeElement !== intervalInput) intervalInput.value = String(status.plan?.updateIntervalMinutes ?? '');
    if (document.activeElement !== timeInput) timeInput.value = status.plan?.fullSyncTime ?? '';

    if (status.running) startPolling();
    else stopPolling();
  };

  const load = async () => {
    try {
      applyStatus(await AdminSettingsApi.getCatalogStatus());
    } catch (error) {
      countsText.textContent = 'Status konnte nicht geladen werden.';
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

  const messageEl = createElement('div', { className: 'admin-settings-message' });

  const body = createElement('div', {
    className: 'admin-settings-section-body',
    id: 'admin-settings-catalog-body'
  },
    countsText,
    lastRunText,
    nextRunText,
    runningText,
    createElement('div', { className: 'admin-catalog-fields' },
      createElement('div', { className: 'admin-settings-field' },
        createElement('label', { className: 'admin-settings-label', for: 'admin-catalog-interval' },
          'Nach neuen Inhalten suchen alle … Minuten'
        ),
        createElement('div', { className: 'admin-settings-field-row' }, intervalInput)
      ),
      createElement('div', { className: 'admin-settings-field' },
        createElement('label', { className: 'admin-settings-label', for: 'admin-catalog-full-time' },
          'Vollabgleich täglich um'
        ),
        createElement('div', { className: 'admin-settings-field-row' }, timeInput)
      )
    ),
    createElement('div', { className: 'admin-settings-actions' },
      saveButton,
      updateButton,
      fullButton
    ),
    messageEl
  );

  const bodyWrap = createElement('div', { className: 'admin-settings-section-body-wrap' }, body);
  bodyWrap.toggleAttribute('inert', true);

  const toggle = createElement('button', {
    className: 'admin-settings-section-toggle',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'admin-settings-catalog-body',
    onClick: () => setExpanded(!expanded)
  },
    createElement('span', { className: 'admin-settings-section-heading' },
      createElement('h3', { className: 'admin-settings-section-title' }, 'Katalog'),
      createElement('p', { className: 'admin-settings-section-description' },
        'Spiegelt Filme und Serien aus Jellyfin, damit Startseite, Bibliothek und Suche ohne Wartezeit laden.'
      )
    ),
    createElement('span', { className: 'admin-settings-section-chevron' }, '⌄')
  );

  const element = createElement('section', { className: 'admin-settings-section' }, toggle, bodyWrap);

  function setExpanded(value) {
    expanded = value;
    toggle.setAttribute('aria-expanded', String(expanded));
    element.classList.toggle('expanded', expanded);
    bodyWrap.toggleAttribute('inert', !expanded);

    if (expanded && !loaded) {
      loaded = true;
      load();
    }
    if (!expanded) stopPolling();
  }

  return { element, setExpanded, destroy: stopPolling };
}
