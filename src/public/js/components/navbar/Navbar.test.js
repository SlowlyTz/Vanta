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
vi.mock('../../api/admin.api.js', () => ({
  AdminApi: { getTranscoding: vi.fn(), updateTranscoding: vi.fn() }
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
});
