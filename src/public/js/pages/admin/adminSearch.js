import { createElement } from '../../utils/dom.js';

// Rendert die gruppierte Ergebnisansicht der globalen Admin-Suche. Die
// eigentliche Datenbeschaffung (welche Nutzer/Anfragen es gibt) liegt beim
// Aufrufer — render() bekommt die vollen Listen plus den Suchbegriff und
// filtert selbst, damit die Trefferlogik an einer Stelle lebt.
export function createAdminSearchResults({ onSelectUser, onSelectRequest }) {
  const element = createElement('div', { className: 'admin-search-results' });

  const buildGroup = ({ title, count, items, renderItem }) => {
    const list = createElement('ul', { className: 'admin-search-group-list' },
      ...items.map(renderItem)
    );

    return createElement('section', { className: 'admin-search-group' },
      createElement('div', { className: 'admin-search-group-header' },
        createElement('h3', { className: 'admin-search-group-title' }, title),
        createElement('span', { className: 'admin-search-group-count' }, String(count))
      ),
      list
    );
  };

  const buildUserItem = (user) => createElement('li', { className: 'admin-search-result-item' },
    createElement('button', {
      className: 'admin-search-result admin-search-result-user',
      type: 'button',
      onClick: () => onSelectUser?.(user)
    },
      createElement('span', { className: 'admin-search-result-title' }, user.name),
      createElement('span', { className: 'admin-search-result-meta' }, 'Nutzer')
    )
  );

  const buildRequestItem = (request) => createElement('li', { className: 'admin-search-result-item' },
    createElement('button', {
      className: 'admin-search-result admin-search-result-request',
      type: 'button',
      onClick: () => onSelectRequest?.(request)
    },
      createElement('span', { className: 'admin-search-result-title' }, request.title || `TMDB: ${request.tmdb_id}`),
      createElement('span', { className: 'admin-search-result-meta' }, `Angefragt von ${request.username}`)
    )
  );

  const render = ({ term = '', users = [], requests = [] } = {}) => {
    element.innerHTML = '';

    const normalizedTerm = term.trim().toLowerCase();
    const matchedUsers = users.filter(user => (user.name || '').toLowerCase().includes(normalizedTerm));
    const matchedRequests = requests.filter(request =>
      (request.title || '').toLowerCase().includes(normalizedTerm) ||
      (request.username || '').toLowerCase().includes(normalizedTerm)
    );

    if (matchedUsers.length === 0 && matchedRequests.length === 0) {
      element.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('p', {}, `Keine Treffer für „${term.trim()}“`)
        )
      );
      return;
    }

    element.appendChild(buildGroup({
      title: 'Nutzer',
      count: matchedUsers.length,
      items: matchedUsers,
      renderItem: buildUserItem
    }));

    element.appendChild(buildGroup({
      title: 'Anfragen',
      count: matchedRequests.length,
      items: matchedRequests,
      renderItem: buildRequestItem
    }));
  };

  const clear = () => {
    element.innerHTML = '';
  };

  return { element, render, clear };
}
