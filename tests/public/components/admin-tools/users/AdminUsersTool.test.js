import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminUsersApi } from '../../../../../src/public/js/api/admin-users.api.js';
import { AuthApi } from '../../../../../src/public/js/api/auth.api.js';
import { appStore } from '../../../../../src/public/js/store/app.store.js';
import { createAdminUsersTool } from '../../../../../src/public/js/components/admin-tools/users/AdminUsersTool.js';

vi.mock('../../../../../src/public/js/api/admin-users.api.js', () => ({
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

vi.mock('../../../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));

vi.mock('../../../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

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

async function flush() {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
}

// Die Detailansicht liegt seit dem Umbau als Modal an document.body, nicht
// mehr als Slot im Tool-Element.
function detailModal() {
  return document.querySelector('.admin-user-dialog-detail');
}

describe('AdminUsersTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthApi.getCurrentUser.mockResolvedValue({ user: { id: 'admin-1', name: 'admin', isAdmin: true } });
    AdminUsersApi.listLibraries.mockResolvedValue({ libraries: [{ id: 'lib-1', name: 'Movies' }] });
  });

  afterEach(() => {
    document.querySelectorAll('.admin-user-dialog-overlay').forEach(el => el.remove());
  });

  it('shows a compact loader while loading, then renders one row per user', async () => {
    let resolveUsers;
    AdminUsersApi.listUsers.mockReturnValue(new Promise(resolve => { resolveUsers = resolve; }));

    const tool = createAdminUsersTool();
    tool.load();

    expect(tool.element.querySelector('.section-loader')).toBeTruthy();

    resolveUsers({ users: [makeUser({ id: 'u1', name: 'alice' }), makeUser({ id: 'u2', name: 'bob' })] });
    await flush();

    expect(tool.element.querySelector('.section-loader')).toBeNull();
    expect(tool.element.querySelectorAll('.admin-user-row')).toHaveLength(2);
  });

  it('shows a message and details for each user: name, badges, stream counts', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [makeUser({ isAdmin: true, isBanned: true, activeStreams: 2, maxConcurrentStreams: 3 })]
    });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    const row = tool.element.querySelector('.admin-user-row');
    expect(row.querySelector('.admin-user-row-name').textContent).toBe('alice');
    expect(row.querySelector('.admin-user-badge-admin')).toBeTruthy();
    expect(row.querySelector('.admin-user-badge-banned')).toBeTruthy();
    expect(row.querySelector('.admin-user-stream-info').textContent).toBe('2/3 Streams');
  });

  it('no longer renders its own search input — the filter term comes from the outside via setFilter', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    expect(tool.element.querySelector('.admin-users-search')).toBeNull();
    expect(typeof tool.setFilter).toBe('function');
  });

  it('filters the visible rows via setFilter', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [makeUser({ id: 'u1', name: 'alice' }), makeUser({ id: 'u2', name: 'bob' })]
    });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.setFilter('ali');

    const names = Array.from(tool.element.querySelectorAll('.admin-user-row-name')).map(el => el.textContent);
    expect(names).toEqual(['alice']);
  });

  it('clears the filter and shows every user again', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [makeUser({ id: 'u1', name: 'alice' }), makeUser({ id: 'u2', name: 'bob' })]
    });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.setFilter('ali');
    expect(tool.element.querySelectorAll('.admin-user-row')).toHaveLength(1);

    tool.setFilter('');
    expect(tool.element.querySelectorAll('.admin-user-row')).toHaveLength(2);
  });

  it('does not rebuild the list when setFilter yields the exact same result as before', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [makeUser({ id: 'u1', name: 'alice' }), makeUser({ id: 'u2', name: 'bob' })]
    });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.setFilter('ali');
    const rowBefore = tool.element.querySelector('.admin-user-row');

    tool.setFilter('ali');
    const rowAfter = tool.element.querySelector('.admin-user-row');

    expect(rowAfter).toBe(rowBefore);
  });

  it('shows an empty state and no crash when the user list is empty', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    expect(tool.element.querySelectorAll('.admin-user-row')).toHaveLength(0);
    expect(tool.element.textContent).toContain('Keine Nutzer gefunden');
  });

  it('shows an error status when loading fails', async () => {
    AdminUsersApi.listUsers.mockRejectedValue(new Error('Netzwerkfehler'));

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    const status = tool.element.querySelector('.admin-requests-status');
    expect(status.classList.contains('hidden')).toBe(false);
    expect(status.textContent).toContain('Netzwerkfehler');
  });

  it('clicking a user row opens the detail view in a modal and leaves the list standing', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    const listView = tool.element.querySelector('.admin-users-list-view');
    expect(listView.hidden).toBe(false);
    expect(detailModal()).toBeNull();

    tool.element.querySelector('.admin-user-row-summary').click();

    const modal = detailModal();
    expect(modal).toBeTruthy();
    expect(modal.querySelector('.admin-user-detail-view')).toBeTruthy();
    expect(modal.querySelector('.admin-user-detail-name').textContent).toBe('alice');

    // Die Liste verschwindet nicht mehr hinter der Detailansicht.
    expect(listView.hidden).toBe(false);
    expect(tool.element.querySelectorAll('.admin-user-row')).toHaveLength(1);
  });

  it('closing the detail modal removes it and reloads the list', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();
    expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(1);

    tool.element.querySelector('.admin-user-row-summary').click();
    expect(detailModal()).toBeTruthy();

    detailModal().querySelector('.admin-user-dialog-close').click();
    await flush();

    expect(detailModal()).toBeNull();
    // Neu geladen, damit im Hintergrund geänderte Namen/Badges/Limits stimmen.
    expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(2);
  });

  it('the tool renders no back control of its own — the modal closes itself', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    expect(tool.registerBackControl).toBeUndefined();
    expect(tool.element.querySelector('.admin-view-back-button')).toBeNull();

    tool.element.querySelector('.admin-user-row-summary').click();
    expect(detailModal().querySelector('.admin-user-dialog-close')).toBeTruthy();
  });

  it('after saving a field, the detail modal stays open and shows the refreshed record', async () => {
    AdminUsersApi.listUsers
      .mockResolvedValueOnce({ users: [makeUser({ maxConcurrentStreams: 1 })] })
      .mockResolvedValueOnce({ users: [makeUser({ maxConcurrentStreams: 2 })] });
    AdminUsersApi.setStreamLimit.mockResolvedValue({ maxConcurrentStreams: 2 });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-row-summary').click();

    const input = detailModal().querySelector('.admin-user-stream-input');
    input.value = '2';
    detailModal().querySelector('.admin-user-save-all').click();
    await flush();

    expect(AdminUsersApi.setStreamLimit).toHaveBeenCalledWith('u1', 2);
    expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(2);

    // Das Modal wird durch eines mit frischen Daten ersetzt — dieses Ersetzen
    // darf kein weiteres Neuladen auslösen (sonst close -> load -> showDetail).
    expect(document.querySelectorAll('.admin-user-dialog-detail')).toHaveLength(1);
    expect(detailModal().querySelector('.admin-user-stream-info').textContent).toBe('0/2 Streams');
  });

  it('closes the detail modal when the open user disappears after a reload (e.g. deleted)', async () => {
    AdminUsersApi.listUsers
      .mockResolvedValueOnce({ users: [makeUser({ id: 'u1' })] })
      .mockResolvedValueOnce({ users: [] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-row-summary').click();

    const deleteBtn = Array.from(detailModal().querySelectorAll('.admin-user-action-btn'))
      .find(b => b.textContent === 'Löschen');
    deleteBtn.click();

    const confirmDialog = Array.from(document.querySelectorAll('.admin-user-dialog-overlay'))
      .find(el => !el.classList.contains('admin-user-dialog-detail'));
    confirmDialog.querySelector('input[type="text"]').value = 'alice';
    Array.from(confirmDialog.querySelectorAll('button')).find(b => b.textContent === 'Endgültig löschen').click();
    await flush();

    expect(detailModal()).toBeNull();
    expect(tool.element.querySelector('.admin-users-list-view').hidden).toBe(false);
  });

  it('shows a global success toast (not a local admin-user-toast) after a successful save', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });
    AdminUsersApi.setStreamLimit.mockResolvedValue({ maxConcurrentStreams: 2 });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-row-summary').click();
    const input = detailModal().querySelector('.admin-user-stream-input');
    input.value = '2';
    detailModal().querySelector('.admin-user-save-all').click();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Änderungen gespeichert', 'success');
    expect(document.querySelector('.admin-user-toast')).toBeNull();
  });

  it('shows a global error toast when a save fails', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });
    AdminUsersApi.renameUser.mockRejectedValue(new Error('Nutzer konnte nicht umbenannt werden'));

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-row-summary').click();
    const nameInput = detailModal().querySelector('.admin-user-field-row input[type="text"]');
    nameInput.value = 'bob';
    detailModal().querySelector('.admin-user-save-all').click();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Nutzer konnte nicht umbenannt werden', 'error');
  });
  it('destroy() closes an open detail modal without triggering another reload', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-row-summary').click();
    expect(detailModal()).toBeTruthy();

    tool.destroy();
    await flush();

    // Das Modal haengt an document.body — ohne destroy() bliebe es beim
    // Seitenwechsel stehen, samt seinem Escape-Handler am document.
    expect(detailModal()).toBeNull();
    expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(1);
  });
});
