import { createElement } from '../../utils/dom.js';
import { createBackIcon, createChevronIcon, createPasswordIcon, createLogoutIcon } from './icons.js';
import { createSettingsOption } from './settingsHelpers.js';
import { createSettingsProfile, createSettingsOverview } from './settingsOverview.js';
import { createPasswordForm } from './settingsPassword.js';
import { createAdminToolsPanel } from '../admin-tools/AdminToolsPanel.js';
import { createSettingsStatsLoader } from '../settings/settingsStats.js';

export function createMobileSettings({ onLogout, onChangePassword, onNav }) {
  const mobileSettingsUsername = createElement('span', { className: 'settings-profile-name' }, 'Username');
  const mobileSettingsOverview = createSettingsOverview();
  const { form: mobilePasswordForm, setStatus: setMobilePasswordStatus } = createPasswordForm(onChangePassword);

  const mobileLogoutBtn = createElement('button', {
    className: 'settings-logout-button',
    type: 'button',
    onClick: () => {
      setMobileSettingsView('nav');
      onLogout?.();
    }
  },
    createLogoutIcon(),
    createElement('span', { className: 'settings-logout-label' }, 'Abmelden'),
    createChevronIcon()
  );

  const { adminPanel: mobileAdminPanel, adminOption: mobileAdminOption, loadAdminVisibility, checkAdminAndOpenAdmin } = createAdminToolsPanel({
    onOpen: () => setMobileSettingsView('admin')
  });

  const mobilePasswordOption = createSettingsOption('Passwort', () => setMobileSettingsView('password'), createPasswordIcon());

  const mobileRootPanel = createElement('div', { className: 'settings-panel settings-panel-root' },
    createSettingsProfile(mobileSettingsUsername),
    createElement('section', { className: 'settings-section' },
      createElement('h3', { className: 'settings-section-title' }, 'Overview'),
      mobileSettingsOverview.element
    ),
    createElement('section', { className: 'settings-section' },
      createElement('h3', { className: 'settings-section-title' }, 'Einstellungen'),
      createElement('div', { className: 'settings-options' },
        mobilePasswordOption,
        mobileAdminOption
      ),
      createElement('div', { className: 'settings-logout-section' }, mobileLogoutBtn)
    )
  );

  const mobilePasswordPanel = createElement('div', { className: 'settings-panel settings-panel-password' }, mobilePasswordForm);

  const mobileSettingsBackButton = createElement('button', {
    className: 'mobile-settings-back-button',
    type: 'button',
    'aria-label': 'Zurück',
    onClick: () => {
      setMobileSettingsView(mobileSettingsView === 'root' ? 'nav' : 'root');
    }
  }, 'Zurück');

  const mobileSettingsTitle = createElement('h2', {
    className: 'settings-dialog-title'
  }, 'Einstellungen');

  const mobileSettingsPanel = createElement('div', {
    className: 'mobile-settings-panel',
    hidden: true
  },
    createElement('div', { className: 'settings-dialog-header mobile-settings-header' },
      mobileSettingsBackButton,
      mobileSettingsTitle,
      createElement('span', { className: 'settings-header-spacer', 'aria-hidden': 'true' })
    ),
    mobileRootPanel,
    mobilePasswordPanel,
    mobileAdminPanel
  );

  let mobileSettingsView = 'nav';
  const settingsStats = createSettingsStatsLoader(mobileSettingsOverview);

  const setMobileSettingsView = (view) => {
    mobileSettingsView = view;

    mobileSettingsPanel.hidden = mobileSettingsView === 'nav';

    mobileSettingsTitle.textContent = mobileSettingsView === 'password'
      ? 'Passwort'
      : mobileSettingsView === 'admin'
        ? 'Admin tools'
        : '';

    mobileRootPanel.hidden = mobileSettingsView !== 'root';
    mobilePasswordPanel.hidden = mobileSettingsView !== 'password';
    mobileAdminPanel.hidden = mobileSettingsView !== 'admin';

    if (mobileSettingsView === 'root') {
      settingsStats.load();
    }

    if (mobileSettingsView !== 'password') {
      setMobilePasswordStatus('');
    }

    if (mobileSettingsView === 'nav') {
      onNav?.();
    }
  };

  setMobileSettingsView('nav');

  return {
    element: mobileSettingsPanel,
    mobileSettingsUsername,
    mobileSettingsOverview,
    mobileAdminOption,
    loadAdminVisibility,
    setMobileSettingsView,
    isSettingsOpen: () => mobileSettingsView !== 'nav',
    checkAdminAndOpenAdmin
  };
}
