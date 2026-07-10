import { createElement } from '../utils/dom.js';

export function createSectionLoader({ label = 'Lädt…', compact = false, className = '' } = {}) {
  const classes = ['section-loader'];
  if (compact) classes.push('section-loader-compact');
  if (className) classes.push(className);

  return createElement('div', {
    className: classes.join(' '),
    role: 'status',
    'aria-live': 'polite'
  },
    createElement('span', { className: 'section-loader-spinner', 'aria-hidden': 'true' }),
    createElement('span', { className: 'section-loader-label' }, label)
  );
}

export function setSectionBusy(el, isBusy) {
  if (!el) return;
  if (isBusy) {
    el.setAttribute('aria-busy', 'true');
  } else {
    el.removeAttribute('aria-busy');
  }
}
