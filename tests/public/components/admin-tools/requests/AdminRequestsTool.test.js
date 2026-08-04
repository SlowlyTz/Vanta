import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../../../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../../../src/public/js/store/app.store.js';
import { createAdminRequestsTool } from '../../../../../src/public/js/components/admin-tools/requests/AdminRequestsTool.js';

vi.mock('../../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    getOpenRequests: vi.fn(),
    getAllRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn()
  }
}));

vi.mock('../../../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

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

async function flush() {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

describe('AdminRequestsTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to the "Offen" tab and loads open requests', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([makeRequest()]);
    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    const tabs = tool.element.querySelectorAll('.admin-requests-tab');
    expect(tabs[0].textContent).toBe('Offen');
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(RequestsApi.getOpenRequests).toHaveBeenCalledTimes(1);
    expect(tool.element.querySelectorAll('.admin-request-item')).toHaveLength(1);
  });

  it('switches to the "Alle" tab, loads every request and shows a status badge per row', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([]);
    RequestsApi.getAllRequests.mockResolvedValue([
      makeRequest({ id: 1, status: 'pending' }),
      makeRequest({ id: 2, status: 'approved' }),
      makeRequest({ id: 3, status: 'rejected' })
    ]);

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    tool.element.querySelectorAll('.admin-requests-tab')[1].click();
    await flush();

    expect(RequestsApi.getAllRequests).toHaveBeenCalledTimes(1);
    expect(tool.element.querySelectorAll('.admin-request-item')).toHaveLength(3);
    expect(tool.element.querySelectorAll('.request-status')).toHaveLength(3);
    expect(tool.element.querySelectorAll('.request-status-approved')).toHaveLength(1);
    expect(tool.element.querySelectorAll('.request-status-rejected')).toHaveLength(1);
  });

  it('does not show approve/reject actions for requests that are no longer pending in the "Alle" tab', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([]);
    RequestsApi.getAllRequests.mockResolvedValue([makeRequest({ status: 'approved' })]);

    const tool = createAdminRequestsTool();
    await tool.load();
    tool.element.querySelectorAll('.admin-requests-tab')[1].click();
    await flush();

    expect(tool.element.querySelectorAll('.request-admin-action')).toHaveLength(0);
  });

  it('shows a success toast and reloads the list after approving', async () => {
    RequestsApi.getOpenRequests
      .mockResolvedValueOnce([makeRequest({ id: 1 })])
      .mockResolvedValueOnce([]);
    RequestsApi.approveRequest.mockResolvedValue({ success: true });

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.request-approve').click();
    await flush();

    expect(RequestsApi.approveRequest).toHaveBeenCalledWith(1);
    expect(appStore.showToast).toHaveBeenCalledWith('„Fight Club“ genehmigt', 'success');
    expect(RequestsApi.getOpenRequests).toHaveBeenCalledTimes(2);
  });

  it('shows a toast that explains the title is banned when rejecting', async () => {
    RequestsApi.getOpenRequests
      .mockResolvedValueOnce([makeRequest({ id: 1 })])
      .mockResolvedValueOnce([]);
    RequestsApi.rejectRequest.mockResolvedValue({ success: true });

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.request-reject').click();
    await flush();

    expect(RequestsApi.rejectRequest).toHaveBeenCalledWith(1);
    expect(appStore.showToast).toHaveBeenCalledWith(
      '„Fight Club“ abgelehnt — landet auf der Sperrliste und kann nicht erneut angefragt werden',
      'success'
    );
  });

  it('shows an error toast and re-enables the buttons when approving fails', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([makeRequest({ id: 1 })]);
    RequestsApi.approveRequest.mockRejectedValue(new Error('Serverfehler'));

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    const approveBtn = tool.element.querySelector('.request-approve');
    approveBtn.click();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Serverfehler', 'error');
    expect(approveBtn.disabled).toBe(false);
  });

  it('shows an empty state when there are no open requests', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([]);

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    expect(tool.element.textContent).toContain('Keine offenen Anfragen');
  });

  it('shows an error state when loading fails', async () => {
    RequestsApi.getOpenRequests.mockRejectedValue(new Error('Netzwerkfehler'));

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    const status = tool.element.querySelector('.admin-requests-status');
    expect(status.classList.contains('hidden')).toBe(false);
    expect(status.textContent).toBe('Netzwerkfehler');
  });

  it('notifies onRequestsChanged with the active tab and loaded requests, for the page-level badge', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([makeRequest()]);
    const onRequestsChanged = vi.fn();

    const tool = createAdminRequestsTool({ onRequestsChanged });
    await tool.load();
    await flush();

    expect(onRequestsChanged).toHaveBeenCalledWith('open', [expect.objectContaining({ id: 1 })]);
  });
});
