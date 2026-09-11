import { createElement } from '../../utils/dom.js';
import { createSettingsGearIcon } from '../../components/navbar/icons.js';
import { AdminSettingsApi } from '../../api/admin-settings.api.js';

const WEBHOOK_PLACEHOLDER = 'https://discord.com/api/webhooks/…';

// Menu entry of this area. The icon is a factory, not a node: the menu builds
// its own card per tool and a single shared node could only ever live in one
// of them.
export const ADMIN_SETTINGS_TOOL = {
  id: 'settings',
  label: 'Einstellungen',
  description: 'Discord-Benachrichtigungen für neue Medienanfragen einrichten',
  icon: () => createSettingsGearIcon()
};

// Einstellungen-Bereich der Admin-Seite (#/admin/settings). Für diese
// Ausbaustufe enthält er nur den Discord-Webhook-Abschnitt, ist aber als Liste
// von Sektionen aufgebaut (`sectionsContainer`), damit spätere Abschnitte
// einfach danebengesetzt werden können, ohne den Bereich umzubauen.
export function createAdminSettingsPanel() {
  let busy = false;
  let currentEnabled = false;
  let webhookLoaded = false;
  let webhookExpanded = false;

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

  const webhookBody = createElement('div', {
    className: 'admin-settings-section-body',
    id: 'admin-settings-webhook-body'
  },
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

  // Der Rumpf steckt in einem Wrapper, dessen grid-template-rows von 0fr auf
  // 1fr animiert wird. `hidden` (display: none) liesse sich nicht animieren,
  // und eine feste max-height wuerde bei wachsendem Inhalt (Fehlermeldungen,
  // Statuszeile) springen. Im eingeklappten Zustand haelt `inert` den Inhalt
  // aus Tastatur-Fokus und Screenreadern heraus, weil er weiterhin im
  // Layout-Baum haengt.
  const webhookBodyWrap = createElement('div', {
    className: 'admin-settings-section-body-wrap'
  }, webhookBody);
  webhookBodyWrap.toggleAttribute('inert', true);

  const webhookChevron = createElement('span', { className: 'admin-settings-section-chevron' }, '⌄');

  const webhookToggle = createElement('button', {
    className: 'admin-settings-section-toggle',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'admin-settings-webhook-body',
    onClick: () => setWebhookExpanded(!webhookExpanded)
  },
    createElement('span', { className: 'admin-settings-section-heading' },
      createElement('h3', { className: 'admin-settings-section-title' }, 'Discord-Webhook'),
      createElement('p', { className: 'admin-settings-section-description' },
        'Meldet jede neue Medienanfrage als Nachricht an einen Discord-Kanal.'
      )
    ),
    webhookChevron
  );

  const webhookSection = createElement('section', { className: 'admin-settings-section' },
    webhookToggle,
    webhookBodyWrap
  );

  const sectionsContainer = createElement('div', { className: 'admin-settings-sections' },
    webhookSection
  );

  const element = createElement('section', {
    className: 'admin-settings-panel',
    'aria-label': 'Admin-Einstellungen'
  }, sectionsContainer);

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

  // Der Status wird erst beim erstmaligen Aufklappen geholt, nicht schon beim
  // Betreten des Bereichs. Der Endpunkt hängt hinter requireFreshAdmin, das bei
  // jedem Request Jellyfin befragt — wer den Webhook gar nicht ansehen will,
  // soll dafür keinen Roundtrip bezahlen.
  function setWebhookExpanded(expanded) {
    webhookExpanded = expanded;
    webhookToggle.setAttribute('aria-expanded', String(expanded));
    webhookSection.classList.toggle('expanded', expanded);
    webhookBodyWrap.toggleAttribute('inert', !expanded);

    if (expanded && !webhookLoaded) {
      webhookLoaded = true;
      load();
    }
  }

  return {
    ...ADMIN_SETTINGS_TOOL,
    element
  };
}
