import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { getItemImageUrl } from '../utils/image.js';
import { formatYear } from '../utils/format.js';

export default function HomePage() {
  const container = createElement('div', { className: 'page-container' });

  const loadData = async () => {
    appStore.setLoading(true);
    try {
      const data = await MediaApi.getHome();
      renderHome(data);
    } catch (error) {
      console.error('[Home Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Mediathek', 'error');
      renderError(error.message);
    } finally {
      appStore.setLoading(false);
    }
  };

  const renderError = (msg) => {
    container.innerHTML = '';
    container.appendChild(
      createElement('div', { className: 'content-section' },
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Verbindung fehlgeschlagen'),
          createElement('p', {}, msg || 'Der Jellyfin-Server konnte nicht erreicht werden.'),
          createElement('button', {
            className: 'btn-primary',
            onClick: loadData
          }, 'Erneut versuchen')
        )
      )
    );
  };

  const renderHome = (data) => {
    container.innerHTML = '';

    const hasResume = data.resume && data.resume.length > 0;
    const hasMovies = data.movies && data.movies.length > 0;
    const hasSeries = data.series && data.series.length > 0;

    if (!hasResume && !hasMovies && !hasSeries) {
      container.appendChild(
        createElement('div', { className: 'content-section' },
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Keine Medien vorhanden'),
            createElement('p', {}, 'Auf deinem Jellyfin-Server wurden keine Medien gefunden.')
          )
        )
      );
      return;
    }

    // Pick hero item (first movie, or first series)
    const heroItem = (data.movies && data.movies[0]) || (data.series && data.series[0]);
    if (heroItem) {
      const heroBackdrop = getItemImageUrl(heroItem, 'Backdrop');

      const playBtn = createElement('button', {
        className: 'btn-primary',
        onClick: () => { window.location.hash = `#/player/${heroItem.Id}`; }
      });
      playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg>Abspielen`;

      const detailsBtn = createElement('button', {
        className: 'btn-secondary',
        onClick: () => { window.location.hash = `#/item/${heroItem.Id}`; }
      }, 'Details');

      const hero = createElement('div', { className: 'home-hero' },
        createElement('div', {
          className: 'home-hero-backdrop',
          style: { backgroundImage: `url('${heroBackdrop}')` }
        }),
        createElement('div', { className: 'home-hero-content' },
          createElement('h1', { className: 'home-hero-title' }, heroItem.Name),
          createElement('div', { className: 'home-hero-metadata' },
            createElement('span', {}, formatYear(heroItem.PremiereDate || heroItem.ProductionYear)),
            createElement('span', {}, heroItem.Type === 'Series' ? 'Serie' : 'Film')
          ),
          createElement('p', { className: 'home-hero-desc' }, heroItem.Overview || 'Keine Beschreibung verfügbar.'),
          createElement('div', { className: 'home-hero-actions' },
            playBtn,
            detailsBtn
          )
        )
      );
      container.appendChild(hero);
    }

    const sectionsContainer = createElement('div', { className: 'content-section' });

    // 1. Continue Watching
    if (hasResume) {
      const resumeCarousel = MediaCarousel({
        title: 'Weiter schauen',
        items: data.resume,
        landscape: true
      });
      if (resumeCarousel) sectionsContainer.appendChild(resumeCarousel);
    }

    // 2. Movies
    if (hasMovies) {
      const moviesCarousel = MediaCarousel({
        title: 'Filme',
        items: data.movies,
        landscape: false
      });
      if (moviesCarousel) sectionsContainer.appendChild(moviesCarousel);
    }

    // 3. Series
    if (hasSeries) {
      const seriesCarousel = MediaCarousel({
        title: 'Serien',
        items: data.series,
        landscape: false
      });
      if (seriesCarousel) sectionsContainer.appendChild(seriesCarousel);
    }

    container.appendChild(sectionsContainer);
  };

  loadData();

  return container;
}
