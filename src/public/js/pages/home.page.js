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
      const homeData = await MediaApi.getHome();
      let categories = { movieGenres: [], seriesGenres: [], publishers: [] };

      try {
        categories = await MediaApi.getHomeCategories();
      } catch (categoryError) {
        if (categoryError.isAuthError) throw categoryError;

        console.error('[Home Categories Load Error]', categoryError);
        appStore.showToast('Kategorien konnten nicht geladen werden', 'error');
      }

      renderHome(homeData, categories);
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

  const hasContent = (data, categories) => {
    const hasResume = data.resume && data.resume.length > 0;
    const hasHero = (data.movies && data.movies.length > 0) || (data.series && data.series.length > 0);
    const hasMovieGenres = categories.movieGenres && categories.movieGenres.length > 0;
    const hasSeriesGenres = categories.seriesGenres && categories.seriesGenres.length > 0;
    const hasPublishers = categories.publishers && categories.publishers.length > 0;
    return hasResume || hasHero || hasMovieGenres || hasSeriesGenres || hasPublishers;
  };

  const renderHome = (data, categories) => {
    container.innerHTML = '';

    if (!hasContent(data, categories)) {
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
    if (data.resume && data.resume.length > 0) {
      const resumeCarousel = MediaCarousel({
        title: 'Weiter schauen',
        items: data.resume,
        landscape: true
      });
      if (resumeCarousel) sectionsContainer.appendChild(resumeCarousel);
    }

    // 2. Movie Genre Categories
    if (categories.movieGenres) {
      categories.movieGenres.forEach(category => {
        const carousel = MediaCarousel({
          title: `Filme: ${category.name}`,
          items: category.items,
          landscape: false,
          href: category.href
        });
        if (carousel) sectionsContainer.appendChild(carousel);
      });
    }

    // 3. Series Genre Categories
    if (categories.seriesGenres) {
      categories.seriesGenres.forEach(category => {
        const carousel = MediaCarousel({
          title: `Serien: ${category.name}`,
          items: category.items,
          landscape: false,
          href: category.href
        });
        if (carousel) sectionsContainer.appendChild(carousel);
      });
    }

    // 4. Publisher Categories
    if (categories.publishers) {
      categories.publishers.forEach(category => {
        const carousel = MediaCarousel({
          title: category.name,
          items: category.items,
          landscape: false,
          href: category.href
        });
        if (carousel) sectionsContainer.appendChild(carousel);
      });
    }

    container.appendChild(sectionsContainer);
  };

  loadData();

  return container;
}
