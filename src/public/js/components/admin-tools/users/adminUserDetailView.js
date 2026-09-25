import { createElement } from '../../../utils/dom.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { openBanDialog, openDeleteDialog } from './adminUserDialogs.js';
import { buildRenameField, buildPasswordField, buildLibraryField, buildStreamLimitField } from './adminUserDetailView/fields.js';
import { createUserBadges, userInitial } from './adminUserRow.js';

export function createAdminUserDetailView(user, {
  libraries = [],
  currentAdminId = null,
  onReload,
  notify
} = {}) {
  const isSelf = currentAdminId != null && user.id === currentAdminId;

  const badges = createUserBadges(user);

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
    createElement('span', { className: 'admin-user-avatar admin-user-avatar-large', 'aria-hidden': 'true' }, userInitial(user.name)),
    createElement('div', { className: 'admin-user-detail-header-main' },
      createElement('div', { className: 'admin-user-detail-name-row' },
        createElement('h3', { className: 'admin-user-detail-name' }, user.name),
        badges
      ),
      streamInfo
    )
  );

  // Sperren und Löschen am Ende, abgesetzt als eigene Gruppe.
  const dangerRow = (title, hint, button) => createElement('div', { className: 'admin-user-danger-row' },
    createElement('span', { className: 'admin-user-danger-text' },
      createElement('strong', {}, title),
      createElement('span', {}, hint)
    ),
    button
  );
  const dangerZone = createElement('section', { className: 'admin-user-section admin-user-danger-zone' },
    createElement('h4', { className: 'admin-user-section-title' }, 'Gefahrenzone'),
    createElement('div', { className: 'admin-user-card' },
      user.isBanned
        ? dangerRow('Sperre aufheben', 'Der Nutzer kann sich wieder anmelden.', banBtn)
        : dangerRow('Nutzer sperren', 'Anmeldung blockieren, bis die Sperre aufgehoben wird.', banBtn),
      dangerRow('Nutzer löschen', 'Entfernt das Konto endgültig aus Jellyfin.', deleteBtn)
    )
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

  const section = (title, ...fields) => createElement('section', { className: 'admin-user-section' },
    createElement('h4', { className: 'admin-user-section-title' }, title),
    createElement('div', { className: 'admin-user-card' }, ...fields)
  );

  const body = createElement('div', { className: 'admin-user-detail-body' },
    section('Konto', renameField.element, passwordField.element),
    section('Zugriff', libraryField.element),
    section('Streams', streamField.element),
    dangerZone,
    createElement('div', { className: 'admin-user-save-all-row' }, saveAllBtn)
  );

  return createElement('div', { className: 'admin-user-detail-view' }, header, body);
}
