import { createElement } from '../../../utils/dom.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { openBanDialog, openDeleteDialog } from './adminUserDialogs.js';

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function buildRenameField(user) {
  const input = createElement('input', {
    className: 'settings-input',
    type: 'text',
    value: user.name
  });

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Benutzername'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => input.value.trim(),
    hasChanged: () => input.value.trim() !== user.name
  };
}

function buildPasswordField() {
  const input = createElement('input', {
    className: 'settings-input',
    type: 'password',
    placeholder: 'Neues Passwort',
    autocomplete: 'new-password'
  });

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Passwort'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => input.value,
    hasChanged: () => input.value.length > 0,
    clear: () => { input.value = ''; }
  };
}

function buildLibraryField(user, libraries) {
  let enableAll = Boolean(user.enableAllFolders);
  const originalEnabledFolders = new Set(user.enabledFolders || []);
  const selected = new Set(originalEnabledFolders);

  const libraryGrid = createElement('div', { className: 'admin-user-library-grid' });

  const allBtn = createElement('button', {
    type: 'button',
    className: `admin-user-choice-btn${enableAll ? ' active' : ''}`,
    'aria-pressed': String(enableAll),
    onClick: () => { enableAll = true; renderLibraryAccess(); }
  }, 'Alle Bibliotheken');

  const selectedBtn = createElement('button', {
    type: 'button',
    className: `admin-user-choice-btn${!enableAll ? ' active' : ''}`,
    'aria-pressed': String(!enableAll),
    onClick: () => { enableAll = false; renderLibraryAccess(); }
  }, 'Ausgewählte Bibliotheken');

  const modeGroup = createElement('div', {
    className: 'admin-user-library-mode',
    role: 'group',
    'aria-label': 'Bibliothekszugriff'
  }, allBtn, selectedBtn);

  function renderLibraryAccess() {
    allBtn.className = `admin-user-choice-btn${enableAll ? ' active' : ''}`;
    allBtn.setAttribute('aria-pressed', String(enableAll));
    selectedBtn.className = `admin-user-choice-btn${!enableAll ? ' active' : ''}`;
    selectedBtn.setAttribute('aria-pressed', String(!enableAll));

    libraryGrid.innerHTML = '';
    libraryGrid.classList.toggle('hidden', enableAll);

    if (enableAll) return;

    if (!libraries || libraries.length === 0) {
      libraryGrid.appendChild(createElement('p', { className: 'admin-user-dialog-hint' }, 'Keine Bibliotheken gefunden'));
      return;
    }

    libraries.forEach(lib => {
      const isActive = selected.has(lib.id);
      const libraryButton = createElement('button', {
        type: 'button',
        className: `admin-user-library-toggle${isActive ? ' active' : ''}`,
        'aria-pressed': String(isActive),
        onClick: () => {
          if (selected.has(lib.id)) selected.delete(lib.id);
          else selected.add(lib.id);
          renderLibraryAccess();
        }
      }, lib.name);
      libraryGrid.appendChild(libraryButton);
    });
  }

  renderLibraryAccess();

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Bibliothekszugriff'),
      modeGroup,
      libraryGrid
    ),
    getValue: () => ({
      enableAllFolders: enableAll,
      enabledFolders: enableAll ? [] : Array.from(selected)
    }),
    hasChanged: () => enableAll !== Boolean(user.enableAllFolders) || !setsEqual(selected, originalEnabledFolders)
  };
}

function buildStreamLimitField(user) {
  const input = createElement('input', {
    className: 'settings-input admin-user-stream-input',
    type: 'number',
    min: '0',
    max: '20',
    step: '1',
    value: String(user.maxConcurrentStreams)
  });

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Max. gleichzeitige Streams'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => parseInt(input.value, 10),
    isValid: () => {
      const value = parseInt(input.value, 10);
      return Number.isInteger(value) && value >= 0 && value <= 20;
    },
    hasChanged: () => parseInt(input.value, 10) !== user.maxConcurrentStreams
  };
}

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
