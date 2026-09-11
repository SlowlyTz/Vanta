import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/public/js/api/admin-settings.api.js', () => ({
  AdminSettingsApi: {
    getCatalogStatus: vi.fn(),
    updateCatalogSettings: vi.fn(),
    runCatalogUpdate: vi.fn(),
    runCatalogFullSync: vi.fn()
  }
}));

import { AdminSettingsApi } from '../../../../src/public/js/api/admin-settings.api.js';
import { createAdminCatalogSection, describeRun } from '../../../../src/public/js/pages/admin/adminCatalogSection.js';

const STATUS = {
  running: false,
  itemCount: 462,
  libraryCount: 6,
  library: { movies: 377, series: 85, episodes: 1444 },
  lastRun: { type: 'full', finishedAt: Date.UTC(2026, 8, 11, 1, 0), durationMs: 806, added: 3, updated: 1, removed: 2, removalSkipped: null, error: null },
  lastSuccess: null,
  plan: { started: true, updateIntervalMinutes: 10, fullSyncTime: '03:00', nextUpdateAt: Date.UTC(2026, 8, 11, 1, 10), nextFullAt: Date.UTC(2026, 8, 12, 1, 0) }
};

const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

const button = (element, text) => [...element.querySelectorAll('button')].find(b => b.textContent === text);

describe('describeRun', () => {
  it('summarises a successful full run with its counts', () => {
    expect(describeRun(STATUS.lastRun)).toMatch(/^Vollabgleich am .* \(806 ms\): \+3 neu, 1 aktualisiert, 2 entfernt$/);
  });

  it('omits the removal count for an update run and mentions a skipped removal', () => {
    expect(describeRun({ type: 'update', finishedAt: 1, durationMs: 1500, added: 0, updated: 0 })).toMatch(/Neue Inhalte am .* \(1\.5 s\): \+0 neu, 0 aktualisiert$/);
    expect(describeRun({ ...STATUS.lastRun, removalSkipped: 'Jellyfin lieferte keine Titel' })).toMatch(/Löschung übersprungen: Jellyfin lieferte keine Titel/);
  });

  it('reports a failed run and the absence of any run', () => {
    expect(describeRun({ type: 'update', finishedAt: 1, error: 'jellyfin down' })).toMatch(/fehlgeschlagen: jellyfin down/);
    expect(describeRun(null)).toBe('Noch kein Lauf.');
  });
});

describe('createAdminCatalogSection', () => {
  let section;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    AdminSettingsApi.getCatalogStatus.mockResolvedValue(STATUS);
    section = createAdminCatalogSection();
    document.body.appendChild(section.element);
  });

  afterEach(() => {
    section.destroy();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('starts collapsed and loads the status on first expansion only', async () => {
    expect(AdminSettingsApi.getCatalogStatus).not.toHaveBeenCalled();
    expect(section.element.querySelector('.admin-settings-section-body-wrap').hasAttribute('inert')).toBe(true);

    section.setExpanded(true);
    await flush();
    section.setExpanded(false);
    section.setExpanded(true);

    expect(AdminSettingsApi.getCatalogStatus).toHaveBeenCalledTimes(1);
    expect(section.element.textContent).toContain('377 Filme, 85 Serien, 1444 Folgen in 6 Bibliotheken');
    expect(section.element.textContent).toContain('Vollabgleich am');
    expect(section.element.querySelector('#admin-catalog-interval').value).toBe('10');
    expect(section.element.querySelector('#admin-catalog-full-time').value).toBe('03:00');
  });

  it('saves the schedule from the inputs and shows the confirmation', async () => {
    AdminSettingsApi.updateCatalogSettings.mockResolvedValue({
      ...STATUS, plan: { ...STATUS.plan, updateIntervalMinutes: 15, fullSyncTime: '04:30' }
    });
    section.setExpanded(true);
    await flush();

    section.element.querySelector('#admin-catalog-interval').value = '15';
    section.element.querySelector('#admin-catalog-full-time').value = '04:30';
    button(section.element, 'Zeitplan speichern').click();
    await flush();

    expect(AdminSettingsApi.updateCatalogSettings).toHaveBeenCalledWith({ updateIntervalMinutes: 15, fullSyncTime: '04:30' });
    expect(section.element.querySelector('.admin-settings-message').textContent).toBe('Zeitplan gespeichert.');
  });

  it('shows the server-side validation message on a rejected save', async () => {
    AdminSettingsApi.updateCatalogSettings.mockRejectedValue(new Error('Das Intervall muss zwischen 1 und 60 Minuten liegen'));
    section.setExpanded(true);
    await flush();

    button(section.element, 'Zeitplan speichern').click();
    await flush();

    const message = section.element.querySelector('.admin-settings-message');
    expect(message.textContent).toMatch(/zwischen 1 und 60/);
    expect(message.classList.contains('error')).toBe(true);
  });

  it('triggers a full sync and polls until the run has finished', async () => {
    AdminSettingsApi.runCatalogFullSync.mockResolvedValue({ started: true, ...STATUS, running: true });
    AdminSettingsApi.getCatalogStatus
      .mockResolvedValueOnce(STATUS)
      .mockResolvedValueOnce({ ...STATUS, running: true })
      .mockResolvedValue({ ...STATUS, running: false, library: { movies: 385, series: 85, episodes: 1444 } });
    section.setExpanded(true);
    await flush();

    button(section.element, 'Vollabgleich jetzt').click();
    await flush();

    expect(AdminSettingsApi.runCatalogFullSync).toHaveBeenCalledTimes(1);
    expect(section.element.querySelector('.admin-catalog-running').hidden).toBe(false);
    expect(section.element.querySelector('.admin-settings-message').textContent).toBe('Vollabgleich gestartet.');

    await vi.advanceTimersByTimeAsync(2000);
    expect(section.element.querySelector('.admin-catalog-running').hidden).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);
    expect(section.element.querySelector('.admin-catalog-running').hidden).toBe(true);
    expect(section.element.textContent).toContain('385 Filme');

    const calls = AdminSettingsApi.getCatalogStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(AdminSettingsApi.getCatalogStatus).toHaveBeenCalledTimes(calls);
  });

  it('tells the admin when a run is already in progress', async () => {
    AdminSettingsApi.runCatalogUpdate.mockResolvedValue({ started: false, ...STATUS, running: true });
    section.setExpanded(true);
    await flush();

    button(section.element, 'Neue Inhalte jetzt suchen').click();
    await flush();

    expect(section.element.querySelector('.admin-settings-message').textContent).toBe('Es läuft bereits ein Abgleich.');
  });

  it('does not overwrite an input the admin is editing while a poll lands', async () => {
    AdminSettingsApi.getCatalogStatus.mockResolvedValue({ ...STATUS, running: true });
    section.setExpanded(true);
    await flush();

    const interval = section.element.querySelector('#admin-catalog-interval');
    interval.focus();
    interval.value = '3';
    await vi.advanceTimersByTimeAsync(2000);

    expect(interval.value).toBe('3');
  });

  it('stops polling when collapsed or destroyed', async () => {
    AdminSettingsApi.getCatalogStatus.mockResolvedValue({ ...STATUS, running: true });
    section.setExpanded(true);
    await flush();
    section.setExpanded(false);

    const calls = AdminSettingsApi.getCatalogStatus.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(AdminSettingsApi.getCatalogStatus).toHaveBeenCalledTimes(calls);
  });
});
