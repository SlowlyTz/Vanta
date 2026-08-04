import { createElement } from '../utils/dom.js';
import { AuthApi } from '../api/auth.api.js';
import { AdminUsersApi } from '../api/admin-users.api.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader } from '../components/loader.js';
import { PageHeading } from '../components/pageHeading.js';
import { createDefaultAdminTools } from '../components/admin-tools/AdminToolRegistry.js';
import { createAdminNav } from './admin/adminNav.js';
import { createAdminHeader } from './admin/adminHeader.js';
import { createAdminSearchResults } from './admin/adminSearch.js';
import { createAdminSettingsPanel } from './admin/adminSettingsPanel.js';

// Seiteneinstieg der Admin-Verwaltung (#/admin). Der Router kennt keine
// Rollenprüfung (nur requiresAuth/guestOnly), deshalb prüft die Seite selbst
// per AuthApi.getCurrentUser(), ob der Nutzer Admin ist. Während der Prüfung
// steht ein Ladezustand, damit für Nicht-Admins nie auch nur kurz die
// Admin-Struktur aufblitzt. Der eigentliche Schutz sitzt serverseitig in
// requireFreshAdmin — dieser Check ist reine UX.
export default function AdminPage() {
  const loadingEl = createElement('div', { className: 'admin-page-loading' },
    createSectionLoader({ label: 'Zugriff wird geprüft…' })
  );

  const container = createElement('div', { className: 'admin-page page-container content-section' },
    loadingEl
  );

  (async () => {
    let isAdmin = false;

    try {
      const data = await AuthApi.getCurrentUser();
      isAdmin = data?.user?.isAdmin === true;
    } catch (error) {
      console.error('[AdminPage] Zugriffsprüfung fehlgeschlagen:', error);
    }

    if (!isAdmin) {
      appStore.showToast('Kein Zugriff', 'error');
      window.location.hash = '#/home';
      return;
    }

    loadingEl.remove();
    container.appendChild(buildAdminLayout());
  })();

  return container;
}

// Baut eine Bereichsansicht (Anfragen/Nutzer). Einen Zurück-Button braucht
// hier kein Tool mehr: die Nutzer-Detailansicht öffnet als Modal und schließt
// sich selbst, die Liste bleibt dahinter stehen.
function buildSectionPanel(tool) {
  return createElement('div', { className: 'admin-section-panel' }, tool.element);
}

function buildAdminLayout() {
  // Suchindex der globalen Suche: unabhängig von den Bereichs-Tabs immer die
  // vollständigen Listen, damit auch abgeschlossene Anfragen und alle Nutzer
  // gefunden werden (plan.md, Teil B2). Wird einmal beim Aufbau geladen und
  // über onRequestsChanged aktuell gehalten, sobald der "Alle"-Tab neu lädt.
  let searchUsers = [];
  let searchRequests = [];

  const tools = createDefaultAdminTools({
    onRequestsChanged: (tab, requests) => {
      if (tab === 'all') searchRequests = requests;
      nav.setBadge('requests', tab === 'all'
        ? requests.filter(r => r.status === 'pending').length
        : requests.length);
    }
  });

  const sectionPanels = new Map();
  tools.forEach(tool => sectionPanels.set(tool.id, buildSectionPanel(tool)));

  const nav = createAdminNav({
    sections: tools.map(tool => ({ id: tool.id, label: tool.label, icon: tool.icon })),
    onSelect: (id) => showSection(id)
  });

  const searchResults = createAdminSearchResults({
    onSelectUser: (user) => {
      nav.setActive('users');
      tools.find(t => t.id === 'users')?.selectUser?.(user.id);
    },
    onSelectRequest: () => nav.setActive('requests')
  });

  const applySectionVisibility = (isSearching) => {
    sectionPanels.forEach((panel, id) => {
      panel.hidden = isSearching || id !== nav.getActive();
    });
    searchResults.element.hidden = !isSearching;
  };

  const handleSearch = (term) => {
    const isSearching = term.trim().length > 0;
    applySectionVisibility(isSearching);

    if (isSearching) {
      searchResults.render({ term, users: searchUsers, requests: searchRequests });
    } else {
      searchResults.clear();
    }
  };

  function showSection(id) {
    header.clear();
    tools.find(t => t.id === id)?.load?.();
  }

  const header = createAdminHeader({
    onSearch: handleSearch,
    onToggleSettings: () => {
      if (settingsPanel.isOpen()) {
        settingsPanel.close();
      } else {
        settingsPanel.open();
        header.setSettingsOpen(true);
      }
    }
  });

  const settingsPanel = createAdminSettingsPanel({
    onClose: () => header.setSettingsOpen(false)
  });

  const contentEl = createElement('div', { className: 'admin-page-content' },
    searchResults.element,
    ...tools.map(tool => sectionPanels.get(tool.id))
  );

  const layout = createElement('div', { className: 'admin-page-layout' },
    PageHeading({
      title: 'Admin-Verwaltung',
      subtitle: 'Medienanfragen prüfen und Nutzer verwalten.'
    }),
    createElement('div', { className: 'admin-page-header-row' }, header.element),
    createElement('div', { className: 'admin-page-body' }, nav.element, contentEl),
    settingsPanel.element
  );

  // Startzustand: erster Bereich (Anfragen) aktiv und geladen.
  showSection(nav.getActive());

  RequestsApi.getAllRequests()
    .then(requests => {
      searchRequests = requests || [];
      nav.setBadge('requests', searchRequests.filter(r => r.status === 'pending').length);
    })
    .catch(error => console.error('[AdminPage] Anfragen für Suche/Badge konnten nicht geladen werden:', error));

  AdminUsersApi.listUsers()
    .then(res => { searchUsers = res?.users || []; })
    .catch(error => console.error('[AdminPage] Nutzer für die Suche konnten nicht geladen werden:', error));

  return layout;
}
