import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../../../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../../../src/public/js/store/app.store.js';
import { ReportsApi } from '../../../../../src/public/js/api/reports.api.js';
import { createAdminRequestsTool } from '../../../../../src/public/js/components/admin-tools/requests/AdminRequestsTool.js';

vi.mock('../../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    getOpenRequests: vi.fn(),
    getAllRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn()
  }
}));

vi.mock('../../../../../src/public/js/api/reports.api.js', () => ({
  ReportsApi: { getOpen: vi.fn(), getAll: vi.fn(), resolve: vi.fn(), dismiss: vi.fn() }
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
    ReportsApi.getOpen.mockResolvedValue([]);
    ReportsApi.getAll.mockResolvedValue([]);
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

    expect(tool.element.textContent).toContain('Nichts offen');
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

  it('lets the error state stand alone instead of stacking an empty state under it', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([]);
    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();
    expect(tool.element.querySelector('.admin-requests-empty').classList.contains('hidden')).toBe(false);

    RequestsApi.getOpenRequests.mockRejectedValue(new Error('Serverfehler'));
    await tool.load();
    await flush();

    const status = tool.element.querySelector('.admin-requests-status');
    const empty = tool.element.querySelector('.admin-requests-empty');
    expect(status.classList.contains('hidden')).toBe(false);
    expect(status.textContent).toBe('Serverfehler');
    expect(empty.classList.contains('hidden')).toBe(true);
  });

  it('has no search: the area offers no filter to the page', () => {
    expect(createAdminRequestsTool().setFilter).toBeUndefined();
  });

  it('describes itself for the admin menu, with the icon as a factory', () => {
    const tool = createAdminRequestsTool();

    expect(tool.id).toBe('requests');
    expect(tool.label).toBe('Anfragen');
    expect(tool.description).toBeTruthy();
    // Ein einzelner Knoten würde zwischen Menükarte und Bereichskopf wandern.
    expect(tool.icon()).not.toBe(tool.icon());
  });

  it('shows open problem reports as their own group above the requests, clearly marked', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([makeRequest()]);
    ReportsApi.getOpen.mockResolvedValue([{
      id: 7, item_id: 'abc', item_type: 'Series', title: 'Severance', report_scope: 'season', season_number: 2,
      problem: 'no-german', message: 'Nur Englisch', status: 'open', username: 'bob', created_at: Date.UTC(2026, 8, 20)
    }]);

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    const groups = [...tool.element.querySelectorAll('.admin-requests-group-title')].map(el => el.textContent);
    expect(groups).toEqual(['Problemmeldungen1', 'Medienanfragen1']);
    const report = tool.element.querySelector('.admin-report-item');
    expect(report.querySelector('.admin-item-kind').textContent).toBe('Problem');
    expect(report.textContent).toContain('Keine deutsche Tonspur');
    expect(report.textContent).toContain('Staffel 2');
    expect(report.textContent).toContain('Nur Englisch');
    expect(tool.element.querySelector('.admin-request-item:not(.admin-report-item) .admin-item-kind').textContent).toBe('Anfrage');
  });

  it('resolves a report and reloads', async () => {
    RequestsApi.getOpenRequests.mockResolvedValue([]);
    ReportsApi.getOpen.mockResolvedValueOnce([{
      id: 7, item_id: 'abc', item_type: 'Movie', title: 'Heat', problem: 'playback', message: '', status: 'open', username: 'bob', created_at: 1
    }]);
    ReportsApi.resolve.mockResolvedValue({});

    const tool = createAdminRequestsTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-report-resolve').click();
    await flush();

    expect(ReportsApi.resolve).toHaveBeenCalledWith(7);
    expect(appStore.showToast).toHaveBeenCalledWith(expect.stringContaining('erledigt'), 'success');
    expect(ReportsApi.getOpen).toHaveBeenCalledTimes(2);
  });
});
