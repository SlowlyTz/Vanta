import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAdminSettingsPanel } from '../../../../src/public/js/pages/admin/adminSettingsPanel.js';
import { AdminSettingsApi } from '../../../../src/public/js/api/admin-settings.api.js';

vi.mock('../../../../src/public/js/api/admin-settings.api.js', () => ({
  AdminSettingsApi: {
    getDiscordWebhook: vi.fn(),
    updateDiscordWebhook: vi.fn(),
    removeDiscordWebhook: vi.fn(),
    testDiscordWebhook: vi.fn(),
    getCatalogStatus: vi.fn()
  }
}));

async function flush() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

const layer = () => document.querySelector('.admin-layer');

describe('createAdminSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue({ configured: false, enabled: false, maskedUrl: null });
    AdminSettingsApi.getCatalogStatus.mockResolvedValue({ library: {}, plan: {}, running: false });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
    vi.useRealTimers();
  });

  it('lists the settings pages like a phone settings screen and loads nothing up front', () => {
    const panel = createAdminSettingsPanel();

    const titles = Array.from(panel.element.querySelectorAll('.admin-settings-list-title')).map(el => el.textContent);
    expect(titles).toEqual(['Discord-Webhook', 'Katalog']);
    expect(AdminSettingsApi.getDiscordWebhook).not.toHaveBeenCalled();
    expect(AdminSettingsApi.getCatalogStatus).not.toHaveBeenCalled();
  });

  it('opens a page as a layer sliding in from the right, and loads only that page', async () => {
    const panel = createAdminSettingsPanel();
    panel.element.querySelector('[data-page="discord"]').click();
    await flush();

    expect(layer()).toBeTruthy();
    expect(layer().querySelector('.admin-layer-title').textContent).toBe('Discord-Webhook');
    expect(layer().querySelector('.admin-layer-back').textContent).toContain('Zurück');
    expect(AdminSettingsApi.getDiscordWebhook).toHaveBeenCalledTimes(1);
    expect(AdminSettingsApi.getCatalogStatus).not.toHaveBeenCalled();
    expect(document.documentElement.classList.contains('admin-layer-open')).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    expect(layer().classList.contains('is-open')).toBe(true);
  });

  it('slides the layer back out on Zurück, then removes it', async () => {
    const panel = createAdminSettingsPanel();
    panel.element.querySelector('[data-page="catalog"]').click();
    await vi.advanceTimersByTimeAsync(50);

    layer().querySelector('.admin-layer-back').click();
    expect(layer().classList.contains('is-open')).toBe(false);
    expect(layer()).toBeTruthy();

    await vi.advanceTimersByTimeAsync(500);
    expect(layer()).toBeNull();
    expect(document.documentElement.classList.contains('admin-layer-open')).toBe(false);
  });

  it('closes on Escape as well, and opens only one layer at a time', async () => {
    const panel = createAdminSettingsPanel();
    panel.element.querySelector('[data-page="discord"]').click();
    panel.element.querySelector('[data-page="catalog"]').click();
    expect(document.querySelectorAll('.admin-layer')).toHaveLength(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(500);
    expect(layer()).toBeNull();
  });

  it('removes an open layer at once when the route changes (destroy)', () => {
    const panel = createAdminSettingsPanel();
    panel.element.querySelector('[data-page="discord"]').click();

    panel.destroy();
    expect(layer()).toBeNull();
  });

  it('exposes itself to the admin menu as the Einstellungen area', () => {
    const panel = createAdminSettingsPanel();

    expect(panel.id).toBe('settings');
    expect(panel.label).toBe('Einstellungen');
    expect(panel.description).toBeTruthy();
    expect(typeof panel.icon).toBe('function');
    expect(panel.icon()).not.toBe(panel.icon());
  });
});
