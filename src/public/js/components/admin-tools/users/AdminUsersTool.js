import { createElement } from '../../../utils/dom.js';
import { createUsersManagementIcon } from '../../navbar/icons.js';
import { AdminUsersApi } from '../../../api/admin-users.api.js';
import { AuthApi } from '../../../api/auth.api.js';
import { appStore } from '../../../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../../loader.js';
import { createAdminUserRow } from './adminUserRow.js';
import { createAdminUserDetailView } from './adminUserDetailView.js';
import { openAdminModal } from '../adminModal.js';

// Baut eine Signatur aus allen in der Zeile sichtbaren Feldern. renderList()
// vergleicht sie mit der zuletzt gerenderten, um bei unverändertem Ergebnis
// (z.B. derselbe Suchbegriff erneut) das komplette Neuaufbauen der Liste zu
// überspringen, statt bei jedem Tastendruck `innerHTML = ''` zu machen.
function buildListSignature(list) {
  return list
    .map(u => `${u.id}|${u.name}|${u.isAdmin}|${u.isBanned}|${u.isDisabled}|${u.activeStreams}|${u.maxConcurrentStreams}`)
    .join(',');
}

// Menu entry of this area. The icon is a factory, not a node: the menu builds
// its own card per tool and a single shared node could only ever live in one
// of them.
export const ADMIN_USERS_TOOL = {
  id: 'users',
  label: 'Nutzerverwaltung',
  description: 'Konten, Zugriff und Streams verwalten',
  icon: () => createUsersManagementIcon()
};

export function createAdminUsersTool() {
  let users = [];
  let libraries = [];
  let currentAdminId = null;
  let searchTerm = '';
  let lastRenderedSignature = null;
  let openDetailModal = null;
  let replacingDetail = false;
  let destroyed = false;

  const statusEl = createElement('div', { className: 'admin-requests-status search-empty-state hidden' });
  const listEl = createElement('div', { className: 'admin-users-list' });

  const listView = createElement('div', { className: 'admin-users-list-view' },
    statusEl,
    listEl
  );

  const element = createElement('div', { className: 'admin-users-view' },
    listView
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

  // Der Filterbegriff kommt von der Suchleiste des Bereichs (adminHeader.js),
  // die Eingaben bereits selbst entprellt. setFilter muss
  // deshalb nicht erneut entprellen — nur das Ergebnis diffen (renderList).
  const setFilter = (term = '') => {
    searchTerm = term || '';
    renderList();
  };

  // Die Detailansicht öffnet als Modal über der Seite; die Liste bleibt
  // dahinter stehen. Schließt der Nutzer das Modal, wird neu geladen, damit
  // dort geänderte Namen, Badges und Stream-Limits sofort stimmen.
  //
  // Nach dem Speichern ersetzt load({ keepSelectedUserId }) das Modal durch
  // eines mit frischen Daten. Dieses Ersetzen darf das Neuladen NICHT erneut
  // auslösen — sonst schaukelt sich close -> load -> showDetail -> close auf.
  const showDetail = (user) => {
    if (openDetailModal) {
      replacingDetail = true;
      openDetailModal.close();
      replacingDetail = false;
    }

    const detailView = createAdminUserDetailView(user, {
      libraries,
      currentAdminId,
      onReload: () => load({ keepSelectedUserId: user.id }),
      notify
    });

    openDetailModal = openAdminModal(detailView, {
      variant: 'admin-user-dialog-detail',
      onClose: () => {
        openDetailModal = null;
        if (!replacingDetail && !destroyed) load();
      }
    });
  };

  const load = async ({ keepSelectedUserId = null } = {}) => {
    if (destroyed) return;

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

      // A save/ban/delete triggers a reload; if the route changed while that
      // was in flight, showDetail() below would put a modal back on the body.
      if (destroyed) return;

      users = usersRes?.users || [];
      libraries = librariesRes?.libraries || [];
      currentAdminId = currentUser?.user?.id || currentAdminId;
      lastRenderedSignature = null;

      renderList();

      const updatedSelectedUser = keepSelectedUserId
        ? users.find(u => u.id === keepSelectedUserId)
        : null;

      if (updatedSelectedUser) {
        showDetail(updatedSelectedUser);
      } else if (keepSelectedUserId && openDetailModal) {
        // Der offene Nutzer existiert nicht mehr (z.B. gerade gelöscht) —
        // das Modal muss weg, sonst steht dort ein toter Datensatz.
        replacingDetail = true;
        openDetailModal.close();
        replacingDetail = false;
      }
    } catch (error) {
      if (destroyed) return;
      console.error('[Admin Users Tool Load Error]', error);
      listEl.innerHTML = '';
      statusEl.textContent = error.message || 'Nutzer konnten nicht geladen werden';
      statusEl.classList.remove('hidden');
    } finally {
      setSectionBusy(listEl, false);
    }
  };

  // Stops a reload that is still in flight from putting the detail view back on
  // document.body after the page is gone. The page closes the overlays.
  const destroy = () => {
    destroyed = true;
    openDetailModal?.close();
  };

  return {
    ...ADMIN_USERS_TOOL,
    element,
    load: () => load(),
    setFilter,
    destroy
  };
}
