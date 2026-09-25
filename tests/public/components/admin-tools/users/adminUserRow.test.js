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

  it('shows avatar initial, name, badges and streams', () => {
    const row = createAdminUserRow(makeUser({ isAdmin: true, isBanned: true, activeStreams: 1, maxConcurrentStreams: 3 }));

    expect(row.querySelector('.admin-user-avatar').textContent).toBe('A');
    expect(row.querySelector('.admin-user-row-name').textContent).toBe('alice');
    expect(Array.from(row.querySelectorAll('.admin-user-badge')).map(b => b.textContent)).toEqual(['Admin', 'Gesperrt']);
    expect(row.querySelector('.admin-user-stream-info').textContent).toBe('1/3 Streams');
    expect(row.classList.contains('is-banned')).toBe(true);
  });

  it('opens the detail view when the row is clicked; ban and delete live there, not in the row', () => {
    const onEdit = vi.fn();
    const user = makeUser();
    const row = createAdminUserRow(user, { onEdit });

    row.querySelector('.admin-user-row-summary').click();

    expect(onEdit).toHaveBeenCalledWith(user);
    expect(row.querySelector('.admin-user-action-btn')).toBeNull();
    expect(AdminUsersApi.banUser).not.toHaveBeenCalled();
  });
});
