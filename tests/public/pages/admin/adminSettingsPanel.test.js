import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdminSettingsPanel } from '../../../../src/public/js/pages/admin/adminSettingsPanel.js';
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

// Der Webhook-Abschnitt startet eingeklappt; erst das Aufklappen zeigt das
// Formular und holt den Status nach.
function expandWebhook(panel) {
  panel.element.querySelector('.admin-settings-section-toggle').click();
}

describe('createAdminSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminSettingsApi.getDiscordWebhook.mockResolvedValue(statusOf());
  });

  it('starts with the webhook section collapsed and fetches nothing until it is expanded', async () => {
    const panel = createAdminSettingsPanel();
    await flush();

    const section = panel.element.querySelector('.admin-settings-section');
    const bodyWrap = panel.element.querySelector('.admin-settings-section-body-wrap');
    const toggle = panel.element.querySelector('.admin-settings-section-toggle');

    // Eingeklappt wird ueber die Klasse gesteuert, nicht ueber [hidden] —
    // display: none liesse sich nicht animieren. `inert` haelt den Inhalt
    // solange aus Fokus und Screenreadern heraus.
    expect(section.classList.contains('expanded')).toBe(false);
    expect(bodyWrap.hasAttribute('inert')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    // Der Endpunkt haengt hinter requireFreshAdmin — wer den Webhook nicht
    // ansehen will, soll dafuer keinen Jellyfin-Roundtrip ausloesen.
    expect(AdminSettingsApi.getDiscordWebhook).not.toHaveBeenCalled();

    expandWebhook(panel);
    await flush();

    expect(section.classList.contains('expanded')).toBe(true);
    expect(bodyWrap.hasAttribute('inert')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(AdminSettingsApi.getDiscordWebhook).toHaveBeenCalledTimes(1);
  });

  it('collapses again on a second click without refetching', async () => {
    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
    await flush();

    const section = panel.element.querySelector('.admin-settings-section');

    expandWebhook(panel);
    expect(section.classList.contains('expanded')).toBe(false);
    expect(panel.element.querySelector('.admin-settings-section-body-wrap').hasAttribute('inert')).toBe(true);

    expandWebhook(panel);
    await flush();
    expect(section.classList.contains('expanded')).toBe(true);
    expect(AdminSettingsApi.getDiscordWebhook).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state as soon as the section is expanded, then the fetched status', async () => {
    let resolveGet;
    AdminSettingsApi.getDiscordWebhook.mockReturnValue(new Promise(resolve => { resolveGet = resolve; }));

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);

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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
    await flush();

    const urlInput = panel.element.querySelector('.admin-settings-input');
    expect(urlInput.value).toBe('');
  });

  it('Speichern sends the typed URL via PUT and reflects the returned masked status', async () => {
    AdminSettingsApi.updateDiscordWebhook.mockResolvedValue(
      statusOf({ configured: true, enabled: true, maskedUrl: 'https://discord.com/api/webhooks/abcd…wxyz' })
    );

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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
    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
    await flush();

    const testButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Testen');
    testButton.click();
    await flush();

    expect(AdminSettingsApi.testDiscordWebhook).toHaveBeenCalledWith(undefined);
  });

  it('shows the server-reported status/error when a test fails against a bad URL', async () => {
    AdminSettingsApi.testDiscordWebhook.mockResolvedValue({ ok: false, status: 404, error: 'Unknown Webhook' });

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
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

    const panel = createAdminSettingsPanel();
    expandWebhook(panel);
    await flush();

    const removeButton = Array.from(panel.element.querySelectorAll('.admin-settings-action'))
      .find(btn => btn.textContent === 'Entfernen');
    removeButton.click();
    await flush();

    expect(AdminSettingsApi.removeDiscordWebhook).toHaveBeenCalled();
    expect(panel.element.querySelector('.admin-settings-webhook-status').textContent).toBe('Kein Webhook konfiguriert.');
  });

  it('renders inline instead of as a modal — no backdrop, no open/close, no Escape handler', () => {
    const panel = createAdminSettingsPanel();
    document.body.appendChild(panel.element);
    expandWebhook(panel);

    expect(panel.element.className).toBe('admin-settings-panel');
    expect(panel.open).toBeUndefined();
    expect(panel.close).toBeUndefined();
    expect(panel.isOpen).toBeUndefined();

    // The panel used to bind a document-level keydown handler that the router
    // never unbound; Escape must simply do nothing now.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(panel.element.isConnected).toBe(true);
    expect(panel.element.querySelector('.admin-settings-section').classList.contains('expanded')).toBe(true);

    panel.element.remove();
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
