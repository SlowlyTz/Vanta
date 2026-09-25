import { createElement } from '../../../utils/dom.js';
import { createChatIcon } from '../../navbar/icons.js';
import { RequestsApi } from '../../../api/requests.api.js';
import { appStore } from '../../../store/app.store.js';
import { setSectionBusy } from '../../loader.js';
import { createAdminRequestItem } from './adminRequestItem.js';

const TABS = [
  { key: 'open', label: 'Offen' },
  { key: 'all', label: 'Alle' }
];

// Menu entry of this area. The icon is a factory, not a node: the menu builds
// its own card per tool and a single shared node could only ever live in one
// of them.
export const ADMIN_REQUESTS_TOOL = {
  id: 'requests',
  label: 'Anfragen',
  description: 'Medienanfragen prüfen und beantworten',
  icon: () => createChatIcon()
};

// Anfragen-Bereich der Admin-Seite: Umschalter "Offen" (Standard, nur pending)
// und "Alle" (jeder Status, mit Status-Badge je Karte). Ohne Suche: die Liste
// der offenen Anfragen ist kurz, und "Alle" ist nach Datum sortiert.
export function createAdminRequestsTool() {
  let activeTab = 'open';
  let loadedRequests = [];

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

  const renderList = () => {
    const visible = loadedRequests;
    listContainer.innerHTML = '';

    if (visible.length === 0) {
      // While the status line is up (loading, or a load error) it owns the area.
      if (!statusElement.classList.contains('hidden')) {
        emptyElement.classList.add('hidden');
        return;
      }

      emptyElement.textContent = activeTab === 'all' ? 'Keine Anfragen vorhanden' : 'Keine offenen Anfragen';
      emptyElement.classList.remove('hidden');
      return;
    }

    emptyElement.classList.add('hidden');

    visible.forEach(request => {
      listContainer.appendChild(createAdminRequestItem(request, {
        onChange: load,
        onNotify: notify,
        showStatus: activeTab === 'all'
      }));
    });
  };

  const load = async () => {
    try {
      statusElement.textContent = 'Lade Anfragen...';
      statusElement.classList.remove('hidden');
      emptyElement.classList.add('hidden');
      setSectionBusy(listContainer, true);
      listContainer.innerHTML = '';

      const requests = activeTab === 'all'
        ? await RequestsApi.getAllRequests()
        : await RequestsApi.getOpenRequests();

      statusElement.classList.add('hidden');
      loadedRequests = requests || [];
      renderList();
    } catch (error) {
      console.error('Failed to load admin requests:', error);
      loadedRequests = [];
      listContainer.innerHTML = '';
      emptyElement.classList.add('hidden');
      statusElement.textContent = error.message || 'Fehler beim Laden der Anfragen';
      statusElement.classList.remove('hidden');
    } finally {
      setSectionBusy(listContainer, false);
    }
  };

  renderTabButtons();

  return {
    ...ADMIN_REQUESTS_TOOL,
    element,
    load
  };
}
