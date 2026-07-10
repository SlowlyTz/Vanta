import { createElement } from '../../../utils/dom.js';
import { createUsersManagementIcon } from '../../navbar/icons.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { AuthApi } from '../../../api/auth.api.js';
import { appStore } from '../../../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../../loader.js';
import { createAdminUserRow } from './adminUserRow.js';
import { createAdminUserDetailView } from './adminUserDetailView.js';

export function createAdminUsersTool() {
  let users = [];
  let libraries = [];
  let currentAdminId = null;
  let searchTerm = '';
  let setBackControl = () => {};

  const searchInput = createElement('input', {
    className: 'settings-input admin-users-search',
    type: 'text',
    placeholder: 'Nutzer suchen...',
    onInput: (e) => {
      searchTerm = e.target.value;
      renderList();
    }
  });

  const statusEl = createElement('div', { className: 'admin-requests-status search-empty-state hidden' });
  const listEl = createElement('div', { className: 'admin-users-list' });

  const listView = createElement('div', { className: 'admin-users-list-view' },
    searchInput,
    statusEl,
    listEl
  );
  const detailSlot = createElement('div', { className: 'admin-users-detail-slot' });
  detailSlot.hidden = true;

  const element = createElement('div', { className: 'admin-users-view' },
    listView,
    detailSlot
  );

  const notify = (message, type = 'info') => {
    appStore.showToast(message, type);
  };

  const renderList = () => {
    listEl.innerHTML = '';
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? users.filter(u => u.name.toLowerCase().includes(term))
      : users;

    if (filtered.length === 0) {
      listEl.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('p', {}, users.length === 0 ? 'Keine Nutzer gefunden' : 'Keine Treffer für diese Suche')
        )
      );
      return;
    }

    filtered.forEach(user => {
      const row = createAdminUserRow(user, {
        currentAdminId,
        onEdit: (selectedUser) => showDetail(selectedUser),
        onChange: () => load(),
        onNotify: notify
      });
      listEl.appendChild(row);
    });
  };

  const showList = () => {
    detailSlot.hidden = true;
    detailSlot.innerHTML = '';
    listView.hidden = false;
    setBackControl(null);
    renderList();
  };

  const showDetail = (user) => {
    listView.hidden = true;
    detailSlot.hidden = false;
    detailSlot.innerHTML = '';
    detailSlot.appendChild(createAdminUserDetailView(user, {
      libraries,
      currentAdminId,
      onReload: () => load({ keepSelectedUserId: user.id }),
      notify
    }));
    setBackControl(showList);
  };

  const load = async ({ keepSelectedUserId = null } = {}) => {
    statusEl.classList.add('hidden');
    setSectionBusy(listEl, true);
    listEl.innerHTML = '';
    listEl.appendChild(createSectionLoader({ label: 'Nutzer werden geladen', compact: true }));

    try {
      const [usersRes, librariesRes, currentUser] = await Promise.all([
        AdminUsersApi.listUsers(),
        AdminUsersApi.listLibraries(),
        AuthApi.getCurrentUser().catch(() => null)
      ]);

      users = usersRes?.users || [];
      libraries = librariesRes?.libraries || [];
      currentAdminId = currentUser?.user?.id || currentAdminId;

      const updatedSelectedUser = keepSelectedUserId
        ? users.find(u => u.id === keepSelectedUserId)
        : null;

      if (updatedSelectedUser) {
        showDetail(updatedSelectedUser);
      } else {
        showList();
      }
    } catch (error) {
      console.error('[Admin Users Tool Load Error]', error);
      listEl.innerHTML = '';
      statusEl.textContent = error.message || 'Nutzer konnten nicht geladen werden';
      statusEl.classList.remove('hidden');
    } finally {
      setSectionBusy(listEl, false);
    }
  };

  return {
    id: 'users',
    label: 'Nutzerverwaltung',
    description: 'Jellyfin-Nutzer verwalten, sperren und Streams begrenzen',
    icon: createUsersManagementIcon(),
    element,
    load: () => load(),
    registerBackControl: (fn) => { setBackControl = fn; }
  };
}
