import { createElement } from '../utils/dom.js';
import { createMetaIcon } from './metaIcons.js';
import { getItemImageUrl, getBackdropUrlFor } from '../utils/image.js';
import { formatYear, formatTicksToDuration } from '../utils/format.js';
import { resolvePageScope } from '../utils/pageScope.js';

const SLIDE_INTERVAL = 8000;

const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

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

// The rotating banner on the home page. It moves on every eight seconds, but
// never while the pointer is over it, while focus is inside it, while the tab
// is hidden, after the pause button, or at all when the system asks for
// reduced motion. Slides that are not shown are inert, so neither Tab nor a
// screen reader lands on their buttons, and a backdrop is only loaded once its
// slide is next.
export function HeroCarousel({ items = [], pageScope = null }) {
  if (!items || items.length === 0) return null;

  const container = createElement('section', {
    className: 'home-hero hero-carousel',
    'aria-roledescription': 'Karussell',
    'aria-label': 'Empfehlungen'
  });

  let currentIndex = 0;
  let autoTimer = null;
  let hovered = false;
  let focusedInside = false;
  let pausedByUser = prefersReducedMotion();
  let destroyed = false;

  const backdropsContainer = createElement('div', { className: 'hero-carousel-backdrops', 'aria-hidden': 'true' });

  const slidesData = items.map((item, index) => {
    const playBtn = createElement('button', {
      className: 'btn-primary',
      type: 'button',
      onClick: (e) => {
        e.stopPropagation();
        window.location.hash = `#/player/${item.Id}`;
      }
    });
    playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Abspielen`;

    const infoBtn = createElement('a', {
      className: 'btn-hero-info',
      href: `#/item/${item.Id}`,
      'aria-label': `${item.Name} Details öffnen`
    });
    infoBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v-5"></path><path d="M12 8h.01"></path></svg>';

    const backdrop = createElement('div', {
      className: 'hero-slide-backdrop',
      style: { opacity: index === 0 ? '1' : '0' }
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
      role: 'group',
      'aria-roledescription': 'Folie',
      'aria-label': `${index + 1} von ${items.length}: ${item.Name}`,
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
    if (index !== 0) {
      content.inert = true;
      content.setAttribute('aria-hidden', 'true');
    }

    backdropsContainer.appendChild(backdrop);
    container.appendChild(content);

    return { backdrop, content, item, loaded: false };
  });

  // A backdrop is fetched when its slide is shown or comes next, at the width
  // this screen needs.
  const loadBackdrop = (index) => {
    const slide = slidesData[index];
    if (!slide || slide.loaded) return;
    slide.loaded = true;
    slide.backdrop.style.backgroundImage = `url('${getBackdropUrlFor(slide.item)}')`;
  };

  container.insertBefore(backdropsContainer, container.firstChild);

  const gradientOverlay = createElement('div', { className: 'hero-carousel-gradient', 'aria-hidden': 'true' });
  container.insertBefore(gradientOverlay, container.children[1]);

  const pauseButton = createElement('button', {
    type: 'button',
    className: 'hero-carousel-pause',
    onClick: () => {
      pausedByUser = !pausedByUser;
      updatePauseButton();
      scheduleNext();
    }
  });
  const updatePauseButton = () => {
    pauseButton.innerHTML = pausedByUser ? PLAY_ICON : PAUSE_ICON;
    pauseButton.setAttribute('aria-label', pausedByUser ? 'Empfehlungen automatisch wechseln' : 'Automatischen Wechsel anhalten');
    pauseButton.setAttribute('aria-pressed', pausedByUser ? 'true' : 'false');
  };
  updatePauseButton();
  if (slidesData.length > 1) container.appendChild(pauseButton);

  const deactivateSlide = (slide) => {
    slide.backdrop.style.opacity = '0';
    slide.content.style.opacity = '0';
    slide.content.style.pointerEvents = 'none';
    slide.content.classList.remove('active');
    slide.content.inert = true;
    slide.content.setAttribute('aria-hidden', 'true');
  };

  const activateSlide = (slide) => {
    slide.backdrop.style.opacity = '1';
    slide.content.style.opacity = '1';
    slide.content.style.pointerEvents = 'auto';
    slide.content.classList.add('active');
    slide.content.inert = false;
    slide.content.removeAttribute('aria-hidden');
  };

  const goToSlide = (index) => {
    if (index === currentIndex || index < 0 || index >= slidesData.length) return;

    loadBackdrop(index);
    deactivateSlide(slidesData[currentIndex]);
    currentIndex = index;
    activateSlide(slidesData[currentIndex]);
    loadBackdrop((currentIndex + 1) % slidesData.length);

    scheduleNext();
  };

  const nextSlide = () => {
    goToSlide((currentIndex + 1) % slidesData.length);
  };

  const isPaused = () => pausedByUser || hovered || focusedInside || document.hidden;

  const stopAutoTimer = () => {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  };

  let wasConnected = false;

  // The carousel is built detached; its page scope stops it when the page is
  // left. The connection check is the fallback for a carousel built outside
  // any page.
  function scheduleNext() {
    stopAutoTimer();
    if (destroyed || slidesData.length < 2 || pausedByUser) return;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (destroyed) return;
      if (container.isConnected) {
        wasConnected = true;
      } else if (wasConnected) {
        cleanup();
        return;
      }
      if (isPaused() || !container.isConnected) {
        scheduleNext();
        return;
      }
      nextSlide();
    }, SLIDE_INTERVAL);
  }

  container.addEventListener('mouseenter', () => {
    hovered = true;
  });

  container.addEventListener('mouseleave', () => {
    hovered = false;
    scheduleNext();
  });

  container.addEventListener('focusin', () => {
    focusedInside = true;
  });

  container.addEventListener('focusout', (event) => {
    if (container.contains(event.relatedTarget)) return;
    focusedInside = false;
    scheduleNext();
  });

  // Back in the foreground: a full interval before the next slide.
  const onVisibilityChange = () => {
    if (!document.hidden) scheduleNext();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  function cleanup() {
    destroyed = true;
    stopAutoTimer();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  loadBackdrop(0);
  if (slidesData.length > 1) loadBackdrop(1);
  scheduleNext();

  container.destroyCarousel = cleanup;
  resolvePageScope(pageScope).onLeave(cleanup);

  return container;
}
