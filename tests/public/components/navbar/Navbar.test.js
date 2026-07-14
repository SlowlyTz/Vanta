import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../../../src/public/js/api/auth.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { Navbar } from '../../../../src/public/js/components/navbar/Navbar.js';
import { NAV_LINKS } from '../../../../src/public/js/components/navbar/navLinks.js';

vi.mock('../../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getGenres: vi.fn().mockResolvedValue([]),
    getStudios: vi.fn().mockResolvedValue([]),
    getLibrary: vi.fn().mockResolvedValue({ totalItems: 0 }),
    getStats: vi.fn().mockResolvedValue({ totalItems: 0 })
  }
}));
vi.mock('../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: { getOpenRequests: vi.fn(), approveRequest: vi.fn(), rejectRequest: vi.fn() }
}));

function stubMatchMedia(matchesDesktop) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('min-width') ? matchesDesktop : !matchesDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
}

describe('Navbar', () => {
  beforeEach(() => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    stubMatchMedia(true);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  it('mounts the top tabs, top actions and mobile drawer into the document', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    expect(navbar.element.querySelectorAll('.navbar-top-tab').length).toBe(3);
    expect(navbar.element.querySelectorAll('.navbar-action-button').length).toBeGreaterThan(0);
    expect(document.getElementById('mobile-navigation')).toBeTruthy();
  });

  it('renders Home, Filme and Serien in the desktop top tab navigation', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const labels = Array.from(navbar.element.querySelectorAll('.navbar-top-tab')).map(el => el.textContent);
    expect(labels).toEqual(['Home', 'Filme', 'Serien']);

    expect(navbar.element.querySelector('.navbar-top-tab[href="#/favorites"]')).toBeFalsy();
  });

  it('renders group, cast, search and profile actions on the right', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    expect(navbar.element.querySelector('.navbar-action-group')).toBeTruthy();
    expect(navbar.element.querySelector('.navbar-action-cast')).toBeTruthy();

    const searchAction = navbar.element.querySelector('.navbar-action-search');
    expect(searchAction.getAttribute('href')).toBe('#/search');

    const profileAction = navbar.element.querySelector('.navbar-action-profile');
    expect(profileAction.getAttribute('href')).toBe('#/profile');
  });

  it('keeps all primary nav links in the hamburger drawer', () => {
    Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const mobileNav = document.getElementById('mobile-navigation');
    const ACCORDION_KEYS = ['movies', 'series', 'publishers'];

    NAV_LINKS.forEach(link => {
      if (ACCORDION_KEYS.includes(link.key)) {
        const trigger = mobileNav.querySelector(`[data-mobile-accordion="${link.key}"] button`);
        expect(trigger, `expected drawer accordion trigger for ${link.key}`).toBeTruthy();
        return;
      }
      const anchor = mobileNav.querySelector(`a[href="${link.href}"]`);
      expect(anchor, `expected drawer link for ${link.key}`).toBeTruthy();
    });
  });

  it('renders Filme, Serien and Publisher as drawer accordions', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();

    const drawer = document.getElementById('mobile-navigation');

    expect(drawer.querySelector('[data-mobile-accordion="movies"]')).toBeTruthy();
    expect(drawer.querySelector('[data-mobile-accordion="series"]')).toBeTruthy();
    expect(drawer.querySelector('[data-mobile-accordion="publishers"]')).toBeTruthy();
  });

  it('loads movie genres when the Filme accordion opens', async () => {
    MediaApi.getGenres.mockResolvedValue([{ Name: 'Horror' }]);

    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();

    document.querySelector('[data-mobile-accordion="movies"] button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('a[href="#/genre/Movie/Horror"]')).toBeTruthy();
    });
  });

  it('loads featured publishers when the Publisher accordion opens', async () => {
    MediaApi.getStudios.mockResolvedValue([
      { Name: 'Netflix' },
      { Name: 'Warner Bros. Pictures' }
    ]);

    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();

    document.querySelector('[data-mobile-accordion="publishers"] button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('a[href="#/publisher-group/netflix"]')).toBeTruthy();
      expect(document.querySelector('a[href="#/publisher-group/warner-bros"]')).toBeTruthy();
    });
  });

  it('zeigt keine "Alle anzeigen"-Einträge mehr in den Accordion-Untermenüs', async () => {
    MediaApi.getGenres.mockResolvedValue([{ Name: 'Horror' }]);
    MediaApi.getStudios.mockResolvedValue([{ Name: 'Netflix' }]);

    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();

    document.querySelector('[data-mobile-accordion="movies"] button').click();
    document.querySelector('[data-mobile-accordion="publishers"] button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('a[href="#/genre/Movie/Horror"]')).toBeTruthy();
      expect(document.querySelector('a[href="#/publisher-group/netflix"]')).toBeTruthy();
    });

    expect(document.querySelector('.mobile-drawer-submenu a[href="#/movies"]')).toBeFalsy();
    expect(document.querySelector('.mobile-drawer-submenu a[href="#/publishers"]')).toBeFalsy();
    const submenuLabels = Array.from(document.querySelectorAll('.mobile-drawer-submenu-link')).map(a => a.textContent);
    expect(submenuLabels).not.toContain('Alle Filme');
    expect(submenuLabels).not.toContain('Alle Serien');
    expect(submenuLabels).not.toContain('Alle Publisher');
  });

  it('trennt Link- und Chevron-Zone im Accordion-Trigger: Klick auf Label navigiert, Chevron öffnet nur das Untermenü', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();
    expect(navbar.element.classList.contains('mobile-open')).toBe(true);

    const moviesItem = document.querySelector('[data-mobile-accordion="movies"]');
    const overviewLink = moviesItem.querySelector('a.mobile-drawer-accordion-link');
    expect(overviewLink.getAttribute('href')).toBe('#/movies');

    const toggleButton = moviesItem.querySelector('button.mobile-drawer-accordion-toggle');
    toggleButton.click();
    expect(moviesItem.classList.contains('is-open')).toBe(true);
    expect(navbar.element.classList.contains('mobile-open')).toBe(true);

    overviewLink.click();
    expect(navbar.element.classList.contains('mobile-open')).toBe(false);
  });

  it('öffnet/schließt das Untermenü per Enter und Space auf dem Chevron', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();

    const moviesItem = document.querySelector('[data-mobile-accordion="movies"]');
    const toggleButton = moviesItem.querySelector('button.mobile-drawer-accordion-toggle');

    toggleButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(moviesItem.classList.contains('is-open')).toBe(true);

    toggleButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(moviesItem.classList.contains('is-open')).toBe(false);
  });

  it('schließt den Drawer per Escape-Taste', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();
    expect(navbar.element.classList.contains('mobile-open')).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(navbar.element.classList.contains('mobile-open')).toBe(false);
  });

  it('marks the Home top tab active on update and switches to Filme active on #/movies', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/home"]').classList.contains('active')).toBe(true);
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/movies"]').classList.contains('active')).toBe(false);

    navbar.update({ currentHash: '#/movies', user: { username: 'alice' }, scrolled: false });
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/home"]').classList.contains('active')).toBe(false);
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/movies"]').classList.contains('active')).toBe(true);
  });

  it('marks the matching accordion trigger active in the drawer on update', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.update({ currentHash: '#/movies', user: { username: 'alice' }, scrolled: false });
    const trigger = document.querySelector('#mobile-navigation [data-mobile-accordion="movies"] a');
    expect(trigger.classList.contains('active')).toBe(true);

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    expect(trigger.classList.contains('active')).toBe(false);
  });

  it('opens the drawer when the menu button is clicked on desktop', () => {
    stubMatchMedia(true);
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const menuButton = navbar.element.querySelector('.mobile-menu-button');
    menuButton.click();

    expect(navbar.element.classList.contains('mobile-open')).toBe(true);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens the same drawer when the menu button is clicked on mobile', () => {
    stubMatchMedia(false);
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const menuButton = navbar.element.querySelector('.mobile-menu-button');
    menuButton.click();

    expect(navbar.element.classList.contains('mobile-open')).toBe(true);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    document.querySelector('.mobile-drawer-close').click();
    expect(navbar.element.classList.contains('mobile-open')).toBe(false);
  });

  it('shows a Profil link directly under Einstellungen in the mobile drawer list and closes the drawer on click', () => {
    stubMatchMedia(false);
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.element.querySelector('.mobile-menu-button').click();
    expect(navbar.element.classList.contains('mobile-open')).toBe(true);

    const mobileNav = document.getElementById('mobile-navigation');
    const items = Array.from(mobileNav.querySelectorAll('.mobile-drawer-list > li'));
    const labels = items.map(item => item.querySelector('.mobile-nav-label').textContent);

    const settingsIndex = labels.indexOf('Einstellungen');
    const profileIndex = labels.indexOf('Profil');

    expect(profileIndex).toBe(settingsIndex + 1);

    const profileLink = items[profileIndex].querySelector('a');
    expect(profileLink.getAttribute('href')).toBe('#/profile');

    profileLink.click();

    expect(navbar.element.classList.contains('mobile-open')).toBe(false);
  });

  it('opens settings in a separate dialog and closes the mobile drawer', () => {
    stubMatchMedia(false);
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    navbar.element.querySelector('.mobile-menu-button').click();

    const mobileNav = document.getElementById('mobile-navigation');
    const settingsButton = mobileNav.querySelector('.navbar-mobile-settings');

    settingsButton.click();

    expect(navbar.element.classList.contains('mobile-open')).toBe(false);
    expect(document.querySelector('.settings-modal-backdrop.open')).toBeTruthy();
    expect(mobileNav.querySelector('.settings-panel')).toBeFalsy();
    expect(document.querySelector('.settings-dialog .settings-profile-name').textContent).toBe('alice');
  });

  it('marks the drawer Profil link active on #/profile', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    navbar.element.querySelector('.mobile-menu-button').click();

    const mobileNav = document.getElementById('mobile-navigation');
    const profileLink = Array.from(mobileNav.querySelectorAll('a')).find(a => a.getAttribute('href') === '#/profile');

    navbar.update({ currentHash: '#/profile', user: { username: 'alice' }, scrolled: false });
    expect(profileLink.classList.contains('active')).toBe(true);

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    expect(profileLink.classList.contains('active')).toBe(false);
  });
});
