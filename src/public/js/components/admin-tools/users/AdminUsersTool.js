import { createElement } from '../../../utils/dom.js';
import { createUsersManagementIcon } from '../../navbar/icons.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { AuthApi } from '../../../api/auth.api.js';
import { appStore } from '../../../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../../loader.js';
import { createAdminUserRow } from './adminUserRow.js';
import { createAdminUserDetailView } from './adminUserDetailView.js';

// Baut eine Signatur aus allen in der Zeile sichtbaren Feldern. renderList()
// vergleicht sie mit der zuletzt gerenderten, um bei unverändertem Ergebnis
// (z.B. derselbe Suchbegriff erneut) das komplette Neuaufbauen der Liste zu
// überspringen, statt bei jedem Tastendruck `innerHTML = ''` zu machen.
function buildListSignature(list) {
  return list
    .map(u => `${u.id}|${u.name}|${u.isAdmin}|${u.isBanned}|${u.isDisabled}|${u.activeStreams}|${u.maxConcurrentStreams}`)
    .join(',');
}

export function createAdminUsersTool() {
  let users = [];
  let libraries = [];
  let currentAdminId = null;
  let searchTerm = '';
  let lastRenderedSignature = null;
  let setBackControl = () => {};

  const statusEl = createElement('div', { className: 'admin-requests-status search-empty-state hidden' });
  const listEl = createElement('div', { className: 'admin-users-list' });

  const listView = createElement('div', { className: 'admin-users-list-view' },
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

  const getFiltered = () => {
    const term = searchTerm.trim().toLowerCase();
    return term ? users.filter(u => u.name.toLowerCase().includes(term)) : users;
  };

  const renderList = () => {
    const filtered = getFiltered();
    const signature = buildListSignature(filtered);

    if (signature === lastRenderedSignature) return;
    lastRenderedSignature = signature;

    listEl.innerHTML = '';

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

  // Der Filterbegriff kommt von der globalen Suchleiste der Admin-Seite
  // (adminHeader.js), die Eingaben bereits selbst entprellt. setFilter muss
  // deshalb nicht erneut entprellen — nur das Ergebnis diffen (renderList).
  const setFilter = (term = '') => {
    searchTerm = term || '';
    renderList();
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

  // Öffnet die Detailansicht für einen bestimmten Nutzer, z.B. aus einem
  // Treffer der globalen Suche heraus. Gibt zurück, ob der Nutzer (noch)
  // in der zuletzt geladenen Liste existiert.
  const selectUser = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return false;
    showDetail(user);
    return true;
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
      lastRenderedSignature = null;

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
    setFilter,
    selectUser,
    registerBackControl: (fn) => { setBackControl = fn; }
  };
}
