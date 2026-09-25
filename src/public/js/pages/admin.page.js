import { createElement } from '../utils/dom.js';
import { AuthApi } from '../api/auth.api.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader } from '../components/loader.js';
import { listAdminTools, createAdminTool } from '../components/admin-tools/AdminToolRegistry.js';
import { closeAllAdminModals } from '../components/admin-tools/adminModal.js';
import { createAdminMenu } from './admin/adminMenu.js';
import { createAdminHeader } from './admin/adminHeader.js';
import { openAdminLayer } from './admin/adminLayer.js';

// Beschriftung der Suchleiste je Bereich. Bereiche ohne setFilter (Anfragen,
// Einstellungen) bekommen gar keine Leiste und stehen deshalb nicht hier.
const SECTION_SEARCH = {
  users: { placeholder: 'Nutzer durchsuchen…', label: 'Nutzer durchsuchen' }
};

// Kompakter, linksbündiger Seitenkopf des Menüs.
function createAdminHeading({ title, subtitle = '' }) {
  return createElement('header', { className: 'admin-page-heading' },
    createElement('h1', { className: 'admin-page-title' }, title),
    subtitle ? createElement('p', { className: 'admin-page-subtitle' }, subtitle) : null
  );
}

const SECTION_HASH = /^#\/admin\/([\w-]+)$/;
const isAdminHash = hash => hash === '#/admin' || SECTION_HASH.test(hash);

// Seiteneinstieg der Admin-Verwaltung. Unten liegt immer das Menü; ein Bereich
// (#/admin/requests|users|settings) fährt als Ebene von rechts darüber und mit
// "Zurück" wieder hinaus — wie die Unterseiten der Einstellungen. Die Seite
// übernimmt Wechsel zwischen #/admin und #/admin/<id> selbst
// (handleHashChange, siehe router.js), damit auch die Zurück-Taste des
// Browsers die Ebene animiert schließt. Der Router kennt keine Rollenprüfung
// (nur requiresAuth), also prüft die Seite selbst, ob der Nutzer Admin ist.
// Der eigentliche Schutz sitzt serverseitig in requireFreshAdmin — dieser
// Check ist reine UX.
export default function AdminPage({ section = null } = {}) {
  const container = createElement('div', { className: 'admin-page page-container content-section' });

  let open = null;
  let rendered = false;
  let torndown = false;

  const closeSection = ({ immediate = false } = {}) => {
    if (!open) return;
    const { tool, layer } = open;
    open = null;
    tool.destroy?.();
    layer.close({ immediate });
  };

  // Der Router verwirft Seiten ohne Unmount-Hook (main.innerHTML = ''). Alles,
  // was diese Seite außerhalb ihres Containers hinterlässt — die Ebene eines
  // Bereichs, das Nutzer-Detailmodal samt Escape-Handler — muss deshalb weg,
  // sobald die Route die Admin-Verwaltung verlässt.
  function teardown() {
    if (torndown) return;
    torndown = true;
    window.removeEventListener('hashchange', handleForeignHash);
    closeSection({ immediate: true });
    // Modals live on document.body, which the router never clears — the user
    // detail view as well as the ban/delete confirmations opened out of it.
    closeAllAdminModals();
  }

  function handleForeignHash() {
    if (!isAdminHash(window.location.hash)) teardown();
  }

  window.addEventListener('hashchange', handleForeignHash);

  const denyAccess = () => {
    if (torndown) return;
    appStore.showToast('Kein Zugriff', 'error');
    window.location.hash = '#/home';
  };

  // Opens an area as a layer. From the menu it slides in and "Zurück" steps
  // back through the history; on a deep link or reload it is simply there and
  // "Zurück" replaces the entry with the menu.
  function openSection(id, { animate = true, fromMenu = false } = {}) {
    const meta = listAdminTools().find(tool => tool.id === id);
    if (!meta) return false;
    if (open?.id === id) return true;
    closeSection();

    const tool = createAdminTool(id);
    const search = tool.setFilter
      ? createAdminHeader({ ...SECTION_SEARCH[id], onSearch: term => tool.setFilter(term) })
      : null;

    const content = createElement('div', { className: 'admin-page-layout', dataset: { section: id } },
      search ? createElement('div', { className: 'admin-page-header-row' }, search.element) : null,
      createElement('div', { className: 'admin-section-body' }, tool.element)
    );

    const layer = openAdminLayer({
      title: tool.label,
      subtitle: tool.description,
      content,
      wide: true,
      animate,
      onBack: () => {
        if (fromMenu) window.history.back();
        else window.location.replace('#/admin');
      }
    });

    open = { id, tool, layer };
    tool.load?.();
    return true;
  }

  // Called by the router for every hash change while this page is shown.
  container.handleHashChange = hash => {
    if (torndown || !rendered || !isAdminHash(hash)) return false;
    const match = hash.match(SECTION_HASH);
    if (!match) {
      closeSection();
      return true;
    }
    return openSection(match[1], { fromMenu: true });
  };

  const render = () => {
    if (torndown) return;

    const tools = listAdminTools();
    container.innerHTML = '';
    container.appendChild(buildMenuView(tools));
    rendered = true;

    if (section) openSection(section, { animate: false });
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
