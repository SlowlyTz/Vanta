// Admin page (#/admin): the dashboard menu, with each area opening as a layer
// on top. The role check here is UX only; the server enforces requireFreshAdmin.
import { createElement } from '../utils/dom.js';
import { AuthApi } from '../api/auth.api.js';
import { notificationsStore } from '../store/notifications.store.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader } from '../components/loader.js';
import { listAdminTools, createAdminTool } from '../components/admin-tools/AdminToolRegistry.js';
import { closeAllAdminModals } from '../components/admin-tools/adminModal.js';
import { createAdminDashboard } from './admin/adminDashboard.js';
import { createAdminHeader } from './admin/adminHeader.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { openAdminLayer } from './admin/adminLayer.js';

// Search bar labels per area. Areas without setFilter get no bar at all.
const SECTION_SEARCH = {
  users: { placeholder: 'Nutzer durchsuchen…', label: 'Nutzer durchsuchen' }
};

function createAdminHeading({ title, subtitle = '' }) {
  return createElement('header', { className: 'admin-page-heading' },
    createElement('h1', { className: 'admin-page-title' }, title),
    subtitle ? createElement('p', { className: 'admin-page-subtitle' }, subtitle) : null
  );
}

const SECTION_HASH = /^#\/admin\/([\w-]+)$/;
const isAdminHash = hash => hash === '#/admin' || SECTION_HASH.test(hash);

// The page handles #/admin <-> #/admin/<id> itself (handleHashChange, see
// router.js) so the browser back button also closes the layer animated.
export default function AdminPage({ section = null } = {}, pageScope) {
  const container = createElement('div', { className: 'admin-page page-container content-section' });

  let open = null;
  // The dashboard under the layers; it stops polling while one is open.
  let dashboard = null;
  const unsubscribers = [];
  let rendered = false;
  let torndown = false;

  const closeSection = ({ immediate = false } = {}) => {
    if (!open) return;
    const { tool, layer } = open;
    open = null;
    tool.destroy?.();
    layer.close({ immediate });
    if (!torndown) dashboard?.resume();
  };

  // Removes everything the page leaves outside its container (area layer, user
  // detail modal) once the router leaves the admin page.
  function teardown() {
    if (torndown) return;
    torndown = true;
    closeSection({ immediate: true });
    unsubscribers.splice(0).forEach(unsubscribe => unsubscribe());
    // Modals live on document.body, which the router never clears — the user
    // detail view as well as the ban/delete confirmations opened out of it.
    closeAllAdminModals();
  }

  const scope = resolvePageScope(pageScope);
  scope.onLeave(teardown);

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
    dashboard?.pause();
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
    // The dashboard: status, the tools and activity.
    const menu = createAdminDashboard({
      tools,
      scope,
      onSelect: (id) => { window.location.hash = `#/admin/${id}`; }
    });
    dashboard = menu;

    // Open requests and reports combined, kept live by the notifications store;
    // the menu renders without waiting for it.
    const unsubscribe = notificationsStore.subscribe(({ adminTotal }) => menu.setBadge('requests', adminTotal));
    unsubscribers.push(unsubscribe);
    notificationsStore.refresh();

    return createElement('div', { className: 'admin-page-layout' },
      createAdminHeading({
        title: 'Admin',
        subtitle: 'Wie es VANTA geht, was wartet und was zuletzt passiert ist.'
      }),
      menu.element
    );
  }

  // The router fills authStore before building the page, so the role is
  // usually known; checking it synchronously avoids a spinner on every switch.
  // Only a missing value is fetched.
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
