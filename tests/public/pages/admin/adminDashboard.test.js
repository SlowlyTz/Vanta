import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/public/js/api/admin-dashboard.api.js', () => ({
  AdminDashboardApi: { get: vi.fn(), announce: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/admin-settings.api.js', () => ({
  AdminSettingsApi: { runCatalogUpdate: vi.fn(async () => ({})) }
}));
vi.mock('../../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));
vi.mock('../../../../src/public/js/components/confirmDialog.js', () => ({ confirmDialog: vi.fn(async () => true) }));

import { AdminDashboardApi } from '../../../../src/public/js/api/admin-dashboard.api.js';
import { AdminSettingsApi } from '../../../../src/public/js/api/admin-settings.api.js';
import { appStore } from '../../../../src/public/js/store/app.store.js';
import { confirmDialog } from '../../../../src/public/js/components/confirmDialog.js';
import { createAdminDashboard, formatBytes, formatDuration } from '../../../../src/public/js/pages/admin/adminDashboard.js';

const DATA = {
  server: { version: '1.02', uptimeSeconds: 7200, jellyfin: { ok: true, latencyMs: 12 } },
  streams: { available: true, direct: 1, transcoding: 1, list: [
    { user: 'Bob', title: 'Dark · Pilot', device: 'VANTA · Firefox', progress: 0.5, paused: false, transcoding: true, quality: '720p' },
    { user: 'Ann', title: 'Dune', device: 'VANTA · Safari', progress: null, paused: true, transcoding: false, quality: null }
  ] },
  work: { requests: 2, reports: 1 },
  catalog: { library: { movies: 393, series: 95, episodes: 1674 }, running: false, lastRun: { finishedAt: 1 }, nextUpdateAt: 2 },
  storage: { imageCache: { bytes: 512 * 1024 * 1024, maxBytes: 2048 * 1024 * 1024 }, databases: [{ name: 'requests.db', bytes: 2048 }] },
  parties: [{ id: 'p', title: 'Heat', owner: 'Ann', members: 3 }],
  activity: {
    requests: [{ title: 'Alien', username: 'Bob', status: 'pending', created_at: 1 }],
    reports: [],
    logins: { successes: 4, failures: 1, locks: 0, activeLocks: 0 },
    bans: []
  }
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('admin dashboard', () => {
  let scope;
  beforeEach(() => {
    vi.clearAllMocks();
    scope = { onLeave: vi.fn(), signal: undefined };
    AdminDashboardApi.get.mockResolvedValue(DATA);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('formats sizes and durations', () => {
    expect(formatBytes(512 * 1024 * 1024)).toBe('512 MB');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatDuration(7200)).toBe('2 Std.');
    expect(formatDuration(300)).toBe('5 Min.');
  });

  it('shows status, streams, work, the tools and activity', async () => {
    const onSelect = vi.fn();
    const dashboard = createAdminDashboard({ tools: [{ id: 'users', label: 'Nutzer' }], onSelect, scope });
    document.body.appendChild(dashboard.element);
    await flush();
    const text = dashboard.element.textContent;
    expect(text).toContain('Jellyfin erreichbar · 12 ms');
    expect(text).toContain('1 direkt · 1 transkodiert');
    expect(text).toContain('Dark · Pilot');
    expect(text).toContain('Transkodiert · 720p');
    expect(text).toContain('512 MB von 2 GB');
    expect(text).toContain('Heat');
    expect(text).toContain('Alien');
    expect(dashboard.element.querySelector('.admin-menu-card')).toBeTruthy();

    dashboard.element.querySelector('.admin-dash-card.has-work').click();
    expect(onSelect).toHaveBeenCalledWith('requests');
    dashboard.stop();
  });

  it('starts a catalogue update and sends a message to everyone', async () => {
    const dashboard = createAdminDashboard({ tools: [], scope });
    document.body.appendChild(dashboard.element);
    await flush();
    [...dashboard.element.querySelectorAll('.admin-dash-inline-button')].find(button => button.textContent === 'Jetzt aktualisieren').click();
    expect(AdminSettingsApi.runCatalogUpdate).toHaveBeenCalled();

    AdminDashboardApi.announce.mockResolvedValue({ recipients: 5, pushed: 3 });
    dashboard.element.querySelector('input.admin-dash-input').value = 'Wartung';
    dashboard.element.querySelector('textarea.admin-dash-input').value = 'Heute Abend.';
    dashboard.element.querySelector('.admin-dash-announce').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ message: 'Alle Nutzer bekommen „Wartung“: Heute Abend.' }));
    expect(AdminDashboardApi.announce).toHaveBeenCalledWith({ title: 'Wartung', body: 'Heute Abend.' });
    expect(appStore.showToast).toHaveBeenCalledWith('An 5 Nutzer gesendet, 3 davon per Push', 'success');
    dashboard.stop();
  });

  it('does not send when the question is declined', async () => {
    confirmDialog.mockResolvedValueOnce(false);
    const dashboard = createAdminDashboard({ tools: [], scope });
    document.body.appendChild(dashboard.element);
    dashboard.element.querySelector('input.admin-dash-input').value = 'Wartung';
    dashboard.element.querySelector('textarea.admin-dash-input').value = 'Heute Abend.';
    dashboard.element.querySelector('.admin-dash-announce').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(AdminDashboardApi.announce).not.toHaveBeenCalled();
    dashboard.stop();
  });

  it('keeps the focus on a card through a refresh', async () => {
    const dashboard = createAdminDashboard({ tools: [], scope });
    document.body.appendChild(dashboard.element);
    await flush();
    const before = dashboard.element.querySelector('[data-key="work"]');
    before.focus();
    await dashboard.refresh();
    const after = dashboard.element.querySelector('[data-key="work"]');
    expect(after).not.toBe(before);
    expect(document.activeElement).toBe(after);
    dashboard.stop();
  });

  it('does not poll while paused and refreshes on resume', async () => {
    vi.useFakeTimers();
    try {
      const dashboard = createAdminDashboard({ tools: [], scope });
      await vi.advanceTimersByTimeAsync(0);
      expect(AdminDashboardApi.get).toHaveBeenCalledTimes(1);
      dashboard.pause();
      await vi.advanceTimersByTimeAsync(25_000);
      expect(AdminDashboardApi.get).toHaveBeenCalledTimes(1);
      dashboard.resume();
      await vi.advanceTimersByTimeAsync(0);
      expect(AdminDashboardApi.get).toHaveBeenCalledTimes(2);
      dashboard.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
