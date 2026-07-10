import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../api/auth.api.js';
import { MediaApi } from '../../api/media.api.js';
import { Navbar } from './Navbar.js';
import { NAV_LINKS } from './navLinks.js';

vi.mock('../../api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../api/media.api.js', () => ({
  MediaApi: {
    getGenres: vi.fn().mockResolvedValue([]),
    getStudios: vi.fn().mockResolvedValue([]),
    getLibrary: vi.fn().mockResolvedValue({ totalItems: 0 })
  }
}));
vi.mock('../../api/requests.api.js', () => ({
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

    expect(navbar.element.querySelectorAll('.navbar-top-tab').length).toBe(2);
    expect(navbar.element.querySelectorAll('.navbar-action-button').length).toBeGreaterThan(0);
    expect(document.getElementById('mobile-navigation')).toBeTruthy();
  });

  it('renders only Home and Favourites in the top tab navigation', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const labels = Array.from(navbar.element.querySelectorAll('.navbar-top-tab')).map(el => el.textContent);
    expect(labels).toEqual(['Home', 'Favourites']);

    const favoritesTab = navbar.element.querySelector('.navbar-top-tab[href="#/favorites"]');
    expect(favoritesTab).toBeTruthy();
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
    NAV_LINKS.forEach(link => {
      const anchor = mobileNav.querySelector(`a[href="${link.href}"]`);
      expect(anchor, `expected drawer link for ${link.key}`).toBeTruthy();
    });
  });

  it('marks the Home top tab active on update and switches to Favourites active on #/favorites', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/home"]').classList.contains('active')).toBe(true);
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/favorites"]').classList.contains('active')).toBe(false);

    navbar.update({ currentHash: '#/favorites', user: { username: 'alice' }, scrolled: false });
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/home"]').classList.contains('active')).toBe(false);
    expect(navbar.element.querySelector('.navbar-top-tab[href="#/favorites"]').classList.contains('active')).toBe(true);
  });

  it('marks the matching nav link active in the drawer on update', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.update({ currentHash: '#/movies', user: { username: 'alice' }, scrolled: false });
    const mobileLink = document.querySelector('#mobile-navigation a[href="#/movies"]');
    expect(mobileLink.classList.contains('active')).toBe(true);

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    expect(mobileLink.classList.contains('active')).toBe(false);
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
