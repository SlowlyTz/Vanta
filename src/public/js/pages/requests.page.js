import { createElement } from '../utils/dom.js';
import { SeerApi } from '../api/seer.api.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import { createPosterPlaceholder, getTmdbImageUrl } from '../utils/poster.js';

const STATUS_MAP = {
  1: { label: 'ausstehend', cls: 'pending' },
  2: { label: 'genehmigt', cls: 'approved' },
  3: { label: 'abgelehnt', cls: 'declined' },
  4: { label: 'verarbeitung', cls: 'processing' },
  5: { label: 'verfuegbar', cls: 'available' }
};

export default function RequestsPage() {
  let debounceTimeout = null;
  let myRequests = [];

  const container = createElement('div', { className: 'page-container content-section' });

  if (!authStore.getState().seerEnabled) {
    container.appendChild(
      createElement('div', { className: 'search-empty-state' },
        createElement('h3', {}, 'Nicht verfuegbar'),
        createElement('p', {}, 'Die Anfragen-Funktion ist nicht aktiviert.')
      )
    );
    return container;
  }

  const searchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Film oder Serie zum Anfragen suchen...',
    onInput: (e) => {
      const query = e.target.value.trim();
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => performSearch(query), 450);
    },
    autocomplete: 'off'
  });

  const searchInputWrapper = createElement('div', { className: 'search-input-wrapper' }, searchInput);

  const resultsGrid = createElement('div', { className: 'requests-grid' });

  const statusContainer = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Medien anfragen'),
    createElement('p', {}, 'Suche nach Filmen oder Serien die noch nicht in der Mediathek sind.')
  );

  const requestsSection = createElement('div', { className: 'requests-section hidden' },
    createElement('h2', { className: 'requests-section-title' }, 'Meine Anfragen')
  );

  const requestsList = createElement('div', { className: 'requests-list' });

  const searchSection = createElement('div', { className: 'search-container' },
    searchInputWrapper,
    resultsGrid,
    statusContainer
  );

  container.appendChild(searchSection);
  container.appendChild(requestsSection);

  const performSearch = async (query) => {
    if (!query) {
      resultsGrid.innerHTML = '';
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Medien anfragen'));
      statusContainer.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien die noch nicht in der Mediathek sind.'));
      statusContainer.classList.remove('hidden');
      return;
    }

    statusContainer.classList.add('hidden');
    appStore.setLoading(true);

    try {
      const data = await SeerApi.search(query);
      const results = data.results || [];
      resultsGrid.innerHTML = '';

      if (results.length === 0) {
        statusContainer.innerHTML = '';
        statusContainer.appendChild(createElement('h3', {}, 'Keine Ergebnisse gefunden'));
        statusContainer.appendChild(createElement('p', {}, `Fuer "${query}" konnten keine Ergebnisse gefunden werden.`));
        statusContainer.classList.remove('hidden');
      } else {
        statusContainer.classList.add('hidden');
        results.forEach(item => {
          const card = createSearchResultCard(item);
          resultsGrid.appendChild(card);
        });
      }
    } catch (error) {
      console.error('[Requests Search Error]', error);
      appStore.showToast('Fehler bei der Suche', 'error');
      resultsGrid.innerHTML = '';
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Suche fehlgeschlagen'));
      statusContainer.appendChild(createElement('p', {}, error.message));
      statusContainer.classList.remove('hidden');
    } finally {
      appStore.setLoading(false);
    }
  };

  const createSearchResultCard = (item) => {
    const isRequested = item.mediaInfo && item.mediaInfo.status !== undefined;
    const statusInfo = isRequested ? STATUS_MAP[item.mediaInfo.status] : null;
    const isAvailable = item.mediaInfo && (item.mediaInfo.status === 5 || item.mediaInfo.jellyfinMediaId);

    const card = createElement('div', {
      className: 'request-card request-card-clickable',
      onClick: (e) => {
        if (e.target.closest('.btn-primary, .btn-requested, .btn-request-error, .request-card-btn, .request-item-delete')) return;
        if (isAvailable && item.mediaInfo && item.mediaInfo.jellyfinMediaId) {
          window.location.hash = `#/item/${item.mediaInfo.jellyfinMediaId}`;
        } else {
          window.location.hash = `#/seer-detail/${item.mediaType}/${item.id}`;
        }
      }
    });

    const posterUrl = getTmdbImageUrl(item.posterPath || item.poster_path, 'w500');

    let posterEl;
    if (posterUrl) {
      posterEl = createElement('img', {
        className: 'request-card-poster',
        src: posterUrl,
        alt: item.title || item.name,
        loading: 'lazy',
        onError: (e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = createPosterPlaceholder(item.title || item.name || '?');
        }
      });
    } else {
      posterEl = createElement('img', {
        className: 'request-card-poster',
        src: createPosterPlaceholder(item.title || item.name || '?'),
        alt: item.title || item.name
      });
    }

    const typeLabel = item.mediaType === 'tv' ? 'Serie' : 'Film';
    const year = item.releaseDate || item.firstAirDate || '';
    const yearShort = year ? year.substring(0, 4) : '';
    const overview = item.overview || 'Keine Beschreibung verfuegbar.';

    let actionBtn;
    if (isAvailable) {
      actionBtn = createElement('span', { className: 'btn-requested' }, 'Verfuegbar');
    } else if (statusInfo && item.mediaInfo.status !== 3) {
      actionBtn = createElement('span', { className: `btn-requested request-status-inline-${statusInfo.cls}` }, statusInfo.label);
    } else {
      actionBtn = createElement('button', {
        className: 'btn-primary request-card-btn',
        onClick: () => handleRequest(item, actionBtn)
      }, 'Anfragen');
    }

    const info = createElement('div', { className: 'request-card-info' },
      createElement('div', { className: 'request-card-meta' },
        createElement('span', { className: 'request-card-type' }, typeLabel),
        yearShort ? createElement('span', { className: 'request-card-year' }, yearShort) : null
      ),
      createElement('h3', { className: 'request-card-title' }, item.title || item.name),
      createElement('p', { className: 'request-card-overview' }, overview.length > 150 ? overview.substring(0, 150) + '...' : overview)
    );

    const actions = createElement('div', { className: 'request-card-actions' }, actionBtn);

    card.appendChild(posterEl);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
  };

  const handleRequest = async (item, btn) => {
    btn.disabled = true;
    btn.textContent = 'Anfragen...';

    try {
      await SeerApi.createRequest(item.mediaType, item.id);
      btn.textContent = 'Angefragt';
      btn.classList.add('btn-requested');
      btn.classList.remove('btn-primary');
      appStore.showToast('Anfrage erfolgreich gesendet!', 'success');
      loadMyRequests();
    } catch (error) {
      console.error('[Request Error]', error);
      const msg = error.message || 'Fehler beim Anfragen';
      if (msg.includes('already') || msg.includes('exist') || msg.includes('duplicate')) {
        btn.textContent = 'Bereits angefragt';
        btn.classList.add('btn-requested');
        btn.classList.remove('btn-primary');
      } else {
        btn.textContent = 'Fehler';
        btn.classList.add('btn-request-error');
        setTimeout(() => {
          btn.textContent = 'Anfragen';
          btn.disabled = false;
          btn.classList.remove('btn-request-error');
        }, 2000);
      }
      appStore.showToast(msg, 'error');
    }
  };

  const loadMyRequests = async () => {
    try {
      const data = await SeerApi.getMyRequests({ take: 50 });
      myRequests = data.results || [];

      if (!Array.isArray(myRequests)) {
        myRequests = [];
      }

      renderMyRequests();
    } catch (error) {
      console.warn('[My Requests Load Error]', error);
      myRequests = [];
      renderMyRequests();
    }
  };

  const getRequestTitle = (req) => {
    const media = req.media;
    if (!media) return `Anfrage #${req.id}`;

    const url = media.externalServiceSlug || media.mediaUrl || '';
    if (req.title) return req.title;

    return `Anfrage #${req.id}`;
  };

  const renderMyRequests = () => {
    requestsSection.classList.toggle('hidden', myRequests.length === 0);
    requestsList.innerHTML = '';

    if (myRequests.length === 0) return;

    myRequests.forEach(req => {
      const statusInfo = STATUS_MAP[req.status] || { label: 'unbekannt', cls: 'unknown' };
      const type = (req.type || req.media?.mediaType) === 'tv' ? 'Serie' : 'Film';

      const mediaTitle = getRequestTitle(req);

      const item = createElement('div', { className: 'request-item' },
        createElement('div', { className: 'request-item-info' },
          createElement('span', { className: 'request-item-title' }, mediaTitle),
          createElement('span', { className: 'request-item-type' }, type)
        ),
        createElement('div', { className: 'request-item-right' },
          createElement('span', { className: `request-status request-status-${statusInfo.cls}` }, statusInfo.label),
          createElement('button', {
            className: 'request-item-delete',
            onClick: () => deleteRequest(req.id)
          }, createDeleteIcon())
        )
      );
      requestsList.appendChild(item);
    });

    if (!requestsSection.contains(requestsList)) {
      requestsSection.appendChild(requestsList);
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      await SeerApi.deleteRequest(requestId);
      myRequests = myRequests.filter(r => r.id !== requestId);
      renderMyRequests();
      appStore.showToast('Anfrage entfernt', 'success');
    } catch (error) {
      console.error('[Delete Request Error]', error);
      appStore.showToast('Fehler beim Entfernen', 'error');
    }
  };

  const createDeleteIcon = () => {
    const icon = createElement('span', { className: 'delete-icon', 'aria-hidden': 'true' });
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    return icon;
  };

  loadMyRequests();

  return container;
}
