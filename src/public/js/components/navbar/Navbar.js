import { createElement } from '../../utils/dom.js';
import { loadDropdowns } from './dropdownMenus.js';
import { createSettingsDialog } from './settingsDialog.js';
import { createDesktopNav } from './desktopNav.js';
import { createMobileDrawer } from './mobileDrawer.js';

const isDesktopNav = () => window.matchMedia('(min-width: 769px)').matches;

export function Navbar({ onLogout, onChangePassword }) {
  let mobileNavOpen = false;

  const desktopNav = createDesktopNav({ onNavigate: () => setMobileNavOpen(false) });
  const mobileDrawer = createMobileDrawer({
    onLogout,
    onChangePassword,
    onNavigate: () => setMobileNavOpen(false)
  });
  const settingsDialog = createSettingsDialog({ onLogout, onChangePassword });

  const mobileMenuButton = createElement('button', {
    className: 'mobile-menu-button',
    type: 'button',
    'aria-label': 'Navigation öffnen',
    'aria-expanded': 'false',
    'aria-controls': 'mobile-navigation settings-dialog',
    onClick: (event) => {
      event.stopPropagation();
      if (isDesktopNav()) {
        setMobileNavOpen(false);
        settingsDialog.setSettingsOpen(!settingsDialog.isOpen());
        return;
      }

      settingsDialog.setSettingsOpen(false);
      setMobileNavOpen(!mobileNavOpen);
    }
  },
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' })
  );

  const navbarActions = createElement('div', { className: 'navbar-actions' },
    desktopNav.navbarSearchForm,
    mobileMenuButton
  );

  const element = createElement('nav', { className: 'navbar' },
    desktopNav.brandLink,
    desktopNav.navList,
    navbarActions
  );

  document.body.appendChild(mobileDrawer.mobileNavBackdrop);
  document.body.appendChild(mobileDrawer.mobileNavList);
  document.body.appendChild(settingsDialog.element);

  const update = ({ currentHash, user, scrolled }) => {
    element.classList.toggle('scrolled', !!scrolled);
    if (!settingsDialog.isOpen() && !mobileNavOpen) {
      mobileMenuButton.setAttribute('aria-label', isDesktopNav() ? 'Einstellungen öffnen' : 'Navigation öffnen');
    }
    const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';
    settingsDialog.settingsUsername.textContent = displayName;
    mobileDrawer.mobileSettings.mobileSettingsUsername.textContent = displayName;

    desktopNav.updateActive(currentHash);
    mobileDrawer.updateActive(currentHash);
  };

  const setMobileNavOpen = (open) => {
    if (mobileNavOpen === open) return;

    mobileNavOpen = open;
    element.classList.toggle('mobile-open', mobileNavOpen);
    mobileMenuButton.setAttribute('aria-expanded', mobileNavOpen ? 'true' : 'false');
    mobileMenuButton.setAttribute('aria-label', mobileNavOpen ? 'Navigation schließen' : 'Navigation öffnen');
    document.documentElement.classList.toggle('mobile-nav-open', mobileNavOpen);
    document.body.classList.toggle('mobile-nav-open', mobileNavOpen);

    if (!mobileNavOpen) {
      mobileDrawer.resetToNav();
    }
  };

  document.addEventListener('click', (event) => {
    if (!mobileNavOpen || element.contains(event.target) || mobileDrawer.mobileNavList.contains(event.target)) return;
    setMobileNavOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (settingsDialog.isOpen()) settingsDialog.setSettingsOpen(false);
    if (mobileNavOpen) setMobileNavOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setMobileNavOpen(false);
  });

  loadDropdowns(element);
  settingsDialog.loadAdminVisibility?.();
  mobileDrawer.mobileSettings.loadAdminVisibility?.();

  return { element, update };
}
