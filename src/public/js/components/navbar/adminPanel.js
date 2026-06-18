import { createElement } from '../../utils/dom.js';
import { createBackIcon, createChevronIcon, createChatIcon, createAdminIcon, createTranscodingIcon } from './icons.js';
import { createSettingsOption } from './settingsHelpers.js';
import { AuthApi } from '../../api/auth.api.js';
import { AdminApi } from '../../api/admin.api.js';
import { RequestsApi } from '../../api/requests.api.js';

export function createAdminPanel({ onOpen }) {
  const adminOption = createElement('div', { className: 'admin-option-container' },
    createSettingsOption('Admin tools', () => checkAdminAndOpenAdmin(), createAdminIcon())
  );

  const adminToolsGrid = createElement('div', { className: 'admin-tools-grid' });
  const adminRequestsList = createElement('div', { className: 'admin-requests-list' });
  const adminRequestsStatus = createElement('div', { className: 'admin-requests-status search-empty-state hidden' });
  const adminRequestsEmpty = createElement('div', { className: 'admin-requests-empty search-empty-state hidden' });

  const requestsCard = createElement('button', {
    className: 'admin-tool-card',
    type: 'button',
    onClick: () => {
      adminToolsGrid.parentElement.hidden = true;
      adminRequestsViewPanel.hidden = false;
      loadAdminRequests(adminRequestsList, adminRequestsStatus, adminRequestsEmpty);
    }
  },
    createElement('div', { className: 'admin-tool-card-icon' }, createChatIcon()),
    createElement('div', { className: 'admin-tool-card-info' },
      createElement('span', { className: 'admin-tool-card-title' }, 'Anfragen'),
      createElement('span', { className: 'admin-tool-card-desc' }, 'Offene Medienanfragen verwalten')
    ),
    createChevronIcon()
  );

  const transcodingCard = createElement('button', {
    className: 'admin-tool-card',
    type: 'button',
    onClick: () => {
      adminToolsGrid.parentElement.hidden = true;
      adminTranscodingViewPanel.hidden = false;
      loadTranscodingSettings();
    }
  },
    createElement('div', { className: 'admin-tool-card-icon' }, createTranscodingIcon()),
    createElement('div', { className: 'admin-tool-card-info' },
      createElement('span', { className: 'admin-tool-card-title' }, 'Transcoding'),
      createElement('span', { className: 'admin-tool-card-desc' }, 'Globale Wiedergabe-Kompatibilität')
    ),
    createChevronIcon()
  );

  adminToolsGrid.appendChild(requestsCard);
  adminToolsGrid.appendChild(transcodingCard);

  const adminToolsPanel = createElement('div', { className: 'admin-tools-panel' },
    createElement('h2', { className: 'admin-tools-title' }, 'Admin tools'),
    adminToolsGrid
  );

  const adminRequestsViewPanel = createElement('div', { className: 'admin-requests-view' },
    createElement('div', { className: 'admin-view-header' },
      createElement('button', {
        className: 'admin-view-back-button',
        type: 'button',
        onClick: () => {
          adminRequestsViewPanel.hidden = true;
          adminToolsPanel.hidden = false;
        }
      }, createBackIcon(), 'Anfragen'),
    ),
    adminRequestsStatus,
    adminRequestsEmpty,
    adminRequestsList
  );
  adminRequestsViewPanel.hidden = true;

  const transcodingSwitchInput = createElement('input', {
    type: 'checkbox',
    className: 'admin-transcoding-switch-input',
    id: 'admin-transcoding-switch'
  });
  const transcodingSwitch = createElement('label', {
    className: 'admin-transcoding-switch',
    htmlFor: 'admin-transcoding-switch'
  });
  const transcodingPanelStatus = createElement('div', { className: 'admin-transcoding-status' }, 'Lade Einstellung...');
  const transcodingHint = createElement('div', { className: 'admin-transcoding-hint' });
  const transcodingError = createElement('div', { className: 'admin-transcoding-error hidden' });

  const adminTranscodingViewPanel = createElement('div', { className: 'admin-transcoding-view' },
    createElement('div', { className: 'admin-view-header' },
      createElement('button', {
        className: 'admin-view-back-button',
        type: 'button',
        onClick: () => {
          adminTranscodingViewPanel.hidden = true;
          adminToolsPanel.hidden = false;
          transcodingError.classList.add('hidden');
        }
      }, createBackIcon(), 'Transcoding'),
    ),
    createElement('div', { className: 'admin-transcoding-content' },
      transcodingPanelStatus,
      createElement('div', { className: 'admin-transcoding-row' },
        createElement('span', { className: 'admin-transcoding-label' }, 'Transcoding für alle Inhalte'),
        createElement('div', { className: 'admin-transcoding-switch-wrapper' },
          transcodingSwitchInput,
          transcodingSwitch
        )
      ),
      transcodingHint,
      transcodingError
    )
  );
  adminTranscodingViewPanel.hidden = true;

  const adminPanel = createElement('div', {
    className: 'settings-panel settings-panel-admin',
    dataset: { view: 'admin' }
  },
    adminToolsPanel,
    adminRequestsViewPanel,
    adminTranscodingViewPanel
  );

  let currentForceHlsTranscoding = null;
  let isSavingTranscoding = false;

  const updateTranscodingUi = () => {
    const enabled = currentForceHlsTranscoding === true;
    transcodingSwitchInput.checked = enabled;
    transcodingSwitchInput.disabled = isSavingTranscoding || currentForceHlsTranscoding === null;
    transcodingPanelStatus.textContent = enabled ? 'Aktiviert' : 'Deaktiviert';
    transcodingHint.textContent = enabled
      ? 'Jellyfin liefert alle Streams als kompatibles HLS mit H.264/AAC.'
      : 'Jellyfin entscheidet pro Medium zwischen Direct Play, Direct Stream und Transcoding.';
  };

  const loadTranscodingSettings = async () => {
    currentForceHlsTranscoding = null;
    transcodingError.classList.add('hidden');
    updateTranscodingUi();

    try {
      const data = await AdminApi.getTranscoding();
      currentForceHlsTranscoding = data.forceHlsTranscoding === true;
      updateTranscodingUi();
    } catch (error) {
      console.error('Failed to load transcoding settings:', error);
      transcodingPanelStatus.textContent = 'Einstellung konnte nicht geladen werden.';
      transcodingError.textContent = error.message || 'Einstellung konnte nicht geladen werden.';
      transcodingError.classList.remove('hidden');
    }
  };

  transcodingSwitchInput.addEventListener('change', async () => {
    if (isSavingTranscoding || currentForceHlsTranscoding === null) return;

    const newValue = transcodingSwitchInput.checked;
    isSavingTranscoding = true;
    transcodingError.classList.add('hidden');
    updateTranscodingUi();

    try {
      const data = await AdminApi.updateTranscoding(newValue);
      currentForceHlsTranscoding = data.forceHlsTranscoding === true;
    } catch (error) {
      console.error('Failed to update transcoding settings:', error);
      transcodingError.textContent = error.message || 'Speichern fehlgeschlagen.';
      transcodingError.classList.remove('hidden');
    } finally {
      isSavingTranscoding = false;
      updateTranscodingUi();
    }
  });

  const checkAdminAndOpenAdmin = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      if (data?.user?.isAdmin !== true) return;
      onOpen?.();
    } catch (error) {
      console.error('Admin check failed:', error);
    }
  };

  const loadAdminVisibility = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      const isAdmin = data?.user?.isAdmin === true;
      adminOption.hidden = !isAdmin;
    } catch (error) {
      console.error('Could not load admin visibility:', error);
      adminOption.hidden = true;
    }
  };

  const loadAdminRequests = async (listContainer, statusElement, emptyElement) => {
    try {
      statusElement.textContent = 'Lade Anfragen...';
      statusElement.classList.remove('hidden');
      emptyElement.classList.add('hidden');
      listContainer.innerHTML = '';

      const requests = await RequestsApi.getOpenRequests();

      statusElement.classList.add('hidden');

      if (!requests || requests.length === 0) {
        emptyElement.textContent = 'Keine offenen Anfragen';
        emptyElement.classList.remove('hidden');
        return;
      }

      emptyElement.classList.add('hidden');

      requests.forEach(request => {
        const item = createElement('div', { className: 'request-item request-item-admin' },
          createElement('div', { className: 'request-item-info request-item-info-admin' },
            createElement('span', { className: 'request-item-title' }, request.title || `TMDB: ${request.tmdb_id}`),
            createElement('span', { className: 'request-item-detail' },
              `${request.username} — ${request.tmdb_type} — ${request.status}`)
          ),
          createElement('div', { className: 'request-item-right request-admin-actions' },
            createElement('button', {
              className: 'request-admin-action request-approve',
              type: 'button',
              title: 'Anfrage genehmigen',
              onClick: async (e) => {
                e.stopPropagation();
                try {
                  await RequestsApi.approveRequest(request.id);
                  loadAdminRequests(listContainer, statusElement, emptyElement);
                } catch (error) {
                  console.error('Failed to approve request:', error);
                }
              }
            }, 'Genehmigen'),
            createElement('button', {
              className: 'request-admin-action request-reject',
              type: 'button',
              title: 'Anfrage ablehnen',
              onClick: async (e) => {
                e.stopPropagation();
                try {
                  await RequestsApi.rejectRequest(request.id);
                  loadAdminRequests(listContainer, statusElement, emptyElement);
                } catch (error) {
                  console.error('Failed to reject request:', error);
                }
              }
            }, 'Ablehnen')
          )
        );
        listContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Failed to load admin requests:', error);
      statusElement.textContent = 'Fehler beim Laden der Anfragen';
      statusElement.classList.remove('hidden');
    }
  };

  return {
    adminPanel,
    adminOption,
    loadAdminVisibility,
    checkAdminAndOpenAdmin
  };
}
