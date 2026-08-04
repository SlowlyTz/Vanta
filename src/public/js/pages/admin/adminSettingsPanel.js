import { createElement } from '../../utils/dom.js';
import { createCloseIcon } from '../../components/navbar/icons.js';
import { AdminSettingsApi } from '../../api/admin-settings.api.js';

const WEBHOOK_PLACEHOLDER = 'https://discord.com/api/webhooks/…';

// Einstellungen-Panel der Admin-Seite. Für diese Ausbaustufe enthält es nur
// den Discord-Webhook-Abschnitt, ist aber als Liste von Sektionen aufgebaut
// (`sectionsContainer`), damit spätere Abschnitte einfach danebengesetzt
// werden können, ohne das Panel umzubauen.
export function createAdminSettingsPanel({ onClose }) {
  let isOpenState = false;
  let busy = false;
  let currentEnabled = false;

  const setMessage = (text, type = '') => {
    messageEl.textContent = text || '';
    messageEl.className = `admin-settings-message ${type}`.trim();
  };

  const setBusy = (value) => {
    busy = value;
    testButton.disabled = busy;
    removeButton.disabled = busy;
    enabledToggle.disabled = busy;
    updateSaveButtonState();
  };

  const updateSaveButtonState = () => {
    saveButton.disabled = busy || urlInput.value.trim().length === 0;
  };

  const applyStatus = ({ configured, enabled, maskedUrl }) => {
    currentEnabled = Boolean(enabled);
    enabledToggle.checked = currentEnabled;
    statusText.textContent = configured
      ? `Webhook konfiguriert: ${maskedUrl}`
      : 'Kein Webhook konfiguriert.';
  };

  const urlInput = createElement('input', {
    className: 'admin-settings-input',
    type: 'text',
    placeholder: WEBHOOK_PLACEHOLDER,
    'aria-label': 'Discord-Webhook-URL',
    onInput: () => updateSaveButtonState()
  });

  const enabledToggle = createElement('input', {
    className: 'admin-settings-toggle-input',
    type: 'checkbox',
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

  const messageEl = createElement('div', {
    className: 'admin-settings-message',
    'aria-live': 'polite'
  });

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

  const webhookSection = createElement('section', { className: 'admin-settings-section' },
    createElement('h3', { className: 'admin-settings-section-title' }, 'Discord-Webhook'),
    createElement('p', { className: 'admin-settings-section-description' },
      'Meldet jede neue Medienanfrage als Nachricht an einen Discord-Kanal.'
    ),
    statusText,
    createElement('div', { className: 'admin-settings-field' },
      createElement('label', { className: 'admin-settings-label', for: 'admin-settings-webhook-url' },
        'Neue Webhook-URL (leer lassen, um die bestehende URL zu behalten)'
      ),
      createElement('div', { className: 'admin-settings-field-row' },
        urlInput
      )
    ),
    createElement('div', { className: 'admin-settings-toggle-row' },
      enabledToggle,
      createElement('label', { className: 'admin-settings-label', for: 'admin-settings-webhook-enabled' },
        'Benachrichtigungen aktiv'
      )
    ),
    createElement('div', { className: 'admin-settings-actions' },
      testButton,
      saveButton,
      removeButton
    ),
    messageEl
  );

  const sectionsContainer = createElement('div', { className: 'admin-settings-sections' },
    webhookSection
  );

  const closeButton = createElement('button', {
    className: 'admin-settings-close-button',
    type: 'button',
    'aria-label': 'Einstellungen schließen',
    onClick: () => close()
  }, createCloseIcon());

  const panel = createElement('div', {
    className: 'admin-settings-panel',
    role: 'dialog',
    tabindex: '-1',
    'aria-modal': 'true',
    'aria-label': 'Admin-Einstellungen'
  },
    createElement('div', { className: 'admin-settings-header' },
      createElement('h2', { className: 'admin-settings-title' }, 'Admin-Einstellungen'),
      closeButton
    ),
    sectionsContainer
  );

  const element = createElement('div', {
    className: 'admin-settings-backdrop',
    'aria-hidden': 'true',
    onClick: (event) => {
      if (event.target === element) close();
    }
  }, panel);

  const handleKeydown = (event) => {
    if (event.key === 'Escape') close();
  };

  const load = async () => {
    setMessage('');
    statusText.textContent = 'Lädt…';

    try {
      const status = await AdminSettingsApi.getDiscordWebhook();
      applyStatus(status);
    } catch (error) {
      statusText.textContent = 'Status konnte nicht geladen werden.';
      setMessage(error.message || 'Status konnte nicht geladen werden.', 'error');
    }
  };

  const open = () => {
    if (isOpenState) return;
    isOpenState = true;
    urlInput.value = '';
    updateSaveButtonState();
    element.classList.add('open');
    element.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', handleKeydown);
    window.requestAnimationFrame(() => panel.focus());
    load();
  };

  const close = () => {
    if (!isOpenState) return;
    isOpenState = false;
    element.classList.remove('open');
    element.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleKeydown);
    onClose?.();
  };

  return {
    element,
    open,
    close,
    isOpen: () => isOpenState
  };
}
