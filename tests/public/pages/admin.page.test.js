import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthApi } from '../../../src/public/js/api/auth.api.js';
import { AdminUsersApi } from '../../../src/public/js/api/admin-users.api.js';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../src/public/js/store/app.store.js';
import { authStore } from '../../../src/public/js/store/auth.store.js';
import { createAdminHeader } from '../../../src/public/js/pages/admin/adminHeader.js';
import { listAdminTools } from '../../../src/public/js/components/admin-tools/AdminToolRegistry.js';
import AdminPage from '../../../src/public/js/pages/admin.page.js';
import { NotificationsApi } from '../../../src/public/js/api/notifications.api.js';
import { notificationsStore } from '../../../src/public/js/store/notifications.store.js';

vi.mock('../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../../src/public/js/api/admin-users.api.js', () => ({
  AdminUsersApi: {
    listUsers: vi.fn(),
    listLibraries: vi.fn(),
    renameUser: vi.fn(),
    setPassword: vi.fn(),
    deleteUser: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    setLibraryAccess: vi.fn(),
    setStreamLimit: vi.fn()
  }
}));
vi.mock('../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    getOpenRequests: vi.fn(),
    getAllRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn()
  }
}));
vi.mock('../../../src/public/js/api/admin-settings.api.js', () => ({
  AdminSettingsApi: {
    getDiscordWebhook: vi.fn(),
    updateDiscordWebhook: vi.fn(),
    removeDiscordWebhook: vi.fn(),
    testDiscordWebhook: vi.fn()
  }
}));
vi.mock('../../../src/public/js/api/reports.api.js', () => ({
  ReportsApi: { getOpen: vi.fn(async () => []), getAll: vi.fn(async () => []), resolve: vi.fn(), dismiss: vi.fn() }
}));
vi.mock('../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: { getSummary: vi.fn(), markSeen: vi.fn() }
}));
vi.mock('../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));
vi.mock('../../../src/public/js/store/auth.store.js', () => ({
  authStore: { getState: vi.fn(() => ({ user: null })) }
}));

// Die Suchleiste ist ein eigenes Modul mit eigener Entprellung; hier zählt nur,
// mit welchem Vertrag die Seite sie an den Bereich hängt.
vi.mock('../../../src/public/js/pages/admin/adminHeader.js', () => ({
  createAdminHeader: vi.fn(() => {
    const element = document.createElement('div');
    element.className = 'admin-header-bar';
    return { element, getTerm: () => '', clear: vi.fn() };
  })
}));

async function flush() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

// Leaves the admin area the way the router sees it: a new hash, then the
// hashchange event.
function leaveAdmin(hash = '#/home') {
  window.history.replaceState(null, '', hash);
  window.dispatchEvent(new Event('hashchange'));
}

// The open area lives in a layer on document.body, not inside the page.
const layer = () => document.querySelector('.admin-layer');

function makeRequest(overrides = {}) {
  return {
    id: 1,
    tmdb_id: 550,
    tmdb_type: 'movie',
    title: 'Fight Club',
    username: 'alice',
    status: 'pending',
    poster_path: '/poster.jpg',
    created_at: '2024-01-15T12:00:00.000Z',
    ...overrides
  };
}

function makeUser(overrides = {}) {
  return {
    id: 'u1',
    name: 'alice',
    isAdmin: false,
    isDisabled: false,
    isBanned: false,
    banReason: null,
    maxConcurrentStreams: 1,
    activeStreams: 0,
    enableAllFolders: true,
    enabledFolders: [],
    ...overrides
  };
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#/admin';
    authStore.getState.mockReturnValue({ user: { id: 'admin-1', isAdmin: true } });
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    AdminUsersApi.listUsers.mockResolvedValue({ users: [] });
    AdminUsersApi.listLibraries.mockResolvedValue({ libraries: [] });
    RequestsApi.getAllRequests.mockResolvedValue([]);
    RequestsApi.getOpenRequests.mockResolvedValue([]);
    NotificationsApi.getSummary.mockResolvedValue({ mine: { requests: 0, reports: 0 }, admin: { requests: 0, reports: 0 } });
    // The store is shared app-wide; every test starts from an empty summary.
    notificationsStore.stop();
  });

  afterEach(() => {
    // Jede noch lebende Seite abbauen: sonst bleiben ihre Modals registriert und
    // ein späterer Abbau schließt sie — samt Nachladen — im nächsten Test.
    leaveAdmin();
    window.history.replaceState(null, '', '#/admin');
    document.querySelectorAll('.admin-user-dialog-overlay, .admin-layer').forEach(el => el.remove());
  });

  describe('Menü (#/admin)', () => {
    it('renders one card per registered area and nothing else', async () => {
      const container = AdminPage();
      await flush();

      const tools = listAdminTools();
      const cards = container.querySelectorAll('.admin-menu-card');

      expect(tools.map(tool => tool.id)).toEqual(['requests', 'users', 'settings']);
      expect(cards).toHaveLength(3);
      cards.forEach(card => {
        expect(card.querySelector('.admin-menu-card-icon').childElementCount).toBe(1);
      });
      tools.forEach((tool, index) => {
        expect(cards[index].textContent).toContain(tool.label);
        expect(cards[index].textContent).toContain(tool.description);
        expect(cards[index].tagName).toBe('BUTTON');
        // Karten navigieren weg — Tab-Semantik wäre hier falsch.
        expect(cards[index].getAttribute('role')).toBeNull();
        expect(cards[index].hasAttribute('aria-selected')).toBe(false);
      });

      expect(container.querySelector('.admin-requests-view')).toBeNull();
      expect(container.querySelector('.admin-users-view')).toBeNull();
      expect(container.querySelector('.admin-settings-panel')).toBeNull();
    });

    it('renders straight away for a session that already knows the role', () => {
      const container = AdminPage();

      expect(container.querySelector('.admin-page-loading')).toBeNull();
      expect(container.querySelector('.admin-menu-grid')).toBeTruthy();
      expect(AuthApi.getCurrentUser).not.toHaveBeenCalled();
    });

    it('navigates to the area’s own route when a card is clicked', async () => {
      const container = AdminPage();
      await flush();

      const usersCard = Array.from(container.querySelectorAll('.admin-menu-card'))
        .find(card => card.textContent.includes('Nutzerverwaltung'));
      usersCard.click();

      expect(window.location.hash).toBe('#/admin/users');
    });

    it('shows open requests and reports together as a badge on the Anfragen card', async () => {
      NotificationsApi.getSummary.mockResolvedValue({ mine: { requests: 0, reports: 0 }, admin: { requests: 1, reports: 2 } });

      const container = AdminPage();
      await flush();

      const badge = container.querySelector('.admin-menu-badge');
      expect(badge.classList.contains('hidden')).toBe(false);
      expect(badge.textContent).toBe('3');
    });

    it('renders without a badge when nothing waits or the count cannot be loaded', async () => {
      NotificationsApi.getSummary.mockRejectedValue(new Error('offline'));

      const container = AdminPage();
      await flush();

      expect(container.querySelectorAll('.admin-menu-card')).toHaveLength(listAdminTools().length);
      expect(container.querySelector('.admin-menu-badge').classList.contains('hidden')).toBe(true);
    });

    it('falls back to the menu for a section that is not registered', async () => {
      const container = AdminPage({ section: 'does-not-exist' });
      await flush();

      expect(container.querySelector('.admin-menu-grid')).toBeTruthy();
      expect(container.querySelector('.admin-back-button')).toBeNull();
    });
  });

  describe('Bereich (#/admin/<id>)', () => {
    it('opens the requests area as a layer over the menu on a deep link, without sliding', async () => {
      RequestsApi.getOpenRequests.mockResolvedValue([makeRequest()]);

      const container = AdminPage({ section: 'requests' });
      await flush();

      expect(container.querySelector('.admin-menu-grid')).toBeTruthy();
      expect(layer().querySelector('.admin-requests-view')).toBeTruthy();
      expect(layer().classList.contains('is-open')).toBe(true);
      expect(layer().querySelector('.admin-users-view')).toBeNull();
      expect(AdminUsersApi.listUsers).not.toHaveBeenCalled();
      expect(layer().querySelectorAll('.admin-request-item')).toHaveLength(1);
    });

    it('opens only the users area and loads it', async () => {
      AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

      AdminPage({ section: 'users' });
      await flush();

      expect(layer().querySelector('.admin-users-view')).toBeTruthy();
      expect(layer().querySelector('.admin-requests-view')).toBeNull();
      expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(1);
    });

    it('renders the settings area without a search bar, since it has no filter', async () => {
      AdminPage({ section: 'settings' });
      await flush();

      expect(layer().querySelector('.admin-settings-panel')).toBeTruthy();
      expect(layer().querySelector('.admin-settings-list-row')).toBeTruthy();
      expect(createAdminHeader).not.toHaveBeenCalled();
    });

    it('titles the layer with the area label and its description, under a Zurück button', async () => {
      AdminPage({ section: 'users' });
      await flush();

      expect(layer().querySelector('.admin-layer-back').textContent).toContain('Zurück');
      expect(layer().querySelector('.admin-layer-title').textContent).toBe('Nutzerverwaltung');
      expect(layer().querySelector('.admin-layer-subtitle').textContent).toBeTruthy();
    });

    it('names the search bar after the area it belongs to', async () => {
      AdminPage({ section: 'users' });
      await flush();
      expect(createAdminHeader.mock.calls[0][0]).toMatchObject({
        placeholder: 'Nutzer durchsuchen…',
        label: 'Nutzer durchsuchen'
      });
    });

    it('hands the scoped search term to the users area as well', async () => {
      AdminUsersApi.listUsers.mockResolvedValue({
        users: [makeUser({ id: 'u1', name: 'alice' }), makeUser({ id: 'u2', name: 'bob' })]
      });

      AdminPage({ section: 'users' });
      await flush();

      expect(layer().querySelectorAll('.admin-user-row')).toHaveLength(2);

      const { onSearch } = createAdminHeader.mock.calls[0][0];
      onSearch('bob');

      const rows = layer().querySelectorAll('.admin-user-row');
      expect(rows).toHaveLength(1);
      expect(rows[0].textContent).toContain('bob');
    });

    it('renders a search bar only for the users area', async () => {
      AdminPage({ section: 'users' });
      await flush();
      expect(layer().querySelector('.admin-header-bar')).toBeTruthy();
      leaveAdmin();

      for (const section of ['requests', 'settings']) {
        window.history.replaceState(null, '', '#/admin');
        createAdminHeader.mockClear();
        AdminPage({ section });
        await flush();
        expect(layer().querySelector('.admin-header-bar')).toBeNull();
        expect(createAdminHeader).not.toHaveBeenCalled();
        leaveAdmin();
      }
    });

    it('slides an area in when the hash moves from the menu to it, and back out on the way back', async () => {
      vi.useFakeTimers();
      const container = AdminPage();
      await flush();

      expect(container.handleHashChange('#/admin/requests')).toBe(true);
      expect(layer()).toBeTruthy();
      expect(layer().classList.contains('is-open')).toBe(false);
      await vi.advanceTimersByTimeAsync(50);
      expect(layer().classList.contains('is-open')).toBe(true);

      expect(container.handleHashChange('#/admin')).toBe(true);
      expect(layer().classList.contains('is-open')).toBe(false);
      await vi.advanceTimersByTimeAsync(500);
      expect(layer()).toBeNull();

      // Anything outside the admin area is left to the router.
      expect(container.handleHashChange('#/home')).toBe(false);
      vi.useRealTimers();
    });

    it('steps back through the history from an area opened from the menu', async () => {
      const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
      const container = AdminPage();
      await flush();

      container.handleHashChange('#/admin/users');
      layer().querySelector('.admin-layer-back').click();

      expect(back).toHaveBeenCalledTimes(1);
      back.mockRestore();
    });
  });

  describe('Zugriff und Abbau', () => {
    it('redirects a non-admin from the cached session, with no spinner and no layout', () => {
      authStore.getState.mockReturnValue({ user: { id: 'u1', isAdmin: false } });

      const container = AdminPage();

      expect(appStore.showToast).toHaveBeenCalledWith('Kein Zugriff', 'error');
      expect(window.location.hash).toBe('#/home');
      expect(container.querySelector('.admin-page-loading')).toBeNull();
      expect(container.querySelector('.admin-page-layout')).toBeNull();
      expect(AuthApi.getCurrentUser).not.toHaveBeenCalled();
    });

    it('asks the API when the session does not know the role yet, showing a loading state', async () => {
      authStore.getState.mockReturnValue({ user: null });
      let resolveUser;
      AuthApi.getCurrentUser.mockReturnValue(new Promise(resolve => { resolveUser = resolve; }));

      const container = AdminPage();

      expect(container.querySelector('.admin-page-loading')).toBeTruthy();
      expect(container.querySelector('.admin-page-layout')).toBeNull();

      resolveUser({ user: { id: 'admin-1', isAdmin: true } });
      await flush();

      expect(container.querySelector('.admin-page-loading')).toBeNull();
      expect(container.querySelector('.admin-menu-grid')).toBeTruthy();
    });

    it('redirects a non-admin on the API fallback path too', async () => {
      authStore.getState.mockReturnValue({ user: null });
      AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'u1', isAdmin: false } });

      const container = AdminPage();
      await flush();

      expect(appStore.showToast).toHaveBeenCalledWith('Kein Zugriff', 'error');
      expect(window.location.hash).toBe('#/home');
      expect(container.querySelector('.admin-page-layout')).toBeNull();
    });

    it('also redirects when the check itself fails', async () => {
      authStore.getState.mockReturnValue({ user: null });
      AuthApi.getCurrentUser.mockRejectedValue(new Error('network error'));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      AdminPage();
      await flush();

      expect(appStore.showToast).toHaveBeenCalledWith('Kein Zugriff', 'error');
      expect(window.location.hash).toBe('#/home');
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('tears down only once and takes its own hashchange listener with it', async () => {
      AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

      AdminPage({ section: 'users' });
      await flush();

      layer().querySelector('.admin-user-row-summary').click();
      expect(document.querySelector('.admin-user-dialog-detail')).toBeTruthy();

      leaveAdmin();
      await flush();

      // Nach dem Abbau darf ein weiterer Routenwechsel nichts mehr auslösen:
      // der Listener hat sich selbst entfernt.
      AdminUsersApi.listUsers.mockClear();
      leaveAdmin('#/search');
      await flush();

      expect(AdminUsersApi.listUsers).not.toHaveBeenCalled();
    });

    it('closes a ban confirmation that is still open when the route changes', async () => {
      AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser({ id: 'u1', name: 'alice' })] });

      AdminPage({ section: 'users' });
      await flush();

      layer().querySelector('.admin-user-row-summary').click();
      const banButton = [...document.querySelectorAll('.admin-user-dialog button')]
        .find(button => /sperren/i.test(button.textContent));
      banButton.click();
      await flush();

      expect(document.querySelectorAll('.admin-user-dialog-overlay').length).toBeGreaterThan(1);

      leaveAdmin();
      await flush();

      // Bestätigungsdialoge hängen ebenfalls an document.body und werden vom
      // Tool nicht mitgeführt — deshalb räumt die Seite alle Overlays ab.
      expect(document.querySelectorAll('.admin-user-dialog-overlay')).toHaveLength(0);
    });

    it('does not redirect a page that has already been torn down', async () => {
      authStore.getState.mockReturnValue({ user: null });
      let resolveMe;
      AuthApi.getCurrentUser.mockReturnValue(new Promise(resolve => { resolveMe = resolve; }));

      AdminPage();
      leaveAdmin('#/search');
      resolveMe({ user: { id: 'u9', isAdmin: false } });
      await flush();

      expect(appStore.showToast).not.toHaveBeenCalled();
      expect(window.location.hash).toBe('#/search');
    });

    it('closes the user detail modal when the route changes', async () => {
      AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

      AdminPage({ section: 'users' });
      await flush();

      layer().querySelector('.admin-user-row-summary').click();
      expect(document.querySelector('.admin-user-dialog-detail')).toBeTruthy();

      leaveAdmin();
      await flush();

      // Der Router hat keinen Unmount-Hook — das Modal hängt an document.body
      // und bliebe sonst über den Seitenwechsel hinaus stehen.
      expect(document.querySelector('.admin-user-dialog-detail')).toBeNull();
      // Und kein Nachladen mehr, nachdem die Seite abgebaut ist.
      expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(1);
    });
  });
});
