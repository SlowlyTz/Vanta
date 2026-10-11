import { createElement } from '../../utils/dom.js';
import { bindSheetSwipe } from '../../utils/sheetSwipe.js';
import { createBackIcon, createCloseIcon, createPasswordIcon, createProfileIcon, createLogoutIcon } from './icons.js';
import { createSettingsOption } from './settingsHelpers.js';
import { createSettingsProfile, createSettingsOverview } from './settingsOverview.js';
import { createPasswordForm } from './settingsPassword.js';
import { createAdminToolsPanel } from '../admin-tools/AdminToolsPanel.js';
import { createSettingsStatsLoader } from '../settings/settingsStats.js';
import { APP_VERSION, formatVersion } from '../../shared/version.js';
import { openModal } from '../../utils/modal.js';

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
    createElement('span', { className: 'settings-logout-label' }, 'Abmelden')
  );

  const { adminOption, loadAdminVisibility } = createAdminToolsPanel({
    onOpen: () => {
      setSettingsOpen(false);
      window.location.hash = '#/admin';
    }
  });

  const passwordOption = createSettingsOption('Passwort ändern', () => setSettingsView('password'), createPasswordIcon());
  const profileOption = createSettingsOption('Profil, Verlauf & Favoriten', () => {
    setSettingsOpen(false);
    window.location.hash = '#/profile';
  }, createProfileIcon());

  const settingsProfile = createSettingsProfile(settingsUsername);
  const sectionTitle = text => createElement('h3', { className: 'settings-section-title' }, text);

  // Only admins see the Verwaltung group; its one entry decides.
  const adminSection = createElement('section', { className: 'settings-section', hidden: true },
    sectionTitle('Verwaltung'),
    createElement('div', { className: 'settings-options' }, adminOption)
  );

  // Open requests and reports waiting for an admin, on the Admin-Tools row.
  const adminBadge = createElement('span', { className: 'settings-option-badge', hidden: true });
  adminOption.querySelector('.settings-option')?.insertBefore(adminBadge, adminOption.querySelector('.settings-chevron'));
  const setAdminBadge = count => {
    adminBadge.textContent = String(count);
    adminBadge.hidden = !count;
  };

  const refreshAdminVisibility = async () => {
    await loadAdminVisibility();
    adminSection.hidden = adminOption.hidden;
    settingsProfile.setAdmin(!adminOption.hidden);
  };

  const rootPanel = createElement('div', {
    className: 'settings-panel settings-panel-root',
    dataset: { view: 'root' }
  },
    settingsProfile.element,
    createElement('section', { className: 'settings-section' },
      sectionTitle('Bibliothek'),
      settingsOverview.element
    ),
    createElement('section', { className: 'settings-section' },
      sectionTitle('Konto'),
      createElement('div', { className: 'settings-options' }, profileOption, passwordOption)
    ),
    adminSection,
    createElement('div', { className: 'settings-logout-section' }, logoutBtn),
    createElement('p', { className: 'settings-version' }, `VANTA · ${formatVersion(APP_VERSION)}`)
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
    passwordPanel
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

  // Phones show the dialog as a sheet: swiping it down closes it.
  bindSheetSwipe({
    sheet: settingsDialog,
    getScrollElement: () => settingsDialog.querySelector('.settings-panel:not([hidden])'),
    onDismiss: () => setSettingsOpen(false)
  });

  let settingsOpen = false;
  let settingsView = 'root';
  let modal = null;
  const settingsStats = createSettingsStatsLoader(settingsOverview);

  const setSettingsView = (view) => {
    settingsView = view;
    settingsTitle.textContent = settingsView === 'password' ? 'Passwort ändern' : 'Einstellungen';

    backButton.classList.toggle('invisible', settingsView === 'root');
    settingsDialog.dataset.view = settingsView;
    rootPanel.hidden = settingsView !== 'root';
    passwordPanel.hidden = settingsView !== 'password';

    if (settingsView !== 'password') {
      setPasswordStatus('');
    }
  };

  // Focus, Escape, the backdrop click, the scroll lock and closing when the
  // page is left all come from openModal; the backdrop stays in the DOM and
  // is only shown and hidden.
  const setSettingsOpen = (open) => {
    if (settingsOpen === open) return;

    settingsOpen = open;
    settingsBackdrop.classList.toggle('open', settingsOpen);
    settingsBackdrop.setAttribute('aria-hidden', settingsOpen ? 'false' : 'true');

    if (!settingsOpen) {
      modal?.close();
      modal = null;
      setPasswordStatus('');
      setSettingsView('root');
      return;
    }

    setSettingsView('root');
    modal = openModal({
      overlay: settingsBackdrop,
      dialog: settingsDialog,
      initialFocus: settingsDialog,
      removeOnClose: false,
      closeOnBackdrop: false,
      onClose: () => setSettingsOpen(false)
    });
    settingsStats.load();
    refreshAdminVisibility();
  };

  setSettingsView('root');

  return {
    element: settingsBackdrop,
    settingsDialog,
    settingsUsername,
    settingsOverview,
    adminOption,
    loadAdminVisibility: refreshAdminVisibility,
    setUsername: settingsProfile.setName,
    setAdminBadge,
    setSettingsView,
    setSettingsOpen,
    isOpen: () => settingsOpen
  };
}
