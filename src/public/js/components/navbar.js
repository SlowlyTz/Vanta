import { MediaApi } from '../api/media.api.js';
import { createElement, $ } from '../utils/dom.js';

const NAV_LINKS = [
  { key: 'home', label: 'Startseite', href: '#/home' },
  { key: 'movies', label: 'Filme', href: '#/movies', type: 'Movie', menuId: 'movies-dropdown-menu' },
  { key: 'series', label: 'Serien', href: '#/series', type: 'Series', menuId: 'series-dropdown-menu' },
  { key: 'search', label: 'Suche', href: '#/search' }
];

export function Navbar({ onLogout, onChangePassword }) {
  const navList = createElement('ul', { className: 'navbar-nav' });
  let settingsOpen = false;
  let settingsView = 'root';
  let mobileSettingsView = 'nav';
  let mobileNavOpen = false;
  let lastFocusedElement = null;

  NAV_LINKS.forEach(link => {
    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      id: `nav-${link.key}`,
      onClick: () => setMobileNavOpen(false)
    }, link.label);

    if (!link.type) {
      navList.appendChild(createElement('li', { className: 'navbar-item' }, anchor));
      return;
    }

    const dropdownMenu = createElement('ul', {
      className: 'dropdown-menu',
      id: link.menuId,
      'aria-label': `${link.label} Genres`
    }, createElement('li', { className: 'dropdown-item-loading' }, 'Lade Genres...'));

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
  }, 'Abmelden');

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
  }, 'Abmelden');

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

  const passwordOption = createSettingsOption('Passwort', () => setSettingsView('password'));
  const themeOption = createSettingsOption('Thema', () => setSettingsView('theme'));
  const mobilePasswordOption = createSettingsOption('Passwort', () => setMobileSettingsView('password'));
  const mobileThemeOption = createSettingsOption('Thema', () => setMobileSettingsView('theme'));

  const rootPanel = createElement('div', {
    className: 'settings-panel settings-panel-root',
    dataset: { view: 'root' }
  },
    createElement('div', { className: 'settings-options' },
      passwordOption,
      themeOption
    ),
    createElement('div', { className: 'settings-options-spacer', 'aria-hidden': 'true' }),
    createElement('div', { className: 'settings-logout-section' }, logoutBtn)
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
    createElement('div', { className: 'settings-options' },
      mobilePasswordOption,
      mobileThemeOption
    ),
    createElement('div', { className: 'settings-options-spacer', 'aria-hidden': 'true' }),
    createElement('div', { className: 'settings-logout-section' }, mobileLogoutBtn)
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
    mobileThemePanel
  );
  mobileNavList.appendChild(mobileSettingsPanel);

  const settingsDialog = createElement('div', {
    className: 'settings-dialog',
    id: 'settings-dialog',
    role: 'dialog',
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
    themePanel
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
  };

  const update = ({ currentHash, user, scrolled }) => {
    element.classList.toggle('scrolled', !!scrolled);

    NAV_LINKS.forEach(link => {
      const linkEl = $(`#nav-${link.key}`, element);
      if (!linkEl) return;

      const isActive =
        (link.key === 'home' && currentHash === '#/home') ||
        (link.key === 'movies' && (currentHash === '#/movies' || currentHash.startsWith('#/genre/Movie'))) ||
        (link.key === 'series' && (currentHash === '#/series' || currentHash.startsWith('#/genre/Series'))) ||
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

  const setSettingsView = (view) => {
    settingsView = view;
    settingsTitle.textContent = settingsView === 'password'
      ? 'Passwort'
      : settingsView === 'theme'
        ? 'Thema'
        : 'Einstellungen';

    backButton.classList.toggle('invisible', settingsView === 'root');
    rootPanel.hidden = settingsView !== 'root';
    passwordPanel.hidden = settingsView !== 'password';
    themePanel.hidden = settingsView !== 'theme';

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
        : 'Einstellungen';

    mobileRootPanel.hidden = mobileSettingsView !== 'root';
    mobilePasswordPanel.hidden = mobileSettingsView !== 'password';
    mobileThemePanel.hidden = mobileSettingsView !== 'theme';

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
    window.requestAnimationFrame(() => passwordOption.focus());
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
  loadGenres();

  return { element, update };
}

function createSettingsOption(label, onClick) {
  return createElement('button', {
    className: 'settings-option',
    type: 'button',
    onClick
  },
    createElement('span', { className: 'settings-option-label' }, label),
    createChevronIcon()
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
