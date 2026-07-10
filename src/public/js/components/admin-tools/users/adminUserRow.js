import { createElement } from '../../../utils/dom.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { openBanDialog, openDeleteDialog } from './adminUserDialogs.js';

export function createAdminUserRow(user, {
  currentAdminId = null,
  onEdit,
  onChange,
  onNotify
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

  const editBtn = createElement('button', {
    className: 'admin-user-action-btn',
    type: 'button',
    onClick: () => onEdit?.(user)
  }, 'Bearbeiten');

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
          onNotify?.('Nutzer entsperrt', 'success');
          onChange?.();
        } catch (error) {
          onNotify?.(error.message || 'Entsperren fehlgeschlagen', 'error');
          banBtn.disabled = false;
        }
        return;
      }

      openBanDialog({
        user,
        onConfirm: async (reason) => {
          await AdminUsersApi.banUser(user.id, reason, user.name);
          onNotify?.('Nutzer gesperrt', 'success');
          onChange?.();
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
          onNotify?.('Nutzer gelöscht', 'success');
          onChange?.();
        }
      });
    }
  }, 'Löschen');

  const summary = createElement('div', { className: 'admin-user-row-summary' },
    createElement('div', { className: 'admin-user-row-main' },
      createElement('span', { className: 'admin-user-row-name' }, user.name),
      badges
    ),
    streamInfo,
    createElement('div', { className: 'admin-user-row-actions' }, editBtn, banBtn, deleteBtn)
  );

  return createElement('div', { className: 'admin-user-row' }, summary);
}
