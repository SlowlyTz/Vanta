import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApi } from '../../api/auth.api.js';
import { RequestsApi } from '../../api/requests.api.js';
import { AdminUsersApi } from '../../api/admin-users.api.js';
import { createAdminToolsPanel } from './AdminToolsPanel.js';

vi.mock('../../api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../api/requests.api.js', () => ({
  RequestsApi: { getOpenRequests: vi.fn(), approveRequest: vi.fn(), rejectRequest: vi.fn() }
}));
vi.mock('../../api/admin-users.api.js', () => ({
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

describe('createAdminToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default tool registry as cards in the grid, with no per-view back button', () => {
    const { adminPanel } = createAdminToolsPanel({ onOpen: vi.fn() });
    const cards = adminPanel.querySelectorAll('.admin-tool-card');
    const titles = Array.from(cards).map(card => card.querySelector('.admin-tool-card-title').textContent);

    expect(titles).toEqual(['Anfragen', 'Nutzerverwaltung']);
    expect(adminPanel.querySelectorAll('.admin-tool-view')).toHaveLength(2);
    expect(adminPanel.querySelectorAll('.admin-view-back-button')).toHaveLength(0);
  });

  it('shows the admin option only for admin users', async () => {
    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: true } });
    const { adminOption, loadAdminVisibility } = createAdminToolsPanel({ onOpen: vi.fn() });

    await loadAdminVisibility();
    expect(adminOption.hidden).toBe(false);

    AuthApi.getCurrentUser.mockResolvedValue({ user: { isAdmin: false } });
    await loadAdminVisibility();
    expect(adminOption.hidden).toBe(true);
  });

  it('opens the requests tool view, loads open requests, and goBack() returns to the grid', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([
      { id: 1, title: 'Movie A', username: 'alice', tmdb_type: 'movie', status: 'pending' }
    ]);

    const { adminPanel, goBack } = createAdminToolsPanel({ onOpen: vi.fn() });
    const [requestsCard] = adminPanel.querySelectorAll('.admin-tool-card');
    const adminToolsPanel = adminPanel.querySelector('.admin-tools-panel');
    const [requestsView] = adminPanel.querySelectorAll('.admin-tool-view');

    requestsCard.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(adminToolsPanel.hidden).toBe(true);
    expect(requestsView.hidden).toBe(false);
    expect(RequestsApi.getOpenRequests).toHaveBeenCalledTimes(1);
    expect(requestsView.querySelectorAll('.request-item-admin')).toHaveLength(1);
    expect(requestsView.querySelectorAll('.admin-view-back-button')).toHaveLength(0);

    const handled = goBack();

    expect(handled).toBe(true);
    expect(adminToolsPanel.hidden).toBe(false);
    expect(requestsView.hidden).toBe(true);
  });

  it('goBack() returns false when the grid itself is showing (nothing left to close here)', () => {
    const { goBack } = createAdminToolsPanel({ onOpen: vi.fn() });
    expect(goBack()).toBe(false);
  });

  it('goBack() steps back one level at a time in the users tool: detail -> list -> grid', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [{
        id: 'u1', name: 'alice', isAdmin: false, isDisabled: false, isBanned: false, banReason: null,
        maxConcurrentStreams: 1, activeStreams: 0, enableAllFolders: true, enabledFolders: []
      }]
    });
    AdminUsersApi.listLibraries.mockResolvedValue({ libraries: [] });
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });

    const { adminPanel, goBack } = createAdminToolsPanel({ onOpen: vi.fn() });
    const cards = adminPanel.querySelectorAll('.admin-tool-card');
    const usersCard = Array.from(cards).find(c => c.querySelector('.admin-tool-card-title').textContent === 'Nutzerverwaltung');
    const adminToolsPanelEl = adminPanel.querySelector('.admin-tools-panel');
    const usersView = Array.from(adminPanel.querySelectorAll('.admin-tool-view')).find(v => v.querySelector('.admin-users-view'));

    usersCard.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(usersView.querySelectorAll('.admin-view-back-button')).toHaveLength(0);

    // Open a user's detail view.
    usersView.querySelector('.admin-user-action-btn').click();
    expect(usersView.querySelector('.admin-users-list-view').hidden).toBe(true);
    expect(usersView.querySelector('.admin-users-detail-slot').hidden).toBe(false);

    // First goBack(): detail -> list, stays inside the tool.
    expect(goBack()).toBe(true);
    expect(usersView.querySelector('.admin-users-list-view').hidden).toBe(false);
    expect(usersView.querySelector('.admin-users-detail-slot').hidden).toBe(true);
    expect(adminToolsPanelEl.hidden).toBe(true);
    expect(usersView.hidden).toBe(false);

    // Second goBack(): list -> tool grid.
    expect(goBack()).toBe(true);
    expect(adminToolsPanelEl.hidden).toBe(false);
    expect(usersView.hidden).toBe(true);

    // Nothing left to close inside the admin area.
    expect(goBack()).toBe(false);
  });
});
