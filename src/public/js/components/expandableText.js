import { createElement } from '../utils/dom.js';

const MORE_LABEL = 'mehr lesen';
const LESS_LABEL = 'weniger anzeigen';

// Text clamped to a few lines with an inline "… mehr lesen" that unfolds it.
// The cut is found by measuring, so the ellipsis and the link really sit at
// the end of the last visible line. Shows the full text where nothing can be
// measured (no layout yet, jsdom).
export function createExpandableText({ text, lines = 2, className = '' }) {
  const full = String(text || '').trim();
  const words = full.split(/\s+/).filter(Boolean);

  const paragraph = createElement('p', { className: 'expandable-text-body' });
  const container = createElement('div', {
    className: `expandable-text${className ? ` ${className}` : ''}`
  }, paragraph);

  let expanded = false;
  let cutCount = null;
  let collapsedHeight = 0;

  const toggle = createElement('button', {
    type: 'button',
    className: 'expandable-text-toggle',
    'aria-expanded': 'false',
    onClick: () => (expanded ? collapse() : expand())
  }, MORE_LABEL);

  const renderCut = (count) => {
    paragraph.textContent = '';
    paragraph.appendChild(document.createTextNode(`${words.slice(0, count).join(' ')}… `));
    paragraph.appendChild(toggle);
  };

  const renderFull = (withToggle) => {
    paragraph.textContent = '';
    paragraph.appendChild(document.createTextNode(full));
    if (withToggle) {
      paragraph.appendChild(document.createTextNode(' '));
      paragraph.appendChild(toggle);
    }
  };

  // Largest word count whose height still fits the allowed lines, or null
  // when the whole text fits (or cannot be measured).
  const findCut = () => {
    renderFull(false);
    const lineHeight = parseFloat(window.getComputedStyle(paragraph).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0 || !paragraph.scrollHeight) return null;

    const limit = lineHeight * lines + 1;
    if (paragraph.scrollHeight <= limit) return null;

    let low = 0;
    let high = words.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      renderCut(mid);
      if (paragraph.scrollHeight <= limit) low = mid;
      else high = mid - 1;
    }
    return low;
  };

  const layout = () => {
    if (expanded) return;
    container.style.maxHeight = '';
    cutCount = findCut();
    container.classList.toggle('is-clamped', cutCount !== null);
    if (cutCount === null) {
      renderFull(false);
      return;
    }
    renderCut(cutCount);
    collapsedHeight = paragraph.scrollHeight;
  };

  const animateHeight = (from, to, done) => {
    container.style.maxHeight = `${from}px`;
    void container.offsetHeight;
    container.style.maxHeight = `${to}px`;
    container.addEventListener('transitionend', () => {
      container.style.maxHeight = '';
      done?.();
    }, { once: true });
  };

  const expand = () => {
    expanded = true;
    const from = container.offsetHeight;
    renderFull(true);
    toggle.textContent = LESS_LABEL;
    toggle.setAttribute('aria-expanded', 'true');
    container.classList.add('is-expanded');
    animateHeight(from, container.scrollHeight);
  };

  const collapse = () => {
    expanded = false;
    toggle.textContent = MORE_LABEL;
    toggle.setAttribute('aria-expanded', 'false');
    container.classList.remove('is-expanded');
    animateHeight(container.scrollHeight, collapsedHeight, () => renderCut(cutCount));
  };

  // Measure once the element has a width, and again when it changes
  // (rotation, resize, the drawer pushing the page).
  if (typeof ResizeObserver === 'function') {
    let lastWidth = 0;
    new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width || 0;
      if (width && width !== lastWidth) {
        lastWidth = width;
        layout();
      }
    }).observe(container);
  }
  renderFull(false);

  return container;
}
