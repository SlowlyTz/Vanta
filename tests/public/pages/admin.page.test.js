import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApi } from '../../../src/public/js/api/auth.api.js';
import { AdminUsersApi } from '../../../src/public/js/api/admin-users.api.js';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../src/public/js/store/app.store.js';
import AdminPage from '../../../src/public/js/pages/admin.page.js';

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
vi.mock('../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

// Die drei Module des parallel gebauten Kopfzeilen-/Such-/Einstellungsteils
// (Teil B/C in plan.md) werden nach dem verbindlichen Modul-Vertrag gemockt,
// damit admin.page.js unabhängig davon getestet werden kann.
vi.mock('../../../src/public/js/pages/admin/adminHeader.js', () => ({
  createAdminHeader: vi.fn((opts) => ({
    element: document.createElement('div'),
    getTerm: () => '',
    clear: () => opts.onSearch(''),
    setSettingsOpen: vi.fn()
  }))
}));
vi.mock('../../../src/public/js/pages/admin/adminSearch.js', () => ({
  createAdminSearchResults: vi.fn(() => {
    const element = document.createElement('div');
    element.hidden = true;
    return { element, render: vi.fn(), clear: vi.fn() };
  })
}));
vi.mock('../../../src/public/js/pages/admin/adminSettingsPanel.js', () => ({
  createAdminSettingsPanel: vi.fn(() => {
    let open = false;
    return {
      element: document.createElement('div'),
      open: vi.fn(() => { open = true; }),
      close: vi.fn(() => { open = false; }),
      isOpen: () => open
    };
  })
}));

async function flush() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#/admin';
    AdminUsersApi.listUsers.mockResolvedValue({ users: [] });
    AdminUsersApi.listLibraries.mockResolvedValue({ libraries: [] });
    RequestsApi.getAllRequests.mockResolvedValue([]);
    RequestsApi.getOpenRequests.mockResolvedValue([]);
  });

  it('shows a loading state while the admin check is pending, with no admin structure visible yet', async () => {
    let resolveUser;
    AuthApi.getCurrentUser.mockReturnValue(new Promise((resolve) => { resolveUser = resolve; }));

    const container = AdminPage();

    expect(container.querySelector('.admin-page-loading')).toBeTruthy();
    expect(container.querySelector('.admin-page-layout')).toBeNull();

    resolveUser({ user: { isAdmin: true } });
    await flush();
  });

  it('redirects non-admins to #/home with a "Kein Zugriff" toast, without rendering the admin layout', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });

    const container = AdminPage();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Kein Zugriff', 'error');
    expect(window.location.hash).toBe('#/home');
    expect(container.querySelector('.admin-page-layout')).toBeNull();
  });

  it('also redirects when the admin check itself fails', async () => {
    AuthApi.getCurrentUser.mockRejectedValue(new Error('network error'));

    AdminPage();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Kein Zugriff', 'error');
    expect(window.location.hash).toBe('#/home');
  });

  it('renders the admin layout with Anfragen as the default active, loaded section for admins', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });

    const container = AdminPage();
    await flush();

    expect(container.querySelector('.admin-page-loading')).toBeNull();
    expect(container.querySelector('.admin-page-layout')).toBeTruthy();

    const panels = container.querySelectorAll('.admin-section-panel');
    expect(panels).toHaveLength(2);
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
    expect(RequestsApi.getOpenRequests).toHaveBeenCalled();
  });

  it('switches sections when a nav item is clicked, loading that section’s data', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    AdminUsersApi.listUsers.mockResolvedValue({ users: [] });

    const container = AdminPage();
    await flush();

    const navButtons = container.querySelectorAll('.admin-nav-item');
    const usersButton = Array.from(navButtons).find(b => b.textContent.includes('Nutzerverwaltung'));
    usersButton.click();
    await flush();

    const panels = container.querySelectorAll('.admin-section-panel');
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
    expect(AdminUsersApi.listUsers).toHaveBeenCalled();

    const requestsButton = Array.from(navButtons).find(b => b.textContent.includes('Anfragen'));
    requestsButton.click();
    await flush();

    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
  });

  it('shows a badge with the number of open requests on the Anfragen nav item', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    RequestsApi.getAllRequests.mockResolvedValue([
      { id: 1, status: 'pending' },
      { id: 2, status: 'pending' },
      { id: 3, status: 'approved' }
    ]);

    const container = AdminPage();
    await flush();

    const badge = container.querySelector('.admin-nav-badge');
    expect(badge.classList.contains('hidden')).toBe(false);
    expect(badge.textContent).toBe('2');
  });
});
