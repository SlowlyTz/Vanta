import { createElement } from '../../../utils/dom.js';
import { createChatIcon } from '../../navbar/icons.js';
import { RequestsApi } from '../../../api/requests.api.js';
import { createAdminRequestItem } from './adminRequestItem.js';

export function createAdminRequestsTool() {
  const listContainer = createElement('div', { className: 'admin-requests-list' });
  const statusElement = createElement('div', { className: 'admin-requests-status search-empty-state hidden' });
  const emptyElement = createElement('div', { className: 'admin-requests-empty search-empty-state hidden' });

  const element = createElement('div', { className: 'admin-requests-view' },
    statusElement,
    emptyElement,
    listContainer
  );

  const load = async () => {
    try {
      statusElement.textContent = 'Lade Anfragen...';
      statusElement.classList.remove('hidden');
      emptyElement.classList.add('hidden');
      listContainer.innerHTML = '';

      const requests = await RequestsApi.getOpenRequests();

      statusElement.classList.add('hidden');

      if (!requests || requests.length === 0) {
        emptyElement.textContent = 'Keine offenen Anfragen';
        emptyElement.classList.remove('hidden');
        return;
      }

      emptyElement.classList.add('hidden');

      requests.forEach(request => {
        listContainer.appendChild(createAdminRequestItem(request, load));
      });
    } catch (error) {
      console.error('Failed to load admin requests:', error);
      statusElement.textContent = 'Fehler beim Laden der Anfragen';
      statusElement.classList.remove('hidden');
    }
  };

  return {
    id: 'requests',
    label: 'Anfragen',
    description: 'Offene Medienanfragen verwalten',
    icon: createChatIcon(),
    element,
    load
  };
}
