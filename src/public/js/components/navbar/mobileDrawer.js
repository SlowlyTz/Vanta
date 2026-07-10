import { createElement } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';
import { createNavIcon, createCloseIcon } from './icons.js';
import { createMobileSettings } from './mobileSettings.js';
import { isNavLinkActive } from './activeNav.js';

export function createMobileDrawer({ onLogout, onChangePassword, onNavigate }) {
  const mobileNavList = createElement('nav', {
    className: 'mobile-drawer-nav',
    id: 'mobile-navigation',
    'aria-label': 'Mobile Navigation'
  });

  const mobileDrawerHeader = createElement('div', { className: 'mobile-drawer-header' },
    createElement('img', {
      className: 'mobile-drawer-logo',
      src: '/assets/logo-vanta.png',
      alt: 'VANTA'
    }),
    createElement('button', {
      className: 'mobile-drawer-close',
      type: 'button',
      'aria-label': 'Navigation schließen',
      onClick: () => onNavigate?.()
    }, createCloseIcon())
  );

  const mobileNavLinksList = createElement('ul', { className: 'mobile-drawer-list' });
  mobileNavList.appendChild(mobileDrawerHeader);
  mobileNavList.appendChild(mobileNavLinksList);

  const mobileNavEntries = new Map();

  NAV_LINKS.forEach(link => {
    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      onClick: () => onNavigate?.()
    },
      createNavIcon(link.key),
      createElement('span', { className: 'mobile-nav-label' }, link.label)
    );

    const item = createElement('li', { className: 'navbar-item mobile-nav-link-item' }, anchor);
    mobileNavEntries.set(link.key, anchor);
    mobileNavLinksList.appendChild(item);
  });

  const mobileSettingsButton = createElement('button', {
    className: 'navbar-link navbar-mobile-settings',
    type: 'button',
    onClick: () => {
      mobileDrawerHeader.hidden = true;
      mobileNavLinksList.hidden = true;
      mobileSettings.setMobileSettingsView('root');
    }
  },
    createNavIcon('settings'),
    createElement('span', { className: 'mobile-nav-label' }, 'Einstellungen')
  );

  const mobileSettingsItem = createElement('li', { className: 'navbar-item navbar-mobile-settings-item mobile-nav-link-item' }, mobileSettingsButton);
  mobileNavLinksList.appendChild(mobileSettingsItem);

  const mobileProfileLink = createElement('a', {
    className: 'navbar-link',
    href: '#/profile',
    onClick: () => onNavigate?.()
  },
    createNavIcon('profile'),
    createElement('span', { className: 'mobile-nav-label' }, 'Profil')
  );

  const mobileProfileItem = createElement('li', { className: 'navbar-item mobile-nav-link-item' }, mobileProfileLink);
  mobileNavLinksList.appendChild(mobileProfileItem);

  const mobileSettings = createMobileSettings({
    onLogout,
    onChangePassword,
    onNav: () => {
      mobileDrawerHeader.hidden = false;
      mobileNavLinksList.hidden = false;
    }
  });

  mobileNavList.appendChild(mobileSettings.element);

  const mobileNavBackdrop = createElement('div', {
    className: 'mobile-nav-backdrop',
    'aria-hidden': 'true',
    onClick: () => onNavigate?.()
  });

  const updateActive = (currentHash) => {
    NAV_LINKS.forEach(link => {
      const anchor = mobileNavEntries.get(link.key);
      if (!anchor) return;
      const isActive = isNavLinkActive(link, currentHash);
      anchor.classList.toggle('active', isActive);
      if (isActive) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });

    const profileActive = isNavLinkActive({ key: 'profile' }, currentHash);
    mobileProfileLink.classList.toggle('active', profileActive);
    if (profileActive) mobileProfileLink.setAttribute('aria-current', 'page');
    else mobileProfileLink.removeAttribute('aria-current');
  };

  const resetToNav = () => {
    mobileSettings.setMobileSettingsView('nav');
  };

  return {
    mobileNavList,
    mobileNavBackdrop,
    mobileSettings,
    updateActive,
    resetToNav
  };
}
