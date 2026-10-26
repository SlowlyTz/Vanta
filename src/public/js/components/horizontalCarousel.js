// Horizontally scrolling row with a title, optional "Alle anzeigen" link and arrow buttons.
import { createElement } from '../utils/dom.js';
import { resolvePageScope } from '../utils/pageScope.js';

export function HorizontalCarousel({ title, items = [], trackClass = '', containerClass = '', href = null, actionLabel = 'Alle anzeigen', pageScope = null }) {
  if (!items || items.length === 0) return null;

  const prevBtn = createElement('button', {
    className: 'carousel-arrow prev disabled',
    type: 'button',
    disabled: 'true',
    'aria-label': `${title} nach links scrollen`,
    onClick: (e) => { e.stopPropagation(); scroll('left'); }
  }, '');
  prevBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>`;

  const nextBtn = createElement('button', {
    className: 'carousel-arrow next',
    type: 'button',
    'aria-label': `${title} nach rechts scrollen`,
    onClick: (e) => { e.stopPropagation(); scroll('right'); }
  }, '');
  nextBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>`;

  const listContainer = createElement('div', {
    className: `carousel-track ${trackClass}`,
    // A row for the TV focus engine: left/right stay in it.
    'data-tv-row': '',
    tabindex: '0',
    role: 'list',
    'aria-label': title || undefined
  });

  items.forEach(item => {
    if (!item) return;
    // A link or button keeps its own role; it gets a list item around it.
    const listItem = item.matches('a[href], button')
      ? createElement('div', { className: 'carousel-list-item' }, item)
      : item;
    if (!listItem.hasAttribute('role')) listItem.setAttribute('role', 'listitem');
    listContainer.appendChild(listItem);
  });

  const getMaxScroll = () => Math.max(0, listContainer.scrollWidth - listContainer.clientWidth);

  const getScrollAmount = () => {
    const firstItem = listContainer.firstElementChild;
    if (!firstItem) return listContainer.clientWidth * 0.8;

    const styles = window.getComputedStyle(listContainer);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    const itemWidth = firstItem.getBoundingClientRect().width;

    return Math.max(itemWidth + gap, listContainer.clientWidth * 0.78);
  };

  const scroll = (direction) => {
    const scrollAmount = getScrollAmount();
    const targetScroll = Math.min(
      getMaxScroll(),
      Math.max(0, listContainer.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount))
    );

    listContainer.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  const updateArrowStates = () => {
    const scrollLeft = listContainer.scrollLeft;
    const maxScroll = getMaxScroll();
    // A row that fits needs no arrows at all.
    arrows.hidden = maxScroll <= 5;

    if (maxScroll <= 5 || scrollLeft <= 5) {
      prevBtn.classList.add('disabled');
      prevBtn.setAttribute('disabled', 'true');
    } else {
      prevBtn.classList.remove('disabled');
      prevBtn.removeAttribute('disabled');
    }

    if (maxScroll <= 5 || scrollLeft >= maxScroll - 5) {
      nextBtn.classList.add('disabled');
      nextBtn.setAttribute('disabled', 'true');
    } else {
      nextBtn.classList.remove('disabled');
      nextBtn.removeAttribute('disabled');
    }
  };

  let arrowFrame = null;
  const requestArrowUpdate = () => {
    if (arrowFrame) cancelAnimationFrame(arrowFrame);
    arrowFrame = requestAnimationFrame(() => {
      arrowFrame = null;
      updateArrowStates();
    });
  };

  const headerChildren = [
    createElement('h3', { className: 'carousel-title-text' }, title)
  ];

  if (href) {
    headerChildren.push(
      createElement('a', {
        className: 'carousel-header-action',
        href,
        'aria-label': `${actionLabel}: ${title}`
      }, actionLabel)
    );
  }

  const arrows = createElement('div', { className: 'carousel-arrows' }, prevBtn, nextBtn);
  headerChildren.push(arrows);

  const header = createElement('div', { className: 'carousel-header' }, ...headerChildren);

  const container = createElement('div', {
    className: `horizontal-carousel-container ${containerClass}`
  },
    header,
    listContainer
  );

  listContainer.addEventListener('scroll', requestArrowUpdate, { passive: true });

  const scope = resolvePageScope(pageScope);
  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(requestArrowUpdate);
    resizeObserver.observe(listContainer);
    listContainer._carouselResizeObserver = resizeObserver;
    scope.onLeave(() => resizeObserver.disconnect());
  } else {
    scope.listen(window, 'resize', requestArrowUpdate);
  }

  requestArrowUpdate();
  const settleTimer = setTimeout(requestArrowUpdate, 100);
  scope.onLeave(() => clearTimeout(settleTimer));

  return container;
}
