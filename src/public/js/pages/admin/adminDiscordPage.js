import { createElement } from '../../utils/dom.js';
import { AdminSettingsApi } from '../../api/admin-settings.api.js';

const WEBHOOK_PLACEHOLDER = 'https://discord.com/api/webhooks/…';

const group = (title, ...children) => createElement('section', { className: 'admin-settings-group' },
  title ? createElement('h3', { className: 'admin-settings-group-title' }, title) : null,
  createElement('div', { className: 'admin-settings-card' }, ...children)
);

// Unterseite "Discord-Webhook" der Admin-Einstellungen: Schalter und Status,
// neue URL mit Testen/Speichern, Entfernen. Der Status wird erst geholt, wenn
// die Seite geöffnet wird (activate): der Endpunkt hängt hinter
// requireFreshAdmin, das bei jedem Request Jellyfin befragt.
export function createAdminDiscordPage() {
  let busy = false;
  let currentEnabled = false;

  const setMessage = (text, type = '') => {
    messageEl.textContent = text || '';
    messageEl.className = `admin-settings-message ${type}`.trim();
  };

  const updateSaveButtonState = () => {
    saveButton.disabled = busy || urlInput.value.trim().length === 0;
  };

  const setBusy = (value) => {
    busy = value;
    testButton.disabled = busy;
    removeButton.disabled = busy;
    enabledToggle.disabled = busy;
    updateSaveButtonState();
  };

  const applyStatus = ({ configured, enabled, maskedUrl }) => {
    currentEnabled = Boolean(enabled);
    enabledToggle.checked = currentEnabled;
    statusText.textContent = configured
      ? `Webhook konfiguriert: ${maskedUrl}`
      : 'Kein Webhook konfiguriert.';
    statusText.classList.toggle('is-configured', Boolean(configured));
    removeGroup.hidden = !configured;
  };

  const urlInput = createElement('input', {
    className: 'admin-settings-input',
    type: 'url',
    inputMode: 'url',
    id: 'admin-settings-webhook-url',
    placeholder: WEBHOOK_PLACEHOLDER,
    autocomplete: 'off',
    onInput: () => updateSaveButtonState()
  });

  const enabledToggle = createElement('input', {
    className: 'admin-settings-toggle-input',
    type: 'checkbox',
    role: 'switch',
    id: 'admin-settings-webhook-enabled',
    onChange: async (event) => {
      const nextEnabled = event.target.checked;
      setBusy(true);
      setMessage('Speichere…', 'info');

      try {
        const status = await AdminSettingsApi.updateDiscordWebhook({ enabled: nextEnabled });
        applyStatus(status);
        setMessage(nextEnabled ? 'Webhook aktiviert.' : 'Webhook pausiert.', 'success');
      } catch (error) {
        event.target.checked = currentEnabled;
        setMessage(error.message || 'Schalter konnte nicht geändert werden.', 'error');
      } finally {
        setBusy(false);
      }
    }
  });

  const statusText = createElement('p', { className: 'admin-settings-webhook-status' }, 'Lädt…');
  const messageEl = createElement('div', { className: 'admin-settings-message', 'aria-live': 'polite' });

  const testButton = createElement('button', {
    className: 'admin-settings-action admin-settings-action-secondary',
    type: 'button',
    onClick: async () => {
      const typedUrl = urlInput.value.trim();
      setBusy(true);
      setMessage('Sende Testnachricht…', 'info');

      try {
        const result = await AdminSettingsApi.testDiscordWebhook(typedUrl || undefined);
        if (result?.ok) {
          setMessage('Testnachricht wurde gesendet.', 'success');
        } else {
          const reason = result?.error || (result?.status ? `HTTP ${result.status}` : 'unbekannter Fehler');
          setMessage(`Test fehlgeschlagen: ${reason}`, 'error');
        }
      } catch (error) {
        setMessage(error.message || 'Test fehlgeschlagen.', 'error');
      } finally {
        setBusy(false);
      }
    }
  }, 'Testen');

  const saveButton = createElement('button', {
    className: 'admin-settings-action admin-settings-action-primary',
    type: 'button',
    disabled: true,
    onClick: async () => {
      const newUrl = urlInput.value.trim();
      if (!newUrl) return;

      setBusy(true);
      setMessage('Speichere…', 'info');

      try {
        const status = await AdminSettingsApi.updateDiscordWebhook({ url: newUrl });
        applyStatus(status);
        urlInput.value = '';
        setMessage('Webhook gespeichert.', 'success');
      } catch (error) {
        setMessage(error.message || 'Webhook konnte nicht gespeichert werden.', 'error');
      } finally {
        setBusy(false);
        updateSaveButtonState();
      }
    }
  }, 'Speichern');

  const removeButton = createElement('button', {
    className: 'admin-settings-action admin-settings-action-danger',
    type: 'button',
    onClick: async () => {
      setBusy(true);
      setMessage('Entferne Webhook…', 'info');

      try {
        const status = await AdminSettingsApi.removeDiscordWebhook();
        applyStatus(status);
        urlInput.value = '';
        setMessage('Webhook entfernt.', 'success');
      } catch (error) {
        setMessage(error.message || 'Webhook konnte nicht entfernt werden.', 'error');
      } finally {
        setBusy(false);
        updateSaveButtonState();
      }
    }
  }, 'Entfernen');

  const removeRow = createElement('div', { className: 'admin-settings-row' },
    createElement('span', { className: 'admin-settings-row-text' },
      createElement('strong', {}, 'Webhook entfernen'),
      createElement('span', {}, 'Löscht die gespeicherte URL; es gehen keine Nachrichten mehr raus.')
    ),
    removeButton
  );
  // Only shown while a webhook is stored.
  const removeGroup = createElement('section', { className: 'admin-settings-group', hidden: true },
    createElement('div', { className: 'admin-settings-card admin-settings-card-danger' }, removeRow)
  );

  const element = createElement('div', { className: 'admin-settings-page' },
    createElement('p', { className: 'admin-settings-page-intro' },
      'Meldet jede neue Medienanfrage als Nachricht an einen Discord-Kanal.'),
    group('Status',
      createElement('div', { className: 'admin-settings-row' },
        createElement('label', { className: 'admin-settings-row-text', for: 'admin-settings-webhook-enabled' },
          createElement('strong', {}, 'Benachrichtigungen aktiv'),
          createElement('span', {}, 'Pausieren behält die URL.')
        ),
        createElement('span', { className: 'admin-switch' },
          enabledToggle,
          createElement('span', { className: 'admin-switch-track', 'aria-hidden': 'true' })
        )
      ),
      statusText
    ),
    group('Webhook-URL',
      createElement('div', { className: 'admin-settings-field' },
        createElement('label', { className: 'admin-settings-label', for: 'admin-settings-webhook-url' },
          'Neue URL'),
        urlInput,
        createElement('span', { className: 'admin-settings-hint' },
          'Leer lassen, um die gespeicherte URL zu behalten. „Testen“ prüft die eingetippte URL, sonst die gespeicherte.')
      ),
      createElement('div', { className: 'admin-settings-actions' }, testButton, saveButton)
    ),
    removeGroup,
    messageEl
  );

  const activate = async () => {
    setMessage('');
    statusText.textContent = 'Lädt…';

    try {
      applyStatus(await AdminSettingsApi.getDiscordWebhook());
    } catch (error) {
      statusText.textContent = 'Status konnte nicht geladen werden.';
      setMessage(error.message || 'Status konnte nicht geladen werden.', 'error');
    }
  };

  return { element, activate };
}
