import { createElement } from '../../utils/dom.js';
import { createBackIcon, createCloseIcon, createChevronIcon, createPasswordIcon, createLogoutIcon } from './icons.js';
import { createSettingsOption } from './settingsHelpers.js';
import { createSettingsProfile, createSettingsOverview } from './settingsOverview.js';
import { createPasswordForm } from './settingsPassword.js';
import { createAdminToolsPanel } from '../admin-tools/AdminToolsPanel.js';
import { createSettingsStatsLoader } from '../settings/settingsStats.js';

export function createSettingsDialog({ onLogout, onChangePassword }) {
  const settingsUsername = createElement('span', { className: 'settings-profile-name' }, 'Username');
  const settingsOverview = createSettingsOverview();
  const { form: passwordForm, setStatus: setPasswordStatus } = createPasswordForm(onChangePassword);

  const logoutBtn = createElement('button', {
    className: 'settings-logout-button',
    type: 'button',
    onClick: () => {
      setSettingsOpen(false);
      onLogout?.();
    }
  },
    createLogoutIcon(),
    createElement('span', { className: 'settings-logout-label' }, 'Abmelden'),
    createChevronIcon()
  );

  const { adminPanel, adminOption, loadAdminVisibility, checkAdminAndOpenAdmin } = createAdminToolsPanel({
    onOpen: () => setSettingsView('admin')
  });

  const passwordOption = createSettingsOption('Passwort', () => setSettingsView('password'), createPasswordIcon());

  const rootPanel = createElement('div', {
    className: 'settings-panel settings-panel-root',
    dataset: { view: 'root' }
  },
    createSettingsProfile(settingsUsername),
    createElement('section', { className: 'settings-section' },
      createElement('h3', { className: 'settings-section-title' }, 'Overview'),
      settingsOverview.element
    ),
    createElement('section', { className: 'settings-section' },
      createElement('h3', { className: 'settings-section-title' }, 'Einstellungen'),
      createElement('div', { className: 'settings-options' },
        passwordOption,
        adminOption
      ),
      createElement('div', { className: 'settings-logout-section' }, logoutBtn)
    )
  );

  const passwordPanel = createElement('div', {
    className: 'settings-panel settings-panel-password',
    dataset: { view: 'password' }
  }, passwordForm);

  const settingsTitle = createElement('h2', {
    className: 'settings-dialog-title',
    id: 'settings-dialog-title'
  }, 'Einstellungen');

  const backButton = createElement('button', {
    className: 'settings-header-button invisible',
    type: 'button',
    'aria-label': 'Zurück',
    onClick: () => setSettingsView('root')
  }, createBackIcon());

  const closeButton = createElement('button', {
    className: 'settings-header-button',
    type: 'button',
    'aria-label': 'Einstellungen schließen',
    onClick: () => setSettingsOpen(false)
  }, createCloseIcon());

  const settingsDialog = createElement('div', {
    className: 'settings-dialog',
    id: 'settings-dialog',
    role: 'dialog',
    tabindex: '-1',
    'aria-modal': 'true',
    'aria-labelledby': 'settings-dialog-title'
  },
    createElement('div', { className: 'settings-dialog-header' },
      backButton,
      settingsTitle,
      closeButton
    ),
    rootPanel,
    passwordPanel,
    adminPanel
  );

  const settingsBackdrop = createElement('div', {
    className: 'settings-modal-backdrop',
    'aria-hidden': 'true',
    onClick: (event) => {
      if (event.target === settingsBackdrop) setSettingsOpen(false);
    }
  },
    settingsDialog
  );

  let settingsOpen = false;
  let settingsView = 'root';
  let lastFocusedElement = null;
  const settingsStats = createSettingsStatsLoader(settingsOverview);

  const setSettingsView = (view) => {
    settingsView = view;
    settingsTitle.textContent = settingsView === 'password'
      ? 'Passwort'
      : settingsView === 'admin'
        ? 'Admin tools'
        : 'Einstellungen';

    backButton.classList.toggle('invisible', settingsView === 'root');
    settingsDialog.dataset.view = settingsView;
    rootPanel.hidden = settingsView !== 'root';
    passwordPanel.hidden = settingsView !== 'password';
    adminPanel.hidden = settingsView !== 'admin';

    if (settingsView !== 'password') {
      setPasswordStatus('');
    }
  };

  const setSettingsOpen = (open) => {
    if (settingsOpen === open) return;

    if (open) {
      lastFocusedElement = document.activeElement;
    }

    settingsOpen = open;
    settingsBackdrop.classList.toggle('open', settingsOpen);
    settingsBackdrop.setAttribute('aria-hidden', settingsOpen ? 'false' : 'true');
    document.body.classList.toggle('settings-modal-open', settingsOpen);

    if (!settingsOpen) {
      setPasswordStatus('');
      setSettingsView('root');
      lastFocusedElement?.focus?.();
      lastFocusedElement = null;
      return;
    }

    setSettingsView('root');
    settingsStats.load();
    loadAdminVisibility();
    window.requestAnimationFrame(() => settingsDialog.focus());
  };

  setSettingsView('root');

  return {
    element: settingsBackdrop,
    settingsDialog,
    settingsUsername,
    settingsOverview,
    adminOption,
    loadAdminVisibility,
    setSettingsView,
    setSettingsOpen,
    isOpen: () => settingsOpen,
    checkAdminAndOpenAdmin
  };
}
