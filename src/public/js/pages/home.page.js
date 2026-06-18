import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { FeaturedMediaCarousel } from '../components/featuredMediaCarousel.js';
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
      const data = await MediaApi.getHomeSections();
      renderHome(data);
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Home Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Startseite', 'error');
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

  const hasContent = (data) => {
    const hasHero = data.hero && data.hero.length > 0;
    const hasResume = data.resume && data.resume.length > 0;
    const hasSections = data.sections && data.sections.length > 0;
    return hasHero || hasResume || hasSections;
  };

  const renderHome = (data) => {
    container.innerHTML = '';

    if (!hasContent(data)) {
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

    const heroItems = shuffleArray([...(data.hero || [])]).slice(0, 8);

    if (heroItems.length > 0) {
      const heroEl = HeroCarousel({ items: heroItems });
      if (heroEl) container.appendChild(heroEl);
    }

    const sectionsContainer = createElement('div', { className: 'content-section' });

    if (data.resume && data.resume.length > 0) {
      const resumeCarousel = MediaCarousel({
        title: 'Weiter schauen',
        items: data.resume,
        landscape: true
      });
      if (resumeCarousel) sectionsContainer.appendChild(resumeCarousel);
    }

    if (data.sections) {
      data.sections.forEach(section => {
        if (!section.items || section.items.length === 0) return;

        if (section.type === 'featured') {
          const carousel = FeaturedMediaCarousel({
            title: section.title,
            items: section.items,
            cardSize: section.cardSize || 'large'
          });
          if (carousel) sectionsContainer.appendChild(carousel);
        } else {
          const carousel = MediaCarousel({
            title: section.title,
            items: section.items,
            landscape: false,
            href: section.href || null
          });
          if (carousel) sectionsContainer.appendChild(carousel);
        }
      });
    }

    container.appendChild(sectionsContainer);
  };

  loadData();

  return container;
}
