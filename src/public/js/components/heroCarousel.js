import { createElement } from '../utils/dom.js';
import { getItemImageUrl } from '../utils/image.js';
import { formatYear } from '../utils/format.js';

const SLIDE_INTERVAL = 8000;

export function HeroCarousel({ items = [] }) {
  if (!items || items.length === 0) return null;

  const container = createElement('div', { className: 'home-hero hero-carousel' });

  let currentIndex = 0;
  let autoTimer = null;
  let isPaused = false;
  let destroyed = false;

  const backdropsContainer = createElement('div', { className: 'hero-carousel-backdrops' });

  const slidesData = items.map((item, index) => {
    const backdropUrl = getItemImageUrl(item, 'Backdrop');

    const playBtn = createElement('button', {
      className: 'btn-primary',
      onClick: (e) => {
        e.stopPropagation();
        window.location.hash = `#/player/${item.Id}`;
      }
    });
    playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg>Abspielen`;

    const detailsBtn = createElement('button', {
      className: 'btn-secondary',
      onClick: (e) => {
        e.stopPropagation();
        window.location.hash = `#/item/${item.Id}`;
      }
    }, 'Details');

    const backdrop = createElement('div', {
      className: 'hero-slide-backdrop',
      style: {
        backgroundImage: `url('${backdropUrl}')`,
        opacity: index === 0 ? '1' : '0'
      }
    });

    const content = createElement('div', {
      className: 'home-hero-content hero-slide-content',
      style: {
        opacity: index === 0 ? '1' : '0',
        pointerEvents: index === 0 ? 'auto' : 'none'
      }
    },
      createElement('h1', { className: 'home-hero-title' }, item.Name),
      createElement('div', { className: 'home-hero-metadata' },
        createElement('span', {}, formatYear(item.PremiereDate || item.ProductionYear)),
        createElement('span', {}, item.Type === 'Series' ? 'Serie' : 'Film')
      ),
      createElement('p', { className: 'home-hero-desc' }, item.Overview || 'Keine Beschreibung verfügbar.'),
      createElement('div', { className: 'home-hero-actions' },
        playBtn,
        detailsBtn
      )
    );

    backdropsContainer.appendChild(backdrop);
    container.appendChild(content);

    return { backdrop, content, item };
  });

  container.insertBefore(backdropsContainer, container.firstChild);

  const gradientOverlay = createElement('div', { className: 'hero-carousel-gradient' });
  container.insertBefore(gradientOverlay, container.children[1]);

  const dotsContainer = createElement('div', { className: 'hero-carousel-dots' });
  slidesData.forEach((_, i) => {
    const dot = createElement('button', {
      className: `hero-carousel-dot${i === 0 ? ' active' : ''}`,
      onClick: () => goToSlide(i)
    });
    dotsContainer.appendChild(dot);
  });
  container.appendChild(dotsContainer);

  const updateDots = () => {
    const dots = dotsContainer.querySelectorAll('.hero-carousel-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  };

  const deactivateSlide = (slide) => {
    slide.backdrop.style.opacity = '0';
    slide.content.style.opacity = '0';
    slide.content.style.pointerEvents = 'none';
  };

  const activateSlide = (slide) => {
    slide.backdrop.style.opacity = '1';
    slide.content.style.opacity = '1';
    slide.content.style.pointerEvents = 'auto';
  };

  const goToSlide = (index) => {
    if (index === currentIndex || index < 0 || index >= slidesData.length) return;

    deactivateSlide(slidesData[currentIndex]);
    currentIndex = index;
    activateSlide(slidesData[currentIndex]);

    updateDots();
    resetAutoTimer();
  };

  const nextSlide = () => {
    const nextIndex = (currentIndex + 1) % slidesData.length;
    goToSlide(nextIndex);
  };

  const scheduleNext = () => {
    stopAutoTimer();
    autoTimer = setTimeout(() => {
      if (!isPaused && !destroyed) {
        nextSlide();
      }
    }, SLIDE_INTERVAL);
  };

  const stopAutoTimer = () => {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  };

  const resetAutoTimer = () => {
    scheduleNext();
  };

  container.addEventListener('mouseenter', () => {
    isPaused = true;
  });

  container.addEventListener('mouseleave', () => {
    isPaused = false;
  });

  const cleanup = () => {
    destroyed = true;
    stopAutoTimer();
  };

  const disconnectObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node === container || node.contains(container)) {
          cleanup();
          disconnectObserver.disconnect();
          return;
        }
      }
    }
  });
  disconnectObserver.observe(container.parentNode || document.body, { childList: true });

  if (slidesData.length > 1) {
    scheduleNext();
  }

  return container;
}