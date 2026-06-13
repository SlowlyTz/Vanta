import { createElement } from '../utils/dom.js';

export function HorizontalCarousel({ title, items = [], trackClass = '', containerClass = '' }) {
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
    tabindex: '0',
    role: 'list'
  });

  items.forEach(item => {
    if (item) {
      listContainer.appendChild(item);
    }
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

  const handleWheel = (event) => {
    if (getMaxScroll() <= 5) return;

    const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const shiftedVerticalIntent = event.shiftKey && Math.abs(event.deltaY) > 0;

    if (!horizontalIntent && !shiftedVerticalIntent) return;

    event.preventDefault();
    listContainer.scrollLeft += horizontalIntent ? event.deltaX : event.deltaY;
    requestArrowUpdate();
  };

  const header = createElement('div', { className: 'carousel-header' },
    createElement('h3', { className: 'carousel-title-text' }, title),
    createElement('div', { className: 'carousel-arrows' },
      prevBtn,
      nextBtn
    )
  );

  const container = createElement('div', {
    className: `horizontal-carousel-container ${containerClass}`
  },
    header,
    listContainer
  );

  listContainer.addEventListener('scroll', requestArrowUpdate, { passive: true });
  listContainer.addEventListener('wheel', handleWheel, { passive: false });

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(requestArrowUpdate);
    resizeObserver.observe(listContainer);
    listContainer._carouselResizeObserver = resizeObserver;
  } else {
    window.addEventListener('resize', requestArrowUpdate);
  }

  requestArrowUpdate();
  setTimeout(requestArrowUpdate, 100);

  return container;
}
