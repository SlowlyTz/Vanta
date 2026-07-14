import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminUsersApi } from '../../../../../src/public/js/api/admin-users.api.js';
import { createAdminUserRow } from '../../../../../src/public/js/components/admin-tools/users/adminUserRow.js';

vi.mock('../../../../../src/public/js/api/admin-users.api.js', () => ({
  AdminUsersApi: {
    renameUser: vi.fn(),
    setPassword: vi.fn(),
    deleteUser: vi.fn(),
    banUser: vi.fn(),
    unbanUser: vi.fn(),
    setLibraryAccess: vi.fn(),
    setStreamLimit: vi.fn()
  }
}));

function makeUser(overrides = {}) {
  return {
    id: 'u1',
    name: 'alice',
    isAdmin: false,
    isDisabled: false,
    isBanned: false,
    maxConcurrentStreams: 1,
    activeStreams: 0,
    enableAllFolders: true,
    enabledFolders: [],
    ...overrides
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('createAdminUserRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.querySelectorAll('.admin-user-dialog-overlay').forEach(el => el.remove());
  });

  it('renders only a summary row with no inline detail panel', () => {
    const row = createAdminUserRow(makeUser());

    expect(row.querySelector('.admin-user-detail')).toBeNull();
    expect(row.querySelector('.admin-user-row-summary')).toBeTruthy();
  });

  it('calls onEdit with the user when Bearbeiten is clicked, without rendering a detail panel', () => {
    const onEdit = vi.fn();
    const user = makeUser();
    const row = createAdminUserRow(user, { onEdit });

    const editBtn = row.querySelector('.admin-user-action-btn');
    editBtn.click();

    expect(onEdit).toHaveBeenCalledWith(user);
    expect(row.querySelector('.admin-user-detail')).toBeNull();
  });

  it('opens a ban dialog that requires a non-empty reason before confirming', async () => {
    const onChange = vi.fn();
    const row = createAdminUserRow(makeUser(), { onChange });
    document.body.appendChild(row);

    const banBtn = Array.from(row.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Sperren');
    banBtn.click();

    const dialog = document.querySelector('.admin-user-dialog-overlay');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('alice sperren');

    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === 'Sperren');
    confirmBtn.click();
    await flush();

    expect(AdminUsersApi.banUser).not.toHaveBeenCalled();
    expect(dialog.querySelector('.admin-user-dialog-error').classList.contains('hidden')).toBe(false);

    dialog.querySelector('textarea').value = 'Account geteilt';
    confirmBtn.click();
    await flush();

    expect(AdminUsersApi.banUser).toHaveBeenCalledWith('u1', 'Account geteilt', 'alice');
    expect(onChange).toHaveBeenCalled();
    expect(document.querySelector('.admin-user-dialog-overlay')).toBeNull();

    document.body.removeChild(row);
  });

  it('unbans directly without a dialog when the user is already banned', async () => {
    const onChange = vi.fn();
    AdminUsersApi.unbanUser.mockResolvedValue({ success: true });
    const row = createAdminUserRow(makeUser({ isBanned: true }), { onChange });

    const unbanBtn = Array.from(row.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Entsperren');
    unbanBtn.click();
    await flush();

    expect(AdminUsersApi.unbanUser).toHaveBeenCalledWith('u1');
    expect(onChange).toHaveBeenCalled();
  });

  it('requires the exact username before confirming deletion', async () => {
    const onChange = vi.fn();
    const row = createAdminUserRow(makeUser(), { onChange });
    document.body.appendChild(row);

    const deleteBtn = Array.from(row.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Löschen');
    deleteBtn.click();

    const dialog = document.querySelector('.admin-user-dialog-overlay');
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === 'Endgültig löschen');
    const input = dialog.querySelector('input[type="text"]');

    input.value = 'wrong-name';
    confirmBtn.click();
    await flush();
    expect(AdminUsersApi.deleteUser).not.toHaveBeenCalled();

    input.value = 'alice';
    confirmBtn.click();
    await flush();

    expect(AdminUsersApi.deleteUser).toHaveBeenCalledWith('u1');
    expect(onChange).toHaveBeenCalled();

    document.body.removeChild(row);
  });

  it('disables ban and delete actions for the current admin (self-protection)', () => {
    const row = createAdminUserRow(makeUser({ id: 'admin-1' }), { currentAdminId: 'admin-1' });

    const banBtn = Array.from(row.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Sperren');
    const deleteBtn = Array.from(row.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Löschen');

    expect(banBtn.disabled).toBe(true);
    expect(deleteBtn.disabled).toBe(true);
  });
});
