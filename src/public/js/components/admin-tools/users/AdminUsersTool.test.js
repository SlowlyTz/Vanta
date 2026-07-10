import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { AuthApi } from '../../../api/auth.api.js';
import { appStore } from '../../../store/app.store.js';
import { createAdminUsersTool } from './AdminUsersTool.js';

vi.mock('../../../api/admin-users.api.js', () => ({
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

vi.mock('../../../api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));

vi.mock('../../../store/app.store.js', () => ({
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

  it('filters the visible rows by the search input', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({
      users: [makeUser({ id: 'u1', name: 'alice' }), makeUser({ id: 'u2', name: 'bob' })]
    });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    const searchInput = tool.element.querySelector('.admin-users-search');
    searchInput.value = 'ali';
    searchInput.dispatchEvent(new Event('input'));

    const names = Array.from(tool.element.querySelectorAll('.admin-user-row-name')).map(el => el.textContent);
    expect(names).toEqual(['alice']);
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

  it('clicking Bearbeiten replaces the list with a full-width detail view, hiding search and the list', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    const listView = tool.element.querySelector('.admin-users-list-view');
    const detailSlot = tool.element.querySelector('.admin-users-detail-slot');
    expect(listView.hidden).toBe(false);
    expect(detailSlot.hidden).toBe(true);

    tool.element.querySelector('.admin-user-action-btn').click();

    expect(listView.hidden).toBe(true);
    expect(detailSlot.hidden).toBe(false);
    expect(detailSlot.querySelector('.admin-user-detail-view')).toBeTruthy();
    expect(detailSlot.querySelector('.admin-user-detail-name').textContent).toBe('alice');
  });

  it('registers a single shared back control instead of rendering its own back button', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });

    const setBackControl = vi.fn();
    const tool = createAdminUsersTool();
    tool.registerBackControl(setBackControl);
    await tool.load();
    await flush();

    // No back button lives inside the tool's own element; it is owned by AdminToolsPanel.
    expect(tool.element.querySelector('.admin-view-back-button')).toBeNull();
    expect(setBackControl).toHaveBeenCalledWith(null);

    tool.element.querySelector('.admin-user-action-btn').click();

    expect(setBackControl).toHaveBeenLastCalledWith(expect.any(Function));

    const detailBackHandler = setBackControl.mock.calls.at(-1)[0];
    detailBackHandler();

    const listView = tool.element.querySelector('.admin-users-list-view');
    const detailSlot = tool.element.querySelector('.admin-users-detail-slot');
    expect(listView.hidden).toBe(false);
    expect(detailSlot.hidden).toBe(true);
    expect(setBackControl).toHaveBeenLastCalledWith(null);
  });

  it('after saving a field in the detail view, the detail record is refreshed and stays on the detail view', async () => {
    AdminUsersApi.listUsers
      .mockResolvedValueOnce({ users: [makeUser({ maxConcurrentStreams: 1 })] })
      .mockResolvedValueOnce({ users: [makeUser({ maxConcurrentStreams: 2 })] });
    AdminUsersApi.setStreamLimit.mockResolvedValue({ maxConcurrentStreams: 2 });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-action-btn').click();

    const detailSlot = tool.element.querySelector('.admin-users-detail-slot');
    const input = detailSlot.querySelector('.admin-user-stream-input');
    input.value = '2';
    detailSlot.querySelector('.admin-user-save-all').click();
    await flush();

    expect(AdminUsersApi.setStreamLimit).toHaveBeenCalledWith('u1', 2);
    expect(AdminUsersApi.listUsers).toHaveBeenCalledTimes(2);
    expect(detailSlot.hidden).toBe(false);
    expect(tool.element.querySelector('.admin-users-list-view').hidden).toBe(true);
    expect(detailSlot.querySelector('.admin-user-stream-info').textContent).toBe('0/2 Streams');
  });

  it('falls back to the list when the selected user disappears after a reload (e.g. deleted)', async () => {
    AdminUsersApi.listUsers
      .mockResolvedValueOnce({ users: [makeUser({ id: 'u1' })] })
      .mockResolvedValueOnce({ users: [] });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-action-btn').click();

    const detailSlot = tool.element.querySelector('.admin-users-detail-slot');
    const deleteBtn = Array.from(detailSlot.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Löschen');
    deleteBtn.click();

    const dialog = document.querySelector('.admin-user-dialog-overlay');
    dialog.querySelector('input[type="text"]').value = 'alice';
    Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === 'Endgültig löschen').click();
    await flush();

    expect(tool.element.querySelector('.admin-users-list-view').hidden).toBe(false);
    expect(detailSlot.hidden).toBe(true);
  });

  it('shows a global success toast (not a local admin-user-toast) after a successful save', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });
    AdminUsersApi.setStreamLimit.mockResolvedValue({ maxConcurrentStreams: 2 });

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-action-btn').click();
    const detailSlot = tool.element.querySelector('.admin-users-detail-slot');
    const input = detailSlot.querySelector('.admin-user-stream-input');
    input.value = '2';
    detailSlot.querySelector('.admin-user-save-all').click();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Änderungen gespeichert', 'success');
    expect(tool.element.querySelector('.admin-user-toast')).toBeNull();
  });

  it('shows a global error toast when a save fails', async () => {
    AdminUsersApi.listUsers.mockResolvedValue({ users: [makeUser()] });
    AdminUsersApi.renameUser.mockRejectedValue(new Error('Nutzer konnte nicht umbenannt werden'));

    const tool = createAdminUsersTool();
    await tool.load();
    await flush();

    tool.element.querySelector('.admin-user-action-btn').click();
    const detailSlot = tool.element.querySelector('.admin-users-detail-slot');
    const nameInput = detailSlot.querySelector('.admin-user-field-row input[type="text"]');
    nameInput.value = 'bob';
    detailSlot.querySelector('.admin-user-save-all').click();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Nutzer konnte nicht umbenannt werden', 'error');
  });
});
