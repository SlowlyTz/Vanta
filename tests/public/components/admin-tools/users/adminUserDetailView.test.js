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
    setStreamLimit: vi.fn(),
    setAgeLimit: vi.fn()
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

const libraries = [
  { id: 'lib-1', name: 'Movies', collectionType: 'movies', itemCount: 300, previews: [{ id: 'm1', tag: 't' }] },
  { id: 'lib-2', name: 'Series', collectionType: 'tvshows', itemCount: 90, previews: [] },
  { id: 'lib-3', name: 'Sammlungen', collectionType: 'boxsets', itemCount: null, previews: [] }
];

const allSwitch = view => view.querySelector('.admin-library-all input');
const libraryCheck = (view, name) => [...view.querySelectorAll('.admin-library-row')]
  .find(row => row.querySelector('strong').textContent === name).querySelector('input');
const toggle = input => {
  input.checked = !input.checked;
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

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

  it('renders a header with name and stream counter', () => {
    const view = createAdminUserDetailView(makeUser({ activeStreams: 1, maxConcurrentStreams: 2 }), { libraries });

    expect(view.querySelector('.admin-user-detail-name').textContent).toBe('alice');
    expect(view.querySelector('.admin-user-stream-info').textContent).toBe('1/2 Streams');
    expect(view.querySelectorAll('input[type="radio"]')).toHaveLength(0);
  });

  it('does not render its own back button (navigation is owned by the shared admin-tools header)', () => {
    const view = createAdminUserDetailView(makeUser(), { libraries });
    expect(view.querySelector('.admin-view-back-button')).toBeNull();
  });

  it('shows the save bar only while something differs from what is saved', async () => {
    const view = createAdminUserDetailView(makeUser(), { libraries });
    const bar = view.querySelector('.admin-user-save-bar');
    expect(bar.hidden).toBe(true);
    expect(bar.querySelector('.admin-user-save-all').textContent).toBe('Änderungen speichern');

    const [nameInput] = view.querySelectorAll('.admin-user-field-row input[type="text"]');
    nameInput.value = 'bob';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(bar.hidden).toBe(false);

    nameInput.value = 'alice';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(bar.hidden).toBe(true);
  });

  it('hides the library list while the user may see every library', () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: true }), { libraries });

    expect(allSwitch(view).checked).toBe(true);
    expect(view.querySelector('.admin-library-list').hidden).toBe(true);
    expect(view.querySelector('.admin-library-summary').textContent).toBe('Sieht alle 3 Bibliotheken.');
  });

  it('lists the libraries grouped by kind with their size, and sums up the choice', () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: false, enabledFolders: ['lib-1'] }), { libraries });

    const groups = [...view.querySelectorAll('.admin-library-group-title')].map(el => el.textContent);
    expect(groups).toEqual(['Filme', 'Serien', 'Sonstiges']);
    expect(libraryCheck(view, 'Movies').checked).toBe(true);
    expect(libraryCheck(view, 'Series').checked).toBe(false);
    expect(view.querySelector('.admin-library-row').textContent).toContain('300 Titel');
    expect(view.querySelector('.admin-library-previews img')).toBeTruthy();
    expect(view.querySelector('.admin-library-summary').textContent).toBe('Sieht 1 von 3 Bibliotheken · 300 Titel');

    toggle(libraryCheck(view, 'Movies'));
    expect(view.querySelector('.admin-library-summary').textContent).toBe('Ohne Bibliothek sieht der Nutzer nichts.');

    [...view.querySelectorAll('.admin-library-bulk')].find(button => button.textContent === 'Alle auswählen').click();
    expect(view.querySelector('.admin-library-summary').textContent).toBe('Sieht 3 von 3 Bibliotheken · 390 Titel');
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

    toggle(allSwitch(view));

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setLibraryAccess).toHaveBeenCalledWith('u1', true, []);
  });

  it('saves library access with the selected folder ids when specific libraries are chosen', async () => {
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: false, enabledFolders: [] }), { libraries });

    toggle(libraryCheck(view, 'Series'));

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setLibraryAccess).toHaveBeenCalledWith('u1', false, ['lib-2']);
  });

  it('offers to take a saved library change back', async () => {
    const notify = vi.fn();
    const onReload = vi.fn();
    const view = createAdminUserDetailView(makeUser({ enableAllFolders: false, enabledFolders: ['lib-1'] }), { libraries, notify, onReload });

    toggle(libraryCheck(view, 'Series'));
    getSaveButton(view).click();
    await flush();

    const [, , options] = notify.mock.calls.find(call => call[0] === 'Änderungen gespeichert');
    await options.action.onClick();
    expect(AdminUsersApi.setLibraryAccess).toHaveBeenLastCalledWith('u1', false, ['lib-1']);
    expect(onReload).toHaveBeenCalled();
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

  it('opens a ban dialog from the danger zone that requires a non-empty reason before confirming', async () => {
    const onReload = vi.fn();
    const view = createAdminUserDetailView(makeUser(), { libraries, onReload });
    document.body.appendChild(view);

    const banBtn = Array.from(view.querySelectorAll('.admin-user-danger-zone .admin-user-action-btn')).find(b => b.textContent === 'Sperren');
    banBtn.click();

    const dialog = document.querySelector('.admin-user-dialog-overlay');
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
    expect(onReload).toHaveBeenCalled();

    document.body.removeChild(view);
  });

  it('unbans directly without a dialog when the user is already banned', async () => {
    const onReload = vi.fn();
    AdminUsersApi.unbanUser.mockResolvedValue({ success: true });
    const view = createAdminUserDetailView(makeUser({ isBanned: true }), { libraries, onReload });

    Array.from(view.querySelectorAll('.admin-user-action-btn')).find(b => b.textContent === 'Entsperren').click();
    await flush();

    expect(AdminUsersApi.unbanUser).toHaveBeenCalledWith('u1');
    expect(onReload).toHaveBeenCalled();
  });

  it('steps the stream limit with −/+ within 0 to 20', () => {
    const view = createAdminUserDetailView(makeUser({ maxConcurrentStreams: 19 }), { libraries });
    const [minus, plus] = view.querySelectorAll('.admin-user-stepper-button');
    const input = view.querySelector('.admin-user-stream-input');

    plus.click();
    plus.click();
    expect(input.value).toBe('20');
    minus.click();
    expect(input.value).toBe('19');
  });

  it('saves the FSK limit and the unrated block, and nothing else', async () => {
    AdminUsersApi.setAgeLimit.mockResolvedValue({ maxAge: 12, blockUnrated: true });
    const view = createAdminUserDetailView(makeUser({ maxAge: null, blockUnrated: false }), { libraries, notify: vi.fn(), onReload: vi.fn() });
    document.body.appendChild(view);

    const fsk12 = [...view.querySelectorAll('.settings-segmented-option')].find(button => button.textContent === 'FSK 12');
    fsk12.click();
    const unrated = view.querySelector('input[aria-label="Titel ohne Altersfreigabe sperren"]');
    toggle(unrated);
    await flush();
    expect(view.querySelector('.admin-user-save-bar').hidden).toBe(false);

    getSaveButton(view).click();
    await flush();

    expect(AdminUsersApi.setAgeLimit).toHaveBeenCalledWith('u1', 12, true);
    expect(AdminUsersApi.setLibraryAccess).not.toHaveBeenCalled();
    expect(AdminUsersApi.setStreamLimit).not.toHaveBeenCalled();
    view.remove();
  });

  it('shows the limit the account has', () => {
    const view = createAdminUserDetailView(makeUser({ maxAge: 16, blockUnrated: true }), { libraries });
    const active = view.querySelector('.settings-segmented-option.is-active');
    expect(active.textContent).toBe('FSK 16');
    expect(view.querySelector('input[aria-label="Titel ohne Altersfreigabe sperren"]').checked).toBe(true);
  });
});
