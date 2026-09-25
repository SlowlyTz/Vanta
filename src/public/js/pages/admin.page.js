import { createElement } from '../utils/dom.js';
import { AuthApi } from '../api/auth.api.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader } from '../components/loader.js';
import { createBackIcon } from '../components/navbar/icons.js';
import { listAdminTools, createAdminTool } from '../components/admin-tools/AdminToolRegistry.js';
import { closeAllAdminModals } from '../components/admin-tools/adminModal.js';
import { createAdminMenu } from './admin/adminMenu.js';
import { createAdminHeader } from './admin/adminHeader.js';

// Beschriftung der Suchleiste je Bereich. Bereiche ohne setFilter (Anfragen,
// Einstellungen) bekommen gar keine Leiste und stehen deshalb nicht hier.
const SECTION_SEARCH = {
  users: { placeholder: 'Nutzer durchsuchen…', label: 'Nutzer durchsuchen' }
};

// Kompakter, linksbündiger Seitenkopf der Admin-Verwaltung: in einem Bereich
// mit Zurück-Chip darüber, im Menü ohne.
function createAdminHeading({ title, subtitle = '', onBack = null }) {
  return createElement('header', { className: 'admin-page-heading' },
    onBack
      ? createElement('button', {
        className: 'admin-back-button',
        type: 'button',
        'aria-label': 'Zurück zur Admin-Verwaltung',
        onClick: onBack
      }, createBackIcon(), 'Admin')
      : null,
    createElement('h1', { className: 'admin-page-title' }, title),
    subtitle ? createElement('p', { className: 'admin-page-subtitle' }, subtitle) : null
  );
}

// Seiteneinstieg der Admin-Verwaltung. Ohne `section` (#/admin) steht hier das
// Menü, mit `section` (#/admin/requests|users|settings) genau ein Bereich samt
// Zurück-Button. Der Router kennt keine Rollenprüfung (nur requiresAuth), also
// prüft die Seite selbst, ob der Nutzer Admin ist. Der eigentliche Schutz sitzt
// serverseitig in requireFreshAdmin — dieser Check ist reine UX.
export default function AdminPage({ section = null } = {}) {
  const container = createElement('div', { className: 'admin-page page-container content-section' });

  let activeTool = null;
  let torndown = false;

  // Der Router verwirft Seiten ohne Unmount-Hook (main.innerHTML = ''). Alles,
  // was diese Seite außerhalb ihres Containers hinterlässt — vor allem das
  // Nutzer-Detailmodal an document.body samt Escape-Handler — muss deshalb hier
  // weg, sobald die Route wechselt. Der Listener nimmt sich dabei selbst raus.
  function teardown() {
    if (torndown) return;
    torndown = true;
    window.removeEventListener('hashchange', teardown);
    activeTool?.destroy?.();
    activeTool = null;
    // Modals live on document.body, which the router never clears — the user
    // detail view as well as the ban/delete confirmations opened out of it.
    closeAllAdminModals();
  }

  window.addEventListener('hashchange', teardown);

  const denyAccess = () => {
    if (torndown) return;
    appStore.showToast('Kein Zugriff', 'error');
    window.location.hash = '#/home';
  };

  const render = () => {
    if (torndown) return;

    const tools = listAdminTools();
    const activeMeta = section ? tools.find(tool => tool.id === section) : null;

    container.innerHTML = '';
    container.appendChild(activeMeta ? buildSectionView(activeMeta.id) : buildMenuView(tools));
  };

  function buildMenuView(tools) {
    const menu = createAdminMenu({
      tools,
      onSelect: (id) => { window.location.hash = `#/admin/${id}`; }
    });

    // /admin/open liefert genau die offenen (pending) Anfragen und ist damit
    // billiger als die Gesamtliste. Die Zahl kommt nach, das Menü steht sofort.
    RequestsApi.getOpenRequests()
      .then(requests => menu.setBadge('requests', (requests || []).length))
      .catch(error => console.error('[AdminPage] Offene Anfragen für das Menü konnten nicht geladen werden:', error));

    return createElement('div', { className: 'admin-page-layout' },
      createAdminHeading({
        title: 'Admin',
        subtitle: 'Anfragen prüfen, Nutzer verwalten und VANTA einrichten.'
      }),
      menu.element
    );
  }

  function buildSectionView(id) {
    const tool = createAdminTool(id);
    activeTool = tool;

    const search = tool.setFilter
      ? createAdminHeader({
        ...SECTION_SEARCH[id],
        onSearch: (term) => tool.setFilter(term)
      })
      : null;

    const layout = createElement('div', { className: 'admin-page-layout', dataset: { section: id } },
      createAdminHeading({
        title: tool.label,
        subtitle: tool.description,
        onBack: () => { window.location.hash = '#/admin'; }
      }),
      search ? createElement('div', { className: 'admin-page-header-row' }, search.element) : null,
      createElement('div', { className: 'admin-section-body' }, tool.element)
    );

    tool.load?.();

    return layout;
  }

  // Der Router füllt den authStore, bevor er die Seite baut — der Rollenwert
  // liegt also normalerweise schon vor. Das wird bewusst synchron ausgewertet:
  // ein Spinner pro Wechsel zwischen Menü und Bereich wäre bei jedem Klick zu
  // sehen. Nur wenn der Wert fehlt, wird er nachgeladen.
  const cachedUser = authStore.getState().user;

  if (typeof cachedUser?.isAdmin === 'boolean') {
    if (cachedUser.isAdmin) {
      render();
    } else {
      denyAccess();
    }

    return container;
  }

  const loadingEl = createElement('div', { className: 'admin-page-loading' },
    createSectionLoader({ label: 'Zugriff wird geprüft…' })
  );
  container.appendChild(loadingEl);

  (async () => {
    let isAdmin = false;

    try {
      const data = await AuthApi.getCurrentUser();
      isAdmin = data?.user?.isAdmin === true;
    } catch (error) {
      console.error('[AdminPage] Zugriffsprüfung fehlgeschlagen:', error);
    }

    if (!isAdmin) {
      denyAccess();
      return;
    }

    render();
  })();

  return container;
}
