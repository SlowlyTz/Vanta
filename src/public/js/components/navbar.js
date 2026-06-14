import { MediaApi } from '../api/media.api.js';
import { PLAYBACK_MODE_OPTIONS, settingsStore } from '../store/settings.store.js';
import { createElement, $ } from '../utils/dom.js';

const NAV_LINKS = [
  { key: 'home', label: 'Startseite', href: '#/home' },
  { key: 'movies', label: 'Filme', href: '#/movies', type: 'Movie', menuId: 'movies-dropdown-menu' },
  { key: 'series', label: 'Serien', href: '#/series', type: 'Series', menuId: 'series-dropdown-menu' },
  { key: 'publishers', label: 'Publisher', href: '#/publishers', menuId: 'publishers-dropdown-menu', isStudios: true },
  { key: 'search', label: 'Suche', href: '#/search' }
];

export function Navbar({ onLogout, onChangePassword }) {
  const navList = createElement('ul', { className: 'navbar-nav' });
  let settingsOpen = false;
  let settingsView = 'root';
  let mobileSettingsView = 'nav';
  let mobileNavOpen = false;
  let lastFocusedElement = null;
  let settingsStatsLoaded = false;
  let settingsStatsLoading = false;

  NAV_LINKS.forEach(link => {
    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      id: `nav-${link.key}`,
      onClick: () => setMobileNavOpen(false)
    }, link.label);

    if (!link.type && !link.isStudios) {
      navList.appendChild(createElement('li', { className: 'navbar-item' }, anchor));
      return;
    }

    const dropdownMenu = createElement('ul', {
      className: 'dropdown-menu',
      id: link.menuId,
      'aria-label': link.isStudios ? 'Publisher' : `${link.label} Genres`
    }, createElement('li', { className: 'dropdown-item-loading' }, link.isStudios ? 'Lade Publisher...' : 'Lade Genres...'));

    navList.appendChild(
      createElement('li', { className: 'navbar-item dropdown' },
        anchor,
        dropdownMenu
      )
    );
  });

  const settingsButton = createElement('button', {
    className: 'settings-button',
    type: 'button',
    'aria-label': 'Einstellungen',
    'aria-expanded': 'false',
    'aria-controls': 'settings-dialog',
    onClick: (event) => {
      event.stopPropagation();
      setMobileNavOpen(false);
      setSettingsOpen(!settingsOpen);
    }
  });
  settingsButton.appendChild(createSettingsIcon());

  const mobileSettingsButton = createElement('button', {
    className: 'navbar-link navbar-mobile-settings',
    type: 'button',
    onClick: () => {
      setMobileSettingsView('root');
    }
  }, 'Einstellungen');

  const mobileNavList = createElement('ul', {
    className: 'mobile-drawer-nav',
    id: 'mobile-navigation',
    'aria-label': 'Mobile Navigation'
  });

  const mobileNavItems = [];

  NAV_LINKS.forEach(link => {
    const item = createElement('li', { className: 'navbar-item mobile-nav-link-item' },
        createElement('a', {
          className: 'navbar-link',
          href: link.href,
          onClick: () => setMobileNavOpen(false)
        }, link.label)
    );
    mobileNavItems.push(item);
    mobileNavList.appendChild(item);
  });

  const mobileSettingsItem = createElement('li', { className: 'navbar-item navbar-mobile-settings-item mobile-nav-link-item' }, mobileSettingsButton);
  mobileNavItems.push(mobileSettingsItem);
  mobileNavList.appendChild(mobileSettingsItem);

  const mobileMenuButton = createElement('button', {
    className: 'mobile-menu-button',
    type: 'button',
    'aria-label': 'Navigation oeffnen',
    'aria-expanded': 'false',
    'aria-controls': 'mobile-navigation',
    onClick: (event) => {
      event.stopPropagation();
      setSettingsOpen(false);
      setMobileNavOpen(!mobileNavOpen);
    }
  },
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' })
  );

  navList.id = 'primary-navigation';

  const currentPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Aktuelles Passwort'
  });

  const newPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Neues Passwort'
  });

  const confirmPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Neues Passwort bestätigen'
  });

  const settingsStatus = createElement('div', {
    className: 'settings-status',
    'aria-live': 'polite'
  });

  const submitBtn = createElement('button', {
    className: 'settings-submit',
    type: 'submit'
  }, 'Passwort speichern');

  const passwordForm = createElement('form', {
    className: 'settings-password-form',
    onSubmit: async (event) => {
      event.preventDefault();
      await handlePasswordSubmit({
        currentPasswordInput,
        newPasswordInput,
        confirmPasswordInput,
        statusElement: settingsStatus,
        submitButton: submitBtn
      });
    }
  },
    currentPasswordInput,
    newPasswordInput,
    confirmPasswordInput,
    submitBtn,
    settingsStatus
  );

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

  const mobileCurrentPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Aktuelles Passwort'
  });

  const mobileNewPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Neues Passwort'
  });

  const mobileConfirmPasswordInput = createElement('input', {
    className: 'settings-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Neues Passwort bestätigen'
  });

  const mobileSettingsStatus = createElement('div', {
    className: 'settings-status',
    'aria-live': 'polite'
  });

  const mobileSubmitBtn = createElement('button', {
    className: 'settings-submit',
    type: 'submit'
  }, 'Passwort speichern');

  const mobilePasswordForm = createElement('form', {
    className: 'settings-password-form',
    onSubmit: async (event) => {
      event.preventDefault();
      await handlePasswordSubmit({
        currentPasswordInput: mobileCurrentPasswordInput,
        newPasswordInput: mobileNewPasswordInput,
        confirmPasswordInput: mobileConfirmPasswordInput,
        statusElement: mobileSettingsStatus,
        submitButton: mobileSubmitBtn
      });
    }
  },
    mobileCurrentPasswordInput,
    mobileNewPasswordInput,
    mobileConfirmPasswordInput,
    mobileSubmitBtn,
    mobileSettingsStatus
  );

  const mobileLogoutBtn = createElement('button', {
    className: 'settings-logout-button',
    type: 'button',
    onClick: () => {
      setMobileNavOpen(false);
      onLogout?.();
    }
  },
    createLogoutIcon(),
    createElement('span', { className: 'settings-logout-label' }, 'Abmelden'),
    createChevronIcon()
  );

  const settingsUsername = createElement('span', { className: 'settings-profile-name' }, 'Username');
  const mobileSettingsUsername = createElement('span', { className: 'settings-profile-name' }, 'Username');
  const settingsOverview = createSettingsOverview();
  const mobileSettingsOverview = createSettingsOverview();
  const statViews = [settingsOverview, mobileSettingsOverview];
  const playbackChoiceButtons = [];

  const createPlaybackChoices = () => PLAYBACK_MODE_OPTIONS.map(option => {
    const button = createElement('button', {
      className: 'settings-choice',
      type: 'button',
      'aria-pressed': 'false',
      onClick: () => settingsStore.setPlaybackMode(option.value)
    },
      createElement('span', { className: 'settings-choice-label' }, option.label),
      createCheckIcon()
    );

    playbackChoiceButtons.push({ button, value: option.value });
    return button;
  });

  const syncPlaybackChoices = () => {
    const currentMode = settingsStore.getPlaybackMode();
    playbackChoiceButtons.forEach(({ button, value }) => {
      const isActive = value === currentMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const settingsTitle = createElement('h2', {
    className: 'settings-dialog-title',
    id: 'settings-dialog-title'
  }, 'Einstellungen');

  const backButton = createElement('button', {
    className: 'settings-header-button invisible',
    type: 'button',
    'aria-label': 'Zurueck',
    onClick: () => setSettingsView('root')
  }, createBackIcon());

  const closeButton = createElement('button', {
    className: 'settings-header-button',
    type: 'button',
    'aria-label': 'Einstellungen schliessen',
    onClick: () => setSettingsOpen(false)
  }, createCloseIcon());

  const passwordOption = createSettingsOption('Passwort', () => setSettingsView('password'), createPasswordIcon());
  const themeOption = createSettingsOption('Thema', () => setSettingsView('theme'), createPaletteIcon());
  const playbackOption = createSettingsOption('Wiedergabe', () => setSettingsView('playback'), createPlaybackIcon());
  const mobilePasswordOption = createSettingsOption('Passwort', () => setMobileSettingsView('password'), createPasswordIcon());
  const mobileThemeOption = createSettingsOption('Thema', () => setMobileSettingsView('theme'), createPaletteIcon());
  const mobilePlaybackOption = createSettingsOption('Wiedergabe', () => setMobileSettingsView('playback'), createPlaybackIcon());

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
        themeOption,
        playbackOption
      ),
      createElement('div', { className: 'settings-logout-section' }, logoutBtn)
    )
  );

  const passwordPanel = createElement('div', {
    className: 'settings-panel settings-panel-password',
    dataset: { view: 'password' }
  }, passwordForm);

  const themePanel = createElement('div', {
    className: 'settings-panel settings-panel-theme',
    dataset: { view: 'theme' }
  },
    createElement('button', {
      className: 'settings-choice active',
      type: 'button'
    },
      createElement('span', { className: 'settings-choice-label' }, 'Dunkel'),
      createCheckIcon()
    )
  );

  const playbackPanel = createElement('div', {
    className: 'settings-panel settings-panel-playback',
    dataset: { view: 'playback' }
  },
    createElement('div', { className: 'settings-options' }, createPlaybackChoices())
  );

  const mobileSettingsBackButton = createElement('button', {
    className: 'mobile-settings-back-button',
    type: 'button',
    'aria-label': 'Zurueck',
    onClick: () => {
      setMobileSettingsView(mobileSettingsView === 'root' ? 'nav' : 'root');
    }
  }, 'Zurück');

  const mobileSettingsTitle = createElement('h2', {
    className: 'settings-dialog-title'
  }, 'Einstellungen');

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
        mobileThemeOption,
        mobilePlaybackOption
      ),
      createElement('div', { className: 'settings-logout-section' }, mobileLogoutBtn)
    )
  );

  const mobilePasswordPanel = createElement('div', { className: 'settings-panel settings-panel-password' }, mobilePasswordForm);
  const mobileThemePanel = createElement('div', { className: 'settings-panel settings-panel-theme' },
    createElement('button', {
      className: 'settings-choice active',
      type: 'button'
    },
      createElement('span', { className: 'settings-choice-label' }, 'Dunkel'),
      createCheckIcon()
    )
  );
  const mobilePlaybackPanel = createElement('div', { className: 'settings-panel settings-panel-playback' },
    createElement('div', { className: 'settings-options' }, createPlaybackChoices())
  );

  const mobileSettingsPanel = createElement('li', {
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
    mobileThemePanel,
    mobilePlaybackPanel
  );
  mobileNavList.appendChild(mobileSettingsPanel);

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
    themePanel,
    playbackPanel
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

  const settingsWrapper = createElement('div', { className: 'settings-wrapper' },
    settingsButton
  );

  const mobileNavBackdrop = createElement('div', {
    className: 'mobile-nav-backdrop',
    'aria-hidden': 'true',
    onClick: () => setMobileNavOpen(false)
  });

  const brandLink = createElement('a', {
    className: 'navbar-brand',
    href: '#/home',
    onClick: () => setMobileNavOpen(false)
  }, 'Slowly Stream');

  const navbarActions = createElement('div', { className: 'navbar-actions' },
    mobileMenuButton,
    settingsWrapper
  );

  const element = createElement('nav', { className: 'navbar' },
    brandLink,
    navList,
    navbarActions
  );

  document.body.appendChild(mobileNavBackdrop);
  document.body.appendChild(mobileNavList);
  document.body.appendChild(settingsBackdrop);

  const loadGenres = () => {
    NAV_LINKS.filter(link => link.type).forEach(link => {
      const menu = $(`#${link.menuId}`, element);
      if (!menu) return;

      MediaApi.getGenres(link.type)
        .then(genres => renderGenreMenu(menu, genres, link.type))
        .catch(error => {
          console.error(`Failed to load ${link.type} genres:`, error);
          menu.innerHTML = '';
          menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Genres gefunden'));
        });
    });

    const studiosLink = NAV_LINKS.find(link => link.isStudios);
    if (studiosLink) {
      const menu = $(`#${studiosLink.menuId}`, element);
      if (menu) {
        MediaApi.getStudios()
          .then(studios => renderStudiosMenu(menu, studios))
          .catch(error => {
            console.error('Failed to load studios:', error);
            menu.innerHTML = '';
            menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
          });
      }
    }
  };

  const update = ({ currentHash, user, scrolled }) => {
    element.classList.toggle('scrolled', !!scrolled);

    const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';
    settingsUsername.textContent = displayName;
    mobileSettingsUsername.textContent = displayName;

    NAV_LINKS.forEach(link => {
      const linkEl = $(`#nav-${link.key}`, element);
      if (!linkEl) return;

      const isActive =
        (link.key === 'home' && currentHash === '#/home') ||
        (link.key === 'movies' && (currentHash === '#/movies' || currentHash.startsWith('#/genre/Movie'))) ||
        (link.key === 'series' && (currentHash === '#/series' || currentHash.startsWith('#/genre/Series'))) ||
        (link.key === 'publishers' && (currentHash === '#/publishers' || currentHash.startsWith('#/publisher/'))) ||
        (link.key === 'search' && currentHash === '#/search');

      linkEl.classList.toggle('active', isActive);
      if (isActive) {
        linkEl.setAttribute('aria-current', 'page');
      } else {
        linkEl.removeAttribute('aria-current');
      }
    });
  };

  const setStatus = (statusElement, message, type = '') => {
    statusElement.textContent = message;
    statusElement.className = `settings-status ${type}`.trim();
  };

  const handlePasswordSubmit = async ({
    currentPasswordInput,
    newPasswordInput,
    confirmPasswordInput,
    statusElement,
    submitButton
  }) => {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword) {
      setStatus(statusElement, 'Bitte ein neues Passwort eingeben.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus(statusElement, 'Die neuen Passwörter stimmen nicht überein.', 'error');
      return;
    }

    submitButton.disabled = true;
    setStatus(statusElement, 'Speichere...');

    try {
      await onChangePassword?.({ currentPassword, newPassword });
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      setStatus(statusElement, 'Passwort wurde geändert.', 'success');
    } catch (error) {
      setStatus(statusElement, error.message || 'Passwort konnte nicht geändert werden.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  };

  const setStatValue = (key, value) => {
    for (const view of statViews) {
      view[key].textContent = value;
    }
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

  const loadSettingsStats = async () => {
    if (settingsStatsLoaded || settingsStatsLoading) return;

    settingsStatsLoading = true;
    setStatsLoading();

    try {
      const [movies, series, episodes] = await Promise.allSettled([
        MediaApi.getLibrary('Movie', null, null, 1, 1),
        MediaApi.getLibrary('Series', null, null, 1, 1),
        MediaApi.getLibrary('Episode', null, null, 1, 1)
      ]);

      setStatValue('movies', formatCount(getTotalItems(movies)));
      setStatValue('series', formatCount(getTotalItems(series)));
      setStatValue('episodes', formatCount(getTotalItems(episodes)));
      settingsStatsLoaded = [movies, series, episodes].some(result => result.status === 'fulfilled');
    } catch (error) {
      console.error('Failed to load settings overview:', error);
      setStatsFallback();
    } finally {
      settingsStatsLoading = false;
    }
  };

  const setSettingsView = (view) => {
    settingsView = view;
    settingsTitle.textContent = settingsView === 'password'
      ? 'Passwort'
      : settingsView === 'theme'
        ? 'Thema'
        : settingsView === 'playback'
          ? 'Wiedergabe'
          : 'Einstellungen';

    backButton.classList.toggle('invisible', settingsView === 'root');
    settingsDialog.dataset.view = settingsView;
    rootPanel.hidden = settingsView !== 'root';
    passwordPanel.hidden = settingsView !== 'password';
    themePanel.hidden = settingsView !== 'theme';
    playbackPanel.hidden = settingsView !== 'playback';

    if (settingsView !== 'password') {
      setStatus(settingsStatus, '');
    }
  };

  const setMobileSettingsView = (view) => {
    mobileSettingsView = view;
    const inSettings = mobileSettingsView !== 'nav';

    mobileNavItems.forEach(item => {
      item.hidden = inSettings;
    });

    mobileSettingsPanel.hidden = !inSettings;
    mobileSettingsTitle.textContent = mobileSettingsView === 'password'
      ? 'Passwort'
      : mobileSettingsView === 'theme'
        ? 'Thema'
        : mobileSettingsView === 'playback'
          ? 'Wiedergabe'
          : 'Einstellungen';

    mobileRootPanel.hidden = mobileSettingsView !== 'root';
    mobilePasswordPanel.hidden = mobileSettingsView !== 'password';
    mobileThemePanel.hidden = mobileSettingsView !== 'theme';
    mobilePlaybackPanel.hidden = mobileSettingsView !== 'playback';

    if (mobileSettingsView === 'root') {
      loadSettingsStats();
    }

    if (mobileSettingsView !== 'password') {
      setStatus(mobileSettingsStatus, '');
    }
  };

  const setSettingsOpen = (open) => {
    if (settingsOpen === open) return;

    if (open) {
      lastFocusedElement = document.activeElement;
    }

    settingsOpen = open;
    settingsWrapper.classList.toggle('open', settingsOpen);
    settingsBackdrop.classList.toggle('open', settingsOpen);
    settingsButton.setAttribute('aria-expanded', settingsOpen ? 'true' : 'false');
    settingsBackdrop.setAttribute('aria-hidden', settingsOpen ? 'false' : 'true');
    document.body.classList.toggle('settings-modal-open', settingsOpen);

    if (!settingsOpen) {
      setStatus(settingsStatus, '');
      setSettingsView('root');
      lastFocusedElement?.focus?.();
      lastFocusedElement = null;
      return;
    }

    setSettingsView('root');
    loadSettingsStats();
    window.requestAnimationFrame(() => settingsDialog.focus());
  };

  const setMobileNavOpen = (open) => {
    if (mobileNavOpen === open) return;

    mobileNavOpen = open;
    element.classList.toggle('mobile-open', mobileNavOpen);
    mobileMenuButton.setAttribute('aria-expanded', mobileNavOpen ? 'true' : 'false');
    mobileMenuButton.setAttribute('aria-label', mobileNavOpen ? 'Navigation schliessen' : 'Navigation oeffnen');
    document.body.classList.toggle('mobile-nav-open', mobileNavOpen);

    if (!mobileNavOpen) {
      setMobileSettingsView('nav');
    }
  };

  document.addEventListener('click', (event) => {
    if (!mobileNavOpen || element.contains(event.target) || mobileNavList.contains(event.target)) return;
    setMobileNavOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (settingsOpen) setSettingsOpen(false);
    if (mobileNavOpen) setMobileNavOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setMobileNavOpen(false);
  });

  setSettingsView('root');
  setMobileSettingsView('nav');
  syncPlaybackChoices();
  settingsStore.subscribe(syncPlaybackChoices);
  loadGenres();

  return { element, update };
}

function createSettingsOption(label, onClick, icon) {
  return createElement('button', {
    className: 'settings-option',
    type: 'button',
    onClick
  },
    createElement('span', { className: 'settings-option-main' },
      icon,
      createElement('span', { className: 'settings-option-label' }, label)
    ),
    createChevronIcon()
  );
}

function createSettingsProfile(usernameElement) {
  return createElement('div', { className: 'settings-profile' },
    createElement('div', { className: 'settings-profile-avatar' }, createUserIcon()),
    createElement('div', { className: 'settings-profile-copy' },
      usernameElement,
      createElement('span', { className: 'settings-profile-subtitle' }, 'Premium Mitglied')
    )
  );
}

function createSettingsOverview() {
  const movies = createElement('span', { className: 'settings-stat-value' }, '-');
  const series = createElement('span', { className: 'settings-stat-value' }, '-');
  const episodes = createElement('span', { className: 'settings-stat-value' }, '-');

  return {
    movies,
    series,
    episodes,
    element: createElement('div', { className: 'settings-overview-grid' },
      createSettingsStat('Filme', movies, createMovieIcon()),
      createSettingsStat('Serien', series, createScreenIcon()),
      createSettingsStat('Folgen', episodes, createPlayOutlineIcon())
    )
  };
}

function createSettingsStat(label, valueElement, icon) {
  return createElement('div', { className: 'settings-stat' },
    icon,
    createElement('span', { className: 'settings-stat-label' }, label),
    valueElement
  );
}

function createIcon(className, svgMarkup) {
  const icon = createElement('span', {
    className,
    'aria-hidden': 'true'
  });
  icon.innerHTML = svgMarkup;
  return icon;
}

function createSettingsIcon() {
  return createIcon('settings-button-icon', `
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.28.37.66.62 1.08.7H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"></path>
    </svg>
  `);
}

function createUserIcon() {
  return createIcon('settings-profile-icon', `
    <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `);
}

function createMovieIcon() {
  return createIcon('settings-row-icon settings-accent-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6h16v14H4z"></path>
      <path d="M8 6 6 2"></path>
      <path d="M12 6 10 2"></path>
      <path d="M16 6 14 2"></path>
    </svg>
  `);
}

function createScreenIcon() {
  return createIcon('settings-row-icon settings-accent-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2"></rect>
      <path d="M8 20h8"></path>
      <path d="M12 16v4"></path>
    </svg>
  `);
}

function createPlayOutlineIcon() {
  return createIcon('settings-row-icon settings-accent-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 4.5v15l13-7.5z"></path>
    </svg>
  `);
}

function createPasswordIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2"></rect>
      <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    </svg>
  `);
}

function createPaletteIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22a10 10 0 1 1 10-10c0 1.9-1.3 3-3 3h-1.5a1.5 1.5 0 0 0-1.1 2.5l.3.3c1 1 1 2.6-.1 3.4-.9.5-2 .8-3.6.8z"></path>
      <circle cx="7.5" cy="10.5" r=".8"></circle>
      <circle cx="10.5" cy="7.5" r=".8"></circle>
      <circle cx="14.5" cy="7.5" r=".8"></circle>
      <circle cx="16.5" cy="11" r=".8"></circle>
    </svg>
  `);
}

function createPlaybackIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 4.5v15l13-7.5z"></path>
      <path d="M4 4v16"></path>
      <path d="M20 6v12"></path>
    </svg>
  `);
}

function createLogoutIcon() {
  return createIcon('settings-row-icon settings-logout-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <path d="M16 17l5-5-5-5"></path>
      <path d="M21 12H9"></path>
    </svg>
  `);
}

function createChevronIcon() {
  return createIcon('settings-chevron', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  `);
}

function createBackIcon() {
  return createIcon('settings-header-icon', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m15 18-6-6 6-6"></path>
    </svg>
  `);
}

function createCloseIcon() {
  return createIcon('settings-header-icon', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  `);
}

function createCheckIcon() {
  return createIcon('settings-check', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m20 6-11 11-5-5"></path>
    </svg>
  `);
}

function renderGenreMenu(menu, genres, type) {
  menu.innerHTML = '';

  if (!genres || genres.length === 0) {
    menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Genres gefunden'));
    return;
  }

  genres.slice(0, 12).forEach(genre => {
    menu.appendChild(
      createElement('li', { className: 'dropdown-list-item' },
        createElement('a', {
          className: 'dropdown-item',
          href: `#/genre/${type}/${encodeURIComponent(genre.Name)}`
        }, genre.Name)
      )
    );
  });
}

