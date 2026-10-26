// Requests area of the admin page: media requests and problem reports.
// "Offen" groups them (reports first), "Alle" mixes them by date with status.
import { createElement } from '../../../utils/dom.js';
import { createChatIcon } from '../../navbar/icons.js';
import { RequestsApi } from '../../../api/requests.api.js';
import { appStore } from '../../../store/app.store.js';
import { setSectionBusy } from '../../loader.js';
import { createAdminRequestItem } from './adminRequestItem.js';
import { createAdminReportItem } from './adminReportItem.js';
import { ReportsApi } from '../../../api/reports.api.js';

const TABS = [
  { key: 'open', label: 'Offen' },
  { key: 'all', label: 'Alle' }
];

// Menu entry of this area. The icon is a factory, not a node: the menu builds
// its own card per tool and a single shared node could only ever live in one
// of them.
export const ADMIN_REQUESTS_TOOL = {
  id: 'requests',
  label: 'Anfragen & Meldungen',
  description: 'Medienanfragen und Problemmeldungen bearbeiten',
  icon: () => createChatIcon()
};

export function createAdminRequestsTool() {
  let activeTab = 'open';
  let loadedRequests = [];
  let loadedReports = [];

  const notify = (message, type = 'info') => appStore.showToast(message, type);

  const tabButtons = new Map();
  const tabsNav = createElement('div', {
    className: 'admin-requests-tabs admin-segmented',
    role: 'tablist',
    'aria-label': 'Anfragen-Filter'
  });

  TABS.forEach(tab => {
    const button = createElement('button', {
      className: 'admin-requests-tab',
      type: 'button',
      role: 'tab',
      'aria-selected': String(tab.key === activeTab),
      onClick: () => setActiveTab(tab.key)
    }, tab.label);
    tabButtons.set(tab.key, button);
    tabsNav.appendChild(button);
  });

  const listContainer = createElement('div', { className: 'admin-requests-list' });
  const statusElement = createElement('div', { className: 'admin-requests-status search-empty-state hidden' });
  const emptyElement = createElement('div', { className: 'admin-requests-empty search-empty-state hidden' });

  const element = createElement('div', { className: 'admin-requests-view' },
    tabsNav,
    statusElement,
    emptyElement,
    listContainer
  );

  const renderTabButtons = () => {
    tabButtons.forEach((button, key) => {
      const active = key === activeTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  const setActiveTab = (key) => {
    if (key === activeTab) return;
    activeTab = key;
    renderTabButtons();
    load();
  };

  const itemFor = (entry, showStatus) => entry.kind === 'report'
    ? createAdminReportItem(entry.data, { onChange: load, onNotify: notify, showStatus })
    : createAdminRequestItem(entry.data, { onChange: load, onNotify: notify, showStatus });

  const group = (title, entries) => createElement('section', { className: 'admin-requests-group' },
    createElement('h3', { className: 'admin-requests-group-title' },
      title, createElement('span', { className: 'admin-requests-group-count' }, String(entries.length))),
    ...entries.map(entry => itemFor(entry, false))
  );

  const renderList = () => {
    listContainer.innerHTML = '';
    const reports = loadedReports.map(data => ({ kind: 'report', data }));
    const requests = loadedRequests.map(data => ({ kind: 'request', data }));

    if (reports.length === 0 && requests.length === 0) {
      // While the status line is up (loading, or a load error) it owns the area.
      if (!statusElement.classList.contains('hidden')) {
        emptyElement.classList.add('hidden');
        return;
      }

      emptyElement.textContent = activeTab === 'all' ? 'Noch keine Anfragen oder Meldungen' : 'Nichts offen — alles erledigt.';
      emptyElement.classList.remove('hidden');
      return;
    }

    emptyElement.classList.add('hidden');

    if (activeTab === 'open') {
      if (reports.length) listContainer.appendChild(group('Problemmeldungen', reports));
      if (requests.length) listContainer.appendChild(group('Medienanfragen', requests));
      return;
    }

    [...reports, ...requests]
      .sort((a, b) => (b.data.created_at || 0) - (a.data.created_at || 0))
      .forEach(entry => listContainer.appendChild(itemFor(entry, true)));
  };

  // Only the latest load (tab switch, decision) fills the list.
  let loadRun = 0;
  const load = async () => {
    const run = ++loadRun;
    try {
      statusElement.textContent = 'Wird geladen …';
      statusElement.classList.remove('hidden');
      emptyElement.classList.add('hidden');
      setSectionBusy(listContainer, true);
      listContainer.innerHTML = '';

      const [requests, reports] = await Promise.all(activeTab === 'all'
        ? [RequestsApi.getAllRequests(), ReportsApi.getAll()]
        : [RequestsApi.getOpenRequests(), ReportsApi.getOpen()]);
      if (run !== loadRun) return;

      statusElement.classList.add('hidden');
      loadedRequests = requests || [];
      loadedReports = reports || [];
      renderList();
    } catch (error) {
      if (run !== loadRun) return;
      console.error('Failed to load admin requests:', error);
      loadedRequests = [];
      loadedReports = [];
      listContainer.innerHTML = '';
      emptyElement.classList.add('hidden');
      statusElement.textContent = error.message || 'Fehler beim Laden der Anfragen';
      statusElement.classList.remove('hidden');
    } finally {
      if (run === loadRun) setSectionBusy(listContainer, false);
    }
  };

  renderTabButtons();

  return {
    ...ADMIN_REQUESTS_TOOL,
    element,
    load
  };
}
