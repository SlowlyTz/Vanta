import { createElement } from '../utils/dom.js';
import { createMetaIcon } from './metaIcons.js';
import { getItemImageUrl } from '../utils/image.js';
import { formatYear, formatTicksToDuration } from '../utils/format.js';

const SLIDE_INTERVAL = 8000;

function getHeroLogoUrl(item) {
  if (!item?.ImageTags?.Logo) return null;
  return getItemImageUrl(item, 'Logo');
}

function createMetaPill({ className, icon, text }) {
  if (!text) return null;
  return createElement('span', { className: `meta-pill ${className || ''}`.trim() },
    icon ? createMetaIcon(icon) : null,
    createElement('span', {}, text)
  );
}

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

    const infoBtn = createElement('button', {
      className: 'btn-hero-info',
      type: 'button',
      'aria-label': `${item.Name} Details öffnen`,
      onClick: (e) => {
        e.stopPropagation();
        window.location.hash = `#/item/${item.Id}`;
      }
    });
    infoBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v-5"></path><path d="M12 8h.01"></path></svg>';

    const backdrop = createElement('div', {
      className: 'hero-slide-backdrop',
      style: {
        backgroundImage: `url('${backdropUrl}')`,
        opacity: index === 0 ? '1' : '0'
      }
    });

    const logoUrl = getHeroLogoUrl(item);
    const titleNode = logoUrl
      ? createElement('img', { className: 'home-hero-logo', src: logoUrl, alt: item.Name })
      : createElement('h1', { className: 'home-hero-title' }, item.Name);

    const metaPills = [
      createMetaPill({ className: 'meta-rating', icon: 'age', text: item.OfficialRating }),
      createMetaPill({ className: 'meta-runtime', icon: 'runtime', text: formatTicksToDuration(item.RunTimeTicks) }),
      createMetaPill({ className: 'meta-score', icon: 'star', text: item.CommunityRating ? item.CommunityRating.toFixed(1) : '' }),
      createMetaPill({ className: 'meta-year', icon: 'year', text: formatYear(item.PremiereDate || item.ProductionYear) })
    ].filter(Boolean);

    const content = createElement('div', {
      className: `home-hero-content hero-slide-content${index === 0 ? ' active' : ''}`,
      style: {
        opacity: index === 0 ? '1' : '0',
        pointerEvents: index === 0 ? 'auto' : 'none'
      }
    },
      titleNode,
      metaPills.length > 0 ? createElement('div', { className: 'home-hero-metadata' }, metaPills) : null,
      createElement('p', { className: 'home-hero-desc' }, item.Overview || 'Keine Beschreibung verfügbar.'),
      createElement('div', { className: 'home-hero-actions' },
        playBtn,
        infoBtn
      )
    );

    backdropsContainer.appendChild(backdrop);
    container.appendChild(content);

    return { backdrop, content, item };
  });

  container.insertBefore(backdropsContainer, container.firstChild);

  const gradientOverlay = createElement('div', { className: 'hero-carousel-gradient' });
  container.insertBefore(gradientOverlay, container.children[1]);

  const deactivateSlide = (slide) => {
    slide.backdrop.style.opacity = '0';
    slide.content.style.opacity = '0';
    slide.content.style.pointerEvents = 'none';
    slide.content.classList.remove('active');
  };

  const activateSlide = (slide) => {
    slide.backdrop.style.opacity = '1';
    slide.content.style.opacity = '1';
    slide.content.style.pointerEvents = 'auto';
    slide.content.classList.add('active');
  };

  const goToSlide = (index) => {
    if (index === currentIndex || index < 0 || index >= slidesData.length) return;

    deactivateSlide(slidesData[currentIndex]);
    currentIndex = index;
    activateSlide(slidesData[currentIndex]);

    resetAutoTimer();
  };

  const nextSlide = () => {
    const nextIndex = (currentIndex + 1) % slidesData.length;
    goToSlide(nextIndex);
  };

  let wasConnected = false;

  // The carousel is built detached and the router later drops the whole page
  // with innerHTML = '', which no observer on the old parent sees. Each tick
  // checks instead: once it was on the page and is gone, it stops for good.
  const scheduleNext = () => {
    stopAutoTimer();
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (destroyed) return;
      if (container.isConnected) {
        wasConnected = true;
      } else if (wasConnected) {
        cleanup();
        return;
      }
      if (isPaused || !container.isConnected) {
        scheduleNext();
        return;
      }
      nextSlide();
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
    if (!destroyed && slidesData.length > 1) scheduleNext();
  });

  const cleanup = () => {
    destroyed = true;
    stopAutoTimer();
  };

  if (slidesData.length > 1) {
    scheduleNext();
  }

  container.destroyCarousel = cleanup;

  return container;
}
