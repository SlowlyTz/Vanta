import { createElement } from '../../utils/dom.js';
import { createBackIcon, createChevronIcon, createPasswordIcon, createPlaybackIcon, createLogoutIcon } from './icons.js';
import { createSettingsOption } from './settingsHelpers.js';
import { createSettingsProfile, createSettingsOverview } from './settingsOverview.js';
import { createPasswordForm } from './settingsPassword.js';
import { createPlaybackChoices } from './settingsPlayback.js';
import { createAdminPanel } from './adminPanel.js';

export function createMobileSettings({ onLogout, onChangePassword, onNav }) {
  const mobileSettingsUsername = createElement('span', { className: 'settings-profile-name' }, 'Username');
  const mobileSettingsOverview = createSettingsOverview();
  const { form: mobilePasswordForm, setStatus: setMobilePasswordStatus } = createPasswordForm(onChangePassword);
  const { buttons: mobilePlaybackButtons, syncPlaybackChoices: syncMobilePlaybackChoices } = createPlaybackChoices();

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

  const { adminPanel: mobileAdminPanel, adminOption: mobileAdminOption, loadAdminVisibility, checkAdminAndOpenAdmin } = createAdminPanel({
    onOpen: () => setMobileSettingsView('admin')
  });

  const mobilePasswordOption = createSettingsOption('Passwort', () => setMobileSettingsView('password'), createPasswordIcon());
  const mobilePlaybackOption = createSettingsOption('Wiedergabe', () => setMobileSettingsView('playback'), createPlaybackIcon());

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
        mobilePlaybackOption,
        mobileAdminOption
      ),
      createElement('div', { className: 'settings-logout-section' }, mobileLogoutBtn)
    )
  );

  const mobilePasswordPanel = createElement('div', { className: 'settings-panel settings-panel-password' }, mobilePasswordForm);
  const mobilePlaybackPanel = createElement('div', { className: 'settings-panel settings-panel-playback' },
    createElement('div', { className: 'settings-options' }, ...mobilePlaybackButtons)
  );

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
    mobilePlaybackPanel,
    mobileAdminPanel
  );

  let mobileSettingsView = 'nav';
  let mobileSettingsStatsLoaded = false;
  let mobileSettingsStatsLoading = false;

  const setMobileSettingsView = (view) => {
    mobileSettingsView = view;

    mobileSettingsPanel.hidden = mobileSettingsView === 'nav';

    mobileSettingsTitle.textContent = mobileSettingsView === 'password'
      ? 'Passwort'
      : mobileSettingsView === 'playback'
        ? 'Wiedergabe'
        : mobileSettingsView === 'admin'
          ? 'Admin tools'
          : '';

    mobileRootPanel.hidden = mobileSettingsView !== 'root';
    mobilePasswordPanel.hidden = mobileSettingsView !== 'password';
    mobilePlaybackPanel.hidden = mobileSettingsView !== 'playback';
    mobileAdminPanel.hidden = mobileSettingsView !== 'admin';

    if (mobileSettingsView === 'root') {
      loadMobileSettingsStats();
    }

    if (mobileSettingsView !== 'password') {
      setMobilePasswordStatus('');
    }

    if (mobileSettingsView === 'nav') {
      onNav?.();
    }
  };

  const setStatValue = (key, value) => {
    mobileSettingsOverview[key].textContent = value;
  };

  const setStatsLoading = () => {
    setStatValue('movies', '...');
    setStatValue('series', '...');
    setStatValue('episodes', '...');
  };

  const setStatsFallback = () => {
    setStatValue('movies', '-');
    setStatValue('series', '-');
    setStatValue('episodes', '-');
  };

  const getTotalItems = (result) => {
    if (!result || result.status !== 'fulfilled') return null;
    const value = result.value?.totalItems ?? result.value?.totalRecordCount;
    return Number.isFinite(value) ? value : null;
  };

  const formatCount = (value) => {
    return Number.isFinite(value) ? new Intl.NumberFormat('de-DE').format(value) : '-';
  };

  const loadMobileSettingsStats = async () => {
    if (mobileSettingsStatsLoaded || mobileSettingsStatsLoading) return;

    mobileSettingsStatsLoading = true;
    setStatsLoading();

    try {
      const { MediaApi } = await import('../../api/media.api.js');
      const [movies, series, episodes] = await Promise.allSettled([
        MediaApi.getLibrary('Movie', null, null, 1, 1),
        MediaApi.getLibrary('Series', null, null, 1, 1),
        MediaApi.getLibrary('Episode', null, null, 1, 1)
      ]);

      setStatValue('movies', formatCount(getTotalItems(movies)));
      setStatValue('series', formatCount(getTotalItems(series)));
      setStatValue('episodes', formatCount(getTotalItems(episodes)));
      mobileSettingsStatsLoaded = [movies, series, episodes].some(result => result.status === 'fulfilled');
    } catch (error) {
      console.error('Failed to load settings overview:', error);
      setStatsFallback();
    } finally {
      mobileSettingsStatsLoading = false;
    }
  };

  setMobileSettingsView('nav');
  syncMobilePlaybackChoices();

  return {
    element: mobileSettingsPanel,
    mobileSettingsUsername,
    mobileSettingsOverview,
    mobileAdminOption,
    loadAdminVisibility,
    setMobileSettingsView,
    syncMobilePlaybackChoices,
    isSettingsOpen: () => mobileSettingsView !== 'nav',
    checkAdminAndOpenAdmin
  };
}
