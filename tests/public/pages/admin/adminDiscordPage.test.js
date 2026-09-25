import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdminDiscordPage } from '../../../../src/public/js/pages/admin/adminDiscordPage.js';
import { AdminSettingsApi } from '../../../../src/public/js/api/admin-settings.api.js';

vi.mock('../../../../src/public/js/api/admin-settings.api.js', () => ({
  AdminSettingsApi: {
    getDiscordWebhook: vi.fn(),
    updateDiscordWebhook: vi.fn(),
    removeDiscordWebhook: vi.fn(),
    testDiscordWebhook: vi.fn()
  }
}));

async function flush() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
}

function statusOf({ configured = false, enabled = false, maskedUrl = null } = {}) {
  return { configured, enabled, maskedUrl };
}

describe('createAdminDiscordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(statusOf());
  });

  it('fetches nothing until the page is opened, then loads the status once', async () => {
    const panel = createAdminDiscordPage();
    await flush();
    // Der Endpunkt haengt hinter requireFreshAdmin — wer die Seite nicht
    // oeffnet, soll dafuer keinen Jellyfin-Roundtrip ausloesen.
    expect(AdminSettingsApi.getDiscordWebhook).not.toHaveBeenCalled();

    panel.activate();
    await flush();
    expect(AdminSettingsApi.getDiscordWebhook).toHaveBeenCalledTimes(1);
  });

  it('offers Entfernen only while a webhook is stored', async () => {
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(statusOf({ configured: true, enabled: true, maskedUrl: 'x' }));
    const panel = createAdminDiscordPage();
    const removeGroup = () => Array.from(panel.element.querySelectorAll('.admin-settings-group'))
      .find(group => group.querySelector('.admin-settings-action-danger'));

    expect(removeGroup().hidden).toBe(true);
    panel.activate();
    await flush();
    expect(removeGroup().hidden).toBe(false);
  });

  it('shows a loading state as soon as the page opens, then the fetched status', async () => {
    let resolveGet;
    AdminSettingsApi.getDiscordWebhook.mockReturnValue(new Promise(resolve => { resolveGet = resolve; }));

    const panel = createAdminDiscordPage();
    panel.activate();

    expect(panel.element.querySelector('.admin-settings-webhook-status').textContent).toBe('Lädt…');

    resolveGet(statusOf({ configured: true, enabled: true, maskedUrl: 'https://discord.com/api/webhooks/1234…f9c2' }));
    await flush();

    expect(panel.element.querySelector('.admin-settings-webhook-status').textContent)
      .toBe('Webhook konfiguriert: https://discord.com/api/webhooks/1234…f9c2');
  });

  it('never pre-fills the URL field with the masked URL', async () => {
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: true, maskedUrl: 'https://discord.com/api/webhooks/1234…f9c2' })
    );

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const urlInput = panel.element.querySelector('.admin-settings-input');
    expect(urlInput.value).toBe('');
  });

  it('Speichern sends the typed URL via PUT and reflects the returned masked status', async () => {
    AdminSettingsApi.updateDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: true, maskedUrl: 'https://discord.com/api/webhooks/abcd…wxyz' })
    );

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const urlInput = panel.element.querySelector('.admin-settings-input');
    urlInput.value = 'https://discord.com/api/webhooks/abcd/wxyz';
    urlInput.dispatchEvent(new Event('input'));

    const saveButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Speichern');
    expect(saveButton.disabled).toBe(false);
    saveButton.click();
    await flush();

    expect(AdminSettingsApi.updateDiscordWebhook).toHaveBeenCalledWith({ url: 'https://discord.com/api/webhooks/abcd/wxyz' });
    expect(panel.element.querySelector('.admin-settings-webhook-status').textContent)
      .toBe('Webhook konfiguriert: https://discord.com/api/webhooks/abcd…wxyz');
    expect(urlInput.value).toBe('');
  });

  it('the save button stays disabled while the URL field is empty', async () => {
    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const saveButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Speichern');

    expect(saveButton.disabled).toBe(true);
  });

  it('flipping the enabled switch alone sends a PUT with only "enabled", never the URL', async () => {
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: false, maskedUrl: 'https://discord.com/api/webhooks/abcd…wxyz' })
    );
    AdminSettingsApi.updateDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: true, maskedUrl: 'https://discord.com/api/webhooks/abcd…wxyz' })
    );

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    // Leftover, unsaved text in the URL field must not leak into the toggle's PUT.
    const urlInput = panel.element.querySelector('.admin-settings-input');
    urlInput.value = 'https://discord.com/api/webhooks/should/not/be/sent';
    urlInput.dispatchEvent(new Event('input'));

    const toggle = panel.element.querySelector('.admin-settings-toggle-input');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await flush();

    expect(AdminSettingsApi.updateDiscordWebhook).toHaveBeenCalledWith({ enabled: true });
    expect(AdminSettingsApi.updateDiscordWebhook).toHaveBeenCalledTimes(1);
  });

  it('reverts the switch and shows an error if the toggle PUT fails', async () => {
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: false, maskedUrl: 'https://discord.com/api/webhooks/abcd…wxyz' })
    );
    const error = new Error('Schalter konnte nicht gespeichert werden');
    error.status = 500;
    AdminSettingsApi.updateDiscordWebhook.mockRejectedValue(error);

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const toggle = panel.element.querySelector('.admin-settings-toggle-input');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await flush();

    expect(toggle.checked).toBe(false);
    expect(panel.element.querySelector('.admin-settings-message').textContent)
      .toBe('Schalter konnte nicht gespeichert werden');
  });

  it('Testen with text in the URL field tests that URL (checking before saving)', async () => {
    AdminSettingsApi.testDiscordWebhook.mockResolvedValue({ ok: true });

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const urlInput = panel.element.querySelector('.admin-settings-input');
    urlInput.value = 'https://discord.com/api/webhooks/new/one';
    urlInput.dispatchEvent(new Event('input'));

    const testButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Testen');
    testButton.click();
    await flush();

    expect(AdminSettingsApi.testDiscordWebhook).toHaveBeenCalledWith('https://discord.com/api/webhooks/new/one');
    expect(panel.element.querySelector('.admin-settings-message').textContent).toBe('Testnachricht wurde gesendet.');
  });

  it('Testen with an empty URL field tests the saved webhook instead', async () => {
    AdminSettingsApi.testDiscordWebhook.mockResolvedValue({ ok: true });

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const testButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Testen');
    testButton.click();
    await flush();

    expect(AdminSettingsApi.testDiscordWebhook).toHaveBeenCalledWith(undefined);
  });

  it('shows the server-reported status/error when a test fails against a bad URL', async () => {
    AdminSettingsApi.testDiscordWebhook.mockResolvedValue({ ok: false, status: 404, error: 'Unknown Webhook' });

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const testButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Testen');
    testButton.click();
    await flush();

    expect(panel.element.querySelector('.admin-settings-message').textContent)
      .toContain('Unknown Webhook');
  });

  it('shows the raw server error message in plain text when saving is rejected with HTTP 400', async () => {
    const error = new Error('Nur Discord-Webhook-URLs sind erlaubt');
    error.status = 400;
    AdminSettingsApi.updateDiscordWebhook.mockRejectedValue(error);

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const urlInput = panel.element.querySelector('.admin-settings-input');
    urlInput.value = 'https://not-discord.example.com/hook';
    urlInput.dispatchEvent(new Event('input'));

    const saveButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Speichern');
    saveButton.click();
    await flush();

    const message = panel.element.querySelector('.admin-settings-message');
    expect(message.textContent).toBe('Nur Discord-Webhook-URLs sind erlaubt');
    expect(message.classList.contains('error')).toBe(true);
  });

  it('Entfernen calls DELETE and resets the status to unconfigured', async () => {
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: true, maskedUrl: 'https://discord.com/api/webhooks/abcd…wxyz' })
    );
    AdminSettingsApi.removeDiscordWebhook.mockResolvedValue(statusOf());

    const panel = createAdminDiscordPage();
    panel.activate();
    await flush();

    const removeButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Entfernen');
    removeButton.click();
    await flush();

    expect(AdminSettingsApi.removeDiscordWebhook).toHaveBeenCalled();
    expect(panel.element.querySelector('.admin-settings-webhook-status').textContent).toBe('Kein Webhook konfiguriert.');
  });
});
