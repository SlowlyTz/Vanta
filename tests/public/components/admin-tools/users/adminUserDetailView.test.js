import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminUsersApi } from '../../../../../src/public/js/api/admin-users.api.js';
import { createAdminUserDetailView } from '../../../../../src/public/js/components/admin-tools/users/adminUserDetailView.js';

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

const libraries = [{ id: 'lib-1', name: 'Movies' }, { id: 'lib-2', name: 'Series' }];

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function getSaveButton(view) {
  return view.querySelector('.admin-user-save-all');
}

describe('createAdminUserDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AdminUsersApi.renameUser.mockResolvedValue({});
    AdminUsersApi.setPassword.mockResolvedValue(true);
    AdminUsersApi.setLibraryAccess.mockResolvedValue({});
    AdminUsersApi.setStreamLimit.mockResolvedValue({});
  });

  afterEach(() => {
    document.querySelectorAll('.admin-user-dialog-overlay').forEach(el => el.remove());
  });

  it('renders a header with name, stream counter, and no native radio/checkbox inputs', () => {
    const view = createAdminUserDetailView(makeUser({ activeStreams: 1, maxConcurrentStreams: 2 }), { libraries });

    expect(view.querySelector('.admin-user-detail-name').textContent).toBe('alice');
    expect(view.querySelector('.admin-user-stream-info').textContent).toBe('1/2 Streams');
    expect(view.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(view.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it('does not render its own back button (navigation is owned by the shared admin-tools header)', () => {
    const view = createAdminUserDetailView(makeUser(), { libraries });
    expect(view.querySelector('.admin-view-back-button')).toBeNull();
  });

  it('renders exactly one Speichern button for the whole form, at the bottom', () => {
    const view = createAdminUserDetailView(makeUser(), { libraries });

    const saveButtons = Array.from(view.querySelectorAll('button')).filter(b => b.textContent === 'Speichern');
    expect(saveButtons).toHaveLength(1);
    expect(saveButtons[0].classList.contains('admin-user-save-all')).toBe(true);

    const body = view.querySelector('.admin-user-detail-body');
    expect(body.lastElementChild.contains(saveButtons[0])).toBe(true);
  });

  it('hides the library grid when "Alle Bibliotheken" is active', () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: true }), { libraries });

    const grid = view.querySelector('.admin-user-library-grid');
    expect(grid.classList.contains('hidden')).toBe(true);
    expect(grid.querySelectorAll('.admin-user-library-toggle')).toHaveLength(0);
  });

  it('shows library toggle buttons with correct aria-pressed when "Ausgewählte Bibliotheken" is active', () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: false, enabledFolders: ['lib-1'] }), { libraries });

    const grid = view.querySelector('.admin-user-library-grid');
    expect(grid.classList.contains('hidden')).toBe(false);

    const toggles = Array.from(grid.querySelectorAll('.admin-user-library-toggle'));
    expect(toggles).toHaveLength(2);
    const movieToggle = toggles.find(b => b.textContent === 'Movies');
    const seriesToggle = toggles.find(b => b.textContent === 'Series');
    expect(movieToggle.getAttribute('aria-pressed')).toBe('true');
    expect(seriesToggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('switching to "Ausgewählte Bibliotheken" reveals the toggle grid, switching back hides it', () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: true }), { libraries });

    const [allBtn, selectedBtn] = view.querySelectorAll('.admin-user-choice-btn');
    const grid = view.querySelector('.admin-user-library-grid');

    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
    selectedBtn.click();

    expect(grid.classList.contains('hidden')).toBe(false);
    expect(grid.querySelectorAll('.admin-user-library-toggle')).toHaveLength(2);
    expect(selectedBtn.getAttribute('aria-pressed')).toBe('true');

    allBtn.click();
    expect(grid.classList.contains('hidden')).toBe(true);
  });

  it('does nothing and shows an info notice when Speichern is clicked without any changes', async () => {
    const notify = vi.fn();
    const view = createAdminUserDetailView(makeUser(), { libraries, notify });

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.renameUser).not.toHaveBeenCalled();
    expect(AdminUsersApi.setPassword).not.toHaveBeenCalled();
    expect(AdminUsersApi.setLibraryAccess).not.toHaveBeenCalled();
    expect(AdminUsersApi.setStreamLimit).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Keine Änderungen'), 'info');
  });

  it('rejects an out-of-range stream limit before calling any API', async () => {
    const notify = vi.fn();
    const view = createAdminUserDetailView(makeUser(), { libraries, notify });

    view.querySelector('.admin-user-stream-input').value = '50';
    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setStreamLimit).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('zwischen 0 und 20'), 'error');
  });

  it('rejects an empty username before calling any API', async () => {
    const notify = vi.fn();
    const view = createAdminUserDetailView(makeUser(), { libraries, notify });

    const [nameInput] = view.querySelectorAll('.admin-user-field-row input');
    nameInput.value = '   ';
    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.renameUser).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Name'), 'error');
  });

  it('saves only the fields that changed, in a single click, and reloads once', async () => {
    const onReload = vi.fn();
    const notify = vi.fn();
    const view = createAdminUserDetailView(makeUser({ maxConcurrentStreams: 1 }), { libraries, onReload, notify });

    const [nameInput] = view.querySelectorAll('.admin-user-field-row input[type="text"]');
    nameInput.value = 'bob';
    view.querySelector('.admin-user-stream-input').value = '3';

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.renameUser).toHaveBeenCalledWith('u1', 'bob');
    expect(AdminUsersApi.setStreamLimit).toHaveBeenCalledWith('u1', 3);
    expect(AdminUsersApi.setPassword).not.toHaveBeenCalled();
    expect(AdminUsersApi.setLibraryAccess).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Änderungen gespeichert', 'success');
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('saves a changed password together with other fields via the single Speichern button', async () => {
    const view = createAdminUserDetailView(makeUser(), { libraries });

    const [, passwordInput] = view.querySelectorAll('.admin-user-field-row input');
    passwordInput.value = 'new-secret';

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setPassword).toHaveBeenCalledWith('u1', 'new-secret');
  });

  it('saves library access with enableAllFolders:true and an empty list when "Alle Bibliotheken" is chosen', async () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: false, enabledFolders: ['lib-1'] }), { libraries });

    const [allBtn] = view.querySelectorAll('.admin-user-choice-btn');
    allBtn.click();

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setLibraryAccess).toHaveBeenCalledWith('u1', true, []);
  });

  it('saves library access with the selected folder ids when specific libraries are chosen', async () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: false, enabledFolders: [] }), { libraries });

    const toggles = Array.from(view.querySelectorAll('.admin-user-library-toggle'));
    toggles.find(b => b.textContent === 'Series').click();

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setLibraryAccess).toHaveBeenCalledWith('u1', false, ['lib-2']);
  });

  it('reports a partial failure when only some of the changed fields fail to save', async () => {
    const notify = vi.fn();
    AdminUsersApi.setStreamLimit.mockRejectedValue(new Error('Stream-Limit konnte nicht aktualisiert werden'));
    const view = createAdminUserDetailView(makeUser(), { libraries, notify });

    const [nameInput] = view.querySelectorAll('.admin-user-field-row input[type="text"]');
    nameInput.value = 'bob';
    view.querySelector('.admin-user-stream-input').value = '5';

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.renameUser).toHaveBeenCalledWith('u1', 'bob');
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Stream-Limit'), 'error');
  });

  it('disables ban and delete actions for the current admin (self-protection)', () => {
    const view = createAdminUserDetailView(makeUser({ id: 'admin-1' }), { libraries, currentAdminId: 'admin-1' });

    const banBtn = Array.from(view.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Sperren');
    const deleteBtn = Array.from(view.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Löschen');

    expect(banBtn.disabled).toBe(true);
    expect(deleteBtn.disabled).toBe(true);
  });

  it('deleting the user from the detail view triggers a reload so the caller can navigate back with fresh data', async () => {
    const onReload = vi.fn();
    const view = createAdminUserDetailView(makeUser(), { libraries, onReload });
    document.body.appendChild(view);

    const deleteBtn = Array.from(view.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Löschen');
    deleteBtn.click();

    const dialog = document.querySelector('.admin-user-dialog-overlay');
    dialog.querySelector('input[type="text"]').value = 'alice';
    const confirmBtn = Array.from(dialog.querySelectorAll('button')).find(b => b.textContent === 'Endgültig löschen');
    confirmBtn.click();
    await flush();

    expect(AdminUsersApi.deleteUser).toHaveBeenCalledWith('u1');
    expect(onReload).toHaveBeenCalled();

    document.body.removeChild(view);
  });
});
