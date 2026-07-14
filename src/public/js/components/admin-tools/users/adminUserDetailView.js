import { createElement } from '../../../utils/dom.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { openBanDialog, openDeleteDialog } from './adminUserDialogs.js';
import { buildRenameField, buildPasswordField, buildLibraryField, buildStreamLimitField } from './adminUserDetailView/fields.js';

export function createAdminUserDetailView(user, {
  libraries = [],
  currentAdminId = null,
  onReload,
  notify
} = {}) {
  const isSelf = currentAdminId != null && user.id === currentAdminId;

  const badges = createElement('div', { className: 'admin-user-badges' });
  if (user.isAdmin) {
    badges.appendChild(createElement('span', { className: 'admin-user-badge admin-user-badge-admin' }, 'Admin'));
  }
  if (user.isBanned) {
    badges.appendChild(createElement('span', { className: 'admin-user-badge admin-user-badge-banned' }, 'Gesperrt'));
  }
  if (user.isDisabled) {
    badges.appendChild(createElement('span', { className: 'admin-user-badge admin-user-badge-disabled' }, 'Deaktiviert'));
  }

  const streamInfo = createElement('span', { className: 'admin-user-stream-info' },
    `${user.activeStreams}/${user.maxConcurrentStreams} Streams`);

  const banBtn = createElement('button', {
    className: `admin-user-action-btn${user.isBanned ? '' : ' admin-user-action-danger'}`,
    type: 'button',
    disabled: isSelf,
    title: isSelf ? 'Du kannst dich nicht selbst sperren' : undefined,
    onClick: async () => {
      if (user.isBanned) {
        banBtn.disabled = true;
        try {
          await AdminUsersApi.unbanUser(user.id);
          notify?.('Nutzer entsperrt', 'success');
          await onReload?.();
        } catch (error) {
          notify?.(error.message || 'Entsperren fehlgeschlagen', 'error');
          banBtn.disabled = false;
        }
        return;
      }

      openBanDialog({
        user,
        onConfirm: async (reason) => {
          await AdminUsersApi.banUser(user.id, reason, user.name);
          notify?.('Nutzer gesperrt', 'success');
          await onReload?.();
        }
      });
    }
  }, user.isBanned ? 'Entsperren' : 'Sperren');

  const deleteBtn = createElement('button', {
    className: 'admin-user-action-btn admin-user-action-danger',
    type: 'button',
    disabled: isSelf,
    title: isSelf ? 'Du kannst dein eigenes Konto nicht löschen' : undefined,
    onClick: () => {
      openDeleteDialog({
        user,
        onConfirm: async () => {
          await AdminUsersApi.deleteUser(user.id);
          notify?.('Nutzer gelöscht', 'success');
          await onReload?.();
        }
      });
    }
  }, 'Löschen');

  const header = createElement('div', { className: 'admin-user-detail-header' },
    createElement('div', { className: 'admin-user-detail-header-main' },
      createElement('div', { className: 'admin-user-detail-name-row' },
        createElement('h3', { className: 'admin-user-detail-name' }, user.name),
        badges
      ),
      streamInfo
    ),
    createElement('div', { className: 'admin-user-detail-header-actions' }, banBtn, deleteBtn)
  );

  const renameField = buildRenameField(user);
  const passwordField = buildPasswordField();
  const libraryField = buildLibraryField(user, libraries);
  const streamField = buildStreamLimitField(user);

  const saveAllBtn = createElement('button', {
    className: 'btn-primary admin-user-save-all',
    type: 'button',
    onClick: () => handleSaveAll()
  }, 'Speichern');

  async function handleSaveAll() {
    const name = renameField.getValue();
    if (!name) {
      notify?.('Name darf nicht leer sein', 'error');
      return;
    }

    if (!streamField.isValid()) {
      notify?.('Wert muss eine ganze Zahl zwischen 0 und 20 sein', 'error');
      return;
    }

    const tasks = [];

    if (renameField.hasChanged()) {
      tasks.push({ label: 'Benutzername', run: () => AdminUsersApi.renameUser(user.id, name) });
    }
    if (passwordField.hasChanged()) {
      const password = passwordField.getValue();
      tasks.push({ label: 'Passwort', run: () => AdminUsersApi.setPassword(user.id, password) });
    }
    if (libraryField.hasChanged()) {
      const { enableAllFolders, enabledFolders } = libraryField.getValue();
      tasks.push({ label: 'Bibliothekszugriff', run: () => AdminUsersApi.setLibraryAccess(user.id, enableAllFolders, enabledFolders) });
    }
    if (streamField.hasChanged()) {
      const maxConcurrentStreams = streamField.getValue();
      tasks.push({ label: 'Stream-Limit', run: () => AdminUsersApi.setStreamLimit(user.id, maxConcurrentStreams) });
    }

    if (tasks.length === 0) {
      notify?.('Keine Änderungen zum Speichern', 'info');
      return;
    }

    saveAllBtn.disabled = true;
    saveAllBtn.setAttribute('aria-busy', 'true');

    const results = await Promise.allSettled(tasks.map(task => task.run()));
    const failedTasks = tasks.filter((_, index) => results[index].status === 'rejected');

    if (failedTasks.length === 0) {
      passwordField.clear();
      notify?.('Änderungen gespeichert', 'success');
    } else if (failedTasks.length === tasks.length) {
      const firstError = results.find(r => r.status === 'rejected')?.reason;
      notify?.(firstError?.message || 'Speichern fehlgeschlagen', 'error');
    } else {
      notify?.(`Teilweise gespeichert. Fehlgeschlagen: ${failedTasks.map(t => t.label).join(', ')}`, 'error');
    }

    saveAllBtn.disabled = false;
    saveAllBtn.removeAttribute('aria-busy');
    await onReload?.();
  }

  const body = createElement('div', { className: 'admin-user-detail-body' },
    renameField.element,
    passwordField.element,
    libraryField.element,
    streamField.element,
    createElement('div', { className: 'admin-user-save-all-row' }, saveAllBtn)
  );

  return createElement('div', { className: 'admin-user-detail-view' }, header, body);
}
