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

// Anfragen-Bereich der Admin-Seite: Tabs "Offen" (Standard, nur pending) und
// "Alle" (jeder Status, mit Status-Badge je Zeile). onRequestsChanged wird
// nach jedem erfolgreichen Laden aufgerufen, damit die Seite (Badge an
// "Anfragen" in der Bereichsnavigation) die Zahl offener Anfragen aktuell
// halten kann, ohne selbst einen zweiten Request abzusetzen.
export function createAdminRequestsTool({ onRequestsChanged } = {}) {
  let activeTab = 'open';

  const notify = (message, type = 'info') => appStore.showToast(message, type);

  const tabButtons = new Map();
  const tabsNav = createElement('div', {
    className: 'admin-requests-tabs',
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

      if (!requests || requests.length === 0) {
        emptyElement.textContent = activeTab === 'all' ? 'Keine Anfragen vorhanden' : 'Keine offenen Anfragen';
        emptyElement.classList.remove('hidden');
      } else {
        emptyElement.classList.add('hidden');

        requests.forEach(request => {
          listContainer.appendChild(createAdminRequestItem(request, {
            onChange: load,
            onNotify: notify,
            showStatus: activeTab === 'all'
          }));
        });
      }

      onRequestsChanged?.(activeTab, requests || []);
    } catch (error) {
      console.error('Failed to load admin requests:', error);
      listContainer.innerHTML = '';
      statusElement.textContent = error.message || 'Fehler beim Laden der Anfragen';
      statusElement.classList.remove('hidden');
    } finally {
      setSectionBusy(listContainer, false);
    }
  };

  renderTabButtons();

  return {
    id: 'requests',
    label: 'Anfragen',
    description: 'Medienanfragen prüfen, genehmigen oder ablehnen',
    icon: createChatIcon(),
    element,
    load
  };
}