const FEATURED_STUDIOS = [
  { match: ['disney', 'walt disney', 'walt disney pictures', 'walt disney studios', 'walt disney animation studios'], label: 'Disney' },
  { match: ['20th century', '20th century studios', '20th century fox', 'twentieth century fox'], label: '20th Century Studios' },
  { match: ['warner bros', 'warner bros pictures', 'warner brothers', 'warner bros.'], label: 'Warner Bros' },
  { match: ['netflix'], label: 'Netflix' },
  { match: ['apple tv', 'apple tv+', 'appletv', 'apple'], label: 'Apple TV' },
  { match: ['amazon', 'prime video', 'amazon studios', 'amazon prime', 'amazon mgm studios'], label: 'Prime Video' },
  { match: ['hbo', 'hbo max', 'hbo films', 'home box office'], label: 'HBO' }
];

function matchFeaturedStudio(studioName) {
  const lower = studioName.toLowerCase();
  for (const entry of FEATURED_STUDIOS) {
    if (entry.match.some(pattern => lower === pattern || lower.startsWith(pattern))) {
      return entry;
    }
  }
  return null;
}

function renderStudiosMenu(menu, studios) {
  menu.innerHTML = '';

  const featured = [];
  const seen = new Set();

  for (const studio of studios) {
    const match = matchFeaturedStudio(studio.Name);
    if (match && !seen.has(match.label)) {
      seen.add(match.label);
      featured.push({ ...studio, displayLabel: match.label, order: FEATURED_STUDIOS.indexOf(match) });
    }
  }

  featured.sort((a, b) => a.order - b.order);

  if (featured.length === 0) {
    menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
    return;
  }

  featured.forEach(studio => {
    menu.appendChild(
      createElement('li', { className: 'dropdown-list-item' },
        createElement('a', {
          className: 'dropdown-item dropdown-item-publisher',
          href: `#/publisher/${encodeURIComponent(studio.Name)}`
        }, studio.displayLabel)
      )
    );
  });
}
