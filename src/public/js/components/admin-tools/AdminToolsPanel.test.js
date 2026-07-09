import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApi } from '../../api/auth.api.js';
import { RequestsApi } from '../../api/requests.api.js';
import { createAdminToolsPanel } from './AdminToolsPanel.js';

vi.mock('../../api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../api/requests.api.js', () => ({
  RequestsApi: { getOpenRequests: vi.fn(), approveRequest: vi.fn(), rejectRequest: vi.fn() }
}));

describe('createAdminToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default tool registry as cards in the grid', () => {
    const { adminPanel } = createAdminToolsPanel({ onOpen: vi.fn() });
    const cards = adminPanel.querySelectorAll('.admin-tool-card');
    const titles = Array.from(cards).map(card => card.querySelector('.admin-tool-card-title').textContent);

    expect(titles).toEqual(['Anfragen']);
    expect(adminPanel.querySelectorAll('.admin-tool-view')).toHaveLength(1);
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

  it('opens the requests tool view, loads open requests and returns to the grid', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([
      { id: 1, title: 'Movie A', username: 'alice', tmdb_type: 'movie', status: 'pending' }
    ]);

    const { adminPanel } = createAdminToolsPanel({ onOpen: vi.fn() });
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

    requestsView.querySelector('.admin-view-back-button').click();
    expect(adminToolsPanel.hidden).toBe(false);
    expect(requestsView.hidden).toBe(true);
  });
});
