import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';

export default function LibraryPage(params) {
  // Extract parameters from router match
  const type = params.type || (params.type === 'Series' ? 'Series' : 'Movie');
  const genre = params.genreName || params.genre || null;

  const container = createElement('div', { className: 'page-container content-section' });

  const loadLibrary = async () => {
    appStore.setLoading(true);
    try {
      const items = await MediaApi.getLibrary(type, genre);
      renderLibrary(items);
    } catch (error) {
      console.error('[Library Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Inhalte', 'error');
      renderError(error.message);
    } finally {
      appStore.setLoading(false);
    }
  };

  const renderError = (msg) => {
    container.innerHTML = '';
    container.appendChild(
      createElement('div', { className: 'search-empty-state' },
        createElement('h3', {}, 'Fehler beim Laden'),
        createElement('p', {}, msg || 'Die Inhalte konnten nicht geladen werden.'),
        createElement('button', {
          className: 'btn-primary',
          onClick: loadLibrary
        }, 'Erneut versuchen')
      )
    );
  };

  const renderLibrary = (items) => {
    container.innerHTML = '';

    const labelType = type === 'Series' ? 'Serien' : 'Filme';
    const pageTitle = genre ? `${labelType}: ${genre}` : `Alle ${labelType}`;

    const titleEl = createElement('h1', { 
      style: { 
        fontSize: '2rem', 
        fontWeight: '700', 
        marginBottom: 'var(--spacing-xl)',
        background: 'linear-gradient(135deg, #ffffff 0%, #a5a5a5 100%)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent'
      } 
    }, pageTitle);

    if (items.length === 0) {
      container.appendChild(
        createElement('div', {},
          titleEl,
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Keine Inhalte gefunden'),
            createElement('p', {}, `In dieser Kategorie sind aktuell keine Einträge vorhanden.`)
          )
        )
      );
      return;
    }

    const grid = createElement('div', { className: 'grid-container' });
    items.forEach(item => {
      const cardEl = MediaCard({ item, landscape: false });
      if (cardEl) grid.appendChild(cardEl);
    });

    container.appendChild(
      createElement('div', {},
        titleEl,
        grid
      )
    );
  };

  loadLibrary();

  return container;
}
