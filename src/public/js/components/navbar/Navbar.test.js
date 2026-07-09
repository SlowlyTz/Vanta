import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../api/auth.api.js';
import { MediaApi } from '../../api/media.api.js';
import { Navbar } from './Navbar.js';

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

  it('mounts nav links, mobile drawer and settings dialog into the document', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    expect(navbar.element.querySelectorAll('.navbar-item').length).toBeGreaterThan(0);
    expect(document.getElementById('mobile-navigation')).toBeTruthy();
    expect(document.getElementById('settings-dialog')).toBeTruthy();
  });

  it('marks the matching nav link active on update, in both desktop and mobile nav', () => {
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    navbar.update({ currentHash: '#/movies', user: { username: 'alice' }, scrolled: false });

    const desktopLink = navbar.element.querySelector('#nav-movies');
    expect(desktopLink.classList.contains('active')).toBe(true);

    const mobileLink = document.querySelector('#mobile-navigation a[href="#/movies"]');
    expect(mobileLink.classList.contains('active')).toBe(true);

    navbar.update({ currentHash: '#/home', user: { username: 'alice' }, scrolled: false });
    expect(desktopLink.classList.contains('active')).toBe(false);
  });

  it('opens the settings dialog when the menu button is clicked on desktop', () => {
    stubMatchMedia(true);
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const menuButton = navbar.element.querySelector('.mobile-menu-button');
    menuButton.click();

    const settingsDialogEl = document.getElementById('settings-dialog');
    expect(settingsDialogEl.closest('.settings-modal-backdrop').classList.contains('open')).toBe(true);
  });

  it('opens the mobile drawer instead of settings when the menu button is clicked on mobile', () => {
    stubMatchMedia(false);
    const navbar = Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });

    const menuButton = navbar.element.querySelector('.mobile-menu-button');
    menuButton.click();

    expect(navbar.element.classList.contains('mobile-open')).toBe(true);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    document.querySelector('.mobile-drawer-close').click();
    expect(navbar.element.classList.contains('mobile-open')).toBe(false);
  });

  it('shows a Profil option in the desktop settings Overview section and navigates on click', () => {
    Navbar({ onLogout: vi.fn(), onChangePassword: vi.fn() });
    window.location.hash = '#/home';

    const dialog = document.getElementById('settings-dialog');
    const overviewSection = Array.from(dialog.querySelectorAll('.settings-section'))
      .find(section => section.querySelector('.settings-section-title')?.textContent === 'Overview');
    const profileOption = Array.from(overviewSection.querySelectorAll('.settings-option'))
      .find(option => option.textContent.includes('Profil'));

    expect(profileOption).toBeTruthy();

    profileOption.click();

    expect(window.location.hash).toBe('#/profile');
    expect(dialog.closest('.settings-modal-backdrop').classList.contains('open')).toBe(false);
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
});
