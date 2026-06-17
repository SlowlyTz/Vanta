import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { HeroCarousel } from '../components/heroCarousel.js';

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HomePage() {
  const container = createElement('div', { className: 'page-container' });

  const loadData = async () => {
    appStore.setLoading(true);
    try {
      const data = await MediaApi.getHome();
      renderHome(data);
    } catch (error) {
      if (error.isAuthError) return;

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

    const heroItems = shuffleArray([
      ...(data.movies || []),
      ...(data.series || [])
    ]).slice(0, 8);

    if (heroItems.length > 0) {
      const heroEl = HeroCarousel({ items: heroItems });
      if (heroEl) container.appendChild(heroEl);
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
